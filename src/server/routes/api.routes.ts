/**
 * API Routes
 * Express router for all API endpoints
 */

import { Router, Request, Response } from 'express';
import { AggregatorService } from '../../services/aggregator.service';
import { QueryParams } from '../../types/domain.types';
import { logger } from '../../logger/logger';
import { HTTP_STATUS, ERROR_CODES } from '../../config/constants';

export function createApiRouter(aggregator: AggregatorService): Router {
  const router = Router();

  /**
   * GET /api/health
   * Health check endpoint
   */
  router.get('/health', async (_req: Request, res: Response) => {
    try {
      const uptime = process.uptime();
      const lastRefresh = aggregator.getLastRefreshTime();
      const cacheStats = aggregator.getCacheStats();

      res.status(HTTP_STATUS.OK).json({
        status: 'healthy',
        uptime,
        timestamp: new Date(),
        services: {
          api: 'connected',
          cache: cacheStats.keys >= 0 ? 'active' : 'inactive',
        },
        lastDataRefresh: lastRefresh,
      });
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/coins
   * Get filtered coins with optional query parameters
   */
  router.get('/coins', async (req: Request, res: Response) => {
    try {
      logger.debug('GET /api/coins', { query: req.query });

      // Parse query parameters
      const params: QueryParams = {
        multiplier: req.query.multiplier ? parseFloat(req.query.multiplier as string) : undefined,
        minMarketCap: req.query.minMarketCap
          ? parseFloat(req.query.minMarketCap as string)
          : undefined,
        maxMarketCap: req.query.maxMarketCap
          ? parseFloat(req.query.maxMarketCap as string)
          : undefined,
        minOI: req.query.minOI ? parseFloat(req.query.minOI as string) : undefined,
        symbols: req.query.symbols as string | undefined,
        sortBy: req.query.sortBy as QueryParams['sortBy'],
        sortOrder: req.query.sortOrder as QueryParams['sortOrder'],
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      // Guard against NaN from non-numeric query strings (e.g. "?limit=abc")
      if (params.limit !== undefined && isNaN(params.limit)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'limit must be a valid number',
          },
        });
        return;
      }
      if (params.offset !== undefined && isNaN(params.offset)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'offset must be a valid number',
          },
        });
        return;
      }

      // Get filtered coins
      const result = await aggregator.getFilteredCoins(params);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          coins: result.coins,
          total: result.total,
          filtered: result.filtered,
          returned: result.coins.length,
          config: result.config,
        },
        timestamp: result.timestamp,
      });
    } catch (error) {
      logger.error('Failed to get filtered coins', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch coins';

      // Filter validation errors are client mistakes → 400, not 500
      const isValidationError = message.startsWith('Invalid filter configuration');
      const status = isValidationError ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const code = isValidationError ? ERROR_CODES.VALIDATION_ERROR : ERROR_CODES.INTERNAL_ERROR;

      res.status(status).json({
        success: false,
        error: {
          code,
          message,
        },
      });
    }
  });

  /**
   * GET /api/coins/:symbol
   * Get specific coin by symbol
   */
  router.get('/coins/:symbol', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      logger.debug(`GET /api/coins/${symbol}`);

      if (!symbol) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Symbol parameter is required',
          },
        });
        return;
      }

      const coin = await aggregator.getCoinBySymbol(symbol);

      if (!coin) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: `Coin with symbol ${symbol} not found`,
          },
        });
        return;
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: coin,
      });
    } catch (error) {
      logger.error('Failed to get coin', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch coin';
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message,
        },
      });
    }
  });

  /**
   * GET /api/statistics
   * Get statistics about filtered coins
   */
  router.get('/statistics', async (req: Request, res: Response) => {
    try {
      logger.debug('GET /api/statistics', { query: req.query });

      // Parse query parameters (same as /coins endpoint)
      const params: QueryParams = {
        multiplier: req.query.multiplier ? parseFloat(req.query.multiplier as string) : undefined,
        minMarketCap: req.query.minMarketCap
          ? parseFloat(req.query.minMarketCap as string)
          : undefined,
        maxMarketCap: req.query.maxMarketCap
          ? parseFloat(req.query.maxMarketCap as string)
          : undefined,
        minOI: req.query.minOI ? parseFloat(req.query.minOI as string) : undefined,
        symbols: req.query.symbols as string | undefined,
      };

      const stats = await aggregator.getStatistics(params);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get statistics', error);
      const message = error instanceof Error ? error.message : 'Failed to calculate statistics';

      // Filter validation errors are client mistakes → 400, not 500
      const isValidationError = message.startsWith('Invalid filter configuration');
      const status = isValidationError ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const code = isValidationError ? ERROR_CODES.VALIDATION_ERROR : ERROR_CODES.INTERNAL_ERROR;

      res.status(status).json({
        success: false,
        error: {
          code,
          message,
        },
      });
    }
  });

  /**
   * POST /api/refresh
   * Force refresh data
   */
  router.post('/refresh', async (_req: Request, res: Response) => {
    try {
      logger.info('POST /api/refresh - Force refresh requested');

      await aggregator.refreshData();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Data refreshed successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to refresh data', error);
      const message = error instanceof Error ? error.message : 'Failed to refresh data';
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message,
        },
      });
    }
  });

  return router;
}
