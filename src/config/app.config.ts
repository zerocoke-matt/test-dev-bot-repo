/**
 * Application Configuration
 * Loads and validates configuration from environment variables
 */

import dotenv from 'dotenv';
import { AppConfig } from '../types/config.types';
import { DEFAULTS, VALIDATION } from './constants';

// Load environment variables
dotenv.config();

/**
 * Get an optional environment variable with a default value
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get an optional number environment variable with a default value
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

/**
 * Get a float environment variable with a default value
 */
function getFloatEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

/**
 * Get a boolean environment variable with a default value
 */
function getBoolEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Application configuration object
 */
export const appConfig: AppConfig = {
  server: {
    port: getNumberEnv('PORT', DEFAULTS.PORT),
    nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  },
  exchanges: {
    binance: {
      timeout: getNumberEnv('BINANCE_TIMEOUT', DEFAULTS.REQUEST_TIMEOUT),
      enabled: getBoolEnv('BINANCE_ENABLED', true),
    },
    bybit: {
      timeout: getNumberEnv('BYBIT_TIMEOUT', DEFAULTS.REQUEST_TIMEOUT),
      enabled: getBoolEnv('BYBIT_ENABLED', true),
    },
    bitget: {
      timeout: getNumberEnv('BITGET_TIMEOUT', DEFAULTS.REQUEST_TIMEOUT),
      enabled: getBoolEnv('BITGET_ENABLED', true),
    },
    okx: {
      timeout: getNumberEnv('OKX_TIMEOUT', DEFAULTS.REQUEST_TIMEOUT),
      enabled: getBoolEnv('OKX_ENABLED', true),
    },
  },
  coingecko: {
    timeout: getNumberEnv('COINGECKO_TIMEOUT', 15000),
  },
  filter: {
    multiplier: getFloatEnv('FILTER_MULTIPLIER', DEFAULTS.FILTER_MULTIPLIER),
  },
  cache: {
    ttl: getNumberEnv('CACHE_TTL', DEFAULTS.CACHE_TTL),
  },
};

/**
 * Validate configuration
 */
export function validateConfig(config: AppConfig): void {
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  if (config.filter.multiplier < VALIDATION.MIN_MULTIPLIER || config.filter.multiplier > VALIDATION.MAX_MULTIPLIER) {
    throw new Error(
      `FILTER_MULTIPLIER must be between ${VALIDATION.MIN_MULTIPLIER} and ${VALIDATION.MAX_MULTIPLIER}`
    );
  }

  if (config.cache.ttl < 0) {
    throw new Error('CACHE_TTL must be non-negative');
  }
}

// Validate configuration on load
validateConfig(appConfig);
