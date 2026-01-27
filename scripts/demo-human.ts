/**
 * Demo script for human testing of BrowserManager
 * 
 * This script demonstrates:
 * - Process signal handling with registerProcessHooks
 * - Launching a browser in headed mode
 * - Navigating to a URL
 * - Taking a screenshot
 * - Clicking on an element
 * - Proper shutdown in finally block (double protection)
 * 
 * Run with: npm run demo
 */

import { browserManager } from '../src/core/browserManager';
import { config } from '../src/core/config';
import { registerProcessHooks } from '../src/core/processHooks';
import * as path from 'path';

// Register process hooks for graceful shutdown on Ctrl+C, SIGTERM, etc.
registerProcessHooks(async () => {
  await browserManager.shutdown();
});

async function main() {
  console.log('🚀 Starting BrowserManager demo...\n');

  try {
    // 1. Launch browser in headed mode
    console.log('1️⃣  Launching browser (headed mode)...');
    await browserManager.launch({ 
      headless: false,
      slowMoMs: 500  // Slow down for visibility
    });
    console.log('✅ Browser launched\n');

    // 2. Navigate to example.com
    console.log('2️⃣  Navigating to https://example.com...');
    await browserManager.navigate('https://example.com');
    console.log('✅ Navigation complete\n');

    // 3. Take a screenshot
    const screenshotPath = path.join(config.screenshotDir, 'demo.png');
    console.log(`3️⃣  Taking screenshot (saving to ${screenshotPath})...`);
    await browserManager.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log('✅ Screenshot saved\n');

    // 4. Click on the first link (More information...)
    console.log('4️⃣  Clicking on first link (a)...');
    await browserManager.click('a');
    console.log('✅ Link clicked\n');

    // Wait a bit to see the result
    console.log('⏳ Waiting 2 seconds to see the result...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n🎉 Demo completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Error during demo:', error.message);
    throw error;
  } finally {
    // 5. Shutdown (idempotent, won't fail if already closed)
    console.log('\n5️⃣  Shutting down browser...');
    await browserManager.shutdown();
    console.log('✅ Browser closed\n');
  }
}

// Run the demo
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
