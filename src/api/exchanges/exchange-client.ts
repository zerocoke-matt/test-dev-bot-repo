/**
 * Exchange Client Base
 * Common interface and abstract class for exchange OI clients
 */

import { HttpClient } from '../http-client';
import { logger } from '../../logger/logger';

/**
 * OI data returned by each exchange client
 */
export interface ExchangeOIData {
  symbol: string;         // Base symbol (e.g., 'BTC')
  exchangeSymbol: string; // Exchange-specific symbol
  exchange: string;       // Exchange name
  openInterest: number;   // OI in USD
  timestamp: number;
}

/**
 * Exchange client interface
 */
export interface IExchangeClient {
  readonly exchangeName: string;
  getOpenInterest(baseSymbol: string): Promise<ExchangeOIData>;
  getBatchOpenInterest(baseSymbols: string[]): Promise<Map<string, ExchangeOIData>>;
}

/**
 * Abstract base exchange client with rate limiting
 */
export abstract class BaseExchangeClient implements IExchangeClient {
  protected httpClient: HttpClient;
  abstract readonly exchangeName: string;

  private requestTimes: number[] = [];
  private maxRequestsPerWindow: number;
  private windowMs: number;
  /** Mutex queue to serialize rate-limit checks and prevent burst concurrency */
  private rateLimitQueue: Promise<void> = Promise.resolve();

  constructor(
    baseURL: string,
    timeout: number,
    maxRequestsPerWindow: number,
    windowMs: number
  ) {
    this.httpClient = new HttpClient(baseURL, timeout, 2, 1000);
    this.maxRequestsPerWindow = maxRequestsPerWindow;
    this.windowMs = windowMs;
  }

  /**
   * Rate limit: serialized through a mutex queue so concurrent callers
   * wait in line rather than all bursting through at once.
   */
  protected rateLimit(): Promise<void> {
    this.rateLimitQueue = this.rateLimitQueue.then(() => this.rateLimitCheck());
    return this.rateLimitQueue;
  }

  /**
   * Internal rate-limit check — only one caller runs this at a time.
   */
  private async rateLimitCheck(): Promise<void> {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(t => now - t < this.windowMs);

    if (this.requestTimes.length >= this.maxRequestsPerWindow) {
      const oldestInWindow = this.requestTimes[0];
      const waitTime = this.windowMs - (now - oldestInWindow) + 50;
      logger.debug(`Rate limit: waiting ${waitTime}ms for ${this.exchangeName}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requestTimes.push(Date.now());
  }

  abstract getOpenInterest(baseSymbol: string): Promise<ExchangeOIData>;

  /**
   * Get OI for multiple symbols with rate limiting
   */
  async getBatchOpenInterest(baseSymbols: string[]): Promise<Map<string, ExchangeOIData>> {
    const results = new Map<string, ExchangeOIData>();

    const promises = baseSymbols.map(async (symbol) => {
      try {
        const data = await this.getOpenInterest(symbol);
        results.set(symbol, data);
      } catch (error) {
        logger.warn(`Failed to fetch OI from ${this.exchangeName} for ${symbol}`, error);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }
}
