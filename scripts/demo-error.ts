/**
 * Demo script to test error handling and automatic error screenshots
 * 
 * Run with: npm run demo:error
 */

import { browserManager } from '../src/core/browserManager';

async function main() {
  console.log('🧪 Testing error handling with automatic screenshots...\n');

  try {
    // Launch browser
    console.log('1️⃣  Launching browser...');
    await browserManager.launch({ headless: false, slowMoMs: 500 });
    console.log('✅ Browser launched\n');

    // Navigate to example.com
    console.log('2️⃣  Navigating to https://example.com...');
    await browserManager.navigate('https://example.com');
    console.log('✅ Navigation complete\n');

    // Try to click on a non-existent element (will fail and capture screenshot)
    console.log('3️⃣  Attempting to click non-existent element...');
    await browserManager.click('#does-not-exist', { timeoutMs: 3000 });
    console.log('✅ Click succeeded (this should not appear)\n');
    
  } catch (error: any) {
    console.error('\n❌ Expected error occurred:', error.message);
    console.log('\n✅ Check screenshots/ folder for error screenshot\n');
  } finally {
    console.log('4️⃣  Shutting down...');
    await browserManager.shutdown();
    console.log('✅ Browser closed\n');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
