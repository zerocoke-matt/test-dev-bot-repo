/**
 * Application Entry Point
 * Initializes and starts the server
 */

import { createApp } from './server/app';
import { BinanceClient } from './api/exchanges/binance-client';
import { BybitClient } from './api/exchanges/bybit-client';
import { BitgetClient } from './api/exchanges/bitget-client';
import { OKXClient } from './api/exchanges/okx-client';
import { CoinGeckoClient } from './api/coingecko-client';
import { DataFetcherService } from './services/data-fetcher.service';
import { FilterService } from './services/filter.service';
import { CacheService } from './services/cache.service';
import { AggregatorService } from './services/aggregator.service';
import { appConfig } from './config/app.config';
import { logger } from './logger/logger';
import { IExchangeClient } from './api/exchanges/exchange-client';

/**
 * Initialize services
 */
function initializeServices() {
  logger.info('Initializing services...');

  // Initialize exchange clients
  const exchangeClients: IExchangeClient[] = [];

  if (appConfig.exchanges.binance.enabled) {
    exchangeClients.push(new BinanceClient(appConfig.exchanges.binance.timeout));
    logger.info('Binance client initialized');
  }

  if (appConfig.exchanges.bybit.enabled) {
    exchangeClients.push(new BybitClient(appConfig.exchanges.bybit.timeout));
    logger.info('Bybit client initialized');
  }

  if (appConfig.exchanges.bitget.enabled) {
    exchangeClients.push(new BitgetClient(appConfig.exchanges.bitget.timeout));
    logger.info('Bitget client initialized');
  }

  if (appConfig.exchanges.okx.enabled) {
    exchangeClients.push(new OKXClient(appConfig.exchanges.okx.timeout));
    logger.info('OKX client initialized');
  }

  logger.info(`${exchangeClients.length} exchange clients initialized`);

  // Initialize CoinGecko client
  const coingeckoClient = new CoinGeckoClient(appConfig.coingecko.timeout);
  logger.info('CoinGecko client initialized');

  // Initialize services
  const dataFetcher = new DataFetcherService(exchangeClients, coingeckoClient);
  logger.info('Data fetcher service initialized');

  const filterService = new FilterService();
  logger.info('Filter service initialized');

  const cacheService = new CacheService(appConfig.cache);
  logger.info('Cache service initialized');

  const aggregator = new AggregatorService(
    dataFetcher,
    filterService,
    cacheService,
    appConfig.filter.multiplier
  );
  logger.info('Aggregator service initialized');

  return aggregator;
}

/**
 * Start the server
 */
async function startServer() {
  try {
    logger.info('Starting Exchange OI vs MC Filter Backend...');
    logger.info(`Environment: ${appConfig.server.nodeEnv}`);
    logger.info(`Port: ${appConfig.server.port}`);

    // Initialize services
    const aggregator = initializeServices();

    // Create Express app
    const app = createApp(aggregator);

    // Start server
    const server = app.listen(appConfig.server.port, () => {
      logger.info(`Server is running on port ${appConfig.server.port}`);
      logger.info(`Health check: http://localhost:${appConfig.server.port}/api/health`);
      logger.info(`API documentation: http://localhost:${appConfig.server.port}/`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled rejection', reason);
      shutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();
