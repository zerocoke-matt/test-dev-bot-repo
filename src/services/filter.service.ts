/**
 * Filter Service
 * Core filtering logic for OI vs MC ratio
 */

import { Coin, FilterConfig, FilterResult, SortField, SortOrder } from '../types/domain.types';
import { logger } from '../logger/logger';
import { VALIDATION } from '../config/constants';

export class FilterService {
  /**
   * Check if a coin passes the filter criteria
   */
  passesCriteria(coin: Coin, config: FilterConfig): boolean {
    // Main filter: (aggregateOI * multiplier) > marketCap
    const oiThreshold = coin.aggregateOI * config.multiplier;
    const passesMainFilter = oiThreshold > coin.marketCap;

    if (!passesMainFilter) {
      return false;
    }

    // Optional: minimum market cap filter
    if (config.minMarketCap !== undefined && coin.marketCap < config.minMarketCap) {
      return false;
    }

    // Optional: maximum market cap filter
    if (config.maxMarketCap !== undefined && coin.marketCap > config.maxMarketCap) {
      return false;
    }

    // Optional: minimum OI filter
    if (config.minOI !== undefined && coin.aggregateOI < config.minOI) {
      return false;
    }

    // Optional: specific symbols filter
    if (config.symbols && config.symbols.length > 0) {
      const symbolUpper = coin.symbol.toUpperCase();
      const allowedSymbols = config.symbols.map((s) => s.toUpperCase());
      if (!allowedSymbols.includes(symbolUpper)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter coins based on configuration
   */
  filterCoins(coins: Coin[], config: FilterConfig): FilterResult {
    logger.debug(`Filtering ${coins.length} coins with config`, config);

    const filtered = coins.filter((coin) => this.passesCriteria(coin, config));

    logger.info(
      `Filtered ${filtered.length}/${coins.length} coins (${((filtered.length / coins.length) * 100).toFixed(1)}%)`
    );

    return {
      coins: filtered,
      total: coins.length,
      filtered: filtered.length,
      config,
      timestamp: new Date(),
    };
  }

  /**
   * Sort coins by a field
   */
  sortCoins(coins: Coin[], sortBy: SortField, order: SortOrder = 'desc'): Coin[] {
    logger.debug(`Sorting ${coins.length} coins by ${sortBy} (${order})`);

    const sorted = [...coins].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case 'oiToMcRatio':
          aValue = a.oiToMcRatio;
          bValue = b.oiToMcRatio;
          break;
        case 'marketCap':
          aValue = a.marketCap;
          bValue = b.marketCap;
          break;
        case 'aggregateOI':
          aValue = a.aggregateOI;
          bValue = b.aggregateOI;
          break;
        case 'volume24h':
          aValue = a.volume24h;
          bValue = b.volume24h;
          break;
        case 'priceChange24h':
          aValue = a.priceChange24h;
          bValue = b.priceChange24h;
          break;
        default:
          return 0;
      }

      if (order === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return sorted;
  }

  /**
   * Paginate coins
   */
  paginateCoins(coins: Coin[], limit: number, offset: number): Coin[] {
    logger.debug(`Paginating ${coins.length} coins (limit: ${limit}, offset: ${offset})`);

    if (offset >= coins.length) {
      return [];
    }

    return coins.slice(offset, offset + limit);
  }

  /**
   * Validate filter configuration
   */
  validateConfig(config: Partial<FilterConfig>): string[] {
    const errors: string[] = [];

    if (config.multiplier !== undefined) {
      if (isNaN(config.multiplier)) {
        errors.push('multiplier must be a valid number');
      } else if (
        config.multiplier < VALIDATION.MIN_MULTIPLIER ||
        config.multiplier > VALIDATION.MAX_MULTIPLIER
      ) {
        errors.push(
          `multiplier must be between ${VALIDATION.MIN_MULTIPLIER} and ${VALIDATION.MAX_MULTIPLIER}`
        );
      }
    }

    if (config.minMarketCap !== undefined) {
      if (isNaN(config.minMarketCap)) {
        errors.push('minMarketCap must be a valid number');
      } else if (config.minMarketCap < VALIDATION.MIN_MARKET_CAP) {
        errors.push(`minMarketCap must be non-negative`);
      }
    }

    if (config.maxMarketCap !== undefined) {
      if (isNaN(config.maxMarketCap)) {
        errors.push('maxMarketCap must be a valid number');
      } else if (config.maxMarketCap < VALIDATION.MIN_MARKET_CAP) {
        errors.push(`maxMarketCap must be non-negative`);
      }
    }

    if (
      config.minMarketCap !== undefined &&
      config.maxMarketCap !== undefined &&
      !isNaN(config.minMarketCap) &&
      !isNaN(config.maxMarketCap) &&
      config.minMarketCap > config.maxMarketCap
    ) {
      errors.push(`minMarketCap must be less than or equal to maxMarketCap`);
    }

    if (config.minOI !== undefined) {
      if (isNaN(config.minOI)) {
        errors.push('minOI must be a valid number');
      } else if (config.minOI < 0) {
        errors.push(`minOI must be non-negative`);
      }
    }

    return errors;
  }

  /**
   * Get default filter configuration
   */
  getDefaultConfig(multiplier: number): FilterConfig {
    return {
      multiplier,
    };
  }
}
