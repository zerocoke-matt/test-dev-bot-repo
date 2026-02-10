/**
 * Data Fetcher Service
 * Orchestrates data fetching from Coinglass API
 */

import { CoinglassClient } from '../api/coinglass-client';
import { Coin } from '../types/domain.types';
import { logger } from '../logger/logger';

export class DataFetcherService {
  constructor(private coinglassClient: CoinglassClient) {}

  /**
   * Calculate OI to MC ratio
   */
  private calculateRatio(oi: number, mc: number): number {
    if (mc === 0) {
      return 0;
    }
    return oi / mc;
  }

  /**
   * Fetch data for a single coin
   */
  async fetchCoinData(symbol: string): Promise<Coin | null> {
    logger.debug(`Fetching data for ${symbol}`);

    try {
      // Fetch OI and MC in parallel
      const [oiData, mcData] = await Promise.all([
        this.coinglassClient.getOpenInterest(symbol),
        this.coinglassClient.getMarketCap(symbol),
      ]);

      const coin: Coin = {
        symbol: mcData.symbol,
        name: mcData.name,
        marketCap: mcData.marketCap,
        aggregateOI: oiData.totalOIAmount,
        oiToMcRatio: this.calculateRatio(oiData.totalOIAmount, mcData.marketCap),
        price: mcData.price,
        volume24h: mcData.volume24h,
        priceChange24h: mcData.priceChange24h,
        rank: mcData.rank,
        lastUpdated: new Date(),
      };

      logger.debug(`Successfully fetched data for ${symbol}`, {
        marketCap: coin.marketCap,
        aggregateOI: coin.aggregateOI,
        ratio: coin.oiToMcRatio,
      });

      return coin;
    } catch (error) {
      logger.error(`Failed to fetch data for ${symbol}`, error);
      return null;
    }
  }

  /**
   * Fetch data for multiple coins
   */
  async fetchMultipleCoins(symbols: string[]): Promise<Coin[]> {
    logger.info(`Fetching data for ${symbols.length} coins`);

    const startTime = Date.now();
    const coins: Coin[] = [];

    // Fetch in parallel with error handling
    const results = await Promise.allSettled(
      symbols.map((symbol) => this.fetchCoinData(symbol))
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        coins.push(result.value);
      }
    }

    const duration = Date.now() - startTime;
    const successRate = ((coins.length / symbols.length) * 100).toFixed(1);

    logger.info(
      `Fetched ${coins.length}/${symbols.length} coins (${successRate}%) in ${duration}ms`
    );

    return coins;
  }

  /**
   * Fetch all available coins
   */
  async fetchAllCoins(): Promise<Coin[]> {
    logger.info('Fetching all available coins');

    try {
      // Get list of available coins
      const coinList = await this.coinglassClient.getCoinList();

      // Filter active coins
      const activeSymbols = coinList
        .filter((coin) => coin.isActive)
        .map((coin) => coin.symbol);

      logger.info(`Found ${activeSymbols.length} active coins`);

      // Fetch data for all active coins
      return await this.fetchMultipleCoins(activeSymbols);
    } catch (error) {
      logger.error('Failed to fetch all coins', error);
      throw error;
    }
  }

  /**
   * Fetch coins with batch optimization
   * Groups API calls to minimize requests
   */
  async fetchCoinsBatch(symbols: string[]): Promise<Coin[]> {
    logger.info(`Fetching batch of ${symbols.length} coins`);

    try {
      // Fetch OI and MC in parallel batches
      const [oiMap, mcMap] = await Promise.all([
        this.coinglassClient.getBatchOpenInterest(symbols),
        this.coinglassClient.getBatchMarketCap(symbols),
      ]);

      const coins: Coin[] = [];

      // Combine data
      for (const symbol of symbols) {
        const oiData = oiMap.get(symbol);
        const mcData = mcMap.get(symbol);

        if (oiData && mcData) {
          const coin: Coin = {
            symbol: mcData.symbol,
            name: mcData.name,
            marketCap: mcData.marketCap,
            aggregateOI: oiData.totalOIAmount,
            oiToMcRatio: this.calculateRatio(oiData.totalOIAmount, mcData.marketCap),
            price: mcData.price,
            volume24h: mcData.volume24h,
            priceChange24h: mcData.priceChange24h,
            rank: mcData.rank,
            lastUpdated: new Date(),
          };
          coins.push(coin);
        } else {
          logger.warn(`Incomplete data for ${symbol}`, {
            hasOI: !!oiData,
            hasMC: !!mcData,
          });
        }
      }

      logger.info(`Successfully combined data for ${coins.length}/${symbols.length} coins`);
      return coins;
    } catch (error) {
      logger.error('Failed to fetch coins in batch', error);
      throw error;
    }
  }
}
