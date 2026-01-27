/**
 * Configuration for BrowserManager
 * Uses environment variables with sensible defaults
 */

export interface BrowserConfig {
  headless: boolean;
  slowMoMs: number;
  defaultTimeoutMs: number;
  screenshotDir: string;
}

/**
 * Parse boolean from string, handling common variations
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  
  const normalized = value.toLowerCase().trim();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  
  return defaultValue;
}

/**
 * Parse number from string with validation
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) {
    return defaultValue;
  }
  
  return parsed;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): BrowserConfig {
  return {
    headless: parseBoolean(process.env.HEADLESS, false),
    slowMoMs: parseNumber(process.env.SLOWMO_MS, 0),
    defaultTimeoutMs: parseNumber(process.env.DEFAULT_TIMEOUT_MS, 30000),
    screenshotDir: process.env.SCREENSHOT_DIR || './screenshots',
  };
}

// Export singleton config instance
export const config = loadConfig();
