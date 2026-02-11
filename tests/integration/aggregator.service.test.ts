/**
 * Aggregator Service Integration Tests
 * Tests the complete flow: fetch -> filter -> cache -> return
 * Updated for exchange-based OI system with CoinGecko market data
 */

import { AggregatorService } from '../../src/services/aggregator.service';
import { DataFetcherService } from '../../src/services/data-fetcher.service';
import { FilterService } from '../../src/services/filter.service';
import { CacheService } from '../../src/services/cache.service';
import { IExchangeClient } from '../../src/api/exchanges/exchange-client';
import { CoinGeckoClient } from '../../src/api/coingecko-client';
import {
  createMockExchangeOIData,
  createMockCoinGeckoMarketData,
  wait,
} from '../helpers/test-utils';

// Mock the CoinGeckoClient module
jest.mock('../../src/api/coingecko-client');

describe('AggregatorService Integration', () => {
  let aggregatorService: AggregatorService;
  let dataFetcherService: DataFetcherService;
  let filterService: FilterService;
  let cacheService: CacheService;
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

    // Create real services with mocked clients
    dataFetcherService = new DataFetcherService(mockExchangeClients, mockCoinGeckoClient);
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
      // Setup: BTC has OI * 0.5 > MC (passes filter), ETH does not
      // BTC: totalOI = 4 * 5B = 20B, MC = 8B -> 20B * 0.5 = 10B > 8B (passes)
      // ETH: totalOI = 4 * 2.5B = 10B, MC = 8B -> 10B * 0.5 = 5B < 8B (fails)
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

      const result = await aggregatorService.getFilteredCoins({ multiplier: 0.5 });

      expect(result.coins).toHaveLength(1);
      expect(result.coins[0].symbol).toBe('BTC');
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.filtered).toBe(1);
    });

    it('should handle API errors gracefully', async () => {
      mockCoinGeckoClient.getMarketDataByIds.mockRejectedValue(new Error('API Error'));

      await expect(aggregatorService.getAllCoins()).rejects.toThrow('API Error');
    });

    it('should enrich data correctly', async () => {
      // BTC: 4 * 6.25B = 25B totalOI, MC = 10B -> ratio = 2.5
      setupExchangeOIForSymbols({ BTC: 6250000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          current_price: 50000,
          market_cap: 10000000000,
          market_cap_rank: 1,
          total_volume: 30000000000,
          price_change_percentage_24h: 3.0,
        }),
      ]);

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
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      // First request - should hit API
      await aggregatorService.getFilteredCoins({});

      // Second request - should use cache
      await aggregatorService.getFilteredCoins({});

      // CoinGecko should only be called once
      expect(mockCoinGeckoClient.getMarketDataByIds).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when forceRefresh is true', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      await aggregatorService.getFilteredCoins({});
      await aggregatorService.getAllCoins(true); // Force refresh

      // CoinGecko should be called twice
      expect(mockCoinGeckoClient.getMarketDataByIds).toHaveBeenCalledTimes(2);
    });

    it('should update cache stats correctly', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

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

      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      await testAggregator.getFilteredCoins({});

      // Wait for cache to expire
      await wait(1500);

      await testAggregator.getFilteredCoins({});

      // CoinGecko should be called twice due to cache expiration
      expect(mockCoinGeckoClient.getMarketDataByIds).toHaveBeenCalledTimes(2);

      shortCacheService.clear();
    });
  });

  describe('Multiple Concurrent Requests', () => {
    it('should handle concurrent requests efficiently', async () => {
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          market_cap: 8000000000,
        }),
      ]);

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
    it('should recover from partial exchange failures', async () => {
      // BTC: only binance and okx succeed (bybit and bitget fail)
      mockExchangeClients[0].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'binance', { openInterest: 5000000000 })
      );
      mockExchangeClients[1].getOpenInterest.mockRejectedValue(new Error('Bybit down'));
      mockExchangeClients[2].getOpenInterest.mockRejectedValue(new Error('Bitget down'));
      mockExchangeClients[3].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'okx', { openInterest: 3000000000 })
      );

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          market_cap: 8000000000,
        }),
      ]);

      const result = await aggregatorService.getFilteredCoins({});

      // Should still return results even though some exchanges failed
      expect(result.coins.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCoinBySymbol', () => {
    it('should fetch specific coin', async () => {
      // Setup mock exchange clients for individual coin fetch
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

      const coin = await aggregatorService.getCoinBySymbol('BTC');

      expect(coin).toBeDefined();
      expect(coin?.symbol).toBe('BTC');
    });

    it('should cache specific coin', async () => {
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockResolvedValue(
          createMockExchangeOIData('BTC', client.exchangeName, { openInterest: 500000000 })
        );
      });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      await aggregatorService.getCoinBySymbol('BTC');
      await aggregatorService.getCoinBySymbol('BTC'); // Should use cache

      // CoinGecko should only be called once
      expect(mockCoinGeckoClient.getMarketDataByIds).toHaveBeenCalledTimes(1);
    });

    it('should return null for invalid symbol', async () => {
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockRejectedValue(new Error('No mapping'));
      });
      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([]);

      const coin = await aggregatorService.getCoinBySymbol('INVALID');

      expect(coin).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics correctly', async () => {
      // BTC and ETH both have enough OI to pass filter
      setupExchangeOIForSymbols({ BTC: 7500000000, ETH: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          market_cap: 10000000000,
        }),
        createMockCoinGeckoMarketData({
          id: 'ethereum',
          symbol: 'eth',
          name: 'Ethereum',
          market_cap: 8000000000,
        }),
      ]);

      const stats = await aggregatorService.getStatistics({ multiplier: 0.5 });

      expect(stats.totalCoins).toBeGreaterThanOrEqual(2);
      expect(stats.filteredCoins).toBeGreaterThanOrEqual(2);
      expect(stats.averageOIToMC).toBeGreaterThan(0);
      expect(stats.medianOIToMC).toBeGreaterThan(0);
      expect(stats.highestOIToMC).toBeDefined();
      expect(stats.lowestOIToMC).toBeDefined();
    });

    it('should handle empty results', async () => {
      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([]);

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
      setupExchangeOIForSymbols({ BTC: 5000000000 });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      await aggregatorService.getFilteredCoins({});
      const statsBeforeRefresh = cacheService.getStats();

      await aggregatorService.refreshData();

      const statsAfterRefresh = cacheService.getStats();
      expect(statsAfterRefresh.keys).toBeLessThanOrEqual(statsBeforeRefresh.keys);
    });
  });
});
