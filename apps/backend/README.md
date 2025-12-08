# spaCy NLP Server

A production-ready Flask-based Python application that provides intelligent semantic search capabilities using spaCy's natural language processing models. The server integrates with Internet Computer (IC) canisters to provide advanced search functionality for video content with lazy indexing and real-time processing.

## 🚀 Features

- **🧠 Semantic Search**: Advanced text search using spaCy word vectors and cosine similarity
- **⚡ Lazy Indexing**: On-demand indexing of video content from IC canisters with background processing
- **🔍 Advanced Search**: Multi-keyword search, phrase support, spell correction, and confidence scoring
- **📊 Real-time Monitoring**: Comprehensive health checks, metrics, and performance monitoring
- **🛡️ Error Handling**: Structured error responses with retry logic and graceful degradation
- **🚀 Vercel Optimized**: Serverless deployment with memory management and performance optimization
- **📝 Multi-format Support**: VTT captions, audio transcripts, TTS transcripts, and scene descriptions
- **🔄 Background Processing**: Queue-based indexing with priority handling and exponential backoff

## 📁 Project Structure

```
apps/server/
├── api/
│   └── index.py                    # Main Flask application with all endpoints
├── src/
│   ├── indexing/
│   │   └── index_manager.py        # Lazy indexing and queue management
│   ├── search/
│   │   └── search_engine.py        # Semantic search with advanced features
│   ├── processing/
│   │   ├── spacy_processor.py      # spaCy NLP processing
│   │   └── text_preprocessor.py    # Text cleaning and preprocessing
│   ├── storage/
│   │   ├── base_store.py           # Abstract storage interface
│   │   └── memory_store.py         # In-memory storage implementation
│   ├── models/
│   │   └── video_models.py         # Data models and validation
│   └── utils/
│       ├── config.py               # Configuration management
│       ├── ic_client.py            # Internet Computer client
│       ├── error_handler.py        # Error handling and logging
│       └── performance.py          # Performance optimization
├── tests/                          # Comprehensive test suite
├── scripts/                        # Deployment and testing scripts
├── requirements.txt                # Python dependencies
├── vercel.json                     # Vercel deployment configuration
└── README.md                       # This file
```

## 🔌 API Endpoints

### Core Search Endpoints

- `POST /api/search` - Perform semantic search across indexed content
- `POST /api/search/advanced` - Advanced search with filters and pagination
- `GET /api/search/suggestions` - Get search suggestions for autocomplete
- `POST /api/similar-words` - Find contextually similar words
- `POST /api/process` - Process text and return spaCy document metadata

### Index Management Endpoints

- `GET /api/index/status` - Get indexing statistics and queue status
- `POST /api/index/video/{videoId}` - Force reindex specific video
- `GET /api/index/video/{videoId}/status` - Get video indexing status
- `GET /api/index/queue` - Get current indexing queue
- `POST /api/index/sync` - Manually trigger registry synchronization
- `GET /api/index/metrics` - Get detailed indexing metrics
- `POST /api/index/cleanup` - Clean up old index entries

### Health and Monitoring

- `GET /api/health` - System health check and component status
- `GET /api/status` - Comprehensive system status
- `GET /api/metrics` - Performance metrics and usage statistics
- `POST /api/performance/optimize` - Trigger performance optimization
- `GET /api/performance/summary` - Get performance summary

## 🔧 Environment Variables

### Required Variables

- `ACCESS_CONTROL_CANISTER_ID` - IC Access Control canister identifier
- `ASSETS_CANISTER_ID` - IC Assets canister identifier

### Optional Configuration

- `SPACY_MODEL` - spaCy model name (default: `en_core_web_md`)
- `IC_NETWORK` - IC network endpoint (default: `https://ic0.app`)
- `LOG_LEVEL` - Logging level (default: `INFO`)
- `ENVIRONMENT` - Environment type (default: `development`)
- `MAX_TEXT_LENGTH` - Maximum text length in bytes (default: `1000000`)
- `MAX_CONCURRENT_REQUESTS` - Maximum concurrent requests (default: `10`)
- `REQUEST_TIMEOUT` - Request timeout in seconds (default: `30`)
- `DEFAULT_SEARCH_LIMIT` - Default search result limit (default: `10`)
- `MAX_SEARCH_LIMIT` - Maximum search result limit (default: `100`)
- `SIMILARITY_THRESHOLD` - Minimum similarity score (default: `0.5`)
- `MAX_QUEUE_SIZE` - Maximum indexing queue size (default: `1000`)
- `INDEXING_BATCH_SIZE` - Indexing batch size (default: `10`)
- `RETRY_MAX_ATTEMPTS` - Maximum retry attempts (default: `3`)
- `RETRY_BACKOFF_FACTOR` - Retry backoff factor (default: `2.0`)
- `CACHE_SIZE` - Cache size limit (default: `1000`)
- `CACHE_TTL` - Cache time-to-live in seconds (default: `3600`)
- `INDEX_STORAGE_TYPE` - Storage backend type (default: `memory`)

## 🛠️ Local Development

### Prerequisites

- Python 3.9+
- pip or pipenv
- Internet Computer canister IDs (for full functionality)

### Setup

1. **Clone and Navigate**:

   ```bash
   cd apps/server
   ```

2. **Install Dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

3. **Set Environment Variables**:

   ```bash
   export ACCESS_CONTROL_CANISTER_ID="your-access-control-canister-id"
   export ASSETS_CANISTER_ID="your-assets-canister-id"
   export ENVIRONMENT="development"
   export LOG_LEVEL="DEBUG"
   ```

4. **Run the Server**:

   ```bash
   python api/index.py
   ```

5. **Test the Installation**:
   ```bash
   curl http://localhost:5000/api/health
   ```

