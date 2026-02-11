/**
 * CoinGecko Client
 * Fetches market cap data from CoinGecko free API
 */

import { HttpClient } from './http-client';
import { logger } from '../logger/logger';

export interface CoinGeckoMarketData {
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

export class CoinGeckoClient {
  private httpClient: HttpClient;
  private requestTimes: number[] = [];
  /** Mutex queue to serialize rate-limit checks and prevent burst concurrency */
  private rateLimitQueue: Promise<void> = Promise.resolve();

  constructor(timeout: number = 15000) {
    this.httpClient = new HttpClient(
      'https://api.coingecko.com/api/v3',
      timeout,
      2,
      2000
    );
  }

  /**
   * Rate limit for CoinGecko free tier: ~10-30 req/min, use conservative 8 req/min.
   * Serialized through a mutex queue so concurrent callers wait in line
   * rather than all bursting through at once.
   */
  private rateLimit(): Promise<void> {
    this.rateLimitQueue = this.rateLimitQueue.then(() => this.rateLimitCheck());
    return this.rateLimitQueue;
  }

  /**
   * Internal rate-limit check — only one caller runs this at a time.
   */
  private async rateLimitCheck(): Promise<void> {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    this.requestTimes = this.requestTimes.filter(t => now - t < windowMs);

    if (this.requestTimes.length >= 8) {
      const oldestInWindow = this.requestTimes[0];
      const waitTime = windowMs - (now - oldestInWindow) + 100;
      logger.debug(`CoinGecko rate limit: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requestTimes.push(Date.now());
  }

  /**
   * Fetch market data for multiple coins in one request
   * CoinGecko returns up to 250 coins per page
   */
  async getMarketData(page: number = 1, perPage: number = 250): Promise<CoinGeckoMarketData[]> {
    await this.rateLimit();

    try {
      const response = await this.httpClient.get<CoinGeckoMarketData[]>(
        '/coins/markets',
        {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: perPage,
            page: page,
            sparkline: false,
          },
        }
      );

      logger.info(`CoinGecko: fetched ${response.data.length} coins (page ${page})`);
      return response.data;
    } catch (error) {
      logger.error('CoinGecko market data fetch failed', error);
      throw error;
    }
  }

  /**
   * Fetch market data for specific coin IDs
   */
  async getMarketDataByIds(ids: string[]): Promise<CoinGeckoMarketData[]> {
    if (ids.length === 0) return [];

    await this.rateLimit();

    try {
      const response = await this.httpClient.get<CoinGeckoMarketData[]>(
        '/coins/markets',
        {
          params: {
            vs_currency: 'usd',
            ids: ids.join(','),
            order: 'market_cap_desc',
            per_page: 250,
            page: 1,
            sparkline: false,
          },
        }
      );

      logger.info(`CoinGecko: fetched data for ${response.data.length}/${ids.length} coins`);
      return response.data;
    } catch (error) {
      logger.error('CoinGecko market data fetch by IDs failed', error);
      throw error;
    }
  }
}
