"""
Main Flask application for spaCy NLP server.
Provides RESTful API endpoints for text processing and semantic search.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from datetime import datetime
import traceback

# Import custom modules
from src.processing.spacy_processor import SpacyProcessor
from src.search.search_engine import SearchEngine, SearchQuery
from src.indexing.index_manager import IndexManager
from src.storage.memory_store import MemoryStore
from src.utils.ic_client import ICClient
from src.models.video_models import ContentType
from src.utils.config import Config
from src.utils.error_handler import (
    handle_error, ApplicationError, ErrorCode, 
    SpacyProcessorError, SearchEngineError, IndexManagerError, ICClientError
)
from src.utils.performance import performance_optimizer, optimize_for_vercel

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Track application start time
app_start_time = datetime.utcnow()

# Configure logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global variables for core components
spacy_processor = None
search_engine = None
index_manager = None
ic_client = None
index_store = None

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify system status."""
    try:
        # Check all components
        components_status = {}
        overall_healthy = True
        
        # Check spaCy processor
        if spacy_processor:
            spacy_healthy = spacy_processor.is_model_loaded()
            components_status['spacy_processor'] = {
                'healthy': spacy_healthy,
                'model_info': spacy_processor.get_model_info()
            }
            if not spacy_healthy:
                overall_healthy = False
        else:
            components_status['spacy_processor'] = {'healthy': False, 'error': 'Not initialized'}
            overall_healthy = False
        
        # Check search engine
        if search_engine:
            components_status['search_engine'] = {
                'healthy': True,
                'statistics': search_engine.get_search_statistics()
            }
        else:
            components_status['search_engine'] = {'healthy': False, 'error': 'Not initialized'}
            overall_healthy = False
        
        # Check index manager
        if index_manager:
            indexing_status = index_manager.get_indexing_status()
            components_status['index_manager'] = {
                'healthy': True,
                'is_processing': indexing_status['is_processing'],
                'queue_size': indexing_status['queue_size'],
                'statistics': indexing_status['statistics']
            }
        else:
            components_status['index_manager'] = {'healthy': False, 'error': 'Not initialized'}
            overall_healthy = False
        
        # Check IC client
        if ic_client:
            try:
                ic_health = ic_client.health_check()
                components_status['ic_client'] = ic_health
                if not ic_health['healthy']:
                    overall_healthy = False
            except Exception as e:
                components_status['ic_client'] = {'healthy': False, 'error': str(e)}
                overall_healthy = False
        else:
            components_status['ic_client'] = {'healthy': False, 'error': 'Not initialized'}
            overall_healthy = False
        
        # Check index store
        if index_store:
            try:
                storage_stats = index_store.get_storage_stats()
                components_status['index_store'] = {
                    'healthy': True,
                    'statistics': storage_stats
                }
            except Exception as e:
                components_status['index_store'] = {'healthy': False, 'error': str(e)}
                overall_healthy = False
        else:
            components_status['index_store'] = {'healthy': False, 'error': 'Not initialized'}
            overall_healthy = False
        
        status = {
            'status': 'healthy' if overall_healthy else 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0',
            'environment': Config.ENVIRONMENT,
            'components': components_status
        }
        return jsonify(status), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/api/search', methods=['POST'])
