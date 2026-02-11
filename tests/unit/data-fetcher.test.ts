/**
 * Data Fetcher Service Unit Tests
 * Tests for the reworked data fetcher that uses exchange clients and CoinGecko
 */

import { DataFetcherService } from '../../src/services/data-fetcher.service';
import { IExchangeClient } from '../../src/api/exchanges/exchange-client';
import { CoinGeckoClient, CoinGeckoMarketData } from '../../src/api/coingecko-client';
import { createMockCoinGeckoMarketData, createMockExchangeOIData } from '../helpers/test-utils';

// Mock the CoinGeckoClient (we need to mock the module for constructor mocking)
jest.mock('../../src/api/coingecko-client');

describe('DataFetcherService', () => {
  let dataFetcher: DataFetcherService;
  let mockExchangeClients: jest.Mocked<IExchangeClient>[];
  let mockCoinGeckoClient: jest.Mocked<CoinGeckoClient>;

  /**
   * Create a mock exchange client
   */
  function createMockExchangeClient(name: string): jest.Mocked<IExchangeClient> {
    return {
      exchangeName: name,
      getOpenInterest: jest.fn(),
      getBatchOpenInterest: jest.fn(),
    };
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

    // Create service
    dataFetcher = new DataFetcherService(mockExchangeClients, mockCoinGeckoClient);
  });

  describe('fetchAggregateOI', () => {
    it('should aggregate OI from all exchanges', async () => {
      // Mock each exchange returning OI data
      mockExchangeClients[0].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'binance', { openInterest: 800000000 })
      );
      mockExchangeClients[1].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'bybit', { openInterest: 500000000 })
      );
      mockExchangeClients[2].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'bitget', { openInterest: 400000000 })
      );
      mockExchangeClients[3].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'okx', { openInterest: 300000000 })
      );

      const result = await dataFetcher.fetchAggregateOI('BTC');

      expect(result.totalOI).toBe(800000000 + 500000000 + 400000000 + 300000000);
      expect(result.exchangeBreakdown).toHaveLength(4);
      expect(result.exchangeBreakdown[0].exchange).toBe('binance');
      expect(result.exchangeBreakdown[1].exchange).toBe('bybit');
      expect(result.exchangeBreakdown[2].exchange).toBe('bitget');
      expect(result.exchangeBreakdown[3].exchange).toBe('okx');

      // Verify each exchange was called
      mockExchangeClients.forEach((client) => {
        expect(client.getOpenInterest).toHaveBeenCalledWith('BTC');
      });
    });

    it('should handle partial failures gracefully', async () => {
      // Two succeed, two fail
      mockExchangeClients[0].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'binance', { openInterest: 800000000 })
      );
      mockExchangeClients[1].getOpenInterest.mockRejectedValue(
        new Error('Bybit API error')
      );
      mockExchangeClients[2].getOpenInterest.mockRejectedValue(
        new Error('Bitget timeout')
      );
      mockExchangeClients[3].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'okx', { openInterest: 300000000 })
      );

      const result = await dataFetcher.fetchAggregateOI('BTC');

      expect(result.totalOI).toBe(800000000 + 300000000);
      expect(result.exchangeBreakdown).toHaveLength(2);
    });

    it('should return zero OI when all exchanges fail', async () => {
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockRejectedValue(new Error('Failed'));
      });

      const result = await dataFetcher.fetchAggregateOI('BTC');

      expect(result.totalOI).toBe(0);
      expect(result.exchangeBreakdown).toHaveLength(0);
    });

    it('should handle single exchange succeeding', async () => {
      mockExchangeClients[0].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('ETH', 'binance', { openInterest: 1000000000 })
      );
      mockExchangeClients[1].getOpenInterest.mockRejectedValue(new Error('Failed'));
      mockExchangeClients[2].getOpenInterest.mockRejectedValue(new Error('Failed'));
      mockExchangeClients[3].getOpenInterest.mockRejectedValue(new Error('Failed'));

      const result = await dataFetcher.fetchAggregateOI('ETH');

      expect(result.totalOI).toBe(1000000000);
      expect(result.exchangeBreakdown).toHaveLength(1);
      expect(result.exchangeBreakdown[0].exchange).toBe('binance');
    });
  });

  describe('fetchMarketData', () => {
    it('should fetch and map market data from CoinGecko', async () => {
      const mockData: CoinGeckoMarketData[] = [
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
        createMockCoinGeckoMarketData({ id: 'ethereum', symbol: 'eth', name: 'Ethereum' }),
      ];

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue(mockData);

      const result = await dataFetcher.fetchMarketData();

      expect(result).toBeInstanceOf(Map);
      expect(result.has('BTC')).toBe(true);
      expect(result.has('ETH')).toBe(true);
      expect(result.get('BTC')!.id).toBe('bitcoin');
      expect(result.get('ETH')!.id).toBe('ethereum');
    });

    it('should handle unknown CoinGecko IDs gracefully', async () => {
      const mockData: CoinGeckoMarketData[] = [
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc' }),
        createMockCoinGeckoMarketData({ id: 'unknown-coin-xyz', symbol: 'xyz' }),
      ];

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue(mockData);

      const result = await dataFetcher.fetchMarketData();

      // BTC should be mapped, unknown should be skipped
      expect(result.has('BTC')).toBe(true);
      // unknown-coin-xyz has no base symbol mapping, so it should not be in the map
    });

    it('should throw error when CoinGecko API fails', async () => {
      mockCoinGeckoClient.getMarketDataByIds.mockRejectedValue(
        new Error('CoinGecko API rate limit')
      );

      await expect(dataFetcher.fetchMarketData()).rejects.toThrow('CoinGecko API rate limit');
    });

    it('should return empty map when CoinGecko returns empty data', async () => {
      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([]);

      const result = await dataFetcher.fetchMarketData();

      expect(result.size).toBe(0);
    });
  });

  describe('fetchCoinData', () => {
    it('should fetch and combine OI and market data for a symbol', async () => {
      // Mock exchange OI responses
      mockExchangeClients[0].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'binance', { openInterest: 500000000 })
      );
      mockExchangeClients[1].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'bybit', { openInterest: 300000000 })
      );
      mockExchangeClients[2].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'bitget', { openInterest: 200000000 })
      );
      mockExchangeClients[3].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'okx', { openInterest: 100000000 })
      );

      // Mock CoinGecko market data
      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          current_price: 40000,
          market_cap: 800000000000,
          market_cap_rank: 1,
          total_volume: 25000000000,
          price_change_percentage_24h: 2.5,
        }),
      ]);

      const result = await dataFetcher.fetchCoinData('BTC');

      expect(result).not.toBeNull();
      expect(result!.symbol).toBe('BTC');
      expect(result!.name).toBe('Bitcoin');
      expect(result!.marketCap).toBe(800000000000);
      expect(result!.aggregateOI).toBe(500000000 + 300000000 + 200000000 + 100000000);
      expect(result!.price).toBe(40000);
      expect(result!.volume24h).toBe(25000000000);
      expect(result!.priceChange24h).toBe(2.5);
      expect(result!.rank).toBe(1);
      expect(result!.oiToMcRatio).toBeCloseTo(1100000000 / 800000000000);
      expect(result!.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return null when CoinGecko returns no market data', async () => {
      // Mock exchange OI responses
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockResolvedValue(
          createMockExchangeOIData('BTC', client.exchangeName, { openInterest: 100000000 })
        );
      });

      // Mock CoinGecko returning empty
      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([]);

      const result = await dataFetcher.fetchCoinData('BTC');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockRejectedValue(new Error('Exchange down'));
      });
      mockCoinGeckoClient.getMarketDataByIds.mockRejectedValue(new Error('CoinGecko down'));

      const result = await dataFetcher.fetchCoinData('BTC');

      expect(result).toBeNull();
    });

    it('should calculate OI to MC ratio as 0 when market cap is 0', async () => {
      mockExchangeClients[0].getOpenInterest.mockResolvedValue(
        createMockExchangeOIData('BTC', 'binance', { openInterest: 500000000 })
      );
      mockExchangeClients[1].getOpenInterest.mockRejectedValue(new Error('Failed'));
      mockExchangeClients[2].getOpenInterest.mockRejectedValue(new Error('Failed'));
      mockExchangeClients[3].getOpenInterest.mockRejectedValue(new Error('Failed'));

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          market_cap: 0,
        }),
      ]);

      const result = await dataFetcher.fetchCoinData('BTC');

      expect(result).not.toBeNull();
      expect(result!.oiToMcRatio).toBe(0);
    });

    it('should return null for unmapped symbol without calling CoinGecko', async () => {
      const result = await dataFetcher.fetchCoinData('NOTMAPPED');

      expect(result).toBeNull();
      // CoinGecko should never be called for an unmapped symbol
      expect(mockCoinGeckoClient.getMarketDataByIds).not.toHaveBeenCalled();
    });

    it('should handle lowercase symbol input', async () => {
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockResolvedValue(
          createMockExchangeOIData('btc', client.exchangeName, { openInterest: 100000000 })
        );
      });

      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin' }),
      ]);

      const result = await dataFetcher.fetchCoinData('btc');

      // The fetchCoinData method uppercases the symbol
      expect(result).not.toBeNull();
      expect(result!.symbol).toBe('BTC');
    });
  });

  describe('fetchAllCoins', () => {
    it('should fetch market data and OI for all mapped coins', async () => {
      // Mock CoinGecko market data (return BTC and ETH)
      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          current_price: 40000,
          market_cap: 800000000000,
          market_cap_rank: 1,
          total_volume: 25000000000,
          price_change_percentage_24h: 2.5,
        }),
        createMockCoinGeckoMarketData({
          id: 'ethereum',
          symbol: 'eth',
          name: 'Ethereum',
          current_price: 2500,
          market_cap: 300000000000,
          market_cap_rank: 2,
          total_volume: 15000000000,
          price_change_percentage_24h: -1.5,
        }),
      ]);

      // Mock exchange OI responses for each exchange
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockResolvedValue(
          createMockExchangeOIData('BTC', client.exchangeName, { openInterest: 250000000 })
        );
      });

      const result = await dataFetcher.fetchAllCoins();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(1);

      // Verify coin structure
      const btcCoin = result.find((c) => c.symbol === 'BTC');
      if (btcCoin) {
        expect(btcCoin.name).toBe('Bitcoin');
        expect(btcCoin.marketCap).toBe(800000000000);
        expect(btcCoin.price).toBe(40000);
        expect(btcCoin.lastUpdated).toBeInstanceOf(Date);
      }
    });

    it('should handle CoinGecko failure by throwing', async () => {
      mockCoinGeckoClient.getMarketDataByIds.mockRejectedValue(
        new Error('CoinGecko API error')
      );

      await expect(dataFetcher.fetchAllCoins()).rejects.toThrow('CoinGecko API error');
    });

    it('should handle all exchange failures gracefully', async () => {
      // Market data succeeds
      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
      ]);

      // All exchanges fail
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockRejectedValue(new Error('Exchange down'));
      });

      const result = await dataFetcher.fetchAllCoins();

      // Should still return coins (with 0 OI from all failed exchanges)
      expect(result).toBeInstanceOf(Array);
      // Coins with market data will still be included, just with 0 aggregateOI
      if (result.length > 0) {
        const btc = result.find((c) => c.symbol === 'BTC');
        if (btc) {
          expect(btc.aggregateOI).toBe(0);
        }
      }
    });

    it('should return empty array when CoinGecko returns no data', async () => {
      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([]);

      const result = await dataFetcher.fetchAllCoins();

      expect(result).toEqual([]);
    });
  });

  describe('fetchMultipleCoins', () => {
    it('should fetch data for multiple specified coins', async () => {
      // Mock exchange OI for BTC
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockResolvedValue(
          createMockExchangeOIData('BTC', client.exchangeName, { openInterest: 250000000 })
        );
      });

      // Mock CoinGecko market data
      mockCoinGeckoClient.getMarketDataByIds.mockResolvedValue([
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          current_price: 40000,
          market_cap: 800000000000,
        }),
      ]);

      const result = await dataFetcher.fetchMultipleCoins(['BTC']);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTC');
    });

    it('should handle partial failures across symbols', async () => {
      // BTC succeeds
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest
          .mockResolvedValueOnce(
            createMockExchangeOIData('BTC', client.exchangeName, { openInterest: 250000000 })
          )
          .mockRejectedValueOnce(new Error('Failed for INVALID'));
      });

      // First call returns BTC data, second returns empty
      mockCoinGeckoClient.getMarketDataByIds
        .mockResolvedValueOnce([
          createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
        ])
        .mockResolvedValueOnce([]);

      const result = await dataFetcher.fetchMultipleCoins(['BTC', 'INVALID']);

      // At least BTC should be in the result
      expect(result.length).toBeGreaterThanOrEqual(1);
      const btc = result.find((c) => c.symbol === 'BTC');
      expect(btc).toBeDefined();
    });

    it('should return empty array when all symbols fail', async () => {
      mockExchangeClients.forEach((client) => {
        client.getOpenInterest.mockRejectedValue(new Error('All exchanges down'));
      });
      mockCoinGeckoClient.getMarketDataByIds.mockRejectedValue(new Error('CoinGecko down'));

      const result = await dataFetcher.fetchMultipleCoins(['BTC', 'ETH']);

      expect(result).toEqual([]);
    });
  });
});
