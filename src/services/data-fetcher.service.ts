/**
 * Data Fetcher Service
 * Orchestrates data fetching from exchange APIs and CoinGecko
 */

import { IExchangeClient, ExchangeOIData } from '../api/exchanges/exchange-client';
import { CoinGeckoClient, CoinGeckoMarketData } from '../api/coingecko-client';
import { Coin } from '../types/domain.types';
import { SYMBOL_MAPPINGS, getBaseFromCoinGeckoId } from '../config/symbol-mapping';
import { logger } from '../logger/logger';

export class DataFetcherService {
  private exchangeClients: IExchangeClient[];
  private coingeckoClient: CoinGeckoClient;

  constructor(exchangeClients: IExchangeClient[], coingeckoClient: CoinGeckoClient) {
    this.exchangeClients = exchangeClients;
    this.coingeckoClient = coingeckoClient;
  }

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
   * Fetch OI from all exchanges for a single symbol and aggregate
   */
  async fetchAggregateOI(baseSymbol: string): Promise<{ totalOI: number; exchangeBreakdown: ExchangeOIData[] }> {
    const exchangeBreakdown: ExchangeOIData[] = [];
    let totalOI = 0;

    const results = await Promise.allSettled(
      this.exchangeClients.map(client => client.getOpenInterest(baseSymbol))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        exchangeBreakdown.push(result.value);
        totalOI += result.value.openInterest;
      }
    }

    return { totalOI, exchangeBreakdown };
  }

  /**
   * Fetch market data from CoinGecko for all mapped coins
   */
  async fetchMarketData(): Promise<Map<string, CoinGeckoMarketData>> {
    const marketMap = new Map<string, CoinGeckoMarketData>();

    try {
      const coingeckoIds = SYMBOL_MAPPINGS.map(m => m.coingeckoId);
      const marketData = await this.coingeckoClient.getMarketDataByIds(coingeckoIds);

      for (const item of marketData) {
        const baseSymbol = getBaseFromCoinGeckoId(item.id);
        if (baseSymbol) {
          marketMap.set(baseSymbol, item);
        }
      }

      logger.info(`Fetched market data for ${marketMap.size} coins from CoinGecko`);
    } catch (error) {
      logger.error('Failed to fetch market data from CoinGecko', error);
      throw error;
    }

    return marketMap;
  }

  /**
   * Fetch data for a single coin
   */
  async fetchCoinData(symbol: string): Promise<Coin | null> {
    logger.debug(`Fetching data for ${symbol}`);

    try {
      // Short-circuit if the symbol has no CoinGecko mapping to avoid wasting API quota
      const coingeckoId = SYMBOL_MAPPINGS.find(m => m.base === symbol.toUpperCase())?.coingeckoId;
      if (!coingeckoId) {
        logger.warn(`No CoinGecko mapping for ${symbol}, skipping`);
        return null;
      }

      const [oiResult, marketData] = await Promise.all([
        this.fetchAggregateOI(symbol),
        this.coingeckoClient.getMarketDataByIds([coingeckoId]),
      ]);

      const mcData = marketData[0];
      if (!mcData) {
        logger.warn(`No market data from CoinGecko for ${symbol}`);
        return null;
      }

      const coin: Coin = {
        symbol: symbol.toUpperCase(),
        name: mcData.name,
        marketCap: mcData.market_cap,
        aggregateOI: oiResult.totalOI,
        oiToMcRatio: this.calculateRatio(oiResult.totalOI, mcData.market_cap),
        price: mcData.current_price,
        volume24h: mcData.total_volume,
        priceChange24h: mcData.price_change_percentage_24h || 0,
        rank: mcData.market_cap_rank || 0,
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
   * Fetch data for all mapped coins
   */
  async fetchAllCoins(): Promise<Coin[]> {
    logger.info('Fetching all available coins');

    const startTime = Date.now();

    try {
      // Step 1: Fetch market data from CoinGecko (batch, single request)
      const marketMap = await this.fetchMarketData();

      // Step 2: For each mapped symbol that has market data, fetch OI from all exchanges
      const symbols = SYMBOL_MAPPINGS
        .filter(m => marketMap.has(m.base))
        .map(m => m.base);

      logger.info(`Fetching OI for ${symbols.length} coins from exchanges`);

      const coins: Coin[] = [];

      // Fetch OI for each symbol (with rate limiting built into exchange clients)
      const oiResults = await Promise.allSettled(
        symbols.map(async (symbol) => {
          const oiResult = await this.fetchAggregateOI(symbol);
          return { symbol, oiResult };
        })
      );

      for (const result of oiResults) {
        if (result.status === 'fulfilled') {
          const { symbol, oiResult } = result.value;
          const mcData = marketMap.get(symbol);

          if (mcData) {
            coins.push({
              symbol,
              name: mcData.name,
              marketCap: mcData.market_cap,
              aggregateOI: oiResult.totalOI,
              oiToMcRatio: this.calculateRatio(oiResult.totalOI, mcData.market_cap),
              price: mcData.current_price,
              volume24h: mcData.total_volume,
              priceChange24h: mcData.price_change_percentage_24h || 0,
              rank: mcData.market_cap_rank || 0,
              lastUpdated: new Date(),
            });
          }
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`Fetched ${coins.length} coins in ${duration}ms`);

      return coins;
    } catch (error) {
      logger.error('Failed to fetch all coins', error);
      throw error;
    }
  }

  /**
   * Fetch data for multiple coins
   */
  async fetchMultipleCoins(symbols: string[]): Promise<Coin[]> {
    logger.info(`Fetching data for ${symbols.length} coins`);

    const startTime = Date.now();
    const coins: Coin[] = [];

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
}
