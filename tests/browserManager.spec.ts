import { test, expect } from '@playwright/test';
import { browserManager } from '../src/core/browserManager';

/**
 * Example test suite showing how to clean screenshots before tests
 * 
 * The cleanScreenshots() method is OPTIONAL - use it when you want to
 * start with a clean screenshots directory before running your test suite.
 * 
 * If you want to keep previous screenshots (e.g., for debugging), 
 * simply don't call cleanScreenshots().
 */

test.describe('BrowserManager Tests with Screenshot Cleanup', () => {
  
  // OPTIONAL: Clean screenshots before running this test suite
  test.beforeAll(async () => {
    // This will delete all *.png files from screenshots/ directory
    const deletedCount = await browserManager.cleanScreenshots();
    console.log(`Cleaned ${deletedCount} screenshot(s) before tests`);
  });

  test('can launch browser and navigate', async () => {
    await browserManager.launch({ headless: true });
    
    await browserManager.navigate('https://example.com');
    
    const page = browserManager.getPage();
    expect(page).not.toBeNull();
    
    const title = await page!.title();
    expect(title).toContain('Example');
    
    await browserManager.quit();
  });

  test('can take a screenshot', async () => {
    await browserManager.launch({ headless: true });
    await browserManager.navigate('https://example.com');
    
    const screenshot = await browserManager.screenshot({ 
      path: 'screenshots/test-example.png' 
    });
    
    expect(screenshot).toBeInstanceOf(Buffer);
    
    await browserManager.quit();
  });

  test('can click and interact with elements', async () => {
    await browserManager.launch({ headless: true });
    await browserManager.navigate('https://example.com');
    
    // Click on the link
    await browserManager.click('a');
    
    // Verify navigation occurred
    const page = browserManager.getPage();
    const url = page!.url();
    expect(url).toContain('iana.org');
    
    await browserManager.quit();
  });
});

test.describe('Tests WITHOUT screenshot cleanup', () => {
  // No beforeAll - screenshots will accumulate
  // This is useful when debugging and you want to keep all screenshots

  test('example test that keeps screenshots', async () => {
    await browserManager.launch({ headless: true });
    await browserManager.navigate('https://example.com');
    
    await browserManager.screenshot({ 
      path: 'screenshots/kept-screenshot.png' 
    });
    
    await browserManager.quit();
  });
});
