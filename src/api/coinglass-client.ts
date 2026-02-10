/**
 * Coinglass API Client
 * Client for interacting with Coinglass API endpoints
 */

import { HttpClient } from './http-client';
import {
  CoinglassBaseResponse,
  AggregateOIData,
  MarketCapData,
  CoinListItem,
} from '../types/api.types';
import { CoinglassConfig } from '../types/config.types';
import { logger } from '../logger/logger';
import { API_ENDPOINTS } from '../config/constants';

export class CoinglassClient {
  private httpClient: HttpClient;
  private apiKey: string;

  constructor(config: CoinglassConfig) {
    this.httpClient = new HttpClient(
      config.baseUrl,
      config.timeout,
      config.maxRetries,
      config.retryDelay
    );
    this.apiKey = config.apiKey;
  }

  /**
   * Get common headers for Coinglass API
   */
  private getHeaders(): Record<string, string> {
    return {
      'CG-API-KEY': this.apiKey,
    };
  }

  /**
   * Validate API response
   */
  private validateResponse<T>(response: CoinglassBaseResponse<T>): T {
    if (!response.success) {
      throw new Error(`Coinglass API Error: ${response.msg} (${response.code})`);
    }
    return response.data;
  }

  /**
   * Get list of available coins
   */
  async getCoinList(): Promise<CoinListItem[]> {
    logger.debug('Fetching coin list from Coinglass');

    try {
      const response = await this.httpClient.get<CoinglassBaseResponse<CoinListItem[]>>(
        API_ENDPOINTS.COIN_LIST,
        {
          headers: this.getHeaders(),
        }
      );

      const data = this.validateResponse(response.data);
      logger.info(`Successfully fetched ${data.length} coins from Coinglass`);
      return data;
    } catch (error) {
      logger.error('Failed to fetch coin list', error);
      throw error;
    }
  }

  /**
   * Get aggregate open interest for a coin
   */
  async getOpenInterest(symbol: string): Promise<AggregateOIData> {
    logger.debug(`Fetching open interest for ${symbol}`);

    try {
      const response = await this.httpClient.get<CoinglassBaseResponse<AggregateOIData>>(
        API_ENDPOINTS.OPEN_INTEREST,
        {
          headers: this.getHeaders(),
          params: {
            symbol: symbol.toUpperCase(),
          },
        }
      );

      const data = this.validateResponse(response.data);
      logger.debug(`Successfully fetched OI for ${symbol}: $${data.totalOIAmount}`);
      return data;
    } catch (error) {
      logger.error(`Failed to fetch open interest for ${symbol}`, error);
      throw error;
    }
  }

  /**
   * Get market cap data for a coin
   */
  async getMarketCap(symbol: string): Promise<MarketCapData> {
    logger.debug(`Fetching market cap for ${symbol}`);

    try {
      const response = await this.httpClient.get<CoinglassBaseResponse<MarketCapData>>(
        API_ENDPOINTS.MARKET_CAP,
        {
          headers: this.getHeaders(),
          params: {
            symbol: symbol.toUpperCase(),
          },
        }
      );

      const data = this.validateResponse(response.data);
      logger.debug(`Successfully fetched market cap for ${symbol}: $${data.marketCap}`);
      return data;
    } catch (error) {
      logger.error(`Failed to fetch market cap for ${symbol}`, error);
      throw error;
    }
  }

  /**
   * Get multiple coins' open interest in batch
   */
  async getBatchOpenInterest(symbols: string[]): Promise<Map<string, AggregateOIData>> {
    logger.info(`Fetching batch open interest for ${symbols.length} symbols`);

    const results = new Map<string, AggregateOIData>();
    const errors: string[] = [];

    // Process in parallel with error handling
    const promises = symbols.map(async (symbol) => {
      try {
        const data = await this.getOpenInterest(symbol);
        results.set(symbol, data);
      } catch (error) {
        logger.warn(`Failed to fetch OI for ${symbol}`, error);
        errors.push(symbol);
      }
    });

    await Promise.allSettled(promises);

    if (errors.length > 0) {
      logger.warn(`Failed to fetch OI for ${errors.length} symbols`, { errors });
    }

    logger.info(`Successfully fetched OI for ${results.size}/${symbols.length} symbols`);
    return results;
  }

  /**
   * Get multiple coins' market cap in batch
   */
  async getBatchMarketCap(symbols: string[]): Promise<Map<string, MarketCapData>> {
    logger.info(`Fetching batch market cap for ${symbols.length} symbols`);

    const results = new Map<string, MarketCapData>();
    const errors: string[] = [];

    // Process in parallel with error handling
    const promises = symbols.map(async (symbol) => {
      try {
        const data = await this.getMarketCap(symbol);
        results.set(symbol, data);
      } catch (error) {
        logger.warn(`Failed to fetch market cap for ${symbol}`, error);
        errors.push(symbol);
      }
    });

    await Promise.allSettled(promises);

    if (errors.length > 0) {
      logger.warn(`Failed to fetch market cap for ${errors.length} symbols`, { errors });
    }

    logger.info(`Successfully fetched market cap for ${results.size}/${symbols.length} symbols`);
    return results;
  }
}
