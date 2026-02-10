/**
 * Application Configuration
 * Loads and validates configuration from environment variables
 */

import dotenv from 'dotenv';
import { AppConfig } from '../types/config.types';
import { DEFAULTS } from './constants';

// Load environment variables
dotenv.config();

/**
 * Get a required environment variable
 * Throws an error if the variable is not set
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

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
 * Application configuration object
 */
export const appConfig: AppConfig = {
  server: {
    port: getNumberEnv('PORT', DEFAULTS.PORT),
    nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  },
  coinglass: {
    apiKey: getRequiredEnv('COINGLASS_API_KEY'),
    baseUrl: getOptionalEnv('COINGLASS_BASE_URL', 'https://api.coinglass.com/api'),
    timeout: getNumberEnv('REQUEST_TIMEOUT', DEFAULTS.REQUEST_TIMEOUT),
    maxRetries: getNumberEnv('MAX_RETRIES', DEFAULTS.MAX_RETRIES),
    retryDelay: getNumberEnv('RETRY_DELAY', DEFAULTS.RETRY_DELAY),
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

  if (config.filter.multiplier < 0) {
    throw new Error('FILTER_MULTIPLIER must be non-negative');
  }

  if (config.cache.ttl < 0) {
    throw new Error('CACHE_TTL must be non-negative');
  }

  if (config.coinglass.timeout < 0) {
    throw new Error('REQUEST_TIMEOUT must be non-negative');
  }

  if (config.coinglass.maxRetries < 0) {
    throw new Error('MAX_RETRIES must be non-negative');
  }

  if (config.coinglass.retryDelay < 0) {
    throw new Error('RETRY_DELAY must be non-negative');
  }
}

// Validate configuration on load
validateConfig(appConfig);
