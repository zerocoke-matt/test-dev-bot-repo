/**
 * Bybit Client
 * Fetches OI from Bybit V5 API
 */

import { BaseExchangeClient, ExchangeOIData } from './exchange-client';
import { getExchangeSymbol } from '../../config/symbol-mapping';
import { logger } from '../../logger/logger';

interface BybitOIResponse {
  retCode: number;
  retMsg: string;
  result: {
    category: string;
    list: Array<{
      symbol: string;
      openInterest: string;
      timestamp: string;
    }>;
  };
}

export class BybitClient extends BaseExchangeClient {
  readonly exchangeName = 'bybit';

  constructor(timeout: number = 10000) {
    // Bybit: 120 req/min -> 2 req/sec
    super('https://api.bybit.com', timeout, 2, 1000);
  }

  async getOpenInterest(baseSymbol: string): Promise<ExchangeOIData> {
    const exchangeSymbol = getExchangeSymbol(baseSymbol, 'bybit');
    if (!exchangeSymbol) {
      throw new Error(`No Bybit symbol mapping for ${baseSymbol}`);
    }

    await this.rateLimit();

    try {
      const response = await this.httpClient.get<BybitOIResponse>(
        '/v5/market/open-interest',
        {
          params: {
            category: 'linear',
            symbol: exchangeSymbol,
            intervalTime: '5min',
            limit: 1,
          },
        }
      );

      if (response.data.retCode !== 0) {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }

      const list = response.data.result.list;
      if (!list || list.length === 0) {
        throw new Error(`No OI data from Bybit for ${baseSymbol}`);
      }

      const oiValue = parseFloat(list[0].openInterest);

      // Bybit returns OI in coin amount for linear, need price conversion
      // Fetch ticker for mark price
      const tickerResponse = await this.httpClient.get<{
        retCode: number;
        result: { list: Array<{ markPrice: string }> };
      }>('/v5/market/tickers', {
        params: { category: 'linear', symbol: exchangeSymbol },
      });

      const markPrice = parseFloat(tickerResponse.data.result.list[0]?.markPrice || '0');
      const oiUsd = oiValue * markPrice;

      logger.debug(`Bybit OI for ${baseSymbol}: $${oiUsd.toFixed(0)}`);

      return {
        symbol: baseSymbol,
        exchangeSymbol,
        exchange: this.exchangeName,
        openInterest: oiUsd,
        timestamp: parseInt(list[0].timestamp) || Date.now(),
      };
    } catch (error) {
      logger.error(`Bybit OI fetch failed for ${baseSymbol}`, error);
      throw error;
    }
  }
}
