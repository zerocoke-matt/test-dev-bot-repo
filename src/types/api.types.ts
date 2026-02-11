/**
 * API Response Types
 * Types for exchange APIs and CoinGecko API
 */

/**
 * Exchange OI data (from direct exchange API)
 */
export interface ExchangeOIResult {
  symbol: string;
  exchange: string;
  exchangeSymbol: string;
  openInterest: number;
  timestamp: number;
}

/**
 * Aggregated OI across all exchanges
 */
export interface AggregateOIData {
  symbol: string;
  totalOI: number;
  totalOIAmount: number;
  exchanges: ExchangeOIResult[];
  updateTime: number;
}

/**
 * CoinGecko market data response item
 */
export interface CoinGeckoMarketItem {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  last_updated: string;
}

/**
 * Market Cap data (normalized from CoinGecko)
 */
export interface MarketCapData {
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
  circulatingSupply: number;
  volume24h: number;
  priceChange24h: number;
  rank: number;
  updateTime: number;
}

/**
 * Coin list item (from symbol mapping)
 */
export interface CoinListItem {
  symbol: string;
  name: string;
  isActive: boolean;
  supportedExchanges: string[];
}

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * HTTP response wrapper
 */
export interface HttpResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}
