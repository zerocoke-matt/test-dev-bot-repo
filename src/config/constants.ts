/**
 * Application Constants
 */

/**
 * Exchange API base URLs
 */
export const EXCHANGE_URLS = {
  BINANCE: 'https://fapi.binance.com',
  BYBIT: 'https://api.bybit.com',
  BITGET: 'https://api.bitget.com',
  OKX: 'https://www.okx.com',
} as const;

/**
 * CoinGecko API
 */
export const COINGECKO_URL = 'https://api.coingecko.com/api/v3' as const;

/**
 * Cache keys
 */
export const CACHE_KEYS = {
  ALL_COINS: 'all_coins',
  COIN_PREFIX: 'coin_',
  STATISTICS: 'statistics',
  MARKET_DATA: 'market_data',
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  EXCHANGE_ERROR: 'EXCHANGE_ERROR',
} as const;

/**
 * Default values
 */
export const DEFAULTS = {
  PORT: 3000,
  FILTER_MULTIPLIER: 0.5,
  CACHE_TTL: 600, // 10 minutes
  REQUEST_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  PAGE_LIMIT: 100,
  PAGE_OFFSET: 0,
} as const;

/**
 * Validation constraints
 */
export const VALIDATION = {
  MIN_MULTIPLIER: 0,
  MAX_MULTIPLIER: 10,
  MIN_MARKET_CAP: 0,
  MAX_LIMIT: 1000,
  MIN_LIMIT: 1,
} as const;

/**
 * Supported exchanges
 */
export const SUPPORTED_EXCHANGES = ['binance', 'bybit', 'bitget', 'okx'] as const;
