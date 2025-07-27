"""
Abstract base class for index storage implementations.
Defines the interface for storing and retrieving video index data.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime
from src.models.video_models import VideoIndexEntry, SearchResult


class IndexStore(ABC):
    """
    Abstract base class for index storage implementations.
    
    Defines the interface that all storage backends must implement
    for storing and retrieving video index data.
    """
    
    @abstractmethod
    def store_video_index(self, index_entry: VideoIndexEntry) -> bool:
        """
        Store a video index entry.
        
        Args:
            index_entry: VideoIndexEntry to store
            
        Returns:
            True if successfully stored
        """
        pass
    
    @abstractmethod
    def get_video_index(self, video_id: str) -> Optional[VideoIndexEntry]:
        """
        Retrieve a video index entry by ID.
        
        Args:
            video_id: Video ID to retrieve
            
        Returns:
            VideoIndexEntry if found, None otherwise
        """
        pass
    
    @abstractmethod
    def delete_video_index(self, video_id: str) -> bool:
        """
        Delete a video index entry.
        
        Args:
            video_id: Video ID to delete
            
        Returns:
            True if successfully deleted
        """
        pass
    
    @abstractmethod
    def get_all_video_ids(self) -> List[str]:
        """
        Get all video IDs in the index.
        
        Returns:
            List of video IDs
        """
        pass
    
    @abstractmethod
    def search_videos(self, query: str, limit: int = 10) -> List[SearchResult]:
        """
        Search for videos based on text query.
        
        Args:
            query: Search query string
            limit: Maximum number of results
            
        Returns:
            List of SearchResult objects
        """
        pass
    
    @abstractmethod
    def get_videos_by_status(self, status: str) -> List[VideoIndexEntry]:
        """
        Get videos by indexing status.
        
        Args:
            status: Status to filter by
            
        Returns:
            List of VideoIndexEntry objects
        """
        pass
    
    @abstractmethod
    def get_total_indexed_count(self) -> int:
        """
        Get total number of indexed videos.
        
        Returns:
            Count of indexed videos
        """
        pass
    
    @abstractmethod
    def cleanup_old_entries(self, cutoff_date: datetime) -> int:
        """
        Clean up entries older than cutoff date.
        
        Args:
            cutoff_date: Date cutoff for cleanup
            
        Returns:
            Number of entries cleaned up
        """
        pass
    
    @abstractmethod
    def get_storage_stats(self) -> Dict[str, Any]:
        """
        Get storage statistics.
        
        Returns:
            Dictionary with storage statistics
        """
        pass
    
    @abstractmethod
    def clear_all(self) -> bool:
        """
        Clear all stored data.
        
        Returns:
            True if successfully cleared
        """
        pass