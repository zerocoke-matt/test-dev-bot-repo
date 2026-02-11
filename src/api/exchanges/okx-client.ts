/**
 * OKX Client
 * Fetches OI from OKX V5 API
 */

import { BaseExchangeClient, ExchangeOIData } from './exchange-client';
import { getExchangeSymbol } from '../../config/symbol-mapping';
import { logger } from '../../logger/logger';

interface OKXOIResponse {
  code: string;
  msg: string;
  data: Array<{
    instId: string;
    instType: string;
    oi: string;
    oiCcy: string;
    ts: string;
  }>;
}

export class OKXClient extends BaseExchangeClient {
  readonly exchangeName = 'okx';

  constructor(timeout: number = 10000) {
    // OKX: 20 req/2sec
    super('https://www.okx.com', timeout, 10, 1000);
  }

  async getOpenInterest(baseSymbol: string): Promise<ExchangeOIData> {
    const exchangeSymbol = getExchangeSymbol(baseSymbol, 'okx');
    if (!exchangeSymbol) {
      throw new Error(`No OKX symbol mapping for ${baseSymbol}`);
    }

    await this.rateLimit();

    try {
      const response = await this.httpClient.get<OKXOIResponse>(
        '/api/v5/public/open-interest',
        {
          params: {
            instType: 'SWAP',
            instId: exchangeSymbol,
          },
        }
      );

      if (response.data.code !== '0') {
        throw new Error(`OKX API error: ${response.data.msg}`);
      }

      const oiData = response.data.data;
      if (!oiData || oiData.length === 0) {
        throw new Error(`No OI data from OKX for ${baseSymbol}`);
      }

      const oiCoins = parseFloat(oiData[0].oi);

      // OKX returns OI in contract count, need mark price for USD
      await this.rateLimit();
      const tickerResponse = await this.httpClient.get<{
        code: string;
        data: Array<{ markPx: string }>;
      }>('/api/v5/public/mark-price', {
        params: { instType: 'SWAP', instId: exchangeSymbol },
      });

      const markPxStr = tickerResponse.data.data?.[0]?.markPx;
      if (!markPxStr) {
        throw new Error(`No mark price data from OKX for ${baseSymbol}`);
      }
      const markPrice = parseFloat(markPxStr);
      if (isNaN(markPrice) || markPrice <= 0) {
        throw new Error(`Invalid mark price from OKX for ${baseSymbol}: ${markPxStr}`);
      }
      const oiUsd = oiCoins * markPrice;

      logger.debug(`OKX OI for ${baseSymbol}: $${oiUsd.toFixed(0)}`);

      return {
        symbol: baseSymbol,
        exchangeSymbol,
        exchange: this.exchangeName,
        openInterest: oiUsd,
        timestamp: parseInt(oiData[0].ts) || Date.now(),
      };
    } catch (error) {
      logger.error(`OKX OI fetch failed for ${baseSymbol}`, error);
      throw error;
    }
  }
}
