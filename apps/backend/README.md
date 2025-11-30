# Vidrune Backend Server

Express backend server for the Vidrune video indexing platform, handling Walrus storage, Somnia smart contracts, Somnia Data Streams, and MeiliSearch operations.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Configure environment variables:
   - `PORT`: Server port (default: 3001)
   - `SOMNIA_RPC_URL`: Somnia network RPC endpoint
   - `GEMINI_KEY_1` through `GEMINI_KEY_10`: Gemini API keys for rate limit distribution
   - `MEILISEARCH_HOST`: MeiliSearch server URL
   - `MEILISEARCH_API_KEY`: MeiliSearch API key
   - `WALRUS_PUBLISHER_URL`: Walrus publisher endpoint
   - `WALRUS_AGGREGATOR_URL`: Walrus aggregator endpoint
   - `SDS_WEBSOCKET_URL`: Somnia Data Streams WebSocket URL

## Development

Start the development server with hot reload:
```bash
npm run dev
```

## Production

Build and run in production:
```bash
npm run build
npm start
```

## Project Structure

```
apps/backend/
├── src/
│   ├── server.ts              # Express app entry point
│   ├── routes/                # API route handlers
│   │   ├── storage.ts         # Walrus storage endpoints
│   │   ├── poll.ts            # SDS polling endpoints
│   │   ├── markets.ts         # Prediction market endpoints
│   │   └── search.ts          # MeiliSearch endpoints
│   ├── services/              # Business logic services
│   │   ├── walrus.ts          # Walrus storage operations
│   │   ├── gemini.ts          # Gemini AI with key rotation
│   │   ├── meilisearch.ts     # Search indexing
│   │   ├── contracts.ts       # Somnia contract interactions
│   │   ├── streams.ts         # SDS WebSocket handling
│   │   └── throttle.ts        # API key rotation logic
│   └── types/
│       └── index.ts           # Shared TypeScript types
├── .env.example               # Environment variable template
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Storage (Walrus)
- `POST /api/storage/upload` - Upload content to Walrus
- `GET /api/storage/:blobId` - Retrieve content from Walrus
- `GET /api/storage/:blobId/metadata` - Get blob metadata

### Polling (Somnia Data Streams)
- `GET /api/poll/status` - Get SDS connection status
- `POST /api/poll/subscribe` - Subscribe to data feed
- `GET /api/poll/feed/:feedId` - Get feed data
- `POST /api/poll/unsubscribe` - Unsubscribe from feed

### Markets (Somnia Contracts)
- `GET /api/markets` - List all prediction markets
- `GET /api/markets/:marketId` - Get market details
- `POST /api/markets` - Create new market
- `POST /api/markets/:marketId/predict` - Place prediction
- `POST /api/markets/:marketId/resolve` - Resolve market

### Search (MeiliSearch)
- `GET /api/search?q=query` - Search indexed content
- `POST /api/search/index` - Index single document
- `POST /api/search/index/batch` - Batch index documents
- `DELETE /api/search/:documentId` - Delete document
- `GET /api/search/stats` - Get index statistics

## Implementation Status

The backend structure is currently scaffolded with placeholder routes. Service implementations are marked with TODO comments and will be filled by subsequent development phases:

- [ ] Walrus storage service
- [ ] Gemini AI service with key rotation
- [ ] MeiliSearch service
- [ ] Somnia contracts service
- [ ] Somnia Data Streams service
- [ ] API key throttling service

## Technology Stack

- **Express**: Web framework
- **TypeScript**: Type safety
- **viem**: Ethereum library for Somnia contracts
- **@google/generative-ai**: Gemini AI integration
- **meilisearch**: Search engine client
- **@somnia-chain/streams**: Somnia Data Streams client
- **tsx**: TypeScript execution with hot reload

## Development Notes

- All route handlers return 501 (Not Implemented) until services are implemented
- Error handling middleware is configured for consistent error responses
- CORS is enabled for cross-origin requests from the frontend
- Request logging middleware is active in development
