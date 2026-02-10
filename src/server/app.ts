/**
 * Express Application
 * Main Express app configuration
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { createApiRouter } from './routes/api.routes';
import { AggregatorService } from '../services/aggregator.service';
import { logger } from '../logger/logger';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';

/**
 * Create and configure Express application
 */
export function createApp(aggregator: AggregatorService): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(
        `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`,
        {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration,
        }
      );
    });
    next();
  });

  // CORS middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.sendStatus(HTTP_STATUS.OK);
      return;
    }

    next();
  });

  // API routes
  app.use('/api', createApiRouter(aggregator));

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.status(HTTP_STATUS.OK).json({
      name: 'Coinglass OI vs MC Filter API',
      version: '1.0.0',
      description: 'Backend service for filtering cryptocurrencies based on Open Interest vs Market Cap ratio',
      endpoints: {
        health: 'GET /api/health',
        coins: 'GET /api/coins',
        coin: 'GET /api/coins/:symbol',
        statistics: 'GET /api/statistics',
        refresh: 'POST /api/refresh',
      },
      documentation: {
        coins: {
          description: 'Get filtered coins',
          queryParams: {
            multiplier: 'number - OI multiplier for filtering (default: 0.5)',
            minMarketCap: 'number - Minimum market cap filter',
            maxMarketCap: 'number - Maximum market cap filter',
            minOI: 'number - Minimum open interest filter',
            symbols: 'string - Comma-separated list of symbols to filter',
            sortBy: 'string - Field to sort by (oiToMcRatio, marketCap, aggregateOI, volume24h, priceChange24h)',
            sortOrder: 'string - Sort order (asc, desc)',
            limit: 'number - Maximum number of results to return',
            offset: 'number - Number of results to skip',
          },
        },
      },
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Cannot ${req.method} ${req.path}`,
      },
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
    });
  });

  return app;
}
