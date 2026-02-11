/**
 * Aggregator Service
 * Main service that orchestrates data fetching, filtering, and caching
 */

import { DataFetcherService } from './data-fetcher.service';
import { FilterService } from './filter.service';
import { CacheService } from './cache.service';
import {
  Coin,
  FilterConfig,
  FilterResult,
  Statistics,
  QueryParams,
  SortField,
  SortOrder,
} from '../types/domain.types';
import { logger } from '../logger/logger';
import { CACHE_KEYS, DEFAULTS, VALIDATION } from '../config/constants';

export class AggregatorService {
  private lastRefreshTime: Date | null = null;

  constructor(
    private dataFetcher: DataFetcherService,
    private filterService: FilterService,
    private cacheService: CacheService,
    private defaultMultiplier: number
  ) {}

  /**
   * Get all coins with caching
   */
  async getAllCoins(forceRefresh: boolean = false): Promise<Coin[]> {
    if (forceRefresh) {
      logger.info('Force refresh requested, clearing cache');
      this.cacheService.delete(CACHE_KEYS.ALL_COINS);
    }

    return await this.cacheService.getOrSet(
      CACHE_KEYS.ALL_COINS,
      async () => {
        logger.info('Cache miss, fetching all coins from API');
        const coins = await this.dataFetcher.fetchAllCoins();
        this.lastRefreshTime = new Date();
        return coins;
      }
    );
  }

  /**
   * Get filtered coins based on query parameters
   */
  async getFilteredCoins(params: QueryParams): Promise<FilterResult> {
    logger.debug('Getting filtered coins with params', params);

    // Get all coins (from cache or API)
    const allCoins = await this.getAllCoins();

    // Build filter config
    const filterConfig: FilterConfig = {
      multiplier: params.multiplier ?? this.defaultMultiplier,
      minMarketCap: params.minMarketCap,
      maxMarketCap: params.maxMarketCap,
      minOI: params.minOI,
      symbols: params.symbols ? params.symbols.split(',').map((s) => s.trim()) : undefined,
    };

    // Validate filter config
    const validationErrors = this.filterService.validateConfig(filterConfig);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid filter configuration: ${validationErrors.join(', ')}`);
    }

    // Filter coins
    let result = this.filterService.filterCoins(allCoins, filterConfig);

    // Sort coins
    if (params.sortBy) {
      const sortField = params.sortBy as SortField;
      const sortOrder = (params.sortOrder as SortOrder) || 'desc';
      result.coins = this.filterService.sortCoins(result.coins, sortField, sortOrder);
    }

    // Paginate coins — guard against NaN and negative values.
    // Use VALIDATION.MAX_LIMIT (1000) as the hard cap so clients can request
    // larger pages up to the configured maximum, defaulting to PAGE_LIMIT (100).
    const rawLimit = params.limit ?? DEFAULTS.PAGE_LIMIT;
    const rawOffset = params.offset ?? DEFAULTS.PAGE_OFFSET;
    const limit = Math.min(
      Math.max(0, isNaN(rawLimit) ? DEFAULTS.PAGE_LIMIT : rawLimit),
      VALIDATION.MAX_LIMIT
    );
    const offset = Math.max(0, isNaN(rawOffset) ? DEFAULTS.PAGE_OFFSET : rawOffset);
    result.coins = this.filterService.paginateCoins(result.coins, limit, offset);

    return result;
  }

  /**
   * Get a specific coin by symbol
   */
  async getCoinBySymbol(symbol: string): Promise<Coin | null> {
    logger.debug(`Getting coin by symbol: ${symbol}`);

    const cacheKey = `${CACHE_KEYS.COIN_PREFIX}${symbol.toUpperCase()}`;

    // Try cache first
    const cached = this.cacheService.get<Coin>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const coin = await this.dataFetcher.fetchCoinData(symbol);
    if (coin) {
      this.cacheService.set(cacheKey, coin);
    }

    return coin;
  }

  /**
   * Calculate statistics for filtered coins
   * Note: Statistics are computed from the full (unpaginated) filtered set
   * to avoid truncated results when more coins match than the page limit.
   */
  async getStatistics(params?: QueryParams): Promise<Statistics> {
    logger.debug('Calculating statistics');

    // Get all coins (from cache or API) — no pagination applied
    const allCoins = await this.getAllCoins();

    // Build filter config from params (same logic as getFilteredCoins)
    const effectiveParams = params ?? {};
    const filterConfig: FilterConfig = {
      multiplier: effectiveParams.multiplier ?? this.defaultMultiplier,
      minMarketCap: effectiveParams.minMarketCap,
      maxMarketCap: effectiveParams.maxMarketCap,
      minOI: effectiveParams.minOI,
      symbols: effectiveParams.symbols ? effectiveParams.symbols.split(',').map((s) => s.trim()) : undefined,
    };

    // Validate filter config (same as getFilteredCoins)
    const validationErrors = this.filterService.validateConfig(filterConfig);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid filter configuration: ${validationErrors.join(', ')}`);
    }

    // Filter coins without pagination to get the complete set
    const filterResult = this.filterService.filterCoins(allCoins, filterConfig);
    const coins = filterResult.coins;

    if (coins.length === 0) {
      return {
        totalCoins: filterResult.total,
        filteredCoins: 0,
        averageOIToMC: 0,
        medianOIToMC: 0,
        highestOIToMC: null,
        lowestOIToMC: null,
        lastRefresh: this.lastRefreshTime || new Date(),
      };
    }

    // Calculate average
    const sum = coins.reduce((acc, coin) => acc + coin.oiToMcRatio, 0);
    const average = sum / coins.length;

    // Calculate median
    const sorted = [...coins].sort((a, b) => a.oiToMcRatio - b.oiToMcRatio);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1].oiToMcRatio + sorted[mid].oiToMcRatio) / 2
        : sorted[mid].oiToMcRatio;

    // Find highest and lowest
    const highest = coins.reduce((max, coin) =>
      coin.oiToMcRatio > max.oiToMcRatio ? coin : max
    );
    const lowest = coins.reduce((min, coin) =>
      coin.oiToMcRatio < min.oiToMcRatio ? coin : min
    );

    return {
      totalCoins: filterResult.total,
      filteredCoins: coins.length,
      averageOIToMC: average,
      medianOIToMC: median,
      highestOIToMC: highest,
      lowestOIToMC: lowest,
      lastRefresh: this.lastRefreshTime || new Date(),
    };
  }

  /**
   * Refresh all data
   */
  async refreshData(): Promise<void> {
    logger.info('Refreshing all data');
    this.cacheService.clear();
    await this.getAllCoins(true);
    logger.info('Data refresh complete');
  }

  /**
   * Get last refresh time
   */
  getLastRefreshTime(): Date | null {
    return this.lastRefreshTime;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * Check if the cache subsystem is usable
   */
  isCacheActive(): boolean {
    return this.cacheService.isActive();
  }
}
