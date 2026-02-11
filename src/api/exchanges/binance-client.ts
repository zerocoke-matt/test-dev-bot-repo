/**
 * Binance Futures Client
 * Fetches OI from Binance USDT-M Futures
 */

import { BaseExchangeClient, ExchangeOIData } from './exchange-client';
import { getExchangeSymbol } from '../../config/symbol-mapping';
import { logger } from '../../logger/logger';

interface BinanceOIResponse {
  symbol: string;
  openInterest: string;
  time: number;
}

export class BinanceClient extends BaseExchangeClient {
  readonly exchangeName = 'binance';

  constructor(timeout: number = 10000) {
    // Binance: 2400 req/min -> ~40 req/sec, use conservative 30 req/sec
    super('https://fapi.binance.com', timeout, 30, 1000);
  }

  async getOpenInterest(baseSymbol: string): Promise<ExchangeOIData> {
    const exchangeSymbol = getExchangeSymbol(baseSymbol, 'binance');
    if (!exchangeSymbol) {
      throw new Error(`No Binance symbol mapping for ${baseSymbol}`);
    }

    await this.rateLimit();

    try {
      const response = await this.httpClient.get<BinanceOIResponse>(
        '/fapi/v1/openInterest',
        { params: { symbol: exchangeSymbol } }
      );

      const oiAmount = parseFloat(response.data.openInterest);

      // Binance returns OI in contracts, we need to get mark price to convert to USD
      const priceResponse = await this.httpClient.get<{ markPrice: string }>(
        '/fapi/v1/premiumIndex',
        { params: { symbol: exchangeSymbol } }
      );
      const markPrice = parseFloat(priceResponse.data.markPrice);
      const oiUsd = oiAmount * markPrice;

      logger.debug(`Binance OI for ${baseSymbol}: $${oiUsd.toFixed(0)}`);

      return {
        symbol: baseSymbol,
        exchangeSymbol,
        exchange: this.exchangeName,
        openInterest: oiUsd,
        timestamp: response.data.time || Date.now(),
      };
    } catch (error) {
      logger.error(`Binance OI fetch failed for ${baseSymbol}`, error);
      throw error;
    }
  }
}
