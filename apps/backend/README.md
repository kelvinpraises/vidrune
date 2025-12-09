# Vidrune Backend Server

Express backend server for the Vidrune video indexing platform, handling Walrus storage, Celo smart contracts, and MeiliSearch operations.

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
   - `CELO_RPC_URL`: Celo Sepolia RPC endpoint
   - `BACKEND_WALLET_PRIVATE_KEY`: Private key for backend operations
   - `VIDEO_REGISTRY_ADDRESS`: VideoRegistry contract address
   - `PREDICTION_MARKET_ADDRESS`: PredictionMarket contract address
   - `POINTS_REGISTRY_ADDRESS`: PointsRegistry contract address
   - `GEMINI_KEY_1` through `GEMINI_KEY_10`: Gemini API keys for rate limit distribution
   - `MEILISEARCH_HOST`: MeiliSearch server URL
   - `MEILISEARCH_API_KEY`: MeiliSearch API key
   - `WALRUS_PUBLISHER_URL`: Walrus publisher endpoint
   - `WALRUS_AGGREGATOR_URL`: Walrus aggregator endpoint

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
│   │   ├── poll.ts            # Polling endpoints for market automation
│   │   ├── markets.ts         # Prediction market endpoints
│   │   ├── video.ts           # Video processing endpoints
│   │   └── search.ts          # MeiliSearch endpoints
│   ├── services/              # Business logic services
│   │   ├── walrus.ts          # Walrus storage operations
│   │   ├── gemini.ts          # Gemini AI with key rotation
│   │   ├── meilisearch.ts     # Search indexing
│   │   ├── contracts.ts       # Celo contract interactions
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

### Markets (Celo Contracts)
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

- [x] Walrus storage service
- [x] Gemini AI service with key rotation
- [x] MeiliSearch service
- [x] Celo contracts service
- [x] API key throttling service
- [x] Automated market creation and resolution
- [x] Video indexing and conviction handling

## Technology Stack

- **Express**: Web framework
- **TypeScript**: Type safety
- **viem**: Ethereum library for Celo contracts
- **@google/generative-ai**: Gemini AI integration
- **meilisearch**: Search engine client
- **tsx**: TypeScript execution with hot reload

## Development Notes

- All route handlers return 501 (Not Implemented) until services are implemented
- Error handling middleware is configured for consistent error responses
- CORS is enabled for cross-origin requests from the frontend
- Request logging middleware is active in development
