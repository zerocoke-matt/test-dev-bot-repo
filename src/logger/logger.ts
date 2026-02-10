/**
 * Logger Utility
 * Simple logging utility with different log levels
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    const env = process.env.NODE_ENV || 'development';
    this.level = env === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  /**
   * Format log message with timestamp and level
   */
  private format(level: string, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: unknown): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.format('DEBUG', message, meta));
    }
  }

  /**
   * Log info message
   */
  info(message: string, meta?: unknown): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.format('INFO', message, meta));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: unknown): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.format('WARN', message, meta));
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: unknown): void {
    if (this.level <= LogLevel.ERROR) {
      const errorMeta = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(this.format('ERROR', message, errorMeta));
    }
  }

  /**
   * Set log level
   */
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    const levels = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
    };
    this.level = levels[level];
  }
}

// Export singleton instance
export const logger = new Logger();