def search():
    """Search endpoint for semantic text search."""
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'Query parameter is required'}), 400
        
        query_text = data.get('query', '').strip()
        if not query_text:
            return jsonify({'error': 'Query cannot be empty'}), 400
        
        if not search_engine:
            return jsonify({'error': 'Search engine not initialized'}), 500
        
        # Parse search parameters
        limit = min(data.get('limit', Config.DEFAULT_SEARCH_LIMIT), Config.MAX_SEARCH_LIMIT)
        threshold = data.get('threshold', Config.SIMILARITY_THRESHOLD)
        
        # Parse content types filter
        content_types = None
        if 'content_types' in data:
            try:
                content_types = [ContentType(ct) for ct in data['content_types']]
            except ValueError as e:
                return jsonify({'error': f'Invalid content type: {str(e)}'}), 400
        
        # Parse other filters
        tags = data.get('tags')
        boost_recent = data.get('boost_recent', False)
        
        # Create search query
        search_query = SearchQuery(
            text=query_text,
            limit=limit,
            threshold=threshold,
            content_types=content_types,
            tags=tags,
            boost_recent=boost_recent
        )
        
        # Perform search
        results, metrics = search_engine.search(search_query)
        
        # Format results for API response
        formatted_results = []
        for result in results:
            formatted_results.append({
                'video_id': result.video_id,
                'title': result.title,
                'description': result.description,
                'relevance_score': result.relevance_score,
                'snippet': result.snippet,
                'tags': result.tags,
                'created_at': result.created_at.isoformat() if result.created_at else None,
                'owner': result.owner,
                'matched_content_types': [content.content_type.value for content in result.matched_content]
            })
        
        return jsonify({
            'query': query_text,
            'results': formatted_results,
            'total_results': len(formatted_results),
            'metrics': {
                'query_time': metrics.query_time,
                'total_candidates': metrics.total_candidates,
                'similarity_calculations': metrics.similarity_calculations
            },
            'parameters': {
                'limit': limit,
                'threshold': threshold,
                'content_types': [ct.value for ct in content_types] if content_types else None,
                'tags': tags,
                'boost_recent': boost_recent
            }
        }), 200
        
    except ValueError as e:
        logger.error(f"Search validation error: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/similar-words', methods=['POST'])
def similar_words():
    """Find contextually similar words endpoint."""
    try:
        data = request.get_json()
        if not data or 'keyword' not in data:
            return jsonify({'error': 'Keyword parameter is required'}), 400
        
        keyword = data.get('keyword', '').strip()
        if not keyword:
            return jsonify({'error': 'Keyword cannot be empty'}), 400
        
        if not spacy_processor:
            return jsonify({'error': 'spaCy processor not initialized'}), 500
        
        # Get word list from request or use a default vocabulary sample
        word_list = data.get('word_list', [])
        if not word_list:
            # Use a sample of common words for demonstration
            word_list = [
                'cat', 'dog', 'animal', 'pet', 'house', 'home', 'car', 'vehicle',
                'book', 'read', 'write', 'text', 'word', 'language', 'computer',
                'technology', 'science', 'research', 'study', 'learn', 'teach',
                'school', 'education', 'student', 'teacher', 'work', 'job',
                'business', 'company', 'money', 'buy', 'sell', 'market'
            ]
        
        limit = min(data.get('limit', Config.DEFAULT_SEARCH_LIMIT), Config.MAX_SEARCH_LIMIT)
        threshold = data.get('threshold', Config.SIMILARITY_THRESHOLD)
        
        # Find similar words
        similar_results = spacy_processor.find_similar_words(
            keyword, word_list, limit=limit, threshold=threshold
        )
        
        # Format results
        formatted_results = []
        for result in similar_results:
            formatted_results.append({
                'word': result.word,
                'similarity': result.similarity,
                'pos': result.pos,
                'lemma': result.lemma
            })
        
        return jsonify({
            'keyword': keyword,
            'similar_words': formatted_results,
            'threshold': threshold,
            'total_found': len(formatted_results)
        }), 200
        
    except ValueError as e:
        logger.error(f"Similar words validation error: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Similar words error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search/advanced', methods=['POST'])
def advanced_search():
    """Advanced search endpoint with filters and pagination."""
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'Query parameter is required'}), 400
        
        query_text = data.get('query', '').strip()
        if not query_text:
            return jsonify({'error': 'Query cannot be empty'}), 400
        
        if not search_engine:
            return jsonify({'error': 'Search engine not initialized'}), 500
        
        # Parse pagination parameters
        page = max(1, data.get('page', 1))
        page_size = min(data.get('page_size', 10), 50)  # Max 50 per page
        
        # Parse filters
        filters = {}
        if 'content_types' in data:
            try:
                filters['content_types'] = [ContentType(ct) for ct in data['content_types']]
            except ValueError as e:
                return jsonify({'error': f'Invalid content type: {str(e)}'}), 400
        
        if 'tags' in data:
            filters['tags'] = data['tags']
        
        if 'date_range' in data:
            try:
                date_range = data['date_range']
                start_date = datetime.fromisoformat(date_range['start'])
                end_date = datetime.fromisoformat(date_range['end'])
                filters['date_range'] = (start_date, end_date)
            except (KeyError, ValueError) as e:
                return jsonify({'error': f'Invalid date range: {str(e)}'}), 400
        
        filters['boost_recent'] = data.get('boost_recent', False)
        filters['threshold'] = data.get('threshold', Config.SIMILARITY_THRESHOLD)
        filters['limit'] = page * page_size + 10  # Get extra for pagination
        
        # Perform paginated search
        search_result = search_engine.search_with_pagination(
            query_text, page=page, page_size=page_size, filters=filters
        )
        
        # Format results
        formatted_results = []
        for result in search_result['results']:
            formatted_results.append({
                'video_id': result.video_id,
                'title': result.title,
                'description': result.description,
                'relevance_score': result.relevance_score,
                'snippet': result.snippet,
                'tags': result.tags,
                'created_at': result.created_at.isoformat() if result.created_at else None,
                'owner': result.owner,
                'matched_content_types': [content.content_type.value for content in result.matched_content]
            })
        
        return jsonify({
            'query': query_text,
            'results': formatted_results,
            'pagination': search_result['pagination'],
            'filters': {
                'content_types': [ct.value for ct in filters.get('content_types', [])],
                'tags': filters.get('tags'),
                'date_range': {
                    'start': filters['date_range'][0].isoformat(),
                    'end': filters['date_range'][1].isoformat()
                } if 'date_range' in filters else None,
                'boost_recent': filters.get('boost_recent', False),
                'threshold': filters.get('threshold', Config.SIMILARITY_THRESHOLD)
            }
        }), 200
        
    except ValueError as e:
        logger.error(f"Advanced search validation error: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Advanced search error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search/suggestions', methods=['GET'])
def search_suggestions():
    """Get search suggestions for autocomplete."""
    try:
        partial_query = request.args.get('q', '').strip()
        if not partial_query:
            return jsonify({'suggestions': []}), 200
        
        if not search_engine:
            return jsonify({'error': 'Search engine not initialized'}), 500
        
        limit = min(int(request.args.get('limit', 5)), 20)
        
        suggestions = search_engine.get_search_suggestions(partial_query, limit=limit)
        
        return jsonify({
            'query': partial_query,
            'suggestions': suggestions
        }), 200
        
    except Exception as e:
        logger.error(f"Search suggestions error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/process', methods=['POST'])
def process_text():
    """Process text document endpoint."""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Text parameter is required'}), 400
        
        text = data.get('text', '')
        if not text.strip():
            return jsonify({'error': 'Text cannot be empty'}), 400
        
        if not spacy_processor:
            return jsonify({'error': 'spaCy processor not initialized'}), 500
        
        # Process the text
        processed_doc = spacy_processor.process_document(text)
        
        # Extract keywords
        keywords = spacy_processor.extract_keywords(processed_doc, limit=20)
        
        return jsonify({
            'text': processed_doc.text,
            'tokens': processed_doc.tokens,
            'lemmas': processed_doc.lemmas,
            'pos_tags': processed_doc.pos_tags,
            'entities': processed_doc.entities,
            'sentences': processed_doc.sentences,
            'keywords': [{'word': kw['word'], 'frequency': kw['frequency'], 'score': kw['score']} for kw in keywords],
            'has_vector': processed_doc.vector is not None,
            'word_vector_count': len(processed_doc.word_vectors),
            'processed': True
        }), 200
        
    except ValueError as e:
        logger.error(f"Process text validation error: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Process text error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/index/status', methods=['GET'])
def index_status():
    """Get indexing status and statistics."""
    try:
        if not index_manager:
            return jsonify({'error': 'Index manager not initialized'}), 500
        
        # Get indexing status
        status = index_manager.get_indexing_status()
        
        # Get additional storage stats
        storage_stats = index_store.get_storage_stats() if index_store else {}
        
        return jsonify({
            'indexing': status,
            'storage': storage_stats,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Index status error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/index/video/<video_id>', methods=['POST'])
def reindex_video(video_id):
    """Force reindexing of a specific video."""
    try:
        if not video_id or not video_id.strip():
            return jsonify({'error': 'Video ID is required'}), 400
        
        if not index_manager:
            return jsonify({'error': 'Index manager not initialized'}), 500
        
        # Force reindex the video
        success = index_manager.force_reindex_video(video_id.strip())
        
        if success:
            return jsonify({
                'video_id': video_id,
                'reindexed': True,
                'message': 'Video queued for reindexing',
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        else:
            return jsonify({
                'video_id': video_id,
                'reindexed': False,
                'message': 'Failed to queue video for reindexing'
            }), 500
        
    except Exception as e:
        logger.error(f"Video reindexing error for {video_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/index/queue', methods=['GET'])
def index_queue():
    """Get current indexing queue status."""
    try:
        if not index_manager:
            return jsonify({'error': 'Index manager not initialized'}), 500
        
        # Get queue status
        queue_items = index_manager.get_queue_status()
        indexing_status = index_manager.get_indexing_status()
        
        return jsonify({
            'queue': queue_items,
            'queue_size': len(queue_items),
            'processing': indexing_status['is_processing'],
            'currently_processing': indexing_status['currently_processing'],
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Index queue error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/index/sync', methods=['POST'])
def sync_registry():
    """Manually trigger registry synchronization."""
    try:
        if not index_manager:
            return jsonify({'error': 'Index manager not initialized'}), 500
        
        # Parse request parameters
        data = request.get_json() or {}
        force = data.get('force', False)
        
        # Trigger registry sync
        try:
            registry = index_manager.sync_video_registry(force=force)
            
            return jsonify({
                'synced': True,
                'videos_found': len(registry),
                'force': force,
                'timestamp': datetime.utcnow().isoformat(),
                'message': f'Registry synchronized successfully - found {len(registry)} videos'
            }), 200
            
        except Exception as sync_error:
            logger.error(f"Registry sync failed: {str(sync_error)}")
            return jsonify({
                'synced': False,
                'error': str(sync_error),
                'timestamp': datetime.utcnow().isoformat()
            }), 500
        
    except Exception as e:
        logger.error(f"Registry sync error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/index/video/<video_id>/status', methods=['GET'])
def video_index_status(video_id):
    """Get indexing status for a specific video."""
    try:
        if not video_id or not video_id.strip():
            return jsonify({'error': 'Video ID is required'}), 400
        
        if not index_manager:
            return jsonify({'error': 'Index manager not initialized'}), 500
        
        # Get video status
        status = index_manager.get_video_index_status(video_id.strip())
        
        return jsonify(status), 200
        
    except Exception as e:
        logger.error(f"Video index status error for {video_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/index/metrics', methods=['GET'])
def index_metrics():
    """Get detailed indexing metrics."""
    try:
        if not index_manager:
            return jsonify({'error': 'Index manager not initialized'}), 500
        
        # Get indexing metrics
        metrics = index_manager.get_indexing_metrics()
        
        # Add search engine metrics if available
        if search_engine:
            search_stats = search_engine.get_search_statistics()
            metrics['search_engine'] = search_stats
        
        return jsonify({
            'metrics': metrics,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Index metrics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/index/cleanup', methods=['POST'])
def cleanup_index():
    """Clean up old index entries."""
    try:
        if not index_manager:
            return jsonify({'error': 'Index manager not initialized'}), 500
        
        # Parse request parameters
        data = request.get_json() or {}
        days = data.get('days', 30)  # Default to 30 days
        
        if days <= 0:
            return jsonify({'error': 'Days must be positive'}), 400
        
        # Perform cleanup
        cleaned_count = index_manager.cleanup_old_entries(days=days)
        
        return jsonify({
            'cleaned_entries': cleaned_count,
            'days': days,
            'timestamp': datetime.utcnow().isoformat(),
            'message': f'Cleaned up {cleaned_count} old entries older than {days} days'
        }), 200
        
    except Exception as e:
        logger.error(f"Index cleanup error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/metrics', methods=['GET'])
def metrics():
    """Get performance metrics and usage statistics."""
    try:
        metrics = {
            'timestamp': datetime.utcnow().isoformat(),
            'uptime_seconds': (datetime.utcnow() - app_start_time).total_seconds() if 'app_start_time' in globals() else 0,
            'environment': Config.ENVIRONMENT
        }
        
        # Add spaCy processor statistics
        if spacy_processor:
            metrics['spacy_processor'] = spacy_processor.get_model_statistics()
        
        # Add search engine statistics
        if search_engine:
            metrics['search_engine'] = search_engine.get_search_statistics()
        
        # Add index manager metrics
        if index_manager:
            metrics['index_manager'] = index_manager.get_indexing_metrics()
        
        # Add IC client statistics
        if ic_client:
            try:
                metrics['ic_client'] = ic_client.get_client_statistics()
            except Exception as e:
                metrics['ic_client'] = {'error': str(e)}
        
        # Add storage statistics
        if index_store:
            try:
                metrics['storage'] = index_store.get_storage_stats()
            except Exception as e:
                metrics['storage'] = {'error': str(e)}
        
        # Add system metrics
        try:
            import psutil
            import os
            
            process = psutil.Process(os.getpid())
            metrics['system'] = {
                'memory_usage_mb': process.memory_info().rss / 1024 / 1024,
                'cpu_percent': process.cpu_percent(),
                'threads': process.num_threads(),
                'open_files': len(process.open_files()) if hasattr(process, 'open_files') else 0
            }
        except ImportError:
            metrics['system'] = {'error': 'psutil not available'}
        except Exception as e:
            metrics['system'] = {'error': str(e)}
        
        return jsonify(metrics), 200
        
    except Exception as e:
        logger.error(f"Metrics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/status', methods=['GET'])
def system_status():
    """Comprehensive system status endpoint."""
    try:
        # Get basic system info
        status = {
            'timestamp': datetime.utcnow().isoformat(),
            'uptime_seconds': (datetime.utcnow() - app_start_time).total_seconds(),
            'version': '1.0.0',
            'environment': Config.ENVIRONMENT
        }
        
        # Component health checks
        components = {}
        overall_healthy = True
        
        # Check each component
        component_checks = [
            ('spacy_processor', spacy_processor),
            ('search_engine', search_engine),
            ('index_manager', index_manager),
            ('ic_client', ic_client),
            ('index_store', index_store)
        ]
        
        for name, component in component_checks:
            if component:
                try:
                    if name == 'spacy_processor':
                        healthy = component.is_model_loaded()
                        info = component.get_model_info()
                    elif name == 'search_engine':
                        healthy = True
                        info = component.get_search_statistics()
                    elif name == 'index_manager':
                        healthy = True
                        info = component.get_indexing_status()
                    elif name == 'ic_client':
                        health_check = component.health_check()
                        healthy = health_check['healthy']
                        info = health_check
                    elif name == 'index_store':
                        healthy = True
                        info = component.get_storage_stats()
                    else:
                        healthy = True
                        info = {}
                    
                    components[name] = {
                        'healthy': healthy,
                        'info': info
                    }
                    
                    if not healthy:
                        overall_healthy = False
                        
                except Exception as e:
                    components[name] = {
                        'healthy': False,
                        'error': str(e)
                    }
                    overall_healthy = False
            else:
                components[name] = {
                    'healthy': False,
                    'error': 'Component not initialized'
                }
                overall_healthy = False
        
        status['overall_healthy'] = overall_healthy
        status['components'] = components
        
        # Add configuration summary
        status['configuration'] = Config.get_config_summary()
        
        return jsonify(status), 200 if overall_healthy else 503
        
    except Exception as e:
        logger.error(f"System status error: {str(e)}")
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'overall_healthy': False,
            'error': str(e)
        }), 500

@app.route('/api/performance/optimize', methods=['POST'])
def optimize_performance():
    """Trigger performance optimization."""
    try:
        results = performance_optimizer.optimize_system()
        
        return jsonify({
            'optimization_results': results,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Performance optimization error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/performance/summary', methods=['GET'])
def performance_summary():
    """Get performance summary."""
    try:
        summary = performance_optimizer.get_performance_summary()
        
        return jsonify({
            'performance_summary': summary,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Performance summary error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(ApplicationError)
def handle_application_error(error):
    """Handle custom application errors."""
    return handle_error(error)

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return handle_error(FileNotFoundError("Endpoint not found"))

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return handle_error(Exception("Internal server error"))

@app.errorhandler(Exception)
def handle_unexpected_error(error):
    """Handle all other unexpected errors."""
    return handle_error(error)

# Initialize application components
def initialize_app():
    """Initialize core application components."""
    global spacy_processor, search_engine, index_manager, ic_client, index_store
    
    try:
        logger.info("Initializing spaCy NLP server...")
        
        # Initialize spaCy processor
        logger.info("Loading spaCy processor...")
        spacy_processor = SpacyProcessor(Config.SPACY_MODEL)
        logger.info("spaCy processor loaded successfully")
        
        # Initialize other components
        logger.info("Initializing IC client...")
        ic_client = ICClient(Config.IC_NETWORK, Config.ACCESS_CONTROL_CANISTER_ID, Config.ASSETS_CANISTER_ID)
        
        logger.info("Initializing index store...")
        index_store = MemoryStore()
        
        logger.info("Initializing search engine...")
        search_engine = SearchEngine(spacy_processor, index_store)
        
        logger.info("Initializing index manager...")
        index_manager = IndexManager(ic_client, index_store, spacy_processor)
        
        # Apply performance optimizations
        logger.info("Applying performance optimizations...")
        optimize_for_vercel()
        
        logger.info("spaCy NLP server initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}")
        logger.error(traceback.format_exc())
        raise

# Initialize app on startup
if __name__ != '__main__':
    initialize_app()

# For local development
if __name__ == '__main__':
    initialize_app()
    app.run(debug=True, host='0.0.0.0', port=5000)