/**
 * Demo script to test screenshot cleanup functionality
 * 
 * Run with: npm run demo:clean
 */

import { browserManager } from '../src/core/browserManager';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../src/core/config';

async function main() {
  console.log('🧹 Testing screenshot cleanup functionality...\n');

  try {
    // 1. Create some test screenshots first
    console.log('1️⃣  Creating test screenshots...');
    await browserManager.launch({ headless: true });
    await browserManager.navigate('https://example.com');
    
    await browserManager.screenshot({ path: 'screenshots/test-1.png' });
    await browserManager.screenshot({ path: 'screenshots/test-2.png' });
    await browserManager.screenshot({ path: 'screenshots/test-3.png' });
    
    await browserManager.quit();
    console.log('✅ Created 3 test screenshots\n');

    // 2. List files before cleanup
    console.log('2️⃣  Files before cleanup:');
    const screenshotDir = path.resolve(config.screenshotDir);
    const filesBefore = fs.readdirSync(screenshotDir);
    filesBefore.forEach(file => console.log(`   - ${file}`));
    console.log(`   Total: ${filesBefore.length} files\n`);

    // 3. Clean screenshots
    console.log('3️⃣  Cleaning screenshots directory...');
    const deletedCount = await browserManager.cleanScreenshots();
    console.log(`✅ Deleted ${deletedCount} screenshot(s)\n`);

    // 4. List files after cleanup
    console.log('4️⃣  Files after cleanup:');
    const filesAfter = fs.readdirSync(screenshotDir);
    if (filesAfter.length === 0) {
      console.log('   (empty directory)');
    } else {
      filesAfter.forEach(file => console.log(`   - ${file}`));
    }
    console.log(`   Total: ${filesAfter.length} files\n`);

    // 5. Test with pattern - create some different files
    console.log('5️⃣  Testing cleanup with pattern...');
    await browserManager.launch({ headless: true });
    await browserManager.navigate('https://example.com');
    
    await browserManager.screenshot({ path: 'screenshots/keep-this.png' });
    await browserManager.screenshot({ path: 'screenshots/error-test.png' });
    await browserManager.screenshot({ path: 'screenshots/error-test2.png' });
    
    await browserManager.quit();
    console.log('✅ Created 3 more screenshots\n');

    console.log('6️⃣  Files before pattern cleanup:');
    const filesBeforePattern = fs.readdirSync(screenshotDir);
    filesBeforePattern.forEach(file => console.log(`   - ${file}`));
    console.log(`   Total: ${filesBeforePattern.length} files\n`);

    // 6. Clean only error-*.png files
    console.log('7️⃣  Cleaning only error-*.png files...');
    const patternDeletedCount = await browserManager.cleanScreenshots('error-*.png');
    console.log(`✅ Deleted ${patternDeletedCount} screenshot(s) matching pattern\n`);

    console.log('8️⃣  Files after pattern cleanup:');
    const filesAfterPattern = fs.readdirSync(screenshotDir);
    filesAfterPattern.forEach(file => console.log(`   - ${file}`));
    console.log(`   Total: ${filesAfterPattern.length} files\n`);

    console.log('🎉 Screenshot cleanup functionality works correctly!\n');
    
  } catch (error: any) {
    console.error('\n❌ Error during demo:', error.message);
    throw error;
  } finally {
    await browserManager.shutdown();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
