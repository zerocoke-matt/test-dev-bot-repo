/**
 * Domain Types
 * Core business domain types for the OI vs MC filtering system
 */

/**
 * Coin with all relevant data for filtering
 */
export interface Coin {
  symbol: string;
  name: string;
  marketCap: number;
  aggregateOI: number;
  oiToMcRatio: number;
  price: number;
  volume24h: number;
  priceChange24h: number;
  rank: number;
  lastUpdated: Date;
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  multiplier: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  minOI?: number;
  symbols?: string[];
}

/**
 * Filter result
 */
export interface FilterResult {
  coins: Coin[];
  total: number;
  filtered: number;
  config: FilterConfig;
  timestamp: Date;
}

/**
 * Statistics about the filtered data
 */
export interface Statistics {
  totalCoins: number;
  filteredCoins: number;
  averageOIToMC: number;
  medianOIToMC: number;
  highestOIToMC: Coin | null;
  lowestOIToMC: Coin | null;
  lastRefresh: Date;
}

/**
 * Health check response
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  timestamp: Date;
  services: {
    api: 'connected' | 'disconnected';
    cache: 'active' | 'inactive';
  };
  lastDataRefresh?: Date;
}

/**
 * Error details
 */
export interface ErrorDetails {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}

/**
 * Sorting options
 */
export type SortField = 'oiToMcRatio' | 'marketCap' | 'aggregateOI' | 'volume24h' | 'priceChange24h';
export type SortOrder = 'asc' | 'desc';

/**
 * Query parameters for filtering
 */
export interface QueryParams {
  multiplier?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  minOI?: number;
  symbols?: string | string[];
  sortBy?: SortField;
  sortOrder?: SortOrder;
  limit?: number;
  offset?: number;
}
