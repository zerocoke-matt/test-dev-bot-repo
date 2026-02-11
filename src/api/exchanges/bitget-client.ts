/**
 * Bitget Client
 * Fetches OI from Bitget Mix API V2
 */

import { BaseExchangeClient, ExchangeOIData } from './exchange-client';
import { getExchangeSymbol } from '../../config/symbol-mapping';
import { logger } from '../../logger/logger';

interface BitgetOIResponse {
  code: string;
  msg: string;
  data: {
    symbol: string;
    amount: string;
  };
}

export class BitgetClient extends BaseExchangeClient {
  readonly exchangeName = 'bitget';

  constructor(timeout: number = 10000) {
    // Bitget: 20 req/sec
    super('https://api.bitget.com', timeout, 15, 1000);
  }

  async getOpenInterest(baseSymbol: string): Promise<ExchangeOIData> {
    const exchangeSymbol = getExchangeSymbol(baseSymbol, 'bitget');
    if (!exchangeSymbol) {
      throw new Error(`No Bitget symbol mapping for ${baseSymbol}`);
    }

    await this.rateLimit();

    try {
      const response = await this.httpClient.get<BitgetOIResponse>(
        '/api/v2/mix/market/open-interest',
        {
          params: {
            productType: 'USDT-FUTURES',
            symbol: exchangeSymbol,
          },
        }
      );

      if (response.data.code !== '00000') {
        throw new Error(`Bitget API error: ${response.data.msg}`);
      }

      const oiAmount = parseFloat(response.data.data.amount);

      // Bitget returns OI in coin amount, need price for USD conversion
      const tickerResponse = await this.httpClient.get<{
        code: string;
        data: Array<{ markPrice: string }>;
      }>('/api/v2/mix/market/ticker', {
        params: { productType: 'USDT-FUTURES', symbol: exchangeSymbol },
      });

      const markPrice = parseFloat(tickerResponse.data.data?.[0]?.markPrice || '0');
      const oiUsd = oiAmount * markPrice;

      logger.debug(`Bitget OI for ${baseSymbol}: $${oiUsd.toFixed(0)}`);

      return {
        symbol: baseSymbol,
        exchangeSymbol,
        exchange: this.exchangeName,
        openInterest: oiUsd,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(`Bitget OI fetch failed for ${baseSymbol}`, error);
      throw error;
    }
  }
}
