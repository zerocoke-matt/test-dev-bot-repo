/**
 * Symbol Mapping Unit Tests
 * Tests for the symbol mapping utilities
 */

import {
  getSymbolMapping,
  getExchangeSymbol,
  getCoinGeckoId,
  getAllBaseSymbols,
  getBaseFromCoinGeckoId,
  SYMBOL_MAPPINGS,
  SymbolMapping,
} from '../../src/config/symbol-mapping';

describe('Symbol Mapping', () => {
  describe('getSymbolMapping', () => {
    it('should return mapping for a known symbol', () => {
      const mapping = getSymbolMapping('BTC');

      expect(mapping).toBeDefined();
      expect(mapping!.base).toBe('BTC');
      expect(mapping!.coingeckoId).toBe('bitcoin');
      expect(mapping!.exchanges.binance).toBe('BTCUSDT');
      expect(mapping!.exchanges.bybit).toBe('BTCUSDT');
      expect(mapping!.exchanges.bitget).toBe('BTCUSDT');
      expect(mapping!.exchanges.okx).toBe('BTC-USDT-SWAP');
    });

    it('should return mapping for ETH', () => {
      const mapping = getSymbolMapping('ETH');

      expect(mapping).toBeDefined();
      expect(mapping!.base).toBe('ETH');
      expect(mapping!.coingeckoId).toBe('ethereum');
      expect(mapping!.exchanges.binance).toBe('ETHUSDT');
      expect(mapping!.exchanges.okx).toBe('ETH-USDT-SWAP');
    });

    it('should return mapping for SOL', () => {
      const mapping = getSymbolMapping('SOL');

      expect(mapping).toBeDefined();
      expect(mapping!.base).toBe('SOL');
      expect(mapping!.coingeckoId).toBe('solana');
    });

    it('should handle case-insensitive lookup', () => {
      const mappingLower = getSymbolMapping('btc');
      const mappingUpper = getSymbolMapping('BTC');
      const mappingMixed = getSymbolMapping('Btc');

      expect(mappingLower).toBeDefined();
      expect(mappingUpper).toBeDefined();
      expect(mappingMixed).toBeDefined();
      expect(mappingLower).toEqual(mappingUpper);
      expect(mappingLower).toEqual(mappingMixed);
    });

    it('should return undefined for unknown symbol', () => {
      const mapping = getSymbolMapping('UNKNOWNCOIN');

      expect(mapping).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const mapping = getSymbolMapping('');

      expect(mapping).toBeUndefined();
    });
  });

  describe('getExchangeSymbol', () => {
    it('should return Binance symbol for BTC', () => {
      const symbol = getExchangeSymbol('BTC', 'binance');

      expect(symbol).toBe('BTCUSDT');
    });

    it('should return Bybit symbol for ETH', () => {
      const symbol = getExchangeSymbol('ETH', 'bybit');

      expect(symbol).toBe('ETHUSDT');
    });

    it('should return Bitget symbol for SOL', () => {
      const symbol = getExchangeSymbol('SOL', 'bitget');

      expect(symbol).toBe('SOLUSDT');
    });

    it('should return OKX symbol (different format)', () => {
      const symbol = getExchangeSymbol('BTC', 'okx');

      expect(symbol).toBe('BTC-USDT-SWAP');
    });

    it('should return OKX symbol for DOGE', () => {
      const symbol = getExchangeSymbol('DOGE', 'okx');

      expect(symbol).toBe('DOGE-USDT-SWAP');
    });

    it('should handle case-insensitive base symbol', () => {
      const symbol = getExchangeSymbol('btc', 'binance');

      expect(symbol).toBe('BTCUSDT');
    });

    it('should return undefined for unknown base symbol', () => {
      const symbol = getExchangeSymbol('UNKNOWNCOIN', 'binance');

      expect(symbol).toBeUndefined();
    });
  });

  describe('getCoinGeckoId', () => {
    it('should return CoinGecko ID for BTC', () => {
      const id = getCoinGeckoId('BTC');

      expect(id).toBe('bitcoin');
    });

    it('should return CoinGecko ID for ETH', () => {
      const id = getCoinGeckoId('ETH');

      expect(id).toBe('ethereum');
    });

    it('should return CoinGecko ID for AVAX (has non-obvious ID)', () => {
      const id = getCoinGeckoId('AVAX');

      expect(id).toBe('avalanche-2');
    });

    it('should return CoinGecko ID for MATIC (has non-obvious ID)', () => {
      const id = getCoinGeckoId('MATIC');

      expect(id).toBe('matic-network');
    });

    it('should handle case-insensitive lookup', () => {
      const id = getCoinGeckoId('btc');

      expect(id).toBe('bitcoin');
    });

    it('should return undefined for unknown symbol', () => {
      const id = getCoinGeckoId('UNKNOWNCOIN');

      expect(id).toBeUndefined();
    });
  });

  describe('getAllBaseSymbols', () => {
    it('should return all base symbols', () => {
      const symbols = getAllBaseSymbols();

      expect(symbols).toBeInstanceOf(Array);
      expect(symbols.length).toBe(SYMBOL_MAPPINGS.length);
    });

    it('should include BTC, ETH, SOL', () => {
      const symbols = getAllBaseSymbols();

      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('SOL');
    });

    it('should include all mapped symbols', () => {
      const symbols = getAllBaseSymbols();

      expect(symbols).toContain('XRP');
      expect(symbols).toContain('DOGE');
      expect(symbols).toContain('ADA');
      expect(symbols).toContain('AVAX');
      expect(symbols).toContain('LINK');
      expect(symbols).toContain('DOT');
      expect(symbols).toContain('MATIC');
      expect(symbols).toContain('UNI');
      expect(symbols).toContain('ATOM');
      expect(symbols).toContain('LTC');
      expect(symbols).toContain('FIL');
      expect(symbols).toContain('ARB');
      expect(symbols).toContain('OP');
      expect(symbols).toContain('APT');
      expect(symbols).toContain('NEAR');
      expect(symbols).toContain('SUI');
      expect(symbols).toContain('PEPE');
    });

    it('should return uppercase symbols', () => {
      const symbols = getAllBaseSymbols();

      symbols.forEach((symbol) => {
        expect(symbol).toBe(symbol.toUpperCase());
      });
    });
  });

  describe('getBaseFromCoinGeckoId', () => {
    it('should return base symbol from CoinGecko ID', () => {
      expect(getBaseFromCoinGeckoId('bitcoin')).toBe('BTC');
      expect(getBaseFromCoinGeckoId('ethereum')).toBe('ETH');
      expect(getBaseFromCoinGeckoId('solana')).toBe('SOL');
    });

    it('should handle non-obvious CoinGecko IDs', () => {
      expect(getBaseFromCoinGeckoId('avalanche-2')).toBe('AVAX');
      expect(getBaseFromCoinGeckoId('matic-network')).toBe('MATIC');
      expect(getBaseFromCoinGeckoId('ripple')).toBe('XRP');
      expect(getBaseFromCoinGeckoId('dogecoin')).toBe('DOGE');
      expect(getBaseFromCoinGeckoId('cardano')).toBe('ADA');
    });

    it('should return undefined for unknown CoinGecko ID', () => {
      expect(getBaseFromCoinGeckoId('nonexistent-coin')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getBaseFromCoinGeckoId('')).toBeUndefined();
    });
  });

  describe('SYMBOL_MAPPINGS structure', () => {
    it('should have all required fields for each mapping', () => {
      SYMBOL_MAPPINGS.forEach((mapping: SymbolMapping) => {
        expect(mapping.base).toBeDefined();
        expect(typeof mapping.base).toBe('string');
        expect(mapping.base.length).toBeGreaterThan(0);

        expect(mapping.coingeckoId).toBeDefined();
        expect(typeof mapping.coingeckoId).toBe('string');
        expect(mapping.coingeckoId.length).toBeGreaterThan(0);

        expect(mapping.exchanges).toBeDefined();
        expect(mapping.exchanges.binance).toBeDefined();
        expect(mapping.exchanges.bybit).toBeDefined();
        expect(mapping.exchanges.bitget).toBeDefined();
        expect(mapping.exchanges.okx).toBeDefined();
      });
    });

    it('should have unique base symbols', () => {
      const baseSymbols = SYMBOL_MAPPINGS.map((m) => m.base);
      const uniqueBaseSymbols = new Set(baseSymbols);

      expect(uniqueBaseSymbols.size).toBe(baseSymbols.length);
    });

    it('should have unique CoinGecko IDs', () => {
      const ids = SYMBOL_MAPPINGS.map((m) => m.coingeckoId);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have OKX symbols in X-USDT-SWAP format', () => {
      SYMBOL_MAPPINGS.forEach((mapping) => {
        expect(mapping.exchanges.okx).toMatch(/-USDT-SWAP$/);
      });
    });

    it('should have Binance symbols ending in USDT', () => {
      SYMBOL_MAPPINGS.forEach((mapping) => {
        expect(mapping.exchanges.binance).toMatch(/USDT$/);
      });
    });
  });
});
