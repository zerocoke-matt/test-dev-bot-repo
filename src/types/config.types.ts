/**
 * Configuration Types
 * Application configuration interfaces
 */

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  nodeEnv: string;
}

/**
 * Coinglass API configuration
 */
export interface CoinglassConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Filter default configuration
 */
export interface FilterDefaults {
  multiplier: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl: number;
}

/**
 * Application configuration
 */
export interface AppConfig {
  server: ServerConfig;
  coinglass: CoinglassConfig;
  filter: FilterDefaults;
  cache: CacheConfig;
}
