/**
 * Filter Service Unit Tests
 * Comprehensive tests for the filtering logic
 */

import { FilterService } from '../../src/services/filter.service';
import { createMockCoin, createMockCoins, createMockFilterConfig } from '../helpers/test-utils';

describe('FilterService', () => {
  let filterService: FilterService;

  beforeEach(() => {
    filterService = new FilterService();
  });

  describe('passesCriteria', () => {
    describe('Main Filter Logic: (OI * multiplier) > MC', () => {
      it('should pass filter when (OI * 0.5) > MC', () => {
        const coin = createMockCoin({
          aggregateOI: 20000000000,
          marketCap: 8000000000,
        });
        const config = createMockFilterConfig({ multiplier: 0.5 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(true);
        // 20B * 0.5 = 10B > 8B (market cap)
      });

      it('should fail filter when (OI * 0.5) <= MC', () => {
        const coin = createMockCoin({
          aggregateOI: 10000000000,
          marketCap: 8000000000,
        });
        const config = createMockFilterConfig({ multiplier: 0.5 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(false);
        // 10B * 0.5 = 5B <= 8B (market cap)
      });

      it('should fail filter when (OI * 0.5) equals MC (exact equality)', () => {
        const coin = createMockCoin({
          aggregateOI: 16000000000,
          marketCap: 8000000000,
        });
        const config = createMockFilterConfig({ multiplier: 0.5 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(false);
        // 16B * 0.5 = 8B = 8B (not greater than)
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero market cap', () => {
        const coin = createMockCoin({
          aggregateOI: 1000000000,
          marketCap: 0,
        });
        const config = createMockFilterConfig({ multiplier: 0.5 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(true);
        // 1B * 0.5 = 500M > 0
      });

      it('should handle zero OI', () => {
        const coin = createMockCoin({
          aggregateOI: 0,
          marketCap: 1000000000,
        });
        const config = createMockFilterConfig({ multiplier: 0.5 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(false);
        // 0 * 0.5 = 0 <= 1B
      });

      it('should handle both zero values', () => {
        const coin = createMockCoin({
          aggregateOI: 0,
          marketCap: 0,
        });
        const config = createMockFilterConfig({ multiplier: 0.5 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(false);
        // 0 * 0.5 = 0 = 0 (not greater than)
      });

      it('should handle negative market cap', () => {
        const coin = createMockCoin({
          aggregateOI: 1000000000,
          marketCap: -500000000,
        });
        const config = createMockFilterConfig({ multiplier: 0.5 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(true);
        // 1B * 0.5 = 500M > -500M
      });

      it('should handle negative OI', () => {
        const coin = createMockCoin({
          aggregateOI: -1000000000,
          marketCap: 500000000,
        });
        const config = createMockFilterConfig({ multiplier: 0.5 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(false);
        // -1B * 0.5 = -500M <= 500M
      });

      it('should handle very large numbers (billions)', () => {
        const coin = createMockCoin({
          aggregateOI: 999999999999999,
          marketCap: 500000000000000,
        });
        const config = createMockFilterConfig({ multiplier: 0.5 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(false);
        // 999.99T * 0.5 = 499.99T <= 500T
      });

      it('should handle very small numbers (decimals)', () => {
        const coin = createMockCoin({
          aggregateOI: 0.0002,
          marketCap: 0.00005,
        });
        const config = createMockFilterConfig({ multiplier: 0.5 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(true);
        // 0.0002 * 0.5 = 0.0001 > 0.00005
      });
    });

    describe('Custom Multiplier Values', () => {
      it('should work with multiplier 0.3', () => {
        const coin = createMockCoin({
          aggregateOI: 40000000000,
          marketCap: 10000000000,
        });
        const config = createMockFilterConfig({ multiplier: 0.3 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(true);
        // 40B * 0.3 = 12B > 10B
      });

      it('should work with multiplier 0.8', () => {
        const coin = createMockCoin({
          aggregateOI: 15000000000,
          marketCap: 10000000000,
        });
        const config = createMockFilterConfig({ multiplier: 0.8 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(true);
        // 15B * 0.8 = 12B > 10B
      });

      it('should work with multiplier 1.0', () => {
        const coin = createMockCoin({
          aggregateOI: 15000000000,
          marketCap: 10000000000,
        });
        const config = createMockFilterConfig({ multiplier: 1.0 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(true);
        // 15B * 1.0 = 15B > 10B
      });

      it('should work with multiplier 0 (edge case)', () => {
        const coin = createMockCoin({
          aggregateOI: 15000000000,
          marketCap: 10000000000,
        });
        const config = createMockFilterConfig({ multiplier: 0 });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(false);
        // 15B * 0 = 0 <= 10B
      });
    });

    describe('Optional Filters', () => {
      it('should filter by minimum market cap', () => {
        const coin = createMockCoin({
          aggregateOI: 20000000000,
          marketCap: 5000000000,
        });
        const config = createMockFilterConfig({
          multiplier: 0.5,
          minMarketCap: 10000000000,
        });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(false);
        // Passes main filter but fails minMarketCap
      });

      it('should filter by maximum market cap', () => {
        const coin = createMockCoin({
          aggregateOI: 20000000000,
          marketCap: 5000000000,
        });
        const config = createMockFilterConfig({
          multiplier: 0.5,
          maxMarketCap: 3000000000,
        });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(false);
        // Passes main filter but fails maxMarketCap
      });

      it('should filter by minimum OI', () => {
        const coin = createMockCoin({
          aggregateOI: 5000000000,
          marketCap: 2000000000,
        });
        const config = createMockFilterConfig({
          multiplier: 0.5,
          minOI: 10000000000,
        });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(false);
        // Passes main filter but fails minOI
      });

      it('should filter by specific symbols', () => {
        const coin = createMockCoin({
          symbol: 'ETH',
          aggregateOI: 20000000000,
          marketCap: 5000000000,
        });
        const config = createMockFilterConfig({
          multiplier: 0.5,
          symbols: ['BTC', 'SOL'],
        });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(false);
        // Passes main filter but symbol not in allowed list
      });

      it('should pass when symbol is in allowed list', () => {
        const coin = createMockCoin({
          symbol: 'BTC',
          aggregateOI: 20000000000,
          marketCap: 5000000000,
        });
        const config = createMockFilterConfig({
          multiplier: 0.5,
          symbols: ['BTC', 'ETH'],
        });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(true);
      });

      it('should handle case-insensitive symbol matching', () => {
        const coin = createMockCoin({
          symbol: 'btc',
          aggregateOI: 20000000000,
          marketCap: 5000000000,
        });
        const config = createMockFilterConfig({
          multiplier: 0.5,
          symbols: ['BTC', 'ETH'],
        });

        const result = filterService.passesCriteria(coin, config);

        expect(result).toBe(true);
      });
    });
  });

  describe('filterCoins', () => {
    it('should filter array of coins correctly', () => {
      const coins = [
        createMockCoin({ symbol: 'BTC', aggregateOI: 20000000000, marketCap: 8000000000 }),
        createMockCoin({ symbol: 'ETH', aggregateOI: 10000000000, marketCap: 8000000000 }),
        createMockCoin({ symbol: 'SOL', aggregateOI: 30000000000, marketCap: 10000000000 }),
      ];
      const config = createMockFilterConfig({ multiplier: 0.5 });

      const result = filterService.filterCoins(coins, config);

      expect(result.coins).toHaveLength(2); // BTC and SOL pass
      expect(result.total).toBe(3);
      expect(result.filtered).toBe(2);
      expect(result.coins.map((c) => c.symbol)).toEqual(['BTC', 'SOL']);
    });

    it('should return empty array when no coins pass', () => {
      const coins = createMockCoins(3);
      coins.forEach((coin) => {
        coin.aggregateOI = 1000000000;
        coin.marketCap = 10000000000;
      });
      const config = createMockFilterConfig({ multiplier: 0.5 });

      const result = filterService.filterCoins(coins, config);

      expect(result.coins).toHaveLength(0);
      expect(result.total).toBe(3);
      expect(result.filtered).toBe(0);
    });

    it('should return all coins when all pass', () => {
      const coins = createMockCoins(5);
      coins.forEach((coin) => {
        coin.aggregateOI = 100000000000;
        coin.marketCap = 10000000000;
      });
      const config = createMockFilterConfig({ multiplier: 0.5 });

      const result = filterService.filterCoins(coins, config);

      expect(result.coins).toHaveLength(5);
      expect(result.total).toBe(5);
      expect(result.filtered).toBe(5);
    });

    it('should include correct config and timestamp in result', () => {
      const coins = createMockCoins(2);
      const config = createMockFilterConfig({ multiplier: 0.7 });

      const result = filterService.filterCoins(coins, config);

      expect(result.config).toEqual(config);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('sortCoins', () => {
    it('should sort by oiToMcRatio descending', () => {
      const coins = [
        createMockCoin({ symbol: 'A', oiToMcRatio: 1.5 }),
        createMockCoin({ symbol: 'B', oiToMcRatio: 2.5 }),
        createMockCoin({ symbol: 'C', oiToMcRatio: 0.5 }),
      ];

      const sorted = filterService.sortCoins(coins, 'oiToMcRatio', 'desc');

      expect(sorted.map((c) => c.symbol)).toEqual(['B', 'A', 'C']);
    });

    it('should sort by oiToMcRatio ascending', () => {
      const coins = [
        createMockCoin({ symbol: 'A', oiToMcRatio: 1.5 }),
        createMockCoin({ symbol: 'B', oiToMcRatio: 2.5 }),
        createMockCoin({ symbol: 'C', oiToMcRatio: 0.5 }),
      ];

      const sorted = filterService.sortCoins(coins, 'oiToMcRatio', 'asc');

      expect(sorted.map((c) => c.symbol)).toEqual(['C', 'A', 'B']);
    });

    it('should sort by marketCap', () => {
      const coins = [
        createMockCoin({ symbol: 'A', marketCap: 5000000000 }),
        createMockCoin({ symbol: 'B', marketCap: 10000000000 }),
        createMockCoin({ symbol: 'C', marketCap: 2000000000 }),
      ];

      const sorted = filterService.sortCoins(coins, 'marketCap', 'desc');

      expect(sorted.map((c) => c.symbol)).toEqual(['B', 'A', 'C']);
    });

    it('should sort by aggregateOI', () => {
      const coins = [
        createMockCoin({ symbol: 'A', aggregateOI: 5000000000 }),
        createMockCoin({ symbol: 'B', aggregateOI: 10000000000 }),
        createMockCoin({ symbol: 'C', aggregateOI: 2000000000 }),
      ];

      const sorted = filterService.sortCoins(coins, 'aggregateOI', 'desc');

      expect(sorted.map((c) => c.symbol)).toEqual(['B', 'A', 'C']);
    });

    it('should sort by volume24h', () => {
      const coins = [
        createMockCoin({ symbol: 'A', volume24h: 5000000000 }),
        createMockCoin({ symbol: 'B', volume24h: 10000000000 }),
        createMockCoin({ symbol: 'C', volume24h: 2000000000 }),
      ];

      const sorted = filterService.sortCoins(coins, 'volume24h', 'desc');

      expect(sorted.map((c) => c.symbol)).toEqual(['B', 'A', 'C']);
    });

    it('should sort by priceChange24h', () => {
      const coins = [
        createMockCoin({ symbol: 'A', priceChange24h: 2.5 }),
        createMockCoin({ symbol: 'B', priceChange24h: -1.5 }),
        createMockCoin({ symbol: 'C', priceChange24h: 5.0 }),
      ];

      const sorted = filterService.sortCoins(coins, 'priceChange24h', 'desc');

      expect(sorted.map((c) => c.symbol)).toEqual(['C', 'A', 'B']);
    });

    it('should not mutate original array', () => {
      const coins = [
        createMockCoin({ symbol: 'A', oiToMcRatio: 1.5 }),
        createMockCoin({ symbol: 'B', oiToMcRatio: 2.5 }),
      ];
      const originalOrder = coins.map((c) => c.symbol);

      filterService.sortCoins(coins, 'oiToMcRatio', 'desc');

      expect(coins.map((c) => c.symbol)).toEqual(originalOrder);
    });
  });

  describe('paginateCoins', () => {
    it('should paginate correctly with limit and offset', () => {
      const coins = createMockCoins(10);

      const result = filterService.paginateCoins(coins, 3, 2);

      expect(result).toHaveLength(3);
      expect(result[0].symbol).toBe('COIN2');
      expect(result[2].symbol).toBe('COIN4');
    });

    it('should return empty array when offset exceeds length', () => {
      const coins = createMockCoins(5);

      const result = filterService.paginateCoins(coins, 10, 10);

      expect(result).toHaveLength(0);
    });

    it('should handle limit larger than remaining items', () => {
      const coins = createMockCoins(5);

      const result = filterService.paginateCoins(coins, 10, 3);

      expect(result).toHaveLength(2); // Only 2 items from offset 3
    });

    it('should return all coins with offset 0 and large limit', () => {
      const coins = createMockCoins(5);

      const result = filterService.paginateCoins(coins, 100, 0);

      expect(result).toHaveLength(5);
    });
  });

  describe('validateConfig', () => {
    it('should return no errors for valid config', () => {
      const config = createMockFilterConfig({ multiplier: 0.5 });

      const errors = filterService.validateConfig(config);

      expect(errors).toHaveLength(0);
    });

    it('should error when multiplier is below minimum', () => {
      const config = { multiplier: -0.1 };

      const errors = filterService.validateConfig(config);

      expect(errors).toContain('multiplier must be between 0 and 10');
    });

    it('should error when multiplier is above maximum', () => {
      const config = { multiplier: 15 };

      const errors = filterService.validateConfig(config);

      expect(errors).toContain('multiplier must be between 0 and 10');
    });

    it('should error when minMarketCap is negative', () => {
      const config = { minMarketCap: -1000 };

      const errors = filterService.validateConfig(config);

      expect(errors).toContain('minMarketCap must be non-negative');
    });

    it('should error when maxMarketCap is negative', () => {
      const config = { maxMarketCap: -1000 };

      const errors = filterService.validateConfig(config);

      expect(errors).toContain('maxMarketCap must be non-negative');
    });

    it('should error when minMarketCap > maxMarketCap', () => {
      const config = { minMarketCap: 10000, maxMarketCap: 5000 };

      const errors = filterService.validateConfig(config);

      expect(errors).toContain('minMarketCap must be less than or equal to maxMarketCap');
    });

    it('should error when minOI is negative', () => {
      const config = { minOI: -500 };

      const errors = filterService.validateConfig(config);

      expect(errors).toContain('minOI must be non-negative');
    });

    it('should return multiple errors for multiple violations', () => {
      const config = { multiplier: 20, minMarketCap: -100 };

      const errors = filterService.validateConfig(config);

      expect(errors.length).toBeGreaterThan(1);
    });

    it('should error when multiplier is NaN', () => {
      const config = { multiplier: NaN };

      const errors = filterService.validateConfig(config);

      expect(errors).toContain('multiplier must be a valid number');
    });

    it('should error when minMarketCap is NaN', () => {
      const config = { minMarketCap: NaN };

      const errors = filterService.validateConfig(config);

      expect(errors).toContain('minMarketCap must be a valid number');
    });

    it('should error when maxMarketCap is NaN', () => {
      const config = { maxMarketCap: NaN };

      const errors = filterService.validateConfig(config);

      expect(errors).toContain('maxMarketCap must be a valid number');
    });

    it('should error when minOI is NaN', () => {
      const config = { minOI: NaN };

      const errors = filterService.validateConfig(config);

      expect(errors).toContain('minOI must be a valid number');
    });

    it('should not check minMarketCap > maxMarketCap when either is NaN', () => {
      const config = { minMarketCap: NaN, maxMarketCap: 5000 };

      const errors = filterService.validateConfig(config);

      expect(errors).toContain('minMarketCap must be a valid number');
      expect(errors).not.toContain('minMarketCap must be less than or equal to maxMarketCap');
    });
  });

  describe('getDefaultConfig', () => {
    it('should return config with specified multiplier', () => {
      const config = filterService.getDefaultConfig(0.7);

      expect(config.multiplier).toBe(0.7);
      expect(config.minMarketCap).toBeUndefined();
      expect(config.maxMarketCap).toBeUndefined();
      expect(config.minOI).toBeUndefined();
      expect(config.symbols).toBeUndefined();
    });
  });
});
