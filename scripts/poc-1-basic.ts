import { browserManager } from "../src/core/browserManager";
import { registerProcessHooks } from "../src/core/processHooks";
import { config } from "../src/core/config";
import { logger } from "../src/utils/logger";
import * as path from "path";

/**
 * POC 1: Basic BrowserManager usage with process hooks
 * 
 * Demonstrates:
 * - Process hooks registration for graceful shutdown
 * - Browser launch in headed mode
 * - Navigation to a page
 * - Element inspection with getElementInfo
 * - Screenshots before and after click
 * - Proper error handling and cleanup
 */

// Register process hooks at the very start
registerProcessHooks(() => browserManager.shutdown());

async function main() {
  try {
    logger.info("🚀 Starting POC 1: Basic Browser Operations");

    // Launch browser in headed mode
    await browserManager.launch({ headless: false });
    logger.info("✅ Browser launched");

    // Navigate to example.com
    await browserManager.navigate("https://example.com");
    logger.info("✅ Navigated to example.com");

    // Get and validate page title
    const title = await browserManager.getTitle();
    logger.info(`📄 Page title: "${title}"`);
    if (!title.includes("Example")) {
      throw new Error(`Title validation failed: expected to contain "Example", got "${title}"`);
    }
    logger.info("✅ Title validation passed");

    // Get element info for the first link
    const info = await browserManager.getElementInfo("a", { timeoutMs: 5000 });
    logger.info("📋 Element info:", info);

    // Take screenshot before click
    const beforePath = path.join(config.screenshotDir, "poc1-before-click.png");
    await browserManager.screenshot({ path: beforePath });
    logger.info(`📸 Screenshot saved: ${beforePath}`);

    // Click the link
    await browserManager.click("a", { timeoutMs: 5000 });
    logger.info("👆 Clicked element");

    // Get and validate current URL
    const currentUrl = await browserManager.getUrl();
    logger.info(`🔗 Current URL: ${currentUrl}`);
    if (!currentUrl || currentUrl.length === 0) {
      throw new Error("URL validation failed: URL is empty");
    }
    logger.info("✅ URL validation passed");

    // Take screenshot after click
    const afterPath = path.join(config.screenshotDir, "poc1-after-click.png");
    await browserManager.screenshot({ path: afterPath });
    logger.info(`📸 Screenshot saved: ${afterPath}`);

    logger.info("✅ POC 1 completed successfully");
  } catch (error) {
    logger.error("❌ POC 1 failed:", error);
    throw error;
  } finally {
    // Always shutdown, even if there were errors
    await browserManager.shutdown();
    logger.info("🔚 Browser shutdown complete");
  }
}

// Run the POC
main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
