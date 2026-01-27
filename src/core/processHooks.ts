/**
 * Process Hooks - Handle process signals and exceptions for graceful shutdown
 * 
 * This module provides a centralized way to register shutdown handlers
 * that respond to process signals (SIGINT, SIGTERM) and uncaught errors.
 * 
 * Features:
 * - Idempotent shutdown (only runs once)
 * - Graceful shutdown with timeout (5s)
 * - Proper exit codes (130 for SIGINT, 1 for errors)
 * - Logging for all events
 * 
 * Usage:
 *   registerProcessHooks(async () => {
 *     await browserManager.shutdown();
 *     // other cleanup...
 *   });
 */

import { logger } from '../utils/logger';

// Shutdown state
let isShuttingDown = false;
let shutdownTimeout: NodeJS.Timeout | null = null;

// Shutdown timeout duration (5 seconds)
const SHUTDOWN_TIMEOUT_MS = 5000;

/**
 * Exit codes
 */
const ExitCode = {
  SUCCESS: 0,
  ERROR: 1,
  SIGINT: 130, // Standard exit code for SIGINT (Ctrl+C)
} as const;

/**
 * Register process hooks for graceful shutdown
 * 
 * This function should be called once during application initialization.
 * It registers handlers for process signals and uncaught errors.
 * 
 * @param shutdownFn - Async function to call for cleanup (e.g., close browser, close connections)
 * 
 * @example
 * registerProcessHooks(async () => {
 *   await browserManager.shutdown();
 *   await database.disconnect();
 * });
 */
export function registerProcessHooks(shutdownFn: () => Promise<void>): void {
  logger.debug('Registering process hooks for graceful shutdown');

  /**
   * Perform graceful shutdown with timeout
   */
  async function performShutdown(signal: string, exitCode: number): Promise<void> {
    // Idempotency: only shutdown once
    if (isShuttingDown) {
      logger.debug('Shutdown already in progress, ignoring duplicate signal');
      return;
    }

    isShuttingDown = true;
    logger.info(`Received ${signal}, initiating graceful shutdown...`);

    // Set up safety timeout to force exit if shutdown hangs
    shutdownTimeout = setTimeout(() => {
      logger.error(`Shutdown timeout (${SHUTDOWN_TIMEOUT_MS}ms) exceeded, forcing exit`);
      process.exit(exitCode);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      // Execute user-provided shutdown function
      await shutdownFn();
      
      logger.info('Graceful shutdown completed successfully');
      
      // Clear timeout and exit cleanly
      if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
        shutdownTimeout = null;
      }

      process.exit(exitCode);
    } catch (error: any) {
      logger.error(`Error during shutdown: ${error.message}`);
      
      // Clear timeout and exit with error
      if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
        shutdownTimeout = null;
      }

      process.exit(ExitCode.ERROR);
    }
  }

  /**
   * SIGINT handler (Ctrl+C)
   */
  process.on('SIGINT', () => {
    performShutdown('SIGINT', ExitCode.SIGINT).catch((error) => {
      logger.error(`Fatal error in SIGINT handler: ${error.message}`);
      process.exit(ExitCode.ERROR);
    });
  });

  /**
   * SIGTERM handler (termination signal)
   */
  process.on('SIGTERM', () => {
    performShutdown('SIGTERM', ExitCode.SUCCESS).catch((error) => {
      logger.error(`Fatal error in SIGTERM handler: ${error.message}`);
      process.exit(ExitCode.ERROR);
    });
  });

  /**
   * Uncaught Exception handler
   */
  process.on('uncaughtException', (error: Error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    
    // Set exit code for error
    process.exitCode = ExitCode.ERROR;

    performShutdown('uncaughtException', ExitCode.ERROR).catch((shutdownError) => {
      logger.error(`Fatal error during exception shutdown: ${shutdownError.message}`);
      process.exit(ExitCode.ERROR);
    });
  });

  /**
   * Unhandled Promise Rejection handler
   */
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : '';
    
    logger.error(`Unhandled promise rejection: ${message}`);
    if (stack) {
      logger.error(`Stack: ${stack}`);
    }
    
    // Set exit code for error
    process.exitCode = ExitCode.ERROR;

    performShutdown('unhandledRejection', ExitCode.ERROR).catch((shutdownError) => {
      logger.error(`Fatal error during rejection shutdown: ${shutdownError.message}`);
      process.exit(ExitCode.ERROR);
    });
  });

  logger.debug('Process hooks registered successfully');
}

/**
 * Check if shutdown is in progress
 * Useful for preventing new operations during shutdown
 */
export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}
