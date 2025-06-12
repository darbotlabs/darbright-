// Thought into existence by Darbot
import { test, expect } from '@playwright/test';
import fs from 'fs';

test('Level-4  ⭐ Forge Order-Status Flow', async ({ browser }) => {
  // Use the stored authentication state from Level 1
  const storageState = 'storageState.json';
  const context = await browser.newContext({ 
    storageState: fs.existsSync(storageState) ? storageState : undefined 
  });
  const page = await context.newPage();
  
  await page.goto('https://copilotstudio.microsoft.com');
  await page.click('text=Tools');
  await page.click('text=Flows');
  await page.click('text=New agent flow');

  // ① Describe flow to Copilot
  const FLOW_PROMPT = `Create a flow that accepts an order number, 
  fetches status from the "Orders" Dataverse table plus the backend Order API
  at https://api.example.com/orders/{orderNumber}, then returns status,
  tracking number, and ETA.`;
  
  await page.fill('textarea[placeholder="Describe your flow"]', FLOW_PROMPT);
  await page.press('textarea', 'Enter');

  // ② Wait for Copilot suggestion & accept
  await page.waitForSelector('text=Here\'s a flow outline', { timeout: 60_000 });
  await page.click('button:has-text("Accept")');

  // ③ Configure connectors
  await page.click('text=Add a connection');
  await page.click('text=Dataverse');
  await page.fill('input[placeholder="Search tables"]', 'Orders');
  await page.check('role=checkbox[name="Orders"]');
  await page.click('button:has-text("Connect")');

  await page.click('text=Add a connection');
  await page.click('text=HTTP');
  await page.fill('input[placeholder="Connection name"]', 'OrderBackend');
  await page.click('button:has-text("Create")');

  // ④ Save & Enable
  await page.click('button:has-text("Save")');
  await page.click('button:has-text("Turn on")');
  await page.screenshot({ path: 'screenshots/level4-flow-enabled.png', fullPage: true });
});
