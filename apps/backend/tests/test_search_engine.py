"""
Unit tests for SearchEngine class.
Tests search functionality, ranking, and advanced features.
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch, MagicMock
import sys
import os
from datetime import datetime

# Add the server directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.search.search_engine import SearchEngine, SearchQuery, SearchMetrics
from src.processing.spacy_processor import SpacyProcessor, ProcessedDocument
from src.storage.memory_store import MemoryStore
from src.models.video_models import VideoIndexEntry, SearchResult, ContentType, IndexStatus


class TestSearchEngine:
    """Test suite for SearchEngine class."""
    
    @pytest.fixture
    def mock_spacy_processor(self):
        """Create mock spaCy processor."""
        processor = Mock(spec=SpacyProcessor)
        
        # Mock processed document
        mock_doc = ProcessedDocument(
            text="test query",
            tokens=["test", "query"],
            lemmas=["test", "query"],
            pos_tags=["NOUN", "NOUN"],
            entities=[],
            sentences=["test query"],
            vector=np.array([1, 0, 0]),
            word_vectors={"test": np.array([1, 0, 0]), "query": np.array([0, 1, 0])}
        )
        
        processor.process_document.return_value = mock_doc
        processor.find_similar_words.return_value = []
        
        return processor
    
    @pytest.fixture
    def mock_index_store(self):
        """Create mock index store with sample data."""
        store = Mock(spec=MemoryStore)
        
        # Sample video entries
        video1 = VideoIndexEntry(
            video_id="video1",
            title="Test Video 1",
            description="A test video about cats",
            owner="user1",
            created_at=datetime(2023, 1, 1),
            updated_at=datetime(2023, 1, 1),
            status=IndexStatus.INDEXED,
            tags=["test", "cats"]
        )
        
        video2 = VideoIndexEntry(
            video_id="video2", 
            title="Another Video",
            description="A video about dogs",
            owner="user2",
            created_at=datetime(2023, 1, 2),
            updated_at=datetime(2023, 1, 2),
            status=IndexStatus.INDEXED,
            tags=["dogs", "pets"]
        )
        
        store.get_videos_by_status.return_value = [video1, video2]
        store.get_total_indexed_count.return_value = 2
        
        return store
    
    @pytest.fixture
    def search_engine(self, mock_spacy_processor, mock_index_store):
        """Create SearchEngine instance with mocks."""
        return SearchEngine(mock_spacy_processor, mock_index_store)
    
    def test_search_engine_initialization(self, search_engine):
        """Test SearchEngine initialization."""
        assert search_engine.spacy_processor is not None
        assert search_engine.index_store is not None
        assert search_engine.search_count == 0
        assert search_engine.total_search_time == 0.0
    
    def test_basic_search(self, search_engine, mock_spacy_processor, mock_index_store):
        """Test basic search functionality."""
        query = SearchQuery(text="test query", limit=10)
        
        results, metrics = search_engine.search(query)
        
        assert isinstance(results, list)
        assert isinstance(metrics, SearchMetrics)
        assert mock_spacy_processor.process_document.called
        assert mock_index_store.get_videos_by_status.called
    
    def test_search_with_empty_query(self, search_engine):
        """Test search with empty query."""
        query = SearchQuery(text="", limit=10)
        
        results, metrics = search_engine.search(query)
        
        assert len(results) == 0
        assert metrics.final_results == 0    

    def test_search_with_filters(self, search_engine):
        """Test search with content type filters."""
        query = SearchQuery(
            text="test query",
            limit=10,
            content_types=[ContentType.CAPTIONS_VTT],
            tags=["test"]
        )
        
        results, metrics = search_engine.search(query)
        
        assert isinstance(results, list)
        assert isinstance(metrics, SearchMetrics)
    
    def test_find_similar_words(self, search_engine, mock_spacy_processor):
        """Test similar word finding."""
        mock_spacy_processor.find_similar_words.return_value = [
            Mock(word="cat", similarity=0.8, pos="NOUN", lemma="cat"),
            Mock(word="kitten", similarity=0.7, pos="NOUN", lemma="kitten")
        ]
        
        results = search_engine.find_similar_words("feline", limit=5)
        
        assert len(results) == 2
        mock_spacy_processor.find_similar_words.assert_called_once()
    
    def test_search_suggestions(self, search_engine, mock_index_store):
        """Test search suggestions."""
        # Mock video entries with text content
        video = VideoIndexEntry(
            video_id="video1",
            title="Test Video",
            description="Testing suggestions",
            owner="user1",
            created_at=datetime(2023, 1, 1),
            updated_at=datetime(2023, 1, 1),
            status=IndexStatus.INDEXED
        )
        
        mock_index_store.get_videos_by_status.return_value = [video]
        
        suggestions = search_engine.get_search_suggestions("test", limit=5)
        
        assert isinstance(suggestions, list)
    
    def test_search_statistics(self, search_engine):
        """Test search statistics retrieval."""
        # Perform a search to generate stats
        query = SearchQuery(text="test", limit=5)
        search_engine.search(query)
        
        stats = search_engine.get_search_statistics()
        
        assert isinstance(stats, dict)
        assert 'total_searches' in stats
        assert stats['total_searches'] > 0
    
    def test_cache_functionality(self, search_engine):
        """Test search result caching."""
        query = SearchQuery(text="cached query", limit=5)
        
        # First search
        results1, metrics1 = search_engine.search(query)
        
        # Second search (should use cache)
        results2, metrics2 = search_engine.search(query)
        
        # Results should be the same
        assert len(results1) == len(results2)
    
    def test_clear_cache(self, search_engine):
        """Test cache clearing."""
        # Perform search to populate cache
        query = SearchQuery(text="test", limit=5)
        search_engine.search(query)
        
        # Clear cache
        search_engine.clear_cache()
        
        # Should not raise exception
        assert True


class TestSearchQuery:
    """Test SearchQuery dataclass."""
    
    def test_search_query_creation(self):
        """Test SearchQuery creation with defaults."""
        query = SearchQuery(text="test query")
        
        assert query.text == "test query"
        assert query.limit == 10
        assert query.threshold == 0.5
        assert query.content_types is None
        assert query.tags is None
        assert query.boost_recent is False
    
    def test_search_query_with_filters(self):
        """Test SearchQuery with all filters."""
        query = SearchQuery(
            text="test",
            limit=20,
            threshold=0.7,
            content_types=[ContentType.CAPTIONS_VTT],
            tags=["test", "video"],
            boost_recent=True
        )
        
        assert query.text == "test"
        assert query.limit == 20
        assert query.threshold == 0.7
        assert ContentType.CAPTIONS_VTT in query.content_types
        assert "test" in query.tags
        assert query.boost_recent is True


class TestSearchMetrics:
    """Test SearchMetrics dataclass."""
    
    def test_search_metrics_creation(self):
        """Test SearchMetrics creation."""
        metrics = SearchMetrics(
            query_time=0.5,
            total_candidates=100,
            filtered_candidates=50,
            final_results=10,
            processing_time=0.3,
            similarity_calculations=50
        )
        
        assert metrics.query_time == 0.5
        assert metrics.total_candidates == 100
        assert metrics.filtered_candidates == 50
        assert metrics.final_results == 10
        assert metrics.processing_time == 0.3
        assert metrics.similarity_calculations == 50


if __name__ == "__main__":
    pytest.main([__file__])