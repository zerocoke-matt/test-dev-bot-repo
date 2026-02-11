/**
 * CoinGecko Client Unit Tests
 * Tests for CoinGecko API client with mocked HTTP responses
 */

import { CoinGeckoClient, CoinGeckoMarketData } from '../../src/api/coingecko-client';
import { HttpClient } from '../../src/api/http-client';
import { createMockCoinGeckoMarketData } from '../helpers/test-utils';

// Mock the HttpClient
jest.mock('../../src/api/http-client');

describe('CoinGeckoClient', () => {
  let coingeckoClient: CoinGeckoClient;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    coingeckoClient = new CoinGeckoClient(15000);
    mockHttpClient = (coingeckoClient as any).httpClient;
  });

  describe('getMarketData', () => {
    it('should fetch market data successfully with default parameters', async () => {
      const mockData: CoinGeckoMarketData[] = [
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
        createMockCoinGeckoMarketData({ id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 2500, market_cap: 300000000000 }),
      ];

      mockHttpClient.get.mockResolvedValueOnce({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await coingeckoClient.getMarketData();

      expect(result).toEqual(mockData);
      expect(result).toHaveLength(2);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/coins/markets',
        {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 250,
            page: 1,
            sparkline: false,
          },
        }
      );
    });

    it('should accept custom page and perPage parameters', async () => {
      const mockData: CoinGeckoMarketData[] = [
        createMockCoinGeckoMarketData(),
      ];

      mockHttpClient.get.mockResolvedValueOnce({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await coingeckoClient.getMarketData(2, 100);

      expect(result).toEqual(mockData);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/coins/markets',
        {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 100,
            page: 2,
            sparkline: false,
          },
        }
      );
    });

    it('should return empty array when no data', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await coingeckoClient.getMarketData();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw error on API failure', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('CoinGecko API rate limit exceeded'));

      await expect(coingeckoClient.getMarketData()).rejects.toThrow('CoinGecko API rate limit exceeded');
    });

    it('should throw error on network error', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(coingeckoClient.getMarketData()).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('getMarketDataByIds', () => {
    it('should fetch market data for specific IDs', async () => {
      const mockData: CoinGeckoMarketData[] = [
        createMockCoinGeckoMarketData({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
        createMockCoinGeckoMarketData({ id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 2500 }),
      ];

      mockHttpClient.get.mockResolvedValueOnce({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await coingeckoClient.getMarketDataByIds(['bitcoin', 'ethereum']);

      expect(result).toEqual(mockData);
      expect(result).toHaveLength(2);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/coins/markets',
        {
          params: {
            vs_currency: 'usd',
            ids: 'bitcoin,ethereum',
            order: 'market_cap_desc',
            per_page: 250,
            page: 1,
            sparkline: false,
          },
        }
      );
    });

    it('should return empty array for empty IDs array', async () => {
      const result = await coingeckoClient.getMarketDataByIds([]);

      expect(result).toEqual([]);
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should fetch data for a single ID', async () => {
      const mockData: CoinGeckoMarketData[] = [
        createMockCoinGeckoMarketData({ id: 'bitcoin' }),
      ];

      mockHttpClient.get.mockResolvedValueOnce({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await coingeckoClient.getMarketDataByIds(['bitcoin']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('bitcoin');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/coins/markets',
        expect.objectContaining({
          params: expect.objectContaining({
            ids: 'bitcoin',
          }),
        })
      );
    });

    it('should handle partial results (some IDs not found)', async () => {
      // CoinGecko may return fewer results than requested if some IDs are invalid
      const mockData: CoinGeckoMarketData[] = [
        createMockCoinGeckoMarketData({ id: 'bitcoin' }),
      ];

      mockHttpClient.get.mockResolvedValueOnce({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await coingeckoClient.getMarketDataByIds(['bitcoin', 'nonexistent-coin']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('bitcoin');
    });

    it('should throw error on API failure', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('Internal server error'));

      await expect(coingeckoClient.getMarketDataByIds(['bitcoin'])).rejects.toThrow(
        'Internal server error'
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should track requests for rate limiting', async () => {
      // Make multiple rapid requests to verify the client handles rate limiting
      mockHttpClient.get.mockResolvedValue({
        data: [createMockCoinGeckoMarketData()],
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      // First request should go through immediately
      const result = await coingeckoClient.getMarketData();

      expect(result).toHaveLength(1);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it('should maintain internal request time tracking', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      // Execute a request to populate the rate limiter
      await coingeckoClient.getMarketData();

      // The internal requestTimes should have been updated
      const requestTimes = (coingeckoClient as any).requestTimes;
      expect(requestTimes.length).toBe(1);
    });
  });

  describe('Constructor', () => {
    it('should create client with default timeout', () => {
      // Clear previous constructor calls
      (HttpClient as jest.MockedClass<typeof HttpClient>).mockClear();
      void new CoinGeckoClient();

      // Verify HttpClient was instantiated (it's mocked)
      expect(HttpClient).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3',
        15000,
        2,
        2000
      );
    });

    it('should create client with custom timeout', () => {
      (HttpClient as jest.MockedClass<typeof HttpClient>).mockClear();
      void new CoinGeckoClient(30000);

      expect(HttpClient).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3',
        30000,
        2,
        2000
      );
    });
  });

  describe('Data Format', () => {
    it('should return properly structured market data', async () => {
      const mockData: CoinGeckoMarketData[] = [
        createMockCoinGeckoMarketData({
          id: 'bitcoin',
          symbol: 'btc',
          name: 'Bitcoin',
          current_price: 45000,
          market_cap: 850000000000,
          market_cap_rank: 1,
          total_volume: 25000000000,
          price_change_percentage_24h: 3.5,
          circulating_supply: 19500000,
          last_updated: '2024-01-15T12:00:00Z',
        }),
      ];

      mockHttpClient.get.mockResolvedValueOnce({
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await coingeckoClient.getMarketData();

      expect(result[0]).toMatchObject({
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        current_price: 45000,
        market_cap: 850000000000,
        market_cap_rank: 1,
        total_volume: 25000000000,
        price_change_percentage_24h: 3.5,
        circulating_supply: 19500000,
        last_updated: '2024-01-15T12:00:00Z',
      });
    });
  });
});