### Running Tests

```bash
# Run all tests
python -m pytest tests/ -v

# Run unit tests only
python -m pytest tests/ -v -m "not integration"

# Run integration tests
python -m pytest tests/ -v -m "integration"

# Run with coverage
python -m pytest tests/ --cov=src --cov-report=html
```

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**:

   ```bash
   npm install -g vercel
   ```

2. **Deploy using Script**:

   ```bash
   # Deploy to preview
   ./scripts/deploy.sh

   # Deploy to production
   ./scripts/deploy.sh --production

   # Deploy with tests
   ./scripts/deploy.sh --with-tests --production
   ```

3. **Manual Deployment**:

   ```bash
   vercel --prod
   ```

4. **Set Environment Variables** in Vercel dashboard or CLI:
   ```bash
   vercel env add ACCESS_CONTROL_CANISTER_ID
   vercel env add ASSETS_CANISTER_ID
   ```

### Testing Deployment

```bash
# Test local deployment
./scripts/test-deployment.sh http://localhost:5000

# Test production deployment
./scripts/test-deployment.sh https://your-deployment-url.vercel.app
```

## 📊 Usage Examples

### Basic Search

```bash
curl -X POST https://your-deployment-url.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "machine learning", "limit": 10}'
```

### Advanced Search with Filters

```bash
curl -X POST https://your-deployment-url.vercel.app/api/search/advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence",
    "page": 1,
    "page_size": 20,
    "content_types": ["captions.vtt", "audio-transcript.txt"],
    "boost_recent": true,
    "threshold": 0.7
  }'
```

### Text Processing

```bash
curl -X POST https://your-deployment-url.vercel.app/api/process \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a sample document for NLP processing."}'
```

### Similar Words

```bash
curl -X POST https://your-deployment-url.vercel.app/api/similar-words \
  -H "Content-Type: application/json" \
  -d '{"keyword": "computer", "limit": 10, "threshold": 0.6}'
```

## 🏗️ Architecture

### Core Components

1. **SpacyProcessor**: Handles NLP processing with model loading, text preprocessing, and vector operations
2. **SearchEngine**: Provides semantic search with ranking, filtering, and advanced features
3. **IndexManager**: Manages lazy indexing with background processing and queue management
4. **ICClient**: Handles Internet Computer canister communication with retry logic
5. **Storage Layer**: Abstract storage interface with in-memory implementation
6. **Error Handling**: Comprehensive error handling with structured responses
7. **Performance Optimization**: Memory management, caching, and batch processing

### Data Flow

1. **Indexing**: Videos are lazily indexed from IC canisters when first accessed
2. **Processing**: Text content is processed with spaCy for NLP features
3. **Storage**: Processed content is stored in the index with metadata
4. **Search**: Queries are processed and matched against indexed content
5. **Ranking**: Results are ranked by relevance using multiple factors
6. **Response**: Formatted results are returned with metrics

## 🔍 Monitoring and Debugging

### Health Checks

```bash
# System health
curl https://your-deployment-url.vercel.app/api/health

# Detailed status
curl https://your-deployment-url.vercel.app/api/status

# Performance metrics
curl https://your-deployment-url.vercel.app/api/metrics
```

### Indexing Status

```bash
# Overall indexing status
curl https://your-deployment-url.vercel.app/api/index/status

# Queue status
curl https://your-deployment-url.vercel.app/api/index/queue

# Specific video status
curl https://your-deployment-url.vercel.app/api/index/video/VIDEO_ID/status
```

### Performance Optimization

```bash
# Trigger optimization
curl -X POST https://your-deployment-url.vercel.app/api/performance/optimize

# Get performance summary
curl https://your-deployment-url.vercel.app/api/performance/summary
```

## 🛡️ Security Features

- **Input Validation**: Comprehensive validation of all inputs
- **Error Sanitization**: Secure error messages without sensitive data exposure
- **Rate Limiting**: Built-in request throttling (configurable)
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Environment Variables**: Secure configuration management
- **Structured Logging**: Detailed logging without sensitive data

## 🚀 Performance Features

- **Memory Management**: Optimized for Vercel's memory constraints
- **LRU Caching**: Intelligent caching with TTL and size limits
- **Batch Processing**: Efficient processing of multiple items
- **Background Processing**: Non-blocking indexing operations
- **Connection Pooling**: Efficient IC canister communication
- **Garbage Collection**: Automatic memory cleanup

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test complete workflows and API endpoints
- **Performance Tests**: Test system performance and memory usage
- **Error Handling Tests**: Test error scenarios and recovery
- **Deployment Tests**: Test deployed endpoints

## 🔧 Troubleshooting

### Common Issues

1. **spaCy Model Not Loading**:

   - Ensure `en_core_web_md` model is available
   - Check memory constraints in deployment environment
   - Verify Python version compatibility

2. **IC Canister Connection Errors**:

   - Verify canister IDs are correct
   - Check network connectivity
   - Ensure proper authentication

3. **Memory Issues**:

   - Monitor memory usage with `/api/metrics`
   - Trigger optimization with `/api/performance/optimize`
   - Adjust cache sizes in configuration

4. **Search Performance**:
   - Check indexing status with `/api/index/status`
   - Monitor queue processing
   - Optimize similarity thresholds

### Debug Mode

Set `LOG_LEVEL=DEBUG` for detailed logging:

```bash
export LOG_LEVEL=DEBUG
python api/index.py
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is part of the Vidrune video platform and follows the project's licensing terms.

## 🆘 Support

For support and questions:

- Check the troubleshooting section above
- Review the API documentation
- Test with the provided scripts
- Monitor system health endpoints

---

**Built with ❤️ for intelligent video search**
