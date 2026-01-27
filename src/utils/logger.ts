/**
 * Minimalist logger with configurable log levels
 * 
 * Usage:
 *   logger.debug('Debug message');
 *   logger.info('Info message');
 *   logger.warn('Warning message');
 *   logger.error('Error message');
 * 
 * Configuration:
 *   Set LOG_LEVEL environment variable: debug | info | warn | error
 *   Default: info
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * Parse log level from string
 */
function parseLogLevel(level: string | undefined): LogLevel {
  if (!level) return LogLevel.INFO;

  const normalized = level.toLowerCase().trim();
  
  switch (normalized) {
    case 'debug':
      return LogLevel.DEBUG;
    case 'info':
      return LogLevel.INFO;
    case 'warn':
    case 'warning':
      return LogLevel.WARN;
    case 'error':
      return LogLevel.ERROR;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  const levelName = LOG_LEVEL_NAMES[level];
  return `${timestamp} [${levelName}] ${message}`;
}

/**
 * Logger class with level-based filtering
 */
class Logger {
  private currentLevel: LogLevel;

  constructor() {
    this.currentLevel = parseLogLevel(process.env.LOG_LEVEL);
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.currentLevel;
  }

  /**
   * Check if a log level is enabled
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  /**
   * Log a debug message
   * Writes to stderr to avoid polluting stdout (critical for MCP protocol)
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      process.stderr.write(formatMessage(LogLevel.DEBUG, message) + '\n');
      if (args.length > 0) {
        process.stderr.write(JSON.stringify(args, null, 2) + '\n');
      }
    }
  }

  /**
   * Log an info message
   * Writes to stderr to avoid polluting stdout (critical for MCP protocol)
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      process.stderr.write(formatMessage(LogLevel.INFO, message) + '\n');
      if (args.length > 0) {
        process.stderr.write(JSON.stringify(args, null, 2) + '\n');
      }
    }
  }

  /**
   * Log a warning message
   * Writes to stderr to avoid polluting stdout (critical for MCP protocol)
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      process.stderr.write(formatMessage(LogLevel.WARN, message) + '\n');
      if (args.length > 0) {
        process.stderr.write(JSON.stringify(args, null, 2) + '\n');
      }
    }
  }

  /**
   * Log an error message
   * Writes to stderr to avoid polluting stdout (critical for MCP protocol)
   */
  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      process.stderr.write(formatMessage(LogLevel.ERROR, message) + '\n');
      if (args.length > 0) {
        process.stderr.write(JSON.stringify(args, null, 2) + '\n');
      }
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Also export class for testing or custom instances
export { Logger };
