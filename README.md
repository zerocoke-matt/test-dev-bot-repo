# Coinglass OI vs MC Filter Backend

A production-ready TypeScript backend service for filtering cryptocurrencies based on the Open Interest (OI) to Market Cap (MC) ratio using the Coinglass API.

## Overview

This service fetches cryptocurrency data from Coinglass API and filters coins where:
```
(Aggregate Open Interest × Multiplier) > Market Cap
```

Default multiplier: **0.5**

## Features

- **Real-time Data Fetching**: Aggregates data from Coinglass API
- **Advanced Filtering**: Flexible filtering with multiple parameters
- **Intelligent Caching**: In-memory cache to minimize API calls
- **Error Handling**: Comprehensive error handling with retry logic
- **RESTful API**: Clean REST API with Express
- **TypeScript**: Full type safety throughout
- **Production Ready**: Logging, validation, and health checks

## Architecture

```
src/
├── types/              # TypeScript type definitions
├── api/                # API clients (Coinglass, HTTP)
├── services/           # Business logic services
├── server/             # Express server and routes
├── config/             # Configuration management
├── logger/             # Logging utility
└── index.ts            # Entry point
```

## Prerequisites

- Node.js >= 18.0.0
- Coinglass API Key

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
NODE_ENV=development
PORT=3000
COINGLASS_API_KEY=your_api_key_here
COINGLASS_BASE_URL=https://api.coinglass.com/api
FILTER_MULTIPLIER=0.5
CACHE_TTL=600
REQUEST_TIMEOUT=10000
MAX_RETRIES=3
RETRY_DELAY=1000
```

## Usage

### Development

Run with ts-node for development:
```bash
npm run dev
```

### Production

Build and run:
```bash
npm run build
npm start
```

## API Endpoints

### GET /api/health
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "uptime": 1234.56,
  "timestamp": "2026-02-10T12:00:00.000Z",
  "services": {
    "api": "connected",
    "cache": "active"
  },
  "lastDataRefresh": "2026-02-10T11:50:00.000Z"
}
```

### GET /api/coins
Get filtered coins with optional parameters

