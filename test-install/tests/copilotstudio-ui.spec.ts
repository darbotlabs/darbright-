import { test, expect } from '@playwright/test';

// UI test for Copilot Studio homepage

test('Copilot Studio homepage loads and has expected elements', async ({ page }) => {
  await page.goto('https://copilotstudio.microsoft.com');

  // Check for the presence of the main heading
  await expect(page.locator('h1, h2, h3')).toContainText(['Copilot', 'Studio']);

  // Check for a visible sign-in or start button (commonly present on SaaS homepages)
  const signInButton = page.getByRole('button', { name: /sign in|get started|start/i });
  await expect(signInButton).toBeVisible();

  // Optionally, check for a navigation bar
  await expect(page.locator('nav')).toBeVisible();
});
// Thought into existence by Darbot
