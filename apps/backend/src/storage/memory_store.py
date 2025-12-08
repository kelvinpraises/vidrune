"""
In-memory implementation of index storage.
Provides fast access for development and testing.
"""

import threading
import time
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
from src.storage.base_store import IndexStore
from src.models.video_models import VideoIndexEntry, SearchResult, IndexStatus, ContentType
from src.utils.config import Config

logger = logging.getLogger(__name__)


class MemoryStore(IndexStore):
    """
    In-memory implementation of IndexStore.
    
    Stores all index data in memory using dictionaries.
    Suitable for development, testing, and small deployments.
    Not persistent across application restarts.
    """
    
    def __init__(self):
        """Initialize MemoryStore."""
        self._data: Dict[str, VideoIndexEntry] = {}
        self._lock = threading.RLock()  # Reentrant lock for thread safety
        self._created_at = datetime.utcnow()
        self._access_count = 0
        self._last_access = None
        
        # Search index for faster text search
        self._text_index: Dict[str, set] = defaultdict(set)  # word -> set of video_ids
        
        logger.info("MemoryStore initialized")
    
    def _update_access_stats(self) -> None:
        """Update access statistics."""
        self._access_count += 1
        self._last_access = datetime.utcnow()
    
    def _build_text_index(self, video_id: str, index_entry: VideoIndexEntry) -> None:
        """
        Build text search index for a video.
        
        Args:
            video_id: Video ID
            index_entry: Index entry to build index for
        """
        try:
            # Clear existing index for this video
            self._clear_text_index(video_id)
            
            # Get all searchable text
            all_text = index_entry.get_all_text().lower()
            
            # Simple word tokenization
            words = set()
            for word in all_text.split():
                # Clean word (remove punctuation, etc.)
                clean_word = ''.join(c for c in word if c.isalnum()).strip()
                if len(clean_word) >= 2:  # Only index words with 2+ characters
                    words.add(clean_word)
            
            # Add to text index
            for word in words:
                self._text_index[word].add(video_id)
                
        except Exception as e:
            logger.error(f"Error building text index for {video_id}: {str(e)}")
    
    def _clear_text_index(self, video_id: str) -> None:
        """
        Clear text index entries for a video.
        
        Args:
            video_id: Video ID to clear index for
        """
        try:
            # Remove video_id from all word sets
            words_to_remove = []
            for word, video_ids in self._text_index.items():
                video_ids.discard(video_id)
                if not video_ids:  # If set is empty, mark word for removal
                    words_to_remove.append(word)
            
            # Remove empty word entries
            for word in words_to_remove:
                del self._text_index[word]
                
        except Exception as e:
            logger.error(f"Error clearing text index for {video_id}: {str(e)}")
    
    def store_video_index(self, index_entry: VideoIndexEntry) -> bool:
        """
        Store a video index entry.
        
        Args:
            index_entry: VideoIndexEntry to store
            
        Returns:
            True if successfully stored
        """
        try:
            with self._lock:
                self._update_access_stats()
                
                video_id = index_entry.video_id
                
                # Store the entry
                self._data[video_id] = index_entry
                
                # Update text search index
                self._build_text_index(video_id, index_entry)
                
                logger.debug(f"Stored index entry for video: {video_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error storing video index for {index_entry.video_id}: {str(e)}")
            return False
    
    def get_video_index(self, video_id: str) -> Optional[VideoIndexEntry]:
        """
        Retrieve a video index entry by ID.
        
        Args:
            video_id: Video ID to retrieve
            
        Returns:
            VideoIndexEntry if found, None otherwise
        """
        try:
            with self._lock:
                self._update_access_stats()
                return self._data.get(video_id)
                
        except Exception as e:
            logger.error(f"Error retrieving video index for {video_id}: {str(e)}")
            return None
    
    def delete_video_index(self, video_id: str) -> bool:
        """
        Delete a video index entry.
        
        Args:
            video_id: Video ID to delete
            
        Returns:
            True if successfully deleted
        """
        try:
            with self._lock:
                self._update_access_stats()
                
                if video_id in self._data:
                    # Clear text index
                    self._clear_text_index(video_id)
                    
                    # Remove from main data
                    del self._data[video_id]
                    
                    logger.debug(f"Deleted index entry for video: {video_id}")
                    return True
                
                return False
                
        except Exception as e:
            logger.error(f"Error deleting video index for {video_id}: {str(e)}")
            return False
    
    def get_all_video_ids(self) -> List[str]:
        """
        Get all video IDs in the index.
        
        Returns:
            List of video IDs
        """
        try:
            with self._lock:
                self._update_access_stats()
                return list(self._data.keys())
                
        except Exception as e:
            logger.error(f"Error getting all video IDs: {str(e)}")
            return []
    
    def search_videos(self, query: str, limit: int = 10) -> List[SearchResult]:
        """
        Search for videos based on text query.
        
        Args:
            query: Search query string
            limit: Maximum number of results
            
        Returns:
            List of SearchResult objects
        """
        try:
            with self._lock:
                self._update_access_stats()
                
                if not query or not query.strip():
                    return []
                
                # Simple text search implementation
                query_words = set()
                for word in query.lower().split():
                    clean_word = ''.join(c for c in word if c.isalnum()).strip()
                    if len(clean_word) >= 2:
                        query_words.add(clean_word)
                
                if not query_words:
                    return []
                
                # Find videos that contain query words
                video_scores = defaultdict(float)
                
                for word in query_words:
                    if word in self._text_index:
                        for video_id in self._text_index[word]:
                            video_scores[video_id] += 1.0 / len(query_words)
                
                # Sort by relevance score
                sorted_videos = sorted(
                    video_scores.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:limit]
                
                # Create SearchResult objects
                results = []
                for video_id, score in sorted_videos:
                    if video_id in self._data:
                        entry = self._data[video_id]
                        
                        # Create snippet (first 200 chars of combined text)
                        all_text = entry.get_all_text()
                        snippet = all_text[:200] + "..." if len(all_text) > 200 else all_text
                        
                        result = SearchResult(
                            video_id=video_id,
                            title=entry.title,
                            description=entry.description,
                            relevance_score=score,
                            matched_content=entry.searchable_content,
                            snippet=snippet,
                            tags=entry.tags,
                            created_at=entry.created_at,
                            owner=entry.owner
                        )
                        results.append(result)
                
                logger.debug(f"Search for '{query}' returned {len(results)} results")
                return results
                
        except Exception as e:
            logger.error(f"Error searching videos for query '{query}': {str(e)}")
            return []
    
    def get_videos_by_status(self, status: str) -> List[VideoIndexEntry]:
        """
        Get videos by indexing status.
        
        Args:
            status: Status to filter by
            
        Returns:
            List of VideoIndexEntry objects
        """
        try:
            with self._lock:
                self._update_access_stats()
                
                # Convert string to IndexStatus enum
                try:
                    status_enum = IndexStatus(status)
                except ValueError:
                    logger.warning(f"Invalid status: {status}")
                    return []
                
                results = []
                for entry in self._data.values():
                    if entry.status == status_enum:
                        results.append(entry)
                
                return results
                
        except Exception as e:
            logger.error(f"Error getting videos by status '{status}': {str(e)}")
            return []
    
    def get_total_indexed_count(self) -> int:
        """
        Get total number of indexed videos.
        
        Returns:
            Count of indexed videos
        """
        try:
            with self._lock:
                self._update_access_stats()
                
                count = 0
                for entry in self._data.values():
                    if entry.status == IndexStatus.INDEXED:
                        count += 1
                
                return count
                
        except Exception as e:
            logger.error(f"Error getting total indexed count: {str(e)}")
            return 0
    
    def cleanup_old_entries(self, cutoff_date: datetime) -> int:
        """
        Clean up entries older than cutoff date.
        
        Args:
            cutoff_date: Date cutoff for cleanup
            
        Returns:
            Number of entries cleaned up
        """
        try:
            with self._lock:
                self._update_access_stats()
                
                videos_to_remove = []
                
                for video_id, entry in self._data.items():
                    # Check if entry is old (based on updated_at or indexed_at)
                    last_update = entry.indexed_at or entry.updated_at
                    if last_update and last_update < cutoff_date:
                        videos_to_remove.append(video_id)
                
                # Remove old entries
                for video_id in videos_to_remove:
                    self.delete_video_index(video_id)
                
                logger.info(f"Cleaned up {len(videos_to_remove)} old index entries")
                return len(videos_to_remove)
                
        except Exception as e:
            logger.error(f"Error cleaning up old entries: {str(e)}")
            return 0
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """
        Get storage statistics.
        
        Returns:
            Dictionary with storage statistics
        """
        try:
            with self._lock:
                self._update_access_stats()
                
                # Count by status
                status_counts = defaultdict(int)
                total_content_items = 0
                total_word_count = 0
                
                for entry in self._data.values():
                    status_counts[entry.status.value] += 1
                    total_content_items += len(entry.searchable_content)
                    total_word_count += entry.get_total_word_count()
                
                return {
                    "storage_type": "memory",
                    "total_entries": len(self._data),
                    "status_breakdown": dict(status_counts),
                    "total_content_items": total_content_items,
                    "total_word_count": total_word_count,
                    "text_index_size": len(self._text_index),
                    "access_statistics": {
                        "total_accesses": self._access_count,
                        "last_access": self._last_access.isoformat() if self._last_access else None,
                        "created_at": self._created_at.isoformat()
                    },
                    "memory_usage": {
                        "estimated_size_mb": self._estimate_memory_usage() / (1024 * 1024)
                    }
                }
                
        except Exception as e:
            logger.error(f"Error getting storage stats: {str(e)}")
            return {"error": str(e)}
    
    def _estimate_memory_usage(self) -> int:
        """
        Estimate memory usage in bytes (rough approximation).
        
        Returns:
            Estimated memory usage in bytes
        """
        try:
            import sys
            
            total_size = 0
            
            # Size of main data dictionary
            total_size += sys.getsizeof(self._data)
            
            # Size of entries
            for entry in self._data.values():
                total_size += sys.getsizeof(entry)
                total_size += sys.getsizeof(entry.title) if entry.title else 0
                total_size += sys.getsizeof(entry.description) if entry.description else 0
                
                # Size of searchable content
                for content in entry.searchable_content:
                    total_size += sys.getsizeof(content)
                    total_size += sys.getsizeof(content.text) if content.text else 0
            
            # Size of text index
            total_size += sys.getsizeof(self._text_index)
            for word, video_ids in self._text_index.items():
                total_size += sys.getsizeof(word)
                total_size += sys.getsizeof(video_ids)
            
            return total_size
            
        except Exception as e:
            logger.error(f"Error estimating memory usage: {str(e)}")
            return 0
    
    def clear_all(self) -> bool:
        """
        Clear all stored data.
        
        Returns:
            True if successfully cleared
        """
        try:
            with self._lock:
                self._update_access_stats()
                
                entry_count = len(self._data)
                
                # Clear all data
                self._data.clear()
                self._text_index.clear()
                
                logger.info(f"Cleared all data ({entry_count} entries)")
                return True
                
        except Exception as e:
            logger.error(f"Error clearing all data: {str(e)}")
            return False
    
    def get_videos_by_content_type(self, content_type: ContentType) -> List[VideoIndexEntry]:
        """
        Get videos that have specific content type.
        
        Args:
            content_type: Content type to filter by
            
        Returns:
            List of VideoIndexEntry objects
        """
        try:
            with self._lock:
                self._update_access_stats()
                
                results = []
                for entry in self._data.values():
                    if entry.get_content_by_type(content_type) is not None:
                        results.append(entry)
                
                return results
                
        except Exception as e:
            logger.error(f"Error getting videos by content type {content_type}: {str(e)}")
            return []
    
    def get_recently_indexed(self, hours: int = 24) -> List[VideoIndexEntry]:
        """
        Get videos indexed within the last N hours.
        
        Args:
            hours: Number of hours to look back
            
        Returns:
            List of recently indexed VideoIndexEntry objects
        """
        try:
            with self._lock:
                self._update_access_stats()
                
                cutoff_time = datetime.utcnow() - timedelta(hours=hours)
                results = []
                
                for entry in self._data.values():
                    if (entry.indexed_at and entry.indexed_at > cutoff_time and 
                        entry.status == IndexStatus.INDEXED):
                        results.append(entry)
                
                # Sort by indexed_at (most recent first)
                results.sort(key=lambda x: x.indexed_at, reverse=True)
                
                return results
                
        except Exception as e:
            logger.error(f"Error getting recently indexed videos: {str(e)}")
            return []