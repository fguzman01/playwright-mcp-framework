/**
 * Demo script to test type error with context
 * 
 * Run with: npm run demo:type-error
 */

import { browserManager } from '../src/core/browserManager';

async function main() {
  console.log('🧪 Testing type error with enhanced context...\n');

  try {
    // Launch browser
    console.log('1️⃣  Launching browser...');
    await browserManager.launch({ headless: false, slowMoMs: 500 });
    console.log('✅ Browser launched\n');

    // Navigate to example.com
    console.log('2️⃣  Navigating to https://example.com...');
    await browserManager.navigate('https://example.com');
    console.log('✅ Navigation complete\n');

    // Try to type into a non-existent input (will fail and capture screenshot)
    console.log('3️⃣  Attempting to type into non-existent input...');
    await browserManager.type('input#missing-field', 'test text', { timeoutMs: 2000 });
    console.log('✅ Type succeeded (this should not appear)\n');
    
  } catch (error: any) {
    console.error('\n❌ Expected error occurred:', error.message);
    console.log('\n📝 Error details:');
    console.log('   - Selector: input#missing-field');
    console.log('   - Timeout: 2000ms');
    if (error.cause) {
      console.log('   - Original error preserved: ✅');
      console.log(`   - Cause: ${error.cause.message.substring(0, 50)}...`);
    }
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
