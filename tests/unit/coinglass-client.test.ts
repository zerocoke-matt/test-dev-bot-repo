/**
 * Coinglass Client Unit Tests
 * Tests for API client with mocked HTTP responses
 */

import { CoinglassClient } from '../../src/api/coinglass-client';
import { HttpClient } from '../../src/api/http-client';
import { CoinglassConfig } from '../../src/types/config.types';
import {
  createMockApiResponse,
  createMockApiErrorResponse,
  createMockAggregateOI,
  createMockMarketCap,
  createMockCoinListItem,
} from '../helpers/test-utils';

// Mock the HttpClient
jest.mock('../../src/api/http-client');

describe('CoinglassClient', () => {
  let coinglassClient: CoinglassClient;
  let mockHttpClient: jest.Mocked<HttpClient>;

  const testConfig: CoinglassConfig = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.coinglass.com',
    timeout: 10000,
    maxRetries: 3,
    retryDelay: 1000,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create client
    coinglassClient = new CoinglassClient(testConfig);

    // Get mocked HttpClient instance
    mockHttpClient = (coinglassClient as any).httpClient;
  });

  describe('getCoinList', () => {
    it('should fetch coin list successfully', async () => {
      const mockCoins = [
        createMockCoinListItem('BTC'),
        createMockCoinListItem('ETH'),
        createMockCoinListItem('SOL'),
      ];
      const mockResponse = createMockApiResponse(mockCoins);

      mockHttpClient.get.mockResolvedValue({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await coinglassClient.getCoinList();

      expect(result).toEqual(mockCoins);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/coins', {
        headers: { 'CG-API-KEY': testConfig.apiKey },
      });
    });

    it('should handle API error response', async () => {
      const mockErrorResponse = createMockApiErrorResponse('Invalid API key', '401');

      mockHttpClient.get.mockResolvedValue({
        data: mockErrorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await expect(coinglassClient.getCoinList()).rejects.toThrow('Invalid API key');
    });

    it('should handle network error', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      await expect(coinglassClient.getCoinList()).rejects.toThrow('Network error');
    });

    it('should include API key in headers', async () => {
      const mockResponse = createMockApiResponse([]);
      mockHttpClient.get.mockResolvedValue({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await coinglassClient.getCoinList();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'CG-API-KEY': testConfig.apiKey },
        })
      );
    });
  });

  describe('getOpenInterest', () => {
    it('should fetch open interest for a symbol', async () => {
      const mockOI = createMockAggregateOI('BTC');
      const mockResponse = createMockApiResponse(mockOI);

      mockHttpClient.get.mockResolvedValue({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await coinglassClient.getOpenInterest('BTC');

      expect(result).toEqual(mockOI);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/oi/openInterest', {
        headers: { 'CG-API-KEY': testConfig.apiKey },
        params: { symbol: 'BTC' },
      });
    });

    it('should convert symbol to uppercase', async () => {
      const mockOI = createMockAggregateOI('BTC');
      const mockResponse = createMockApiResponse(mockOI);

      mockHttpClient.get.mockResolvedValue({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await coinglassClient.getOpenInterest('btc');

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { symbol: 'BTC' },
        })
      );
    });

    it('should handle API error', async () => {
      const mockErrorResponse = createMockApiErrorResponse('Symbol not found', '404');

      mockHttpClient.get.mockResolvedValue({
        data: mockErrorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await expect(coinglassClient.getOpenInterest('INVALID')).rejects.toThrow('Symbol not found');
    });

    it('should handle timeout error', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Request timeout'));

      await expect(coinglassClient.getOpenInterest('BTC')).rejects.toThrow('Request timeout');
    });
  });

  describe('getMarketCap', () => {
    it('should fetch market cap for a symbol', async () => {
      const mockMC = createMockMarketCap('ETH');
      const mockResponse = createMockApiResponse(mockMC);

      mockHttpClient.get.mockResolvedValue({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await coinglassClient.getMarketCap('ETH');

      expect(result).toEqual(mockMC);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/market/marketcap', {
        headers: { 'CG-API-KEY': testConfig.apiKey },
        params: { symbol: 'ETH' },
      });
    });

    it('should convert symbol to uppercase', async () => {
      const mockMC = createMockMarketCap('ETH');
      const mockResponse = createMockApiResponse(mockMC);

      mockHttpClient.get.mockResolvedValue({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await coinglassClient.getMarketCap('eth');

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { symbol: 'ETH' },
        })
      );
    });

    it('should handle API error', async () => {
      const mockErrorResponse = createMockApiErrorResponse('Rate limit exceeded', '429');

      mockHttpClient.get.mockResolvedValue({
        data: mockErrorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await expect(coinglassClient.getMarketCap('BTC')).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('getBatchOpenInterest', () => {
    it('should fetch OI for multiple symbols', async () => {
      const symbols = ['BTC', 'ETH', 'SOL'];
      const mockResponses = symbols.map((symbol) =>
        createMockApiResponse(createMockAggregateOI(symbol))
      );

      mockHttpClient.get
        .mockResolvedValueOnce({
          data: mockResponses[0],
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        .mockResolvedValueOnce({
          data: mockResponses[1],
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        .mockResolvedValueOnce({
          data: mockResponses[2],
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      const result = await coinglassClient.getBatchOpenInterest(symbols);

      expect(result.size).toBe(3);
      expect(result.has('BTC')).toBe(true);
      expect(result.has('ETH')).toBe(true);
      expect(result.has('SOL')).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures gracefully', async () => {
      const symbols = ['BTC', 'INVALID', 'ETH'];
      const mockBtcResponse = createMockApiResponse(createMockAggregateOI('BTC'));
      const mockEthResponse = createMockApiResponse(createMockAggregateOI('ETH'));
      const mockErrorResponse = createMockApiErrorResponse('Not found', '404');

      mockHttpClient.get
        .mockResolvedValueOnce({
          data: mockBtcResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        .mockResolvedValueOnce({
          data: mockErrorResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        .mockResolvedValueOnce({
          data: mockEthResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      const result = await coinglassClient.getBatchOpenInterest(symbols);

      expect(result.size).toBe(2);
      expect(result.has('BTC')).toBe(true);
      expect(result.has('ETH')).toBe(true);
      expect(result.has('INVALID')).toBe(false);
    });

    it('should handle all failures', async () => {
      const symbols = ['INVALID1', 'INVALID2'];

      mockHttpClient.get.mockRejectedValue(new Error('Not found'));

      const result = await coinglassClient.getBatchOpenInterest(symbols);

      expect(result.size).toBe(0);
    });

    it('should handle empty symbols array', async () => {
      const result = await coinglassClient.getBatchOpenInterest([]);

      expect(result.size).toBe(0);
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });
  });

  describe('getBatchMarketCap', () => {
    it('should fetch market cap for multiple symbols', async () => {
      const symbols = ['BTC', 'ETH', 'SOL'];
      const mockResponses = symbols.map((symbol) =>
        createMockApiResponse(createMockMarketCap(symbol))
      );

      mockHttpClient.get
        .mockResolvedValueOnce({
          data: mockResponses[0],
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        .mockResolvedValueOnce({
          data: mockResponses[1],
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        .mockResolvedValueOnce({
          data: mockResponses[2],
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      const result = await coinglassClient.getBatchMarketCap(symbols);

      expect(result.size).toBe(3);
      expect(result.has('BTC')).toBe(true);
      expect(result.has('ETH')).toBe(true);
      expect(result.has('SOL')).toBe(true);
    });

    it('should handle partial failures gracefully', async () => {
      const symbols = ['BTC', 'INVALID', 'ETH'];
      const mockBtcResponse = createMockApiResponse(createMockMarketCap('BTC'));
      const mockEthResponse = createMockApiResponse(createMockMarketCap('ETH'));

      mockHttpClient.get
        .mockResolvedValueOnce({
          data: mockBtcResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({
          data: mockEthResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      const result = await coinglassClient.getBatchMarketCap(symbols);

      expect(result.size).toBe(2);
      expect(result.has('BTC')).toBe(true);
      expect(result.has('ETH')).toBe(true);
      expect(result.has('INVALID')).toBe(false);
    });

    it('should handle empty symbols array', async () => {
      const result = await coinglassClient.getBatchMarketCap([]);

      expect(result.size).toBe(0);
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw error with API code and message', async () => {
      const mockErrorResponse = createMockApiErrorResponse('Unauthorized', '401');

      mockHttpClient.get.mockResolvedValue({
        data: mockErrorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await expect(coinglassClient.getCoinList()).rejects.toThrow(
        'Coinglass API Error: Unauthorized (401)'
      );
    });

    it('should propagate network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockHttpClient.get.mockRejectedValue(networkError);

      await expect(coinglassClient.getCoinList()).rejects.toThrow('ECONNREFUSED');
    });

    it('should handle malformed responses', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: { invalid: 'response' } as any,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await expect(coinglassClient.getCoinList()).rejects.toThrow();
    });
  });
});
