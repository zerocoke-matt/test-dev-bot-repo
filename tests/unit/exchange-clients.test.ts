/**
 * Exchange Clients Unit Tests
 * Tests for Binance, Bybit, Bitget, and OKX clients with mocked HTTP responses
 */

import { HttpClient } from '../../src/api/http-client';
import { BinanceClient } from '../../src/api/exchanges/binance-client';
import { BybitClient } from '../../src/api/exchanges/bybit-client';
import { BitgetClient } from '../../src/api/exchanges/bitget-client';
import { OKXClient } from '../../src/api/exchanges/okx-client';
import { IExchangeClient } from '../../src/api/exchanges/exchange-client';

// Mock the HttpClient
jest.mock('../../src/api/http-client');

describe('Exchange Clients', () => {
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper to get the mocked HttpClient from any exchange client
   */
  function getMockHttpClient(client: IExchangeClient): jest.Mocked<HttpClient> {
    return (client as any).httpClient;
  }

  describe('BinanceClient', () => {
    let binanceClient: BinanceClient;

    beforeEach(() => {
      binanceClient = new BinanceClient(10000);
      mockHttpClient = getMockHttpClient(binanceClient);
    });

    it('should have correct exchange name', () => {
      expect(binanceClient.exchangeName).toBe('binance');
    });

    it('should fetch open interest for a known symbol', async () => {
      // Mock OI response
      mockHttpClient.get
        .mockResolvedValueOnce({
          data: { symbol: 'BTCUSDT', openInterest: '5000', time: 1700000000000 },
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        // Mock mark price response
        .mockResolvedValueOnce({
          data: { markPrice: '40000.50' },
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      const result = await binanceClient.getOpenInterest('BTC');

      expect(result.symbol).toBe('BTC');
      expect(result.exchange).toBe('binance');
      expect(result.exchangeSymbol).toBe('BTCUSDT');
      expect(result.openInterest).toBe(5000 * 40000.50);
      expect(result.timestamp).toBe(1700000000000);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/fapi/v1/openInterest',
        { params: { symbol: 'BTCUSDT' } }
      );
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/fapi/v1/premiumIndex',
        { params: { symbol: 'BTCUSDT' } }
      );
    });

    it('should throw error for unknown symbol', async () => {
      await expect(binanceClient.getOpenInterest('UNKNOWNCOIN')).rejects.toThrow(
        'No Binance symbol mapping for UNKNOWNCOIN'
      );
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should handle API error', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(binanceClient.getOpenInterest('BTC')).rejects.toThrow('Network error');
    });

    it('should use Date.now() when time is not in response', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      mockHttpClient.get
        .mockResolvedValueOnce({
          data: { symbol: 'BTCUSDT', openInterest: '100' },
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        .mockResolvedValueOnce({
          data: { markPrice: '50000' },
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      const result = await binanceClient.getOpenInterest('BTC');

      expect(result.timestamp).toBe(now);

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('BybitClient', () => {
    let bybitClient: BybitClient;

    beforeEach(() => {
      bybitClient = new BybitClient(10000);
      mockHttpClient = getMockHttpClient(bybitClient);
    });

    it('should have correct exchange name', () => {
      expect(bybitClient.exchangeName).toBe('bybit');
    });

    it('should fetch open interest for a known symbol', async () => {
      // Mock OI response
      mockHttpClient.get
        .mockResolvedValueOnce({
          data: {
            retCode: 0,
            retMsg: 'OK',
            result: {
              category: 'linear',
              list: [
                { symbol: 'BTCUSDT', openInterest: '3000', timestamp: '1700000000000' },
              ],
            },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        // Mock ticker response
        .mockResolvedValueOnce({
          data: {
            retCode: 0,
            result: {
              list: [{ markPrice: '42000' }],
            },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      const result = await bybitClient.getOpenInterest('BTC');

      expect(result.symbol).toBe('BTC');
      expect(result.exchange).toBe('bybit');
      expect(result.exchangeSymbol).toBe('BTCUSDT');
      expect(result.openInterest).toBe(3000 * 42000);
      expect(result.timestamp).toBe(1700000000000);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/v5/market/open-interest',
        {
          params: {
            category: 'linear',
            symbol: 'BTCUSDT',
            intervalTime: '5min',
            limit: 1,
          },
        }
      );
    });

    it('should throw error for Bybit API error response', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          retCode: 10001,
          retMsg: 'Invalid symbol',
          result: { category: 'linear', list: [] },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await expect(bybitClient.getOpenInterest('BTC')).rejects.toThrow(
        'Bybit API error: Invalid symbol'
      );
    });

    it('should throw error when list is empty', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          retCode: 0,
          retMsg: 'OK',
          result: { category: 'linear', list: [] },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await expect(bybitClient.getOpenInterest('BTC')).rejects.toThrow(
        'No OI data from Bybit for BTC'
      );
    });

    it('should throw error for unknown symbol', async () => {
      await expect(bybitClient.getOpenInterest('UNKNOWNCOIN')).rejects.toThrow(
        'No Bybit symbol mapping for UNKNOWNCOIN'
      );
    });

    it('should handle network error', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(bybitClient.getOpenInterest('BTC')).rejects.toThrow('Connection refused');
    });
  });

  describe('BitgetClient', () => {
    let bitgetClient: BitgetClient;

    beforeEach(() => {
      bitgetClient = new BitgetClient(10000);
      mockHttpClient = getMockHttpClient(bitgetClient);
    });

    it('should have correct exchange name', () => {
      expect(bitgetClient.exchangeName).toBe('bitget');
    });

    it('should fetch open interest for a known symbol', async () => {
      // Mock OI response
      mockHttpClient.get
        .mockResolvedValueOnce({
          data: {
            code: '00000',
            msg: 'success',
            data: { symbol: 'BTCUSDT', amount: '2500' },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        // Mock ticker response
        .mockResolvedValueOnce({
          data: {
            code: '00000',
            data: [{ markPrice: '41000' }],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      const result = await bitgetClient.getOpenInterest('BTC');

      expect(result.symbol).toBe('BTC');
      expect(result.exchange).toBe('bitget');
      expect(result.exchangeSymbol).toBe('BTCUSDT');
      expect(result.openInterest).toBe(2500 * 41000);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/api/v2/mix/market/open-interest',
        {
          params: {
            productType: 'USDT-FUTURES',
            symbol: 'BTCUSDT',
          },
        }
      );
    });

    it('should throw error for Bitget API error response', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          code: '40001',
          msg: 'Unauthorized',
          data: null,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await expect(bitgetClient.getOpenInterest('BTC')).rejects.toThrow(
        'Bitget API error: Unauthorized'
      );
    });

    it('should throw error for unknown symbol', async () => {
      await expect(bitgetClient.getOpenInterest('UNKNOWNCOIN')).rejects.toThrow(
        'No Bitget symbol mapping for UNKNOWNCOIN'
      );
    });

    it('should handle network error', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('Timeout'));

      await expect(bitgetClient.getOpenInterest('BTC')).rejects.toThrow('Timeout');
    });
  });

  describe('OKXClient', () => {
    let okxClient: OKXClient;

    beforeEach(() => {
      okxClient = new OKXClient(10000);
      mockHttpClient = getMockHttpClient(okxClient);
    });

    it('should have correct exchange name', () => {
      expect(okxClient.exchangeName).toBe('okx');
    });

    it('should fetch open interest for a known symbol', async () => {
      // Mock OI response
      mockHttpClient.get
        .mockResolvedValueOnce({
          data: {
            code: '0',
            msg: '',
            data: [
              {
                instId: 'BTC-USDT-SWAP',
                instType: 'SWAP',
                oi: '1500',
                oiCcy: 'BTC',
                ts: '1700000000000',
              },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        // Mock mark price response
        .mockResolvedValueOnce({
          data: {
            code: '0',
            data: [{ markPx: '43000' }],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      const result = await okxClient.getOpenInterest('BTC');

      expect(result.symbol).toBe('BTC');
      expect(result.exchange).toBe('okx');
      expect(result.exchangeSymbol).toBe('BTC-USDT-SWAP');
      expect(result.openInterest).toBe(1500 * 43000);
      expect(result.timestamp).toBe(1700000000000);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/api/v5/public/open-interest',
        {
          params: {
            instType: 'SWAP',
            instId: 'BTC-USDT-SWAP',
          },
        }
      );
    });

    it('should throw error for OKX API error response', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          code: '51001',
          msg: 'Instrument ID does not exist',
          data: [],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await expect(okxClient.getOpenInterest('BTC')).rejects.toThrow(
        'OKX API error: Instrument ID does not exist'
      );
    });

    it('should throw error when data array is empty', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          code: '0',
          msg: '',
          data: [],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await expect(okxClient.getOpenInterest('BTC')).rejects.toThrow(
        'No OI data from OKX for BTC'
      );
    });

    it('should throw error for unknown symbol', async () => {
      await expect(okxClient.getOpenInterest('UNKNOWNCOIN')).rejects.toThrow(
        'No OKX symbol mapping for UNKNOWNCOIN'
      );
    });

    it('should handle network error', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('ECONNRESET'));

      await expect(okxClient.getOpenInterest('BTC')).rejects.toThrow('ECONNRESET');
    });
  });

  describe('Base Exchange Client - getBatchOpenInterest', () => {
    let binanceClient: BinanceClient;

    beforeEach(() => {
      binanceClient = new BinanceClient(10000);
      mockHttpClient = getMockHttpClient(binanceClient);
    });

    it('should fetch OI for multiple symbols', async () => {
      // Use spyOn for reliable concurrent behavior
      jest.spyOn(binanceClient, 'getOpenInterest')
        .mockImplementation(async (symbol: string) => {
          if (symbol === 'BTC') {
            return {
              symbol: 'BTC',
              exchangeSymbol: 'BTCUSDT',
              exchange: 'binance',
              openInterest: 40000000,
              timestamp: 1700000000000,
            };
          }
          if (symbol === 'ETH') {
            return {
              symbol: 'ETH',
              exchangeSymbol: 'ETHUSDT',
              exchange: 'binance',
              openInterest: 12500000,
              timestamp: 1700000000000,
            };
          }
          throw new Error(`Unknown symbol ${symbol}`);
        });

      const result = await binanceClient.getBatchOpenInterest(['BTC', 'ETH']);

      expect(result.size).toBe(2);
      expect(result.has('BTC')).toBe(true);
      expect(result.has('ETH')).toBe(true);

      const btc = result.get('BTC')!;
      expect(btc.symbol).toBe('BTC');
      expect(btc.exchange).toBe('binance');
      expect(btc.openInterest).toBe(40000000);

      const eth = result.get('ETH')!;
      expect(eth.symbol).toBe('ETH');
      expect(eth.exchange).toBe('binance');
      expect(eth.openInterest).toBe(12500000);
    });

    it('should handle partial failures gracefully', async () => {
      // BTC succeeds
      mockHttpClient.get
        .mockResolvedValueOnce({
          data: { symbol: 'BTCUSDT', openInterest: '1000', time: 1700000000000 },
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        .mockResolvedValueOnce({
          data: { markPrice: '40000' },
          status: 200,
          statusText: 'OK',
          headers: {},
        });
      // ETH fails (will be called after BTC's 2 calls)
      // Note: We can't guarantee the exact order with Promise.allSettled, so we
      // need to handle this differently by mocking getOpenInterest
      jest.spyOn(binanceClient, 'getOpenInterest')
        .mockResolvedValueOnce({
          symbol: 'BTC',
          exchangeSymbol: 'BTCUSDT',
          exchange: 'binance',
          openInterest: 40000000,
          timestamp: Date.now(),
        })
        .mockRejectedValueOnce(new Error('ETH fetch failed'));

      const result = await binanceClient.getBatchOpenInterest(['BTC', 'ETH']);

      expect(result.size).toBe(1);
      expect(result.has('BTC')).toBe(true);
      expect(result.has('ETH')).toBe(false);
    });

    it('should handle all failures', async () => {
      jest.spyOn(binanceClient, 'getOpenInterest')
        .mockRejectedValue(new Error('All failed'));

      const result = await binanceClient.getBatchOpenInterest(['BTC', 'ETH']);

      expect(result.size).toBe(0);
    });

    it('should handle empty symbols array', async () => {
      const result = await binanceClient.getBatchOpenInterest([]);

      expect(result.size).toBe(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should track request times for rate limiting', async () => {
      const binanceClient = new BinanceClient(10000);
      mockHttpClient = getMockHttpClient(binanceClient);

      // Mock successful responses
      mockHttpClient.get
        .mockResolvedValue({
          data: { symbol: 'BTCUSDT', openInterest: '100', time: Date.now() },
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      // Mock the mark price response as well
      mockHttpClient.get
        .mockResolvedValueOnce({
          data: { symbol: 'BTCUSDT', openInterest: '100', time: Date.now() },
          status: 200,
          statusText: 'OK',
          headers: {},
        })
        .mockResolvedValueOnce({
          data: { markPrice: '40000' },
          status: 200,
          statusText: 'OK',
          headers: {},
        });

      // Should not throw - rate limiting is internal
      await binanceClient.getOpenInterest('BTC');

      // Verify the client made the expected calls
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });
  });
});
