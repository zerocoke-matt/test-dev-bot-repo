/**
 * Test Utilities
 * Helper functions and mock data generators for tests
 */

import {
  Coin,
  FilterConfig,
  FilterResult,
  Statistics,
} from '../../src/types/domain.types';
import {
  AggregateOIData,
  MarketCapData,
  CoinListItem,
} from '../../src/types/api.types';
import { ExchangeOIData } from '../../src/api/exchanges/exchange-client';
import { CoinGeckoMarketData } from '../../src/api/coingecko-client';

/**
 * Generate a mock Coin object with default values
 */
export function createMockCoin(overrides?: Partial<Coin>): Coin {
  const defaults: Coin = {
    symbol: 'BTC',
    name: 'Bitcoin',
    marketCap: 500000000000,
    aggregateOI: 600000000000,
    oiToMcRatio: 1.2,
    price: 40000,
    volume24h: 20000000000,
    priceChange24h: 2.5,
    rank: 1,
    lastUpdated: new Date('2024-01-01T00:00:00Z'),
  };

  return { ...defaults, ...overrides };
}

/**
 * Generate multiple mock coins
 */
export function createMockCoins(count: number, overrides?: Partial<Coin>[]): Coin[] {
  const coins: Coin[] = [];
  for (let i = 0; i < count; i++) {
    const override = overrides?.[i] || {};
    coins.push(
      createMockCoin({
        symbol: `COIN${i}`,
        name: `Coin ${i}`,
        marketCap: 1000000000 * (i + 1),
        aggregateOI: 1500000000 * (i + 1),
        rank: i + 1,
        ...override,
      })
    );
  }
  return coins;
}

/**
 * Create a mock FilterConfig
 */
export function createMockFilterConfig(overrides?: Partial<FilterConfig>): FilterConfig {
  return {
    multiplier: 0.5,
    ...overrides,
  };
}

/**
 * Create a mock FilterResult
 */
export function createMockFilterResult(
  coins: Coin[],
  config?: FilterConfig
): FilterResult {
  return {
    coins,
    total: coins.length + 10,
    filtered: coins.length,
    config: config || createMockFilterConfig(),
    timestamp: new Date(),
  };
}

/**
 * Create mock AggregateOIData (new exchange-based format)
 */
export function createMockAggregateOI(symbol: string = 'BTC'): AggregateOIData {
  return {
    symbol,
    totalOI: 2000000000,
    totalOIAmount: 2000000000,
    exchanges: [
      {
        symbol,
        exchange: 'binance',
        exchangeSymbol: `${symbol}USDT`,
        openInterest: 800000000,
        timestamp: Date.now(),
      },
      {
        symbol,
        exchange: 'bybit',
        exchangeSymbol: `${symbol}USDT`,
        openInterest: 500000000,
        timestamp: Date.now(),
      },
      {
        symbol,
        exchange: 'bitget',
        exchangeSymbol: `${symbol}USDT`,
        openInterest: 400000000,
        timestamp: Date.now(),
      },
      {
        symbol,
        exchange: 'okx',
        exchangeSymbol: `${symbol}-USDT-SWAP`,
        openInterest: 300000000,
        timestamp: Date.now(),
      },
    ],
    updateTime: Date.now(),
  };
}

/**
 * Create mock MarketCapData (from CoinGecko)
 */
export function createMockMarketCap(symbol: string = 'BTC'): MarketCapData {
  return {
    symbol,
    name: 'Bitcoin',
    marketCap: 500000000000,
    price: 40000,
    circulatingSupply: 19000000,
    volume24h: 20000000000,
    priceChange24h: 2.5,
    rank: 1,
    updateTime: Date.now(),
  };
}

/**
 * Create mock ExchangeOIData (individual exchange response)
 */
export function createMockExchangeOIData(
  symbol: string = 'BTC',
  exchange: string = 'binance',
  overrides?: Partial<ExchangeOIData>
): ExchangeOIData {
  const exchangeSymbol = exchange === 'okx'
    ? `${symbol}-USDT-SWAP`
    : `${symbol}USDT`;

  return {
    symbol,
    exchangeSymbol,
    exchange,
    openInterest: 500000000,
    timestamp: Date.now(),
    ...overrides,
  };
}

/**
 * Create mock CoinGeckoMarketData
 */
export function createMockCoinGeckoMarketData(
  overrides?: Partial<CoinGeckoMarketData>
): CoinGeckoMarketData {
  return {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    current_price: 40000,
    market_cap: 500000000000,
    market_cap_rank: 1,
    total_volume: 20000000000,
    price_change_percentage_24h: 2.5,
    circulating_supply: 19000000,
    last_updated: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock CoinListItem
 */
export function createMockCoinListItem(symbol: string = 'BTC'): CoinListItem {
  return {
    symbol,
    name: `${symbol} Token`,
    isActive: true,
    supportedExchanges: ['binance', 'bybit', 'bitget', 'okx'],
  };
}

/**
 * Create mock Statistics
 */
export function createMockStatistics(
  coins: Coin[] = [createMockCoin()]
): Statistics {
  const ratios = coins.map((c) => c.oiToMcRatio);
  const sorted = [...ratios].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return {
    totalCoins: coins.length + 10,
    filteredCoins: coins.length,
    averageOIToMC: ratios.reduce((a, b) => a + b, 0) / ratios.length,
    medianOIToMC:
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid],
    highestOIToMC: coins.reduce((max, coin) =>
      coin.oiToMcRatio > max.oiToMcRatio ? coin : max
    ),
    lowestOIToMC: coins.reduce((min, coin) =>
      coin.oiToMcRatio < min.oiToMcRatio ? coin : min
    ),
    lastRefresh: new Date(),
  };
}

/**
 * Wait for a specified time (for async tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assert that a coin passes the filter
 */
export function assertCoinPassesFilter(
  coin: Coin,
  config: FilterConfig
): boolean {
  return coin.aggregateOI * config.multiplier > coin.marketCap;
}

/**
 * Calculate expected OI to MC ratio
 */
export function calculateOIToMCRatio(aggregateOI: number, marketCap: number): number {
  return marketCap > 0 ? aggregateOI / marketCap : 0;
}
