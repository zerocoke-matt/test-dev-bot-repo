/**
 * API Endpoint Integration Tests
 * Tests for Express REST API endpoints
 * Updated for exchange-based OI system with CoinGecko market data
 */

import request from 'supertest';
import express, { Express } from 'express';
import { createApiRouter } from '../../src/server/routes/api.routes';
import { AggregatorService } from '../../src/services/aggregator.service';
import { DataFetcherService } from '../../src/services/data-fetcher.service';
import { FilterService } from '../../src/services/filter.service';
import { CacheService } from '../../src/services/cache.service';
import { IExchangeClient } from '../../src/api/exchanges/exchange-client';
import { CoinGeckoClient } from '../../src/api/coingecko-client';
import {
  createMockExchangeOIData,
  createMockCoinGeckoMarketData,
} from '../helpers/test-utils';

// Mock the CoinGeckoClient module
jest.mock('../../src/api/coingecko-client');

describe('API Endpoints', () => {
  let app: Express;
  let aggregatorService: AggregatorService;
  let mockExchangeClients: jest.Mocked<IExchangeClient>[];
  let mockCoinGeckoClient: jest.Mocked<CoinGeckoClient>;

  function createMockExchangeClient(name: string): jest.Mocked<IExchangeClient> {
    return {
      exchangeName: name,
      getOpenInterest: jest.fn(),
      getBatchOpenInterest: jest.fn(),
    };
  }

  /**
   * Setup exchange clients to return OI for multiple symbols
   */
  function setupExchangeOIForSymbols(symbolOIs: Record<string, number>): void {
    mockExchangeClients.forEach((client) => {
      client.getOpenInterest.mockImplementation(async (sym: string) => {
        if (sym in symbolOIs) {
          return createMockExchangeOIData(sym, client.exchangeName, {
            openInterest: symbolOIs[sym],
          });
        }
        throw new Error(`No data for ${sym}`);
      });
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock exchange clients
    mockExchangeClients = [
      createMockExchangeClient('binance'),
      createMockExchangeClient('bybit'),
      createMockExchangeClient('bitget'),
      createMockExchangeClient('okx'),
    ];

    // Create mock CoinGecko client
    mockCoinGeckoClient = new CoinGeckoClient() as jest.Mocked<CoinGeckoClient>;

    // Create services
    const dataFetcherService = new DataFetcherService(mockExchangeClients, mockCoinGeckoClient);
    const filterService = new FilterService();
    const cacheService = new CacheService({ ttl: 10 });

    aggregatorService = new AggregatorService(
      dataFetcherService,
      filterService,
      cacheService,
      0.5
    );

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api', createApiRouter(aggregatorService));
  });

  describe('GET /api/health', () => {
    it('should return 200 with health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
        services: {
          api: 'connected',
          cache: expect.any(String),
        },
      });
    });

    it('should include uptime in response', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should report cache status', async () => {
      const response = await request(app).get('/api/health');

      expect(['active', 'inactive']).toContain(response.body.services.cache);
    });
  });

  describe('GET /api/coins', () => {
    it('should return filtered coins', async () => {
      // BTC passes filter, ETH does not
      // BTC: 4 * 5B = 20B OI, MC = 8B -> 20B * 0.5 = 10B > 8B (passes)
      // ETH: 4 * 2.5B = 10B OI, MC = 8B -> 10B * 0.5 = 5B < 8B (fails)
      setupExchangeOIForSymbols({ BTC: 5000000000, ETH: 2500000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          current_price: 40000,
          market_cap: 8000000000,
          market_cap_rank: 1,
          total_volume: 20000000000,
          price_change_percentage_24h: 2.5,
        }),
        createMockCoinGeckoMarketData({
          id: 'ethereum',
          symbol: 'eth',
          name: 'Ethereum',
          current_price: 2500,
          market_cap: 8000000000,
          market_cap_rank: 2,
          total_volume: 10000000000,
          price_change_percentage_24h: -1.0,
        }),
      ]);

      const response = await request(app).get('/api/coins');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.coins).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.filtered).toBeDefined();
    });

    it('should accept multiplier query parameter', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      const response = await request(app).get('/api/coins?multiplier=0.7');

      expect(response.status).toBe(200);
      expect(response.body.data.config.multiplier).toBe(0.7);
    });

    it('should accept minMarketCap query parameter', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      const response = await request(app).get('/api/coins?minMarketCap=1000000000');

      expect(response.status).toBe(200);
      expect(response.body.data.config.minMarketCap).toBe(1000000000);
    });

    it('should accept sortBy and sortOrder query parameters', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      const response = await request(app).get('/api/coins?sortBy=marketCap&sortOrder=asc');

      expect(response.status).toBe(200);
    });

    it('should accept limit and offset query parameters', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      const response = await request(app).get('/api/coins?limit=10&offset=5');

      expect(response.status).toBe(200);
    });

    it('should accept symbols query parameter', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      const response = await request(app).get('/api/coins?symbols=BTC,ETH');

      expect(response.status).toBe(200);
    });

    it('should return 500 on internal error', async () => {
      mockCoinGeckoClient.getMarketDataByIds.mockRejectedValue(new Error('Internal error'));

      const response = await request(app).get('/api/coins');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when limit is not a valid number', async () => {
      const response = await request(app).get('/api/coins?limit=abc');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('limit');
    });

    it('should return 400 when offset is not a valid number', async () => {
      const response = await request(app).get('/api/coins?offset=xyz');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('offset');
    });

    it('should return 400 for invalid filter configuration', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      // multiplier=99 is out of range (max 10)
      const response = await request(app).get('/api/coins?multiplier=99');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid filter configuration');
    });

    it('should handle negative limit gracefully', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      const response = await request(app).get('/api/coins?limit=-1');

      // Should not crash; negative limit is clamped to 0
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/coins/:symbol', () => {
    it('should return specific coin by symbol', async () => {
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockResolvedValue(
          createMockExchangeOIData('BTC', client.exchangeName, { openInterest: 500000000 })
        );
      });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          market_cap: 800000000000,
        }),
      ]);

      const response = await request(app).get('/api/coins/BTC');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('BTC');
    });

    it('should return 404 for non-existent coin', async () => {
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockRejectedValue(new Error('Not found'));
      });
      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([]);

      const response = await request(app).get('/api/coins/INVALID');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle lowercase symbols', async () => {
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockResolvedValue(
          createMockExchangeOIData('BTC', client.exchangeName, { openInterest: 500000000 })
        );
      });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      const response = await request(app).get('/api/coins/btc');

      expect(response.status).toBe(200);
    });

    it('should return 500 on internal error', async () => {
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockRejectedValue(new Error('Internal error'));
      });
      mockCoinGeckoClient.getMarketDataByIds.mockRejectedValue(new Error('Internal error'));

      const response = await request(app).get('/api/coins/BTC');

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/statistics', () => {
    it('should return valid statistics', async () => {
      // Both BTC and ETH pass filter with high OI
      setupExchangeOIForSymbols({ BTC: 5000000000, ETH: 3750000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          market_cap: 8000000000,
        }),
        createMockCoinGeckoMarketData({
          id: 'ethereum',
          symbol: 'eth',
          name: 'Ethereum',
          market_cap: 6000000000,
        }),
      ]);

      const response = await request(app).get('/api/statistics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalCoins: expect.any(Number),
        filteredCoins: expect.any(Number),
        averageOIToMC: expect.any(Number),
        medianOIToMC: expect.any(Number),
      });
    });

    it('should accept filter parameters', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      const response = await request(app).get('/api/statistics?multiplier=0.7');

      expect(response.status).toBe(200);
    });

    it('should return 500 on internal error', async () => {
      mockCoinGeckoClient.getMarketDataByIds.mockRejectedValue(new Error('Internal error'));

      const response = await request(app).get('/api/statistics');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid filter configuration', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      // multiplier=99 is out of range (max 10)
      const response = await request(app).get('/api/statistics?multiplier=99');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/refresh', () => {
    it('should refresh data successfully', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      const response = await request(app).post('/api/refresh');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return 500 on refresh failure', async () => {
      mockCoinGeckoClient.getMarketDataByIds.mockRejectedValue(new Error('Refresh failed'));

      const response = await request(app).post('/api/refresh');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for invalid routes', async () => {
      const response = await request(app).get('/api/invalid-route');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/refresh')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Express should handle this with 400
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Response Format', () => {
    it('should always include success field', async () => {
      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([]);

      const response = await request(app).get('/api/coins');

      expect(response.body).toHaveProperty('success');
    });

    it('should include error details on failure', async () => {
      mockCoinGeckoClient.getMarketDataByIds.mockRejectedValue(new Error('Test error'));

      const response = await request(app).get('/api/coins');

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});
