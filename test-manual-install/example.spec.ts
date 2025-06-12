// Thought into existence by Darbot
import { test, expect } from '@playwright/test';

test('manual installation validation', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
  await expect(page.getByRole('heading', { name: 'Playwright' })).toBeVisible();
});

test('page screenshot functionality', async ({ page }) => {
  await page.goto('https://example.com/');
  await page.screenshot({ path: 'example.png' });
  await expect(page.getByRole('heading', { name: 'Example Domain' })).toBeVisible();
});
