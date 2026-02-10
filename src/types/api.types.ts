/**
 * Coinglass API Response Types
 * Types for interacting with the Coinglass API
 */

/**
 * Base response structure from Coinglass API
 */
export interface CoinglassBaseResponse<T> {
  code: string;
  msg: string;
  success: boolean;
  data: T;
}

/**
 * Open Interest data for a single coin
 */
export interface OpenInterestData {
  symbol: string;
  exchangeName: string;
  openInterest: number;
  openInterestAmount: number;
  timestamp: number;
}

/**
 * Aggregated Open Interest response
 */
export interface AggregateOIData {
  symbol: string;
  totalOI: number;
  totalOIAmount: number;
  exchanges: OpenInterestData[];
  updateTime: number;
}

/**
 * Market Cap data for a single coin
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
 * Coin list item
 */
export interface CoinListItem {
  symbol: string;
  name: string;
  isActive: boolean;
  supportedExchanges: string[];
}

/**
 * API Error response
 */
export interface CoinglassErrorResponse {
  code: string;
  msg: string;
  success: false;
  error?: string;
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
