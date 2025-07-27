"""
Integration tests for the complete spaCy NLP server.
Tests end-to-end workflows and API endpoints.
"""

import pytest
import json
import sys
import os
from unittest.mock import Mock, patch
from datetime import datetime

# Add the server directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.index import app
from src.models.video_models import VideoIndexEntry, IndexStatus, ContentType


class TestAPIIntegration:
    """Integration tests for API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client
    
    @pytest.fixture
    def mock_components(self):
        """Mock all components for testing."""
        with patch('api.index.spacy_processor') as mock_spacy, \
             patch('api.index.search_engine') as mock_search, \
             patch('api.index.index_manager') as mock_index, \
             patch('api.index.ic_client') as mock_ic, \
             patch('api.index.index_store') as mock_store:
            
            # Configure mocks
            mock_spacy.is_model_loaded.return_value = True
            mock_spacy.get_model_info.return_value = {"loaded": True}
            mock_spacy.process_document.return_value = Mock(
                text="test", tokens=["test"], lemmas=["test"],
                pos_tags=["NOUN"], entities=[], sentences=["test"],
                vector=None, word_vectors={}
            )
            
            mock_search.search.return_value = ([], Mock(
                query_time=0.1, total_candidates=0, filtered_candidates=0,
                final_results=0, processing_time=0.1, similarity_calculations=0
            ))
            mock_search.get_search_statistics.return_value = {
                "total_searches": 0, "cache_hits": 0
            }
            
            mock_index.get_indexing_status.return_value = {
                "is_processing": False, "queue_size": 0,
                "statistics": {"total_videos": 0}
            }
            
            yield {
                'spacy': mock_spacy,
                'search': mock_search,
                'index': mock_index,
                'ic': mock_ic,
                'store': mock_store
            }
    
    def test_health_endpoint(self, client, mock_components):
        """Test health check endpoint."""
        response = client.get('/api/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'status' in data
        assert 'components' in data
    
    def test_search_endpoint_success(self, client, mock_components):
        """Test successful search request."""
        search_data = {
            "query": "test search",
            "limit": 10
        }
        
        response = client.post('/api/search', 
                             data=json.dumps(search_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'query' in data
        assert 'results' in data
        assert 'metrics' in data
    
    def test_search_endpoint_missing_query(self, client, mock_components):
        """Test search request with missing query."""
        response = client.post('/api/search',
                             data=json.dumps({}),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_similar_words_endpoint(self, client, mock_components):
        """Test similar words endpoint."""
        mock_components['spacy'].find_similar_words.return_value = [
            Mock(word="test", similarity=0.8, pos="NOUN", lemma="test")
        ]
        
        word_data = {"keyword": "test"}
        
        response = client.post('/api/similar-words',
                             data=json.dumps(word_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'keyword' in data
        assert 'similar_words' in data
    
    def test_process_text_endpoint(self, client, mock_components):
        """Test text processing endpoint."""
        text_data = {"text": "This is a test document."}
        
        response = client.post('/api/process',
                             data=json.dumps(text_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'text' in data
        assert 'processed' in data
        assert data['processed'] is True
    
    def test_index_status_endpoint(self, client, mock_components):
        """Test index status endpoint."""
        mock_components['store'].get_storage_stats.return_value = {
            "total_entries": 0
        }
        
        response = client.get('/api/index/status')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'indexing' in data
        assert 'storage' in data
    
    def test_reindex_video_endpoint(self, client, mock_components):
        """Test video reindexing endpoint."""
        mock_components['index'].force_reindex_video.return_value = True
        
        response = client.post('/api/index/video/test-video-123')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'video_id' in data
        assert data['reindexed'] is True
    
    def test_queue_status_endpoint(self, client, mock_components):
        """Test queue status endpoint."""
        mock_components['index'].get_queue_status.return_value = []
        
        response = client.get('/api/index/queue')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'queue' in data
        assert 'processing' in data
    
    def test_registry_sync_endpoint(self, client, mock_components):
        """Test registry synchronization endpoint."""
        mock_components['index'].sync_video_registry.return_value = []
        
        response = client.post('/api/index/sync',
                             data=json.dumps({"force": True}),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'synced' in data
        assert data['synced'] is True
    
    def test_metrics_endpoint(self, client, mock_components):
        """Test metrics endpoint."""
        response = client.get('/api/metrics')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, dict)
    
    def test_system_status_endpoint(self, client, mock_components):
        """Test system status endpoint."""
        mock_components['ic'].health_check.return_value = {"healthy": True}
        mock_components['store'].get_storage_stats.return_value = {"total_entries": 0}
        
        response = client.get('/api/status')
        
        assert response.status_code in [200, 503]  # May be unhealthy in test
        data = json.loads(response.data)
        assert 'overall_healthy' in data
        assert 'components' in data
    
    def test_advanced_search_endpoint(self, client, mock_components):
        """Test advanced search endpoint."""
        mock_components['search'].search_with_pagination.return_value = {
            'results': [],
            'pagination': {
                'current_page': 1,
                'total_pages': 0,
                'total_results': 0,
                'has_next': False,
                'has_previous': False
            }
        }
        
        search_data = {
            "query": "advanced test",
            "page": 1,
            "page_size": 10,
            "content_types": ["captions.vtt"],
            "boost_recent": True
        }
        
        response = client.post('/api/search/advanced',
                             data=json.dumps(search_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'results' in data
        assert 'pagination' in data
    
    def test_search_suggestions_endpoint(self, client, mock_components):
        """Test search suggestions endpoint."""
        mock_components['search'].get_search_suggestions.return_value = ["test", "testing"]
        
        response = client.get('/api/search/suggestions?q=test&limit=5')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'suggestions' in data
        assert isinstance(data['suggestions'], list)
    
    def test_404_error_handling(self, client):
        """Test 404 error handling."""
        response = client.get('/api/nonexistent')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data


class TestEndToEndWorkflow:
    """End-to-end workflow tests."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client
    
    @pytest.mark.integration
    def test_complete_search_workflow(self, client):
        """Test complete search workflow from indexing to search."""
        with patch('api.index.spacy_processor') as mock_spacy, \
             patch('api.index.search_engine') as mock_search, \
             patch('api.index.index_manager') as mock_index:
            
            # Mock successful components
            mock_spacy.is_model_loaded.return_value = True
            mock_spacy.process_document.return_value = Mock(
                text="test document", tokens=["test", "document"],
                lemmas=["test", "document"], pos_tags=["NOUN", "NOUN"],
                entities=[], sentences=["test document"],
                vector=None, word_vectors={}
            )
            
            # Mock search results
            mock_search.search.return_value = ([
                Mock(
                    video_id="video1",
                    title="Test Video",
                    description="A test video",
                    relevance_score=0.8,
                    snippet="Test snippet",
                    tags=["test"],
                    created_at=datetime(2023, 1, 1),
                    owner="user1",
                    matched_content=[]
                )
            ], Mock(
                query_time=0.1, total_candidates=1, filtered_candidates=1,
                final_results=1, processing_time=0.1, similarity_calculations=1
            ))
            
            mock_index.get_indexing_status.return_value = {
                "is_processing": False,
                "queue_size": 0,
                "statistics": {"total_videos": 1, "indexed_videos": 1}
            }
            
            # Step 1: Check system health
            health_response = client.get('/api/health')
            assert health_response.status_code == 200
            
            # Step 2: Process some text
            process_response = client.post('/api/process',
                                         data=json.dumps({"text": "test document"}),
                                         content_type='application/json')
            assert process_response.status_code == 200
            
            # Step 3: Perform search
            search_response = client.post('/api/search',
                                        data=json.dumps({"query": "test"}),
                                        content_type='application/json')
            assert search_response.status_code == 200
            
            search_data = json.loads(search_response.data)
            assert len(search_data['results']) == 1
            assert search_data['results'][0]['video_id'] == "video1"
            
            # Step 4: Check indexing status
            status_response = client.get('/api/index/status')
            assert status_response.status_code == 200
    
    @pytest.mark.integration
    def test_error_handling_workflow(self, client):
        """Test error handling across different endpoints."""
        # Test various error scenarios
        
        # 1. Missing required parameters
        response = client.post('/api/search', data=json.dumps({}),
                             content_type='application/json')
        assert response.status_code == 400
        
        # 2. Empty query
        response = client.post('/api/search',
                             data=json.dumps({"query": ""}),
                             content_type='application/json')
        assert response.status_code == 400
        
        # 3. Invalid content type filter
        response = client.post('/api/search/advanced',
                             data=json.dumps({
                                 "query": "test",
                                 "content_types": ["invalid_type"]
                             }),
                             content_type='application/json')
        assert response.status_code == 400


class TestPerformanceIntegration:
    """Performance-related integration tests."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client
    
    def test_performance_endpoints(self, client):
        """Test performance monitoring endpoints."""
        with patch('api.index.performance_optimizer') as mock_optimizer:
            mock_optimizer.optimize_system.return_value = {
                "optimization_run": 1,
                "memory_optimization": {"freed_mb": 10}
            }
            mock_optimizer.get_performance_summary.return_value = {
                "memory_stats": {"rss_mb": 100},
                "cache_statistics": {}
            }
            
            # Test optimization endpoint
            response = client.post('/api/performance/optimize')
            assert response.status_code == 200
            
            # Test performance summary
            response = client.get('/api/performance/summary')
            assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])