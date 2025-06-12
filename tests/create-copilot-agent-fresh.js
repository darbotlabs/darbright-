// Thought into existence by Darbot
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const CONFIG = {
  cdpPort: 9222,
  copilotStudioUrl: 'https://copilotstudio.microsoft.com',
  screenshotsDir: '../test-results/copilot-agent',
  waitTimeout: 8000,                                         // ⬅️ little more time
  agentDescription: 'Create a helpdesk agent that can answer customer questions about our products and services. The agent should be polite, professional, and helpful.'  // Thought into existence by Darbot
};

async function launchEdgeAndNavigate() {
  // Check if the screenshots directory exists, if not, create it
  try {
    await fs.mkdir(path.resolve(__dirname, CONFIG.screenshotsDir), { recursive: true });
  } catch (error) {
    console.warn(`⚠️ Could not create screenshots directory: ${error.message}`);
  }

  console.log(`🌐 Launching Edge with CDP port ${CONFIG.cdpPort}...`);
  // We use spawn from child_process to launch Edge
  const { spawn } = require('child_process');
  
  // Path to MS Edge (Windows default location)
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  // Launch Edge with remote debugging port
  const edgeProcess = spawn(edgePath, [
    `--remote-debugging-port=${CONFIG.cdpPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    CONFIG.copilotStudioUrl
  ], {
    detached: true, // Run in background
    stdio: 'ignore'
  });
  
  // Don't wait for child process
  edgeProcess.unref();
  
  // Give browser time to initialize
  console.log(`⏳ Waiting ${CONFIG.waitTimeout / 1000} seconds for Edge to initialize...`);
  await new Promise(resolve => setTimeout(resolve, CONFIG.waitTimeout));
}

async function createAgent() {
  try {
    await launchEdgeAndNavigate();

    // ⬇️ Connect to the (now surely-running) Edge instance
    console.log('🔌 Connecting to Edge browser via CDP...');
    const browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.cdpPort}`);
    const context  = browser.contexts()[0] ?? await browser.newContext();

    const page = context.pages().find(p => p.url().includes('copilotstudio')) ?? context.pages()[0];
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    console.log(`✅ Landed on: ${page.url()}`);

    /* ------------------------------------------------------------------ *
     * 1) Fill the “Describe your agent” text-area                         *
     * ------------------------------------------------------------------ */
    const descriptionBox = await page.locator('textarea').filter({
      hasText: /describe what your agent should do/i
    }).first();

    await descriptionBox.waitFor({ state: 'visible', timeout: 10_000 });
    await descriptionBox.fill(CONFIG.agentDescription);
    console.log('📝 Agent description filled');

    /* ------------------------------------------------------------------ *
     * 2) Click the small triangle button (SVG inside a button)            *
     * ------------------------------------------------------------------ */
    // triangle == paper-plane icon inside a button that sits AFTER textarea
    const sendBtn = await page.locator('button:has(svg)').filter({
      has: page.locator('svg[aria-label="Send"], svg[data-icon-name="Send"]')
    }).first();

    await sendBtn.waitFor({ state: 'visible', timeout: 10_000 });
    console.log('🚀 Sending…');

    // Handle either same-tab navigation or new-tab opening
    const [newPage] = await Promise.all([
      context.waitForEvent('page').catch(() => null),         // fires when a new tab opens
      page.waitForNavigation({ waitUntil: 'load' }).catch(() => null),
      sendBtn.click()
    ]);

    const resultPage = newPage ?? page;
    await resultPage.waitForLoadState('networkidle', { timeout: 60_000 });

    /* ------------------------------------------------------------------ *
     * 3) Simple “analysis” of the result page                             *
     * ------------------------------------------------------------------ */
    const heading = await resultPage.locator('h1,h2').first().innerText().catch(() => '');
    console.log(`🔍 Result page heading: "${heading}"`);
    await resultPage.screenshot({
      path: path.join(CONFIG.screenshotsDir, 'result-page.png'),
      fullPage: true
    });    console.log('✅ Workflow complete');
    return {
      success: true,
      heading,
      url: resultPage.url()
    };
  } catch (error) {
    console.error('❌ Error in createAgent:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Self-executing main function
(async () => {
  try {
    const result = await createAgent();
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Error in main execution:', error);
  }
})();