/**
 * Application Constants
 */

/**
 * API endpoint paths
 */
export const API_ENDPOINTS = {
  OPEN_INTEREST: '/v1/oi/openInterest',
  MARKET_CAP: '/v1/market/marketcap',
  COIN_LIST: '/v1/coins',
} as const;

/**
 * Cache keys
 */
export const CACHE_KEYS = {
  ALL_COINS: 'all_coins',
  COIN_PREFIX: 'coin_',
  STATISTICS: 'statistics',
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
