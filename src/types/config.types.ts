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
 * Exchange API configuration
 */
export interface ExchangeConfig {
  timeout: number;
  enabled: boolean;
}

/**
 * CoinGecko API configuration
 */
export interface CoinGeckoConfig {
  timeout: number;
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
  exchanges: Record<string, ExchangeConfig>;
  coingecko: CoinGeckoConfig;
  filter: FilterDefaults;
  cache: CacheConfig;
}