**Query Parameters:**
- `multiplier` (number): OI multiplier for filtering (default: 0.5)
- `minMarketCap` (number): Minimum market cap filter
- `maxMarketCap` (number): Maximum market cap filter
- `minOI` (number): Minimum open interest filter
- `symbols` (string): Comma-separated list of symbols (e.g., "BTC,ETH,SOL")
- `sortBy` (string): Field to sort by (oiToMcRatio, marketCap, aggregateOI, volume24h, priceChange24h)
- `sortOrder` (string): Sort order (asc, desc)
- `limit` (number): Maximum results (max: 1000, default: 100)
- `offset` (number): Pagination offset (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/coins?multiplier=0.5&sortBy=oiToMcRatio&limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "coins": [
      {
        "symbol": "BTC",
        "name": "Bitcoin",
        "marketCap": 1000000000,
        "aggregateOI": 600000000,
        "oiToMcRatio": 0.6,
        "price": 50000,
        "volume24h": 50000000,
        "priceChange24h": 2.5,
        "rank": 1,
        "lastUpdated": "2026-02-10T12:00:00.000Z"
      }
    ],
    "total": 100,
    "filtered": 25,
    "returned": 10,
    "config": {
      "multiplier": 0.5
    }
  },
  "timestamp": "2026-02-10T12:00:00.000Z"
}
```

### GET /api/coins/:symbol
Get specific coin by symbol

**Example:**
```bash
curl "http://localhost:3000/api/coins/BTC"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTC",
    "name": "Bitcoin",
    "marketCap": 1000000000,
    "aggregateOI": 600000000,
    "oiToMcRatio": 0.6,
    "price": 50000,
    "volume24h": 50000000,
    "priceChange24h": 2.5,
    "rank": 1,
    "lastUpdated": "2026-02-10T12:00:00.000Z"
  }
}
```

### GET /api/statistics
Get statistics about filtered coins

**Query Parameters:** (same as /api/coins)

**Example:**
```bash
curl "http://localhost:3000/api/statistics?multiplier=0.5"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCoins": 100,
    "filteredCoins": 25,
    "averageOIToMC": 0.75,
    "medianOIToMC": 0.65,
    "highestOIToMC": {
      "symbol": "ETH",
      "oiToMcRatio": 1.2
    },
    "lowestOIToMC": {
      "symbol": "BTC",
      "oiToMcRatio": 0.5
    },
    "lastRefresh": "2026-02-10T12:00:00.000Z"
  }
}
```

### POST /api/refresh
Force refresh cached data

**Example:**
```bash
curl -X POST "http://localhost:3000/api/refresh"
```

**Response:**
```json
{
  "success": true,
  "message": "Data refreshed successfully",
  "timestamp": "2026-02-10T12:00:00.000Z"
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment (development/production) | development |
| PORT | Server port | 3000 |
| COINGLASS_API_KEY | Coinglass API key | Required |
| COINGLASS_BASE_URL | Coinglass API base URL | https://api.coinglass.com/api |
| FILTER_MULTIPLIER | Default filter multiplier | 0.5 |
| CACHE_TTL | Cache TTL in seconds | 600 |
| REQUEST_TIMEOUT | HTTP request timeout (ms) | 10000 |
| MAX_RETRIES | Maximum retry attempts | 3 |
| RETRY_DELAY | Delay between retries (ms) | 1000 |

## Core Filter Logic

The main filtering condition is implemented in `src/services/filter.service.ts`:

```typescript
// A coin passes the filter if:
(coin.aggregateOI * config.multiplier) > coin.marketCap
```

Additional optional filters:
- Minimum market cap
- Maximum market cap
- Minimum open interest
- Specific symbols only

## Caching Strategy

- **Default TTL**: 600 seconds (10 minutes)
- **Cache Keys**:
  - `all_coins`: All fetched coins
  - `coin_${SYMBOL}`: Individual coin data
  - `statistics`: Calculated statistics
- **Automatic Expiration**: Cache automatically expires after TTL
- **Manual Refresh**: Use POST /api/refresh to force refresh

## Error Handling

The service implements comprehensive error handling:

1. **API Errors**: Coinglass API failures are caught and logged
2. **Network Errors**: Automatic retry with exponential backoff
3. **Validation Errors**: Input validation with clear error messages
4. **Rate Limiting**: Handles 429 responses from Coinglass
5. **Graceful Degradation**: Continues working with partial data

## Logging

Structured logging with different levels:
- **DEBUG**: Detailed information (development only)
- **INFO**: General information
- **WARN**: Warning messages
- **ERROR**: Error messages with stack traces

Example log output:
```
[2026-02-10T12:00:00.000Z] [INFO] Server is running on port 3000
[2026-02-10T12:00:01.000Z] [DEBUG] Fetching coin list from Coinglass
[2026-02-10T12:00:02.000Z] [INFO] GET /api/coins 200 - 150ms
```

## Testing

You can test the API using curl or any HTTP client:

```bash
# Health check
curl http://localhost:3000/api/health

# Get filtered coins
curl "http://localhost:3000/api/coins?multiplier=0.5&limit=5"

# Get specific coin
curl http://localhost:3000/api/coins/BTC

# Get statistics
curl http://localhost:3000/api/statistics

# Force refresh
curl -X POST http://localhost:3000/api/refresh
```

## Performance Considerations

1. **Parallel Fetching**: Coin data is fetched in parallel to minimize latency
2. **Batch Processing**: Multiple coins can be fetched in optimized batches
3. **In-Memory Cache**: Reduces API calls to Coinglass
4. **Connection Pooling**: HTTP client reuses connections
5. **Retry Logic**: Exponential backoff prevents API hammering

## License

ISC
