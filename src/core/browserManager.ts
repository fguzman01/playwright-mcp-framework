/**
 * BrowserManager - Singleton wrapper around Playwright chromium browser
 * 
 * Manages the lifecycle of a browser instance, context, and page.
 * All methods follow actionability rules (no manual waits, locator-based).
 */

import { chromium, Browser, BrowserContext, Page, Locator } from 'playwright';
import * as path from 'path';
import { config } from './config';
import { ensureDir, resolveAbsolute, cleanDirectory } from '../utils/fs';
import { logger } from '../utils/logger';

export interface LaunchOptions {
  headless?: boolean;
  slowMoMs?: number;
}

export interface ClickOptions {
  timeoutMs?: number;
}

export interface TypeOptions {
  timeoutMs?: number;
  clear?: boolean;
}

export interface ScreenshotOptions {
  path?: string;
  fullPage?: boolean;
  returnBase64?: boolean;
}

/**
 * BrowserManager class - manages Playwright browser lifecycle
 */
class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isShuttingDown = false;

  /**
   * Launch a new browser instance
   * 
   * @param options - Launch options (headless, slowMoMs)
   * @throws Error if browser is already launched
   */
  async launch(options?: LaunchOptions): Promise<void> {
    await this.runStep('launch', async () => {
      if (this.browser) {
        throw new Error('Browser is already launched. Call quit() before launching again.');
      }

      const headless = options?.headless ?? config.headless;
      const slowMo = options?.slowMoMs ?? config.slowMoMs;

      logger.debug(`Launch options: headless=${headless}, slowMo=${slowMo}ms`);

      // Ensure screenshot directory exists
      await ensureDir(resolveAbsolute(config.screenshotDir));

      // Launch browser
      this.browser = await chromium.launch({
        headless,
        slowMo,
      });

      // Create context with viewport
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });

      // Create page
      this.page = await this.context.newPage();

      // Set default timeout
      this.page.setDefaultTimeout(config.defaultTimeoutMs);
    });
  }

  /**
   * Navigate to a URL
   * 
   * @param url - URL to navigate to
   * @throws Error if browser is not launched
   */
  async navigate(url: string): Promise<void> {
    this.ensureLaunched('navigate');
    
    await this.runStep(`navigate to ${url}`, async () => {
      await this.page!.goto(url, { waitUntil: 'domcontentloaded' });
    });
  }

  /**
   * Get the current page title
   * 
   * @returns The page title
   * @throws Error if browser is not launched
   */
  async getTitle(): Promise<string> {
    this.ensureLaunched('getTitle');
    return await this.page!.title();
  }

  /**
   * Get the current page URL
   * 
   * @returns The current URL
   * @throws Error if browser is not launched
   */
  async getUrl(): Promise<string> {
    this.ensureLaunched('getUrl');
    return this.page!.url();
  }

  /**
   * Wait for a selector to be visible
   * 
   * @param selector - CSS selector to wait for
   * @param options - Wait options (timeoutMs)
   * @throws Error if element is not visible within timeout
   */
  async waitForSelector(selector: string, options?: { timeoutMs?: number }): Promise<void> {
    this.ensureLaunched('waitForSelector');
    
    const timeout = options?.timeoutMs ?? config.defaultTimeoutMs;
    
    await this.runStep(`wait for selector "${selector}"`, async () => {
      await this.page!.locator(selector).first().waitFor({
        state: 'visible',
        timeout,
      });
    });
  }

  /**
   * Find an element using a selector
   * Returns a Playwright Locator (does not wait or verify existence)
   * 
   * @param selector - CSS selector, text, or other locator
   * @returns Playwright Locator
   * @throws Error if browser is not launched
   */
  find(selector: string): Locator {
    this.ensureLaunched('find');
    
    return this.page!.locator(selector);
  }

  /**
   * Click on an element
   * Uses Playwright's auto-waiting and actionability checks
   * 
   * @param selector - Selector for element to click
   * @param options - Click options (timeoutMs)
   * @throws Error if browser is not launched or element not found/actionable
   */
  async click(selector: string, options?: ClickOptions): Promise<void> {
    this.ensureLaunched('click');
    
    const timeout = options?.timeoutMs ?? config.defaultTimeoutMs;
    
    await this.runStep(`click "${selector}"`, async () => {
      try {
        const locator = this.page!.locator(selector);
        await locator.click({ timeout });
      } catch (error: any) {
        throw new Error(
          `Click failed for selector "${selector}" (timeout ${timeout}ms): ${error.message}`,
          { cause: error }
        );
      }
    });
  }

  /**
   * Type text into an element
   * Uses fill() which is faster and more reliable than type()
   * 
   * @param selector - Selector for input element
   * @param text - Text to type
   * @param options - Type options (timeoutMs, clear)
   * @throws Error if browser is not launched or element not found/actionable
   */
  async type(selector: string, text: string, options?: TypeOptions): Promise<void> {
    this.ensureLaunched('type');
    
    const timeout = options?.timeoutMs ?? config.defaultTimeoutMs;
    const clear = options?.clear ?? true;
    
    await this.runStep(`type into "${selector}"`, async () => {
      try {
        const locator = this.page!.locator(selector);

        if (clear) {
          // Clear existing content
          await locator.clear({ timeout });
        }

        // Fill with new text
        await locator.fill(text, { timeout });
      } catch (error: any) {
        throw new Error(
          `Type failed for selector "${selector}" (timeout ${timeout}ms): ${error.message}`,
          { cause: error }
        );
      }
    });
  }

  /**
   * Get information about an element
   * 
   * @param selector - Selector for element to inspect
   * @param options - Options (timeoutMs)
   * @returns Element information including found status, tag, text, and bounding box
   * @throws Error if browser is not launched
   */
  async getElementInfo(
    selector: string,
    options?: { timeoutMs?: number }
  ): Promise<{
    selector: string;
    found: boolean;
    tag?: string;
    text?: string;
    boundingBox?: { x: number; y: number; width: number; height: number };
  }> {
    this.ensureLaunched('getElementInfo');

    const timeout = options?.timeoutMs ?? config.defaultTimeoutMs;

    return await this.runStep(`get element info for "${selector}"`, async () => {
      try {
        // Use locator-only approach
        const loc = this.page!.locator(selector).first();

        // Wait for element to be attached (does not throw if timeout)
        await loc.waitFor({ state: 'attached', timeout });

        // Element was found, get info
        const tag = await loc.evaluate((el) => el.tagName.toLowerCase());
        
        let text = await loc.innerText();
        // Truncate text to max 200 chars
        if (text && text.length > 200) {
          text = text.substring(0, 200) + '...';
        }

        const boundingBox = await loc.boundingBox();

        return {
          selector,
          found: true,
          tag,
          text,
          ...(boundingBox && { boundingBox }),
        };
      } catch (error: any) {
        // Element not found within timeout - this is not an error for this method
        logger.debug(`Element not found: "${selector}" (timeout ${timeout}ms)`);
        return {
          selector,
          found: false,
        };
      }
    });
  }

  /**
   * Take a screenshot
   * 
   * @param options - Screenshot options (path, fullPage, returnBase64)
   * @returns Buffer or base64 string depending on returnBase64 option
   * @throws Error if browser is not launched
   */
  async screenshot(options?: ScreenshotOptions): Promise<Buffer | string> {
    this.ensureLaunched('screenshot');
    
    const fullPage = options?.fullPage ?? false;
    const returnBase64 = options?.returnBase64 ?? false;

    let screenshotPath: string | undefined;
    
    if (options?.path) {
      screenshotPath = resolveAbsolute(options.path);
      
      // Ensure parent directory exists
      const parentDir = path.dirname(screenshotPath);
      await ensureDir(parentDir);
    }

    // Take screenshot
    const buffer = await this.page!.screenshot({
      path: screenshotPath,
      fullPage,
      type: 'png',
    });

    if (returnBase64) {
      return buffer.toString('base64');
    }

    return buffer;
  }

  /**
   * Quit the browser (normal shutdown)
   * Closes page, context, and browser in order
   * 
   * @throws Error if browser is not launched
   */
  async quit(): Promise<void> {
    this.ensureLaunched('quit');
    
    await this.runStep('quit', async () => {
      try {
        if (this.page) {
          await this.page.close();
          this.page = null;
        }

        if (this.context) {
          await this.context.close();
          this.context = null;
        }

        if (this.browser) {
          await this.browser.close();
          this.browser = null;
        }
      } catch (error) {
        // Reset state even if close fails
        this.page = null;
        this.context = null;
        this.browser = null;
        throw error;
      }
    });
  }

  /**
   * Shutdown the browser (idempotent, safe to call multiple times)
   * Use for cleanup in signal handlers or error recovery
   * 
   * Does not throw if browser is not launched or already closed
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return; // Already shutting down
    }

    this.isShuttingDown = true;

    try {
      if (!this.browser) {
        return; // Nothing to shut down
      }

      await this.quit();
    } catch (error) {
      // Log but don't throw - shutdown should be safe
      console.error('Error during shutdown:', error);
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * Check if browser is currently launched
   */
  isLaunched(): boolean {
    return this.browser !== null && this.page !== null;
  }

  /**
   * Get the current page (for advanced usage)
   * 
   * @returns Current page or null if not launched
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Get the current browser context (for advanced usage)
   * 
   * @returns Current context or null if not launched
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * Get the browser instance (for advanced usage)
   * 
   * @returns Browser instance or null if not launched
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Ensure browser is launched before operation
   * 
   * @param operation - Name of operation being performed (for error message)
   * @throws Error if browser is not launched
   */
  private ensureLaunched(operation: string): void {
    if (!this.browser || !this.page) {
      throw new Error(
        `Cannot ${operation}: Browser is not launched. Call launch() first.`
      );
    }
  }

  /**
   * Run a step with logging, timing, and automatic error screenshot
   * 
   * @param stepName - Name of the step for logging
   * @param fn - Async function to execute
   * @returns Result of the function
   * @throws Re-throws any error after logging and attempting screenshot
   */
  private async runStep<T>(stepName: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    logger.info(`Starting: ${stepName}`);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      logger.info(`Completed: ${stepName} (${duration}ms)`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`Failed: ${stepName} (${duration}ms) - ${error.message}`);

      // Best effort: try to take error screenshot
      await this.captureErrorScreenshot(stepName);

      // Re-throw original error
      throw error;
    }
  }

  /**
   * Capture screenshot on error (best effort, doesn't throw)
   * 
   * @param stepName - Name of the step that failed
   */
  private async captureErrorScreenshot(stepName: string): Promise<void> {
    try {
      if (!this.page) {
        logger.debug('Cannot capture error screenshot: No page available');
        return;
      }

      const filename = this.buildErrorScreenshotName(stepName);
      const screenshotPath = path.join(config.screenshotDir, filename);

      await this.screenshot({ path: screenshotPath, fullPage: true });
      logger.info(`Error screenshot saved: ${screenshotPath}`);
    } catch (screenshotError: any) {
      // Best effort - don't fail if screenshot fails
      logger.debug(`Failed to capture error screenshot: ${screenshotError.message}`);
    }
  }

  /**
   * Build a safe filename for error screenshots
   * 
   * Format: error-20260127T153010Z-click-button_submit.png
   * 
   * @param stepName - Name of the step that failed
   * @returns Safe filename for Windows/Unix
   */
  private buildErrorScreenshotName(stepName: string): string {
    // Get timestamp in ISO format without colons (Windows-safe)
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    // Sanitize step name: replace non-alphanumeric with underscore
    const safeName = stepName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    return `error-${timestamp}-${safeName}.png`;
  }

  /**
   * Clean screenshots directory by removing all PNG files
   * Useful to run before a test suite to avoid accumulating old screenshots
   * 
   * @param pattern - Optional pattern to match files (default: '*.png')
   * @returns Number of files deleted
   * 
   * @example
   * // In a test file:
   * test.beforeAll(async () => {
   *   await browserManager.cleanScreenshots();
   * });
   */
  async cleanScreenshots(pattern: string = '*.png'): Promise<number> {
    const screenshotDir = resolveAbsolute(config.screenshotDir);
    logger.info(`Cleaning screenshots directory: ${screenshotDir} (pattern: ${pattern})`);
    
    const deletedCount = await cleanDirectory(screenshotDir, pattern);
    
    logger.info(`Deleted ${deletedCount} screenshot(s)`);
    return deletedCount;
  }
}

// Export singleton instance
export const browserManager = new BrowserManager();

// Also export class for testing or multiple instances
export { BrowserManager };
