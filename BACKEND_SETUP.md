# Backend Setup Guide

## Quick Start

Follow these steps to get the Coinglass OI vs MC Filter Backend running.

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Coinglass API key:

```env
NODE_ENV=development
PORT=3000
COINGLASS_API_KEY=your_actual_api_key_here
COINGLASS_BASE_URL=https://api.coinglass.com/api
FILTER_MULTIPLIER=0.5
CACHE_TTL=600
REQUEST_TIMEOUT=10000
MAX_RETRIES=3
RETRY_DELAY=1000
```

### 3. Run Development Server

```bash
npm run dev
```

The server will start on http://localhost:3000

### 4. Build for Production

```bash
npm run build
npm start
```

## Testing the API

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Get Filtered Coins
```bash
# Get coins with default multiplier (0.5)
curl "http://localhost:3000/api/coins"

# Get coins with custom multiplier
curl "http://localhost:3000/api/coins?multiplier=0.75"

# Get top 5 coins sorted by OI/MC ratio
curl "http://localhost:3000/api/coins?sortBy=oiToMcRatio&limit=5"

# Filter by market cap range
curl "http://localhost:3000/api/coins?minMarketCap=1000000000&maxMarketCap=10000000000"

# Filter specific symbols
curl "http://localhost:3000/api/coins?symbols=BTC,ETH,SOL"
```

### Get Specific Coin
```bash
curl "http://localhost:3000/api/coins/BTC"
```

### Get Statistics
```bash
curl "http://localhost:3000/api/statistics"

# Statistics with custom filter
curl "http://localhost:3000/api/statistics?multiplier=0.75"
```

### Force Refresh Data
```bash
curl -X POST "http://localhost:3000/api/refresh"
```

## File Structure

```
/private/tmp/test-dev-repo/
├── package.json                          # NPM configuration
├── tsconfig.json                         # TypeScript configuration
├── .env.example                          # Environment template
├── .gitignore                            # Git ignore rules
├── README.md                             # Project documentation
├── BACKEND_SETUP.md                      # This file
└── src/
    ├── types/
    │   ├── api.types.ts                  # Coinglass API types
    │   ├── domain.types.ts               # Domain types (Coin, FilterConfig, etc.)
    │   └── config.types.ts               # Configuration types
    ├── api/
    │   ├── coinglass-client.ts           # Coinglass API client
    │   └── http-client.ts                # HTTP wrapper with retry logic
    ├── services/
    │   ├── data-fetcher.service.ts       # Data fetching orchestration
    │   ├── filter.service.ts             # Core filtering logic
    │   ├── cache.service.ts              # In-memory cache
    │   └── aggregator.service.ts         # Main service coordinator
    ├── server/
    │   ├── app.ts                        # Express app configuration
    │   └── routes/
    │       └── api.routes.ts             # API endpoints
    ├── config/
    │   ├── app.config.ts                 # App configuration loader
    │   └── constants.ts                  # Constants and defaults
    ├── logger/
    │   └── logger.ts                     # Logging utility
    └── index.ts                          # Application entry point
```

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check and service status |
| `/api/coins` | GET | Get filtered coins with query parameters |
| `/api/coins/:symbol` | GET | Get specific coin by symbol |
| `/api/statistics` | GET | Get statistics about filtered coins |
| `/api/refresh` | POST | Force refresh cached data |

## Query Parameters for `/api/coins`

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `multiplier` | number | OI multiplier for filtering | 0.5 |
| `minMarketCap` | number | Minimum market cap filter | - |
| `maxMarketCap` | number | Maximum market cap filter | - |
| `minOI` | number | Minimum open interest filter | - |
| `symbols` | string | Comma-separated symbols (e.g., "BTC,ETH") | - |
| `sortBy` | string | Sort field (oiToMcRatio, marketCap, aggregateOI, volume24h, priceChange24h) | - |
| `sortOrder` | string | Sort order (asc, desc) | desc |
| `limit` | number | Maximum results to return (max: 1000) | 100 |
| `offset` | number | Number of results to skip | 0 |

## Core Filter Logic

The main filter condition is:
```typescript
(coin.aggregateOI * multiplier) > coin.marketCap
```

- **Default multiplier**: 0.5
- A coin passes if its aggregate open interest (multiplied by the multiplier) exceeds its market cap
- Additional filters can be applied on top of this base filter

## Architecture Overview

### Services Layer

1. **CoinglassClient**: Handles all API communication with Coinglass
   - Implements retry logic with exponential backoff
   - Supports batch operations
   - Validates API responses

2. **HttpClient**: Generic HTTP client wrapper
   - Automatic retry on failures
   - Request/response logging
   - Error handling and transformation

3. **DataFetcherService**: Orchestrates data fetching
   - Fetches coin data from multiple endpoints
   - Combines OI and MC data
   - Supports parallel fetching for performance

4. **FilterService**: Core filtering logic
   - Implements the main OI vs MC filter
   - Handles sorting and pagination
   - Validates filter configuration

5. **CacheService**: In-memory caching
   - Uses node-cache for fast access
   - Configurable TTL
   - Cache statistics and monitoring

6. **AggregatorService**: Main service coordinator
   - Orchestrates all other services
   - Implements business logic
   - Manages data flow

### Error Handling

The backend implements comprehensive error handling:

- **Network errors**: Automatic retry with exponential backoff
- **API errors**: Proper error messages and status codes
- **Validation errors**: Clear feedback on invalid input
- **Rate limiting**: Handles 429 responses gracefully
- **Graceful degradation**: Continues working with partial data

### Caching Strategy

- **Default TTL**: 10 minutes (600 seconds)
- **Cache keys**:
  - `all_coins`: All fetched coin data
  - `coin_BTC`: Individual coin data
  - `statistics`: Calculated statistics
- **Auto-expiration**: Cache automatically expires
- **Manual refresh**: POST /api/refresh clears cache

## Development Tips

### Watch Mode
```bash
npm run watch
```

### Check Types
```bash
npx tsc --noEmit
```

### View Logs
The application logs to stdout with different levels:
- DEBUG: Detailed debugging info (development only)
- INFO: General information
- WARN: Warning messages
- ERROR: Error messages with stack traces

### Environment Variables
All configuration is done via environment variables. See `.env.example` for all available options.

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, change the PORT in your `.env` file:
```env
PORT=3001
```

### API Key Issues
Make sure your Coinglass API key is valid and has the necessary permissions.

### Cache Issues
If you're seeing stale data, force a refresh:
```bash
curl -X POST http://localhost:3000/api/refresh
```

### TypeScript Errors
Make sure all dependencies are installed:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Build the application: `npm run build`
3. Run the built application: `npm start`
4. Use a process manager like PM2 for production:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name coinglass-backend
   ```

## Support

For issues or questions, refer to the main README.md or the inline code documentation.
