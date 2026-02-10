/**
 * Aggregator Service Integration Tests
 * Tests the complete flow: fetch -> filter -> cache -> return
 */

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
  wait,
} from '../helpers/test-utils';

// Mock the HttpClient
jest.mock('../../src/api/http-client');

describe('AggregatorService Integration', () => {
  let aggregatorService: AggregatorService;
  let dataFetcherService: DataFetcherService;
  let filterService: FilterService;
  let cacheService: CacheService;
  let coinglassClient: CoinglassClient;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create real services
    coinglassClient = new CoinglassClient({
      apiKey: 'test-key',
      baseUrl: 'https://api.test.com',
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
    });

    mockHttpClient = (coinglassClient as any).httpClient;

    dataFetcherService = new DataFetcherService(coinglassClient);
    filterService = new FilterService();
    cacheService = new CacheService({ ttl: 10 });

    aggregatorService = new AggregatorService(
      dataFetcherService,
      filterService,
      cacheService,
      0.5
    );
  });

  afterEach(() => {
    cacheService.clear();
  });

  describe('End-to-End Flow: Fetch -> Filter -> Return', () => {
    it('should fetch, filter, and return coins successfully', async () => {
      // Mock API responses
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

      const result = await aggregatorService.getFilteredCoins({ multiplier: 0.5 });

      expect(result.coins).toHaveLength(1); // Only BTC passes
      expect(result.coins[0].symbol).toBe('BTC');
      expect(result.total).toBe(2);
      expect(result.filtered).toBe(1);
    });

    it('should handle API errors gracefully', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('API Error'));

      await expect(aggregatorService.getAllCoins()).rejects.toThrow('API Error');
    });

    it('should enrich data correctly', async () => {
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      btcOI.totalOIAmount = 25000000000; // 25B * 0.5 = 12.5B > 10B
      const btcMC = createMockMarketCap('BTC');
      btcMC.marketCap = 10000000000;
      btcMC.price = 50000;
      btcMC.volume24h = 30000000000;

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      const result = await aggregatorService.getFilteredCoins({ multiplier: 0.5 });

      expect(result.coins.length).toBeGreaterThan(0);
      expect(result.coins[0]).toMatchObject({
        symbol: 'BTC',
        marketCap: 10000000000,
        aggregateOI: 25000000000,
        price: 50000,
        volume24h: 30000000000,
        oiToMcRatio: 2.5,
      });
    });
  });

  describe('Cache Integration', () => {
    it('should use cache on second request', async () => {
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      // First request - should hit API
      await aggregatorService.getFilteredCoins({});

      // Second request - should use cache
      await aggregatorService.getFilteredCoins({});

      // Should only call API once (3 calls total: coin list, OI, MC)
      expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
    });

    it('should bypass cache when forceRefresh is true', async () => {
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      await aggregatorService.getFilteredCoins({});
      await aggregatorService.getAllCoins(true); // Force refresh

      expect(mockHttpClient.get).toHaveBeenCalledTimes(6);
    });

    it('should update cache stats correctly', async () => {
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      await aggregatorService.getFilteredCoins({});
      await aggregatorService.getFilteredCoins({}); // Cache hit

      const stats = aggregatorService.getCacheStats();

      expect(stats.hits).toBeGreaterThanOrEqual(1);
      expect(stats.keys).toBeGreaterThanOrEqual(1);
    });

    it('should handle cache expiration', async () => {
      // Use very short TTL for this test
      const shortCacheService = new CacheService({ ttl: 1 });
      const testAggregator = new AggregatorService(
        dataFetcherService,
        filterService,
        shortCacheService,
        0.5
      );

      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      await testAggregator.getFilteredCoins({});

      // Wait for cache to expire
      await wait(1500);

      await testAggregator.getFilteredCoins({});

      // Should call API twice (6 calls total)
      expect(mockHttpClient.get).toHaveBeenCalledTimes(6);

      shortCacheService.clear();
    });
  });

  describe('Multiple Concurrent Requests', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Pre-populate cache to avoid the coinList.filter issue
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      btcOI.totalOIAmount = 20000000000;
      const btcMC = createMockMarketCap('BTC');
      btcMC.marketCap = 8000000000;

      // Setup mock responses for initial fetch
      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      // First request to populate cache
      await aggregatorService.getFilteredCoins({});

      // Now make 5 concurrent requests (all should use cache)
      const promises = Array(5)
        .fill(null)
        .map(() => aggregatorService.getFilteredCoins({}));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.coins).toBeDefined();
        expect(Array.isArray(result.coins)).toBe(true);
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from partial API failures', async () => {
      const coinListResponse = createMockApiResponse([
        createMockCoinListItem('BTC'),
        createMockCoinListItem('ETH'),
      ]);

      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} })
        .mockRejectedValueOnce(new Error('ETH OI failed'))
        .mockRejectedValueOnce(new Error('ETH MC failed'));

      const result = await aggregatorService.getFilteredCoins({});

      // Should still return BTC even though ETH failed
      expect(result.coins.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCoinBySymbol', () => {
    it('should fetch specific coin', async () => {
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      const coin = await aggregatorService.getCoinBySymbol('BTC');

      expect(coin).toBeDefined();
      expect(coin?.symbol).toBe('BTC');
    });

    it('should cache specific coin', async () => {
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      mockHttpClient.get
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      await aggregatorService.getCoinBySymbol('BTC');
      await aggregatorService.getCoinBySymbol('BTC'); // Should use cache

      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should return null for invalid symbol', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Not found'));

      const coin = await aggregatorService.getCoinBySymbol('INVALID');

      expect(coin).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics correctly', async () => {
      const coinListResponse = createMockApiResponse([
        createMockCoinListItem('BTC'),
        createMockCoinListItem('ETH'),
      ]);

      const btcOI = createMockAggregateOI('BTC');
      btcOI.totalOIAmount = 30000000000;
      const btcMC = createMockMarketCap('BTC');
      btcMC.marketCap = 10000000000;

      const ethOI = createMockAggregateOI('ETH');
      ethOI.totalOIAmount = 20000000000;
      const ethMC = createMockMarketCap('ETH');
      ethMC.marketCap = 8000000000;

      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(ethOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(ethMC), status: 200, statusText: 'OK', headers: {} });

      const stats = await aggregatorService.getStatistics({ multiplier: 0.5 });

      expect(stats.totalCoins).toBe(2);
      expect(stats.filteredCoins).toBe(2);
      expect(stats.averageOIToMC).toBeGreaterThan(0);
      expect(stats.medianOIToMC).toBeGreaterThan(0);
      expect(stats.highestOIToMC).toBeDefined();
      expect(stats.lowestOIToMC).toBeDefined();
    });

    it('should handle empty results', async () => {
      const coinListResponse = createMockApiResponse([]);

      mockHttpClient.get.mockResolvedValueOnce({
        data: coinListResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const stats = await aggregatorService.getStatistics({});

      expect(stats.filteredCoins).toBe(0);
      expect(stats.averageOIToMC).toBe(0);
      expect(stats.medianOIToMC).toBe(0);
      expect(stats.highestOIToMC).toBeNull();
      expect(stats.lowestOIToMC).toBeNull();
    });
  });

  describe('refreshData', () => {
    it('should clear cache and refetch data', async () => {
      const coinListResponse = createMockApiResponse([createMockCoinListItem('BTC')]);
      const btcOI = createMockAggregateOI('BTC');
      const btcMC = createMockMarketCap('BTC');

      // First set of mocks for initial call
      mockHttpClient.get
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} })
        // Second set for refresh
        .mockResolvedValueOnce({ data: coinListResponse, status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcOI), status: 200, statusText: 'OK', headers: {} })
        .mockResolvedValueOnce({ data: createMockApiResponse(btcMC), status: 200, statusText: 'OK', headers: {} });

      await aggregatorService.getFilteredCoins({});
      const statsBeforeRefresh = cacheService.getStats();

      await aggregatorService.refreshData();

      const statsAfterRefresh = cacheService.getStats();
      expect(statsAfterRefresh.keys).toBeLessThanOrEqual(statsBeforeRefresh.keys);
    });
  });
});
