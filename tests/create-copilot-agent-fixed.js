// Thought into existence by Darbot
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const CONFIG = {
  cdpPort: 9222,
  copilotStudioUrl: 'https://copilotstudio.microsoft.com',
  screenshotsDir: '../test-results/copilot-agent',
  waitTimeout: 8000,                                         // ⬅️ little more time for startup
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
    const context = browser.contexts()[0] ?? await browser.newContext();

    const page = context.pages().find(p => p.url().includes('copilotstudio')) ?? context.pages()[0];
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    console.log(`✅ Landed on: ${page.url()}`);

    /* ------------------------------------------------------------------ *
     * 1) Take a screenshot to help with debugging                         *
     * ------------------------------------------------------------------ */
    await page.screenshot({
      path: path.join(CONFIG.screenshotsDir, 'landing-page.png'),
      fullPage: true
    });
    console.log('📸 Landing page screenshot saved');

    /* ------------------------------------------------------------------ *
     * 2) Fill the "Describe your agent" text-area                         *
     * ------------------------------------------------------------------ */
    let descriptionBox;
    
    try {
      // First try - look for textarea with placeholder text or common attributes
      descriptionBox = await page.locator('textarea[placeholder*="describe"], textarea[aria-label*="describe"], textarea').first();
      await descriptionBox.waitFor({ state: 'visible', timeout: 5_000 });
      console.log('Found text area using primary selector');
    } catch (error) {
      try {
        // Second try - find text areas in the main content
        console.log('First attempt failed, trying to find any textarea in main content...');
        const mainContent = await page.locator('main, [role="main"], .main-content, #main-content').first();
        await mainContent.waitFor({ state: 'visible', timeout: 5_000 });
        
        descriptionBox = await mainContent.locator('textarea').first();
        await descriptionBox.waitFor({ state: 'visible', timeout: 5_000 });
        console.log('Found text area within main content');
      } catch (error2) {
        // Third try - look for contenteditable divs or other input areas
        console.log('Second attempt failed, looking for contenteditable or input elements...');
        
        // Try to find any input elements
        const inputElements = await page.locator('textarea, [contenteditable="true"], input[type="text"]').all();
        console.log(`Found ${inputElements.length} potential input fields`);
        
        if (inputElements.length > 0) {
          descriptionBox = inputElements[0];
          console.log('Using first input field as fallback');
        } else {
          throw new Error('Could not find any input field for agent description');
        }
      }
    }

    await descriptionBox.fill(CONFIG.agentDescription);
    console.log('📝 Agent description filled');

    /* ------------------------------------------------------------------ *
     * 3) Click the submit button (various selectors)                      *
     * ------------------------------------------------------------------ */
    let sendBtn;
    
    try {
      // First try - paper plane icons commonly used for send
      sendBtn = await page.locator('button:has(svg[aria-label="Send"]), button:has(svg[data-icon-name="Send"]), button svg[aria-hidden="true"]').first();
      await sendBtn.waitFor({ state: 'visible', timeout: 5_000 });
      console.log('Found send button with primary selector');
    } catch (error) {
      try {
        // Second try - look for buttons near our text area
        console.log('First button attempt failed, trying to find button near textarea...');
        const buttonNearTextarea = await page.locator('textarea ~ button, textarea + button, textarea + * button').first();
        await buttonNearTextarea.waitFor({ state: 'visible', timeout: 5_000 });
        sendBtn = buttonNearTextarea;
        console.log('Found button near textarea');
      } catch (error2) {
        // Third try - look for any button with common "submit" text
        console.log('Second button attempt failed, looking for any submission button...');
        const submitButtons = await page.locator(
          'button:has-text("Submit"), button:has-text("Send"), button:has-text("Create"), ' +
          'button:has-text("Next"), button:has-text("Continue"), button[type="submit"]'
        ).all();
        
        if (submitButtons.length > 0) {
          sendBtn = submitButtons[0];
          console.log('Using first submission button as fallback');
        } else {
          // Last resort - look for any button
          const anyButton = await page.locator('button').first();
          sendBtn = anyButton;
          console.log('Using first button on page as last resort');
        }
      }
    }

    console.log('🚀 Sending…');

    // Handle either same-tab navigation or new-tab opening
    const [newPage] = await Promise.all([
      context.waitForEvent('page', { timeout: 30000 }).catch(() => null),  // fires when a new tab opens
      page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => null),
      sendBtn.click()
    ]);

    const resultPage = newPage ?? page;
    await resultPage.waitForLoadState('networkidle', { timeout: 60_000 });

    /* ------------------------------------------------------------------ *
     * 4) Simple "analysis" of the result page                             *
     * ------------------------------------------------------------------ */
    const heading = await resultPage.locator('h1, h2, h3').first().innerText().catch(() => '');
    console.log(`🔍 Result page heading: "${heading}"`);
    
    await resultPage.screenshot({
      path: path.join(CONFIG.screenshotsDir, 'result-page.png'),
      fullPage: true
    });

    console.log('✅ Workflow complete');
    return {
      success: true,
      heading,
      url: resultPage.url()
    };
  } catch (error) {
    console.error('❌ Error in createAgent:', error);
    // Take screenshot on error for debugging
    try {
      const browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.cdpPort}`).catch(() => null);
      if (browser) {
        const context = browser.contexts()[0];
        if (context) {
          const page = context.pages()[0];
          if (page) {
            await page.screenshot({
              path: path.join(CONFIG.screenshotsDir, 'error-state.png'),
              fullPage: true
            });
            console.log('📸 Error state screenshot saved');
          }
        }
      }
    } catch (screenshotError) {
      console.warn('⚠️ Could not take error screenshot:', screenshotError.message);
    }
    
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
    
    // Clean exit by closing CDP connection
    try {
      const browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.cdpPort}`).catch(() => null);
      if (browser) await browser.close();
    } catch (error) {
      console.warn('⚠️ Could not close browser connection:', error.message);
    }
  } catch (error) {
    console.error('❌ Error in main execution:', error);
  }
})();
