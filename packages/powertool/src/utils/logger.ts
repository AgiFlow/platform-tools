/**
 * Logger Utility
 *
 * DESIGN PATTERNS:
 * - Singleton pattern for consistent logging
 * - Structured logging with levels
 *
 * CODING STANDARDS:
 * - Use console methods for different log levels
 * - Support structured data logging
 * - Keep interface simple and focused
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogData {
  [key: string]: any;
}

class Logger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, data?: LogData): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  info(message: string, data?: LogData): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  warn(message: string, data?: LogData): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  error(message: string, data?: LogData): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const targetLevelIndex = levels.indexOf(level);
    return targetLevelIndex >= currentLevelIndex;
  }
}

export const log = new Logger();
