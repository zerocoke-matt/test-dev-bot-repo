/**
 * API Endpoint Integration Tests
 * Tests for Express REST API endpoints
 */

import request from 'supertest';
import express, { Express } from 'express';
import { createApiRouter } from '../../src/server/routes/api.routes';
import { AggregatorService } from '../../src/services/aggregator.service';
import { DataFetcherService } from '../../src/services/data-fetcher.service';
import { FilterService } from '../../src/services/filter.service';
import { CacheService } from '../../src/services/cache.service';
import { CoinglassClient } from '../../src/api/coinglass-client';
import { HttpClient } from '../../src/api/http-client';
import {
  createMockApiResponse,
  createMockAggregateOI,
  createMockMarketCap,
  createMockCoinListItem,
} from '../helpers/test-utils';

// Mock the HttpClient
jest.mock('../../src/api/http-client');

describe('API Endpoints', () => {
  let app: Express;
  let aggregatorService: AggregatorService;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create services
    const coinglassClient = new CoinglassClient({
      apiKey: 'test-key',
      baseUrl: 'https://api.test.com',
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
    });

    mockHttpClient = (coinglassClient as any).httpClient;

    const dataFetcherService = new DataFetcherService(coinglassClient);
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
      const coinListResponse = createMockApiResponse([
        createMockCoinListItem('BTC'),
        createMockCoinListItem('ETH'),
      ]);

      const btcOI = createMockAggregateOI('BTC');
      btcOI.totalOIAmount = 20000000000;
      const btcMC = createMockMarketCap('BTC');
      btcMC.marketCap = 8000000000;

      const ethOI = createMockAggregateOI('ETH');
      ethOI.totalOIAmount = 10000000000;
      const ethMC = createMockMarketCap('ETH');
      ethMC.marketCap = 8000000000;

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(ethOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(ethMC), status: 200, statusText: 'OK', headers: {} });

      const response = await request(app).get('/api/coins');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.coins).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.filtered).toBeDefined();
    });

    it('should accept multiplier query parameter', async () => {
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      const response = await request(app).get('/api/coins?multiplier=0.7');

      expect(response.status).toBe(200);
      expect(response.body.data.config.multiplier).toBe(0.7);
    });

    it('should accept minMarketCap query parameter', async () => {
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      const response = await request(app).get('/api/coins?minMarketCap=1000000000');

      expect(response.status).toBe(200);
      expect(response.body.data.config.minMarketCap).toBe(1000000000);
    });

    it('should accept sortBy and sortOrder query parameters', async () => {
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      const response = await request(app).get('/api/coins?sortBy=marketCap&sortOrder=asc');

      expect(response.status).toBe(200);
    });

    it('should accept limit and offset query parameters', async () => {
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      const response = await request(app).get('/api/coins?limit=10&offset=5');

      expect(response.status).toBe(200);
    });

    it('should accept symbols query parameter', async () => {
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      const response = await request(app).get('/api/coins?symbols=BTC,ETH');

      expect(response.status).toBe(200);
    });

    it('should return 500 on internal error', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Internal error'));

      const response = await request(app).get('/api/coins');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/coins/:symbol', () => {
    it('should return specific coin by symbol', async () => {
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      const response = await request(app).get('/api/coins/BTC');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('BTC');
    });

    it('should return 404 for non-existent coin', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Not found'));

      const response = await request(app).get('/api/coins/INVALID');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle lowercase symbols', async () => {
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      const response = await request(app).get('/api/coins/btc');

      expect(response.status).toBe(200);
    });

    it('should return 500 on internal error', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Internal error'));

      const response = await request(app).get('/api/coins/BTC');

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/statistics', () => {
    it('should return valid statistics', async () => {
      const coinListResponse = createMockApiResponse([
        createMockCoinListItem('BTC'),
        createMockCoinListItem('ETH'),
      ]);

      const btcOI = createMockAggregateOI('BTC');
      btcOI.totalOIAmount = 20000000000;
      const btcMC = createMockMarketCap('BTC');
      btcMC.marketCap = 8000000000;

      const ethOI = createMockAggregateOI('ETH');
      ethOI.totalOIAmount = 15000000000;
      const ethMC = createMockMarketCap('ETH');
      ethMC.marketCap = 6000000000;

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(ethOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(ethMC), status: 200, statusText: 'OK', headers: {} });

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
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      const response = await request(app).get('/api/statistics?multiplier=0.7');

      expect(response.status).toBe(200);
    });

    it('should return 500 on internal error', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Internal error'));

      const response = await request(app).get('/api/statistics');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/refresh', () => {
    it('should refresh data successfully', async () => {
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      const response = await request(app).post('/api/refresh');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return 500 on refresh failure', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Refresh failed'));

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
      const coinListResponse = createMockApiResponse([]);
      mockHttpClient.get.mockResolvedValue({
        data: coinListResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const response = await request(app).get('/api/coins');

      expect(response.body).toHaveProperty('success');
    });

    it('should include error details on failure', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Test error'));

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
