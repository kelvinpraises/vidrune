"""
Unit tests for IndexManager class.
Tests indexing queue operations and synchronization.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os
from datetime import datetime
import threading
import time

# Add the server directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.indexing.index_manager import IndexManager, IndexingStats
from src.utils.ic_client import ICClient, VideoMetadata
from src.storage.memory_store import MemoryStore
from src.processing.spacy_processor import SpacyProcessor
from src.models.video_models import VideoIndexEntry, IndexStatus


class TestIndexManager:
    """Test suite for IndexManager class."""
    
    @pytest.fixture
    def mock_ic_client(self):
        """Create mock IC client."""
        client = Mock(spec=ICClient)
        
        # Mock video metadata
        video1 = VideoMetadata(
            video_id="video1",
            title="Test Video 1",
            description="Test description",
            created_at=datetime(2023, 1, 1),
            updated_at=datetime(2023, 1, 1),
            owner="user1",
            tags=["test"]
        )
        
        client.get_video_registry.return_value = [video1]
        client.get_video_manifest.return_value = Mock(
            video_id="video1",
            scenes=[],
            captions_vtt=None,
            audio_transcript=None,
            tts_transcript=None,
            metadata={}
        )
        
        return client
    
    @pytest.fixture
    def mock_index_store(self):
        """Create mock index store."""
        store = Mock(spec=MemoryStore)
        store.get_video_index.return_value = None
        store.store_video_index.return_value = True
        store.delete_video_index.return_value = True
        store.get_total_indexed_count.return_value = 0
        return store
    
    @pytest.fixture
    def mock_spacy_processor(self):
        """Create mock spaCy processor."""
        processor = Mock(spec=SpacyProcessor)
        return processor
    
    @pytest.fixture
    def index_manager(self, mock_ic_client, mock_index_store, mock_spacy_processor):
        """Create IndexManager instance with mocks."""
        return IndexManager(mock_ic_client, mock_index_store, mock_spacy_processor)
    
    def test_index_manager_initialization(self, index_manager):
        """Test IndexManager initialization."""
        assert index_manager.ic_client is not None
        assert index_manager.index_store is not None
        assert index_manager.spacy_processor is not None
        assert not index_manager.is_processing
        assert isinstance(index_manager.stats, IndexingStats)
    
    def test_sync_video_registry(self, index_manager, mock_ic_client):
        """Test video registry synchronization."""
        registry = index_manager.sync_video_registry()
        
        assert isinstance(registry, list)
        mock_ic_client.get_video_registry.assert_called_once()
        assert index_manager.stats.total_videos > 0
    
    def test_queue_video_for_indexing(self, index_manager):
        """Test queuing video for indexing."""
        success = index_manager.queue_video_for_indexing("video1", priority=5)
        
        assert success is True
        assert index_manager.indexing_queue.qsize() > 0
    
    def test_force_reindex_video(self, index_manager, mock_index_store):
        """Test forcing video reindexing."""
        success = index_manager.force_reindex_video("video1")
        
        assert success is True
        mock_index_store.delete_video_index.assert_called_with("video1")
    
    def test_get_indexing_status(self, index_manager):
        """Test getting indexing status."""
        status = index_manager.get_indexing_status()
        
        assert isinstance(status, dict)
        assert 'is_processing' in status
        assert 'queue_size' in status
        assert 'statistics' in status
    
    def test_get_queue_status(self, index_manager):
        """Test getting queue status."""
        # Add item to queue
        index_manager.queue_video_for_indexing("video1")
        
        queue_status = index_manager.get_queue_status()
        
        assert isinstance(queue_status, list)
    
    def test_get_video_index_status(self, index_manager):
        """Test getting video index status."""
        status = index_manager.get_video_index_status("video1")
        
        assert isinstance(status, dict)
        assert 'video_id' in status
        assert 'status' in status
    
    def test_cleanup_old_entries(self, index_manager, mock_index_store):
        """Test cleaning up old entries."""
        mock_index_store.cleanup_old_entries.return_value = 5
        
        cleaned = index_manager.cleanup_old_entries(days=30)
        
        assert cleaned == 5
        mock_index_store.cleanup_old_entries.assert_called_once()
    
    def test_get_indexing_metrics(self, index_manager, mock_index_store):
        """Test getting indexing metrics."""
        mock_index_store.get_total_indexed_count.return_value = 10
        
        metrics = index_manager.get_indexing_metrics()
        
        assert isinstance(metrics, dict)
        assert 'queue_metrics' in metrics
        assert 'processing_metrics' in metrics
    
    def test_background_processing_start_stop(self, index_manager):
        """Test starting and stopping background processing."""
        # Start processing
        index_manager.start_background_processing()
        assert index_manager.is_processing is True
        
        # Stop processing
        index_manager.stop_background_processing()
        assert index_manager.is_processing is False
    
    def test_status_callbacks(self, index_manager):
        """Test status change callbacks."""
        callback_called = []
        
        def test_callback(video_id, status, message=None):
            callback_called.append((video_id, status, message))
        
        index_manager.add_status_callback(test_callback)
        index_manager._notify_status_change("video1", IndexStatus.QUEUED)
        
        assert len(callback_called) == 1
        assert callback_called[0][0] == "video1"
        assert callback_called[0][1] == IndexStatus.QUEUED


class TestIndexingStats:
    """Test IndexingStats dataclass."""
    
    def test_indexing_stats_creation(self):
        """Test IndexingStats creation."""
        stats = IndexingStats(
            total_videos=100,
            indexed_videos=80,
            queued_videos=10,
            failed_videos=5,
            processing_time=120.5
        )
        
        assert stats.total_videos == 100
        assert stats.indexed_videos == 80
        assert stats.queued_videos == 10
        assert stats.failed_videos == 5
        assert stats.processing_time == 120.5
        assert stats.errors == []  # Default empty list


if __name__ == "__main__":
    pytest.main([__file__])