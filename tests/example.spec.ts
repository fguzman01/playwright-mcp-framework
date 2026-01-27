import { test, expect } from '@playwright/test';
import { browserManager } from '../src/core/browserManager';

// Limpiar screenshots antes de ejecutar estos tests
test.beforeAll(async () => {
  await browserManager.cleanScreenshots();
});

test('has title', async ({ page }) => {
  await page.goto('https://example.com');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Example Domain/);
  
  // Esperar 2 segundos para visualizar
  await page.waitForTimeout(2000);
});

test('get started link', async ({ page }) => {
  await page.goto('https://example.com');

  // Expects page to have a heading with the name of Example Domain.
  await expect(page.locator('h1')).toContainText('Example Domain');
  
  // Esperar 2 segundos para visualizar
  await page.waitForTimeout(2000);
});
