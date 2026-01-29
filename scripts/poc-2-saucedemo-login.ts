import { browserManager } from "../src/core/browserManager";
import { registerProcessHooks } from "../src/core/processHooks";
import { config } from "../src/core/config";
import { logger } from "../src/utils/logger";
import * as path from "path";

/**
 * POC 2: SauceDemo Login Test
 * 
 * Demonstrates:
 * - Form interaction (type with clear)
 * - Login flow with validation
 * - waitForSelector for post-navigation validation
 * - No manual sleeps or waits
 */

// Register process hooks at the very start
registerProcessHooks(() => browserManager.shutdown());

async function main() {
  try {
    logger.info("🚀 Starting POC 2: SauceDemo Login");

    // Launch browser in headed mode
    await browserManager.launch({ headless: false });
    logger.info("✅ Browser launched");

    // Navigate to SauceDemo
    await browserManager.navigate("https://www.saucedemo.com/");
    logger.info("✅ Navigated to SauceDemo");

    // Type username
    await browserManager.type("#user-name", "standard_user", {
      clear: true,
      timeoutMs: 10000,
    });
    logger.info("✅ Typed username");

    // Type password
    await browserManager.type("#password", "secret_sauce", {
      clear: true,
      timeoutMs: 10000,
    });
    logger.info("✅ Typed password");

    // Click login button
    await browserManager.click("#login-button", { timeoutMs: 10000 });
    logger.info("✅ Clicked login button");

    // Validate login by waiting for inventory list to be visible
    await browserManager.waitForSelector(".inventory_list", { timeoutMs: 10000 });
    logger.info("✅ Login validated - inventory list is visible");

    // Take screenshot of logged-in state
    const screenshotPath = path.join(config.screenshotDir, "poc2-saucedemo-logged-in.png");
    await browserManager.screenshot({ path: screenshotPath });
    logger.info(`📸 Screenshot saved: ${screenshotPath}`);

    logger.info("✅ POC 2 OK");
  } catch (error) {
    logger.error("❌ POC 2 failed:", error);
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
