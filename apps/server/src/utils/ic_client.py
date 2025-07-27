"""
Internet Computer (IC) client for canister communication.
Handles interaction with Access Control and Assets canisters.
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
import json
import requests
from functools import wraps
import backoff
from src.utils.config import Config

logger = logging.getLogger(__name__)


@dataclass
class VideoMetadata:
    """Container for video metadata from IC canisters."""
    video_id: str
    title: str
    description: str
    created_at: datetime
    updated_at: datetime
    owner: str
    tags: List[str]
    duration: Optional[int] = None
    thumbnail_url: Optional[str] = None
    manifest_url: Optional[str] = None


@dataclass
class ManifestContent:
    """Container for video manifest content."""
    video_id: str
    scenes: List[Dict[str, Any]]
    captions_vtt: Optional[str] = None
    audio_transcript: Optional[str] = None
    tts_transcript: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class CanisterResponse:
    """Container for canister API responses."""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    status_code: Optional[int] = None
    response_time: Optional[float] = None


class ICClientError(Exception):
    """Base exception for IC client errors."""
    pass


class CanisterConnectionError(ICClientError):
    """Exception for canister connection failures."""
    pass


class CanisterAuthError(ICClientError):
    """Exception for canister authentication failures."""
    pass


class CanisterDataError(ICClientError):
    """Exception for canister data parsing errors."""
    pass


def retry_on_failure(max_attempts: int = None, backoff_factor: float = None):
    """
    Decorator for retrying failed canister calls with exponential backoff.
    
    Args:
        max_attempts: Maximum retry attempts (default from config)
        backoff_factor: Backoff multiplier (default from config)
    """
    max_attempts = max_attempts or Config.RETRY_MAX_ATTEMPTS
    backoff_factor = backoff_factor or Config.RETRY_BACKOFF_FACTOR
    
    def decorator(func):
        @wraps(func)
        @backoff.on_exception(
            backoff.expo,
            (requests.RequestException, CanisterConnectionError),
            max_tries=max_attempts,
            factor=backoff_factor,
            jitter=backoff.random_jitter
        )
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator


class ICClient:
    """
    Client for interacting with Internet Computer canisters.
    
    Provides methods for:
    - Fetching video registry from Access Control canister
    - Retrieving video metadata and manifests from Assets canister
    - Error handling and retry logic for canister calls
    - Caching for improved performance
    """
    
    def __init__(self, ic_network: str = None, access_control_canister_id: str = None,
                 assets_canister_id: str = None):
        """
        Initialize IC client with canister configuration.
        
        Args:
            ic_network: IC network endpoint (default from config)
            access_control_canister_id: Access Control canister ID (default from config)
            assets_canister_id: Assets canister ID (default from config)
        """
        self.ic_network = ic_network or Config.IC_NETWORK
        self.access_control_canister_id = access_control_canister_id or Config.ACCESS_CONTROL_CANISTER_ID
        self.assets_canister_id = assets_canister_id or Config.ASSETS_CANISTER_ID
        
        # Validate required configuration
        if not self.access_control_canister_id:
            raise ICClientError("ACCESS_CONTROL_CANISTER_ID is required")
        if not self.assets_canister_id:
            raise ICClientError("ASSETS_CANISTER_ID is required")
        
        # Initialize session for connection pooling
        self.session = requests.Session()
        self.session.timeout = Config.REQUEST_TIMEOUT
        
        # Simple in-memory cache for canister responses
        self._cache = {}
        self._cache_ttl = Config.CACHE_TTL
        
        # Request statistics
        self._request_count = 0
        self._error_count = 0
        self._total_response_time = 0.0
        
        logger.info(f"Initialized IC client for network: {self.ic_network}")
        logger.info(f"Access Control canister: {self.access_control_canister_id}")
        logger.info(f"Assets canister: {self.assets_canister_id}")
    
    def _get_canister_url(self, canister_id: str, method: str) -> str:
        """
        Build canister API URL for method calls.
        
        Args:
            canister_id: Target canister ID
            method: Method name to call
            
        Returns:
            Complete canister API URL
        """
        return f"{self.ic_network}/api/v2/canister/{canister_id}/call"
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """
        Check if cached response is still valid.
        
        Args:
            cache_key: Cache key to check
            
        Returns:
            True if cache entry is valid
        """
        if cache_key not in self._cache:
            return False
        
        cached_time, _ = self._cache[cache_key]
        return time.time() - cached_time < self._cache_ttl
    
    def _get_from_cache(self, cache_key: str) -> Optional[Any]:
        """
        Retrieve data from cache if valid.
        
        Args:
            cache_key: Cache key to retrieve
            
        Returns:
            Cached data or None if not found/expired
        """
        if self._is_cache_valid(cache_key):
            _, data = self._cache[cache_key]
            logger.debug(f"Cache hit for key: {cache_key}")
            return data
        
        # Remove expired entry
        if cache_key in self._cache:
            del self._cache[cache_key]
        
        return None
    
    def _set_cache(self, cache_key: str, data: Any) -> None:
        """
        Store data in cache with timestamp.
        
        Args:
            cache_key: Cache key
            data: Data to cache
        """
        self._cache[cache_key] = (time.time(), data)
        logger.debug(f"Cached data for key: {cache_key}")
        
        # Simple cache size management
        if len(self._cache) > Config.CACHE_SIZE:
            # Remove oldest entries
            sorted_cache = sorted(self._cache.items(), key=lambda x: x[1][0])
            for key, _ in sorted_cache[:len(self._cache) - Config.CACHE_SIZE + 1]:
                del self._cache[key]
    
    @retry_on_failure()
    def _make_canister_call(self, canister_id: str, method: str, 
                           args: Optional[Dict] = None) -> CanisterResponse:
        """
        Make a call to an IC canister with error handling and metrics.
        
        Args:
            canister_id: Target canister ID
            method: Method name to call
            args: Method arguments
            
        Returns:
            CanisterResponse with result or error information
        """
        start_time = time.time()
        self._request_count += 1
        
        try:
            url = self._get_canister_url(canister_id, method)
            
            # Prepare request payload
            payload = {
                "request_type": "call",
                "canister_id": canister_id,
                "method_name": method,
                "arg": args or {}
            }
            
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "spacy-nlp-server/1.0.0"
            }
            
            logger.debug(f"Making canister call: {method} to {canister_id}")
            
            # Make the request
            response = self.session.post(
                url,
                json=payload,
                headers=headers,
                timeout=Config.REQUEST_TIMEOUT
            )
            
            response_time = time.time() - start_time
            self._total_response_time += response_time
            
            # Handle HTTP errors
            if response.status_code >= 400:
                self._error_count += 1
                error_msg = f"HTTP {response.status_code}: {response.text}"
                logger.error(f"Canister call failed: {error_msg}")
                
                if response.status_code == 401:
                    raise CanisterAuthError(error_msg)
                elif response.status_code >= 500:
                    raise CanisterConnectionError(error_msg)
                else:
                    raise ICClientError(error_msg)
            
            # Parse response
            try:
                response_data = response.json()
            except json.JSONDecodeError as e:
                self._error_count += 1
                raise CanisterDataError(f"Invalid JSON response: {str(e)}")
            
            logger.debug(f"Canister call successful: {method} ({response_time:.3f}s)")
            
            return CanisterResponse(
                success=True,
                data=response_data,
                status_code=response.status_code,
                response_time=response_time
            )
            
        except requests.RequestException as e:
            self._error_count += 1
            response_time = time.time() - start_time
            self._total_response_time += response_time
            
            error_msg = f"Request failed: {str(e)}"
            logger.error(error_msg)
            
            return CanisterResponse(
                success=False,
                error=error_msg,
                response_time=response_time
            )
        
        except Exception as e:
            self._error_count += 1
            response_time = time.time() - start_time
            self._total_response_time += response_time
            
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            
            return CanisterResponse(
                success=False,
                error=error_msg,
                response_time=response_time
            )
    
    def get_video_registry(self, use_cache: bool = True) -> List[VideoMetadata]:
        """
        Fetch video registry from Access Control canister.
        
        Args:
            use_cache: Whether to use cached results
            
        Returns:
            List of VideoMetadata objects
            
        Raises:
            ICClientError: If registry fetch fails
        """
        cache_key = "video_registry"
        
        # Check cache first
        if use_cache:
            cached_data = self._get_from_cache(cache_key)
            if cached_data is not None:
                return cached_data
        
        try:
            logger.info("Fetching video registry from Access Control canister")
            
            response = self._make_canister_call(
                self.access_control_canister_id,
                "get_video_registry",
                {}
            )
            
            if not response.success:
                raise ICClientError(f"Failed to fetch video registry: {response.error}")
            
            # Parse registry data
            registry_data = response.data.get("videos", [])
            video_metadata_list = []
            
            for video_data in registry_data:
                try:
                    metadata = VideoMetadata(
                        video_id=video_data["id"],
                        title=video_data.get("title", ""),
                        description=video_data.get("description", ""),
                        created_at=datetime.fromisoformat(video_data.get("created_at", "1970-01-01T00:00:00")),
                        updated_at=datetime.fromisoformat(video_data.get("updated_at", "1970-01-01T00:00:00")),
                        owner=video_data.get("owner", ""),
                        tags=video_data.get("tags", []),
                        duration=video_data.get("duration"),
                        thumbnail_url=video_data.get("thumbnail_url"),
                        manifest_url=video_data.get("manifest_url")
                    )
                    video_metadata_list.append(metadata)
                    
                except (KeyError, ValueError) as e:
                    logger.warning(f"Failed to parse video metadata for {video_data.get('id', 'unknown')}: {str(e)}")
                    continue
            
            logger.info(f"Successfully fetched {len(video_metadata_list)} videos from registry")
            
            # Cache the results
            if use_cache:
                self._set_cache(cache_key, video_metadata_list)
            
            return video_metadata_list
            
        except Exception as e:
            logger.error(f"Error fetching video registry: {str(e)}")
            raise ICClientError(f"Failed to fetch video registry: {str(e)}") from e    

    def get_video_manifest(self, video_id: str, use_cache: bool = True) -> ManifestContent:
        """
        Fetch video manifest from Assets canister.
        
        Args:
            video_id: Video ID to fetch manifest for
            use_cache: Whether to use cached results
            
        Returns:
            ManifestContent object with video data
            
        Raises:
            ICClientError: If manifest fetch fails
        """
        cache_key = f"manifest_{video_id}"
        
        # Check cache first
        if use_cache:
            cached_data = self._get_from_cache(cache_key)
            if cached_data is not None:
                return cached_data
        
        try:
            logger.info(f"Fetching manifest for video: {video_id}")
            
            response = self._make_canister_call(
                self.assets_canister_id,
                "get_video_manifest",
                {"video_id": video_id}
            )
            
            if not response.success:
                raise ICClientError(f"Failed to fetch manifest for {video_id}: {response.error}")
            
            manifest_data = response.data.get("manifest", {})
            
            # Parse manifest content
            manifest = ManifestContent(
                video_id=video_id,
                scenes=manifest_data.get("scenes", []),
                captions_vtt=manifest_data.get("captions.vtt"),
                audio_transcript=manifest_data.get("audio-transcript.txt"),
                tts_transcript=manifest_data.get("tts-transcript.txt"),
                metadata=manifest_data.get("metadata", {})
            )
            
            logger.info(f"Successfully fetched manifest for video: {video_id}")
            
            # Cache the results
            if use_cache:
                self._set_cache(cache_key, manifest)
            
            return manifest
            
        except Exception as e:
            logger.error(f"Error fetching manifest for {video_id}: {str(e)}")
            raise ICClientError(f"Failed to fetch manifest for {video_id}: {str(e)}") from e
    
    def get_video_content(self, video_id: str, content_type: str, use_cache: bool = True) -> Optional[str]:
        """
        Fetch specific video content (captions, transcripts) from Assets canister.
        
        Args:
            video_id: Video ID
            content_type: Type of content ('captions.vtt', 'audio-transcript.txt', 'tts-transcript.txt')
            use_cache: Whether to use cached results
            
        Returns:
            Content string or None if not found
            
        Raises:
            ICClientError: If content fetch fails
        """
        cache_key = f"content_{video_id}_{content_type}"
        
        # Check cache first
        if use_cache:
            cached_data = self._get_from_cache(cache_key)
            if cached_data is not None:
                return cached_data
        
        try:
            logger.debug(f"Fetching {content_type} for video: {video_id}")
            
            response = self._make_canister_call(
                self.assets_canister_id,
                "get_video_content",
                {
                    "video_id": video_id,
                    "content_type": content_type
                }
            )
            
            if not response.success:
                logger.warning(f"Failed to fetch {content_type} for {video_id}: {response.error}")
                return None
            
            content = response.data.get("content")
            
            if content:
                logger.debug(f"Successfully fetched {content_type} for video: {video_id}")
                
                # Cache the results
                if use_cache:
                    self._set_cache(cache_key, content)
            
            return content
            
        except Exception as e:
            logger.error(f"Error fetching {content_type} for {video_id}: {str(e)}")
            return None
    
    def get_all_video_content(self, video_id: str, use_cache: bool = True) -> Dict[str, Optional[str]]:
        """
        Fetch all available content types for a video.
        
        Args:
            video_id: Video ID
            use_cache: Whether to use cached results
            
        Returns:
            Dictionary with content types as keys and content as values
        """
        content_types = ['captions.vtt', 'audio-transcript.txt', 'tts-transcript.txt']
        content = {}
        
        for content_type in content_types:
            try:
                content[content_type] = self.get_video_content(video_id, content_type, use_cache)
            except Exception as e:
                logger.warning(f"Failed to fetch {content_type} for {video_id}: {str(e)}")
                content[content_type] = None
        
        return content
    
    def check_video_exists(self, video_id: str) -> bool:
        """
        Check if a video exists in the registry.
        
        Args:
            video_id: Video ID to check
            
        Returns:
            True if video exists
        """
        try:
            registry = self.get_video_registry(use_cache=True)
            return any(video.video_id == video_id for video in registry)
        except Exception as e:
            logger.error(f"Error checking if video {video_id} exists: {str(e)}")
            return False
    
    def get_videos_updated_since(self, since_date: datetime, use_cache: bool = False) -> List[VideoMetadata]:
        """
        Get videos that have been updated since a specific date.
        
        Args:
            since_date: Date to check for updates since
            use_cache: Whether to use cached registry (usually False for this use case)
            
        Returns:
            List of VideoMetadata for updated videos
        """
        try:
            registry = self.get_video_registry(use_cache=use_cache)
            updated_videos = [
                video for video in registry 
                if video.updated_at > since_date
            ]
            
            logger.info(f"Found {len(updated_videos)} videos updated since {since_date}")
            return updated_videos
            
        except Exception as e:
            logger.error(f"Error getting videos updated since {since_date}: {str(e)}")
            return []
    
    def get_client_statistics(self) -> Dict[str, Any]:
        """
        Get client performance and usage statistics.
        
        Returns:
            Dictionary with client statistics
        """
        avg_response_time = (
            self._total_response_time / self._request_count 
            if self._request_count > 0 else 0.0
        )
        
        error_rate = (
            self._error_count / self._request_count 
            if self._request_count > 0 else 0.0
        )
        
        return {
            "total_requests": self._request_count,
            "total_errors": self._error_count,
            "error_rate": error_rate,
            "average_response_time": avg_response_time,
            "cache_size": len(self._cache),
            "cache_hit_rate": self._calculate_cache_hit_rate(),
            "configuration": {
                "ic_network": self.ic_network,
                "access_control_canister_id": self.access_control_canister_id,
                "assets_canister_id": self.assets_canister_id,
                "request_timeout": Config.REQUEST_TIMEOUT,
                "cache_ttl": self._cache_ttl,
                "retry_max_attempts": Config.RETRY_MAX_ATTEMPTS
            }
        }
    
    def _calculate_cache_hit_rate(self) -> float:
        """Calculate cache hit rate (simplified estimation)."""
        # This is a simplified calculation - in production you'd want more detailed metrics
        return 0.0  # Placeholder - would need to track hits/misses properly
    
    def clear_cache(self) -> None:
        """Clear all cached data."""
        cache_size = len(self._cache)
        self._cache.clear()
        logger.info(f"Cleared {cache_size} cache entries")
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on IC canisters.
        
        Returns:
            Dictionary with health status
        """
        health_status = {
            "healthy": True,
            "timestamp": datetime.utcnow().isoformat(),
            "canisters": {}
        }
        
        # Test Access Control canister
        try:
            start_time = time.time()
            response = self._make_canister_call(
                self.access_control_canister_id,
                "health_check",
                {}
            )
            response_time = time.time() - start_time
            
            health_status["canisters"]["access_control"] = {
                "healthy": response.success,
                "response_time": response_time,
                "error": response.error if not response.success else None
            }
            
            if not response.success:
                health_status["healthy"] = False
                
        except Exception as e:
            health_status["canisters"]["access_control"] = {
                "healthy": False,
                "error": str(e)
            }
            health_status["healthy"] = False
        
        # Test Assets canister
        try:
            start_time = time.time()
            response = self._make_canister_call(
                self.assets_canister_id,
                "health_check",
                {}
            )
            response_time = time.time() - start_time
            
            health_status["canisters"]["assets"] = {
                "healthy": response.success,
                "response_time": response_time,
                "error": response.error if not response.success else None
            }
            
            if not response.success:
                health_status["healthy"] = False
                
        except Exception as e:
            health_status["canisters"]["assets"] = {
                "healthy": False,
                "error": str(e)
            }
            health_status["healthy"] = False
        
        return health_status
    
    def close(self) -> None:
        """Close the client and clean up resources."""
        if hasattr(self, 'session'):
            self.session.close()
        self.clear_cache()
        logger.info("IC client closed")
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


# Utility functions for common IC operations
def create_ic_client() -> ICClient:
    """Create IC client with default configuration."""
    return ICClient()


def fetch_video_registry() -> List[VideoMetadata]:
    """Quick utility to fetch video registry."""
    with create_ic_client() as client:
        return client.get_video_registry()


def fetch_video_manifest(video_id: str) -> ManifestContent:
    """Quick utility to fetch video manifest."""
    with create_ic_client() as client:
        return client.get_video_manifest(video_id)