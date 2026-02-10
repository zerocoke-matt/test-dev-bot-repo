/**
 * HTTP Client
 * Wrapper around axios with retry logic and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { HttpRequestOptions, HttpResponse } from '../types/api.types';
import { logger } from '../logger/logger';
import { ERROR_CODES } from '../config/constants';

export class HttpClient {
  private client: AxiosInstance;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    baseURL: string,
    timeout: number,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`HTTP Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
        });
        return config;
      },
      (error) => {
        logger.error('HTTP Request Error', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`HTTP Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('HTTP Response Error', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: AxiosError): boolean {
    if (!error.response) {
      // Network errors are retryable
      return true;
    }

    const status = error.response.status;
    // Retry on 5xx errors and 429 (rate limit)
    return status >= 500 || status === 429;
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T>(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      params,
      data,
      timeout,
      retries = this.maxRetries,
      retryDelay = this.retryDelay,
    } = options;

    const config: AxiosRequestConfig = {
      url,
      method,
      headers,
      params,
      data,
      timeout,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.client.request<T>(config);
        return {
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
        };
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        if (attempt < retries && this.isRetryable(axiosError)) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          logger.warn(
            `Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`,
            {
              url,
              error: axiosError.message,
            }
          );
          await this.sleep(delay);
          continue;
        }

        // Not retryable or out of retries
        break;
      }
    }

    // All retries exhausted
    throw this.handleError(lastError as AxiosError);
  }

  /**
   * GET request
   */
  async get<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    url: string,
    data?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', data });
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data
        ? JSON.stringify(error.response.data)
        : error.message;

      const err = new Error(`API Error (${status}): ${message}`);
      (err as any).code = ERROR_CODES.API_ERROR;
      return err;
    } else if (error.request) {
      // Request made but no response received
      const err = new Error(`Network Error: No response received - ${error.message}`);
      (err as any).code = ERROR_CODES.NETWORK_ERROR;
      return err;
    } else {
      // Error setting up request
      const err = new Error(`Request Error: ${error.message}`);
      (err as any).code = ERROR_CODES.INTERNAL_ERROR;
      return err;
    }
  }
}
