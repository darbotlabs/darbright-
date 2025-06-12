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
  let browser = null;
  
  try {
    await launchEdgeAndNavigate();

    // ⬇️ Connect to the (now surely-running) Edge instance
    console.log('🔌 Connecting to Edge browser via CDP...');
    browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.cdpPort}`);
    const context = browser.contexts()[0] ?? await browser.newContext();

    const page = context.pages().find(p => p.url().includes('copilotstudio')) ?? context.pages()[0];
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    console.log(`✅ Landed on: ${page.url()}`);

    /* ------------------------------------------------------------------ *
     * 1) Take a screenshot to help with debugging                         *
     * ------------------------------------------------------------------ */
    await page.screenshot({
      path: path.join(CONFIG.screenshotsDir, 'before-input.png'),
      fullPage: true
    });
    
    /* ------------------------------------------------------------------ *
     * 2) Find and fill the "Describe your agent" text-area                *
     * ------------------------------------------------------------------ */
    let descriptionBox = null;
    
    // Try multiple selector strategies to find the textarea
    const selectors = [
      // First: look for textareas with relevant attributes
      'textarea[placeholder*="describe"], textarea[aria-label*="describe"]',
      // Second: any textarea 
      'textarea',
      // Third: contenteditable divs
      '[contenteditable="true"]',
      // Fourth: any standard input
      'input[type="text"]'
    ];
    
    for (const selector of selectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        descriptionBox = elements[0];
        console.log(`Found input using selector: ${selector}`);
        break;
      }
    }
    
    if (!descriptionBox) {
      throw new Error('Could not find any input field for agent description');
    }

    await descriptionBox.fill(CONFIG.agentDescription);
    console.log('📝 Agent description filled');

    // Take another screenshot after input
    await page.screenshot({
      path: path.join(CONFIG.screenshotsDir, 'after-input.png')
    });

    /* ------------------------------------------------------------------ *
     * 3) Find and click the submission button                            *
     * ------------------------------------------------------------------ */
    let sendBtn = null;
    
    // Try multiple selector strategies to find the button
    const buttonSelectors = [
      // Paper plane icons or send buttons
      'button:has(svg[aria-label="Send"]), button:has(svg[data-icon-name="Send"])',
      // Button appearing after our textarea (common pattern)
      'textarea ~ button, textarea + button, textarea + * button',
      // Any button with submission text
      'button:has-text("Submit"), button:has-text("Send"), button:has-text("Create"), button:has-text("Next")',
      // Any button with an icon (likely action button)
      'button:has(svg), button:has(img)',
      // Last resort: any button
      'button'
    ];
    
    for (const selector of buttonSelectors) {
      try {
        const possibleButtons = await page.locator(selector).all();
        if (possibleButtons.length > 0) {
          // Prefer visible buttons
          for (const btn of possibleButtons) {
            const isVisible = await btn.isVisible();
            if (isVisible) {
              sendBtn = btn;
              console.log(`Found visible button using selector: ${selector}`);
              break;
            }
          }
          
          if (sendBtn) break;
          
          // Fall back to first button if none are visible
          sendBtn = possibleButtons[0];
          console.log(`Found button (may not be visible) using selector: ${selector}`);
          break;
        }
      } catch (error) {
        continue; // Try next selector
      }
    }
    
    if (!sendBtn) {
      throw new Error('Could not find any button to submit the form');
    }
    
    console.log('🚀 Sending…');
    
    // Take screenshot before clicking
    await page.screenshot({
      path: path.join(CONFIG.screenshotsDir, 'after-submit.png')
    });

    // Handle either same-tab navigation or new-tab opening with robust error handling
    const navigationPromise = page.waitForNavigation({ 
      waitUntil: 'load', 
      timeout: 30000 
    }).catch(() => null);
    
    const newPagePromise = context.waitForEvent('page', { 
      timeout: 30000 
    }).catch(() => null);
    
    // Try with force: true to work around potential overlays
    await sendBtn.click({ force: true });
    
    // Wait for either navigation to complete
    const [newPage, navigationResult] = await Promise.all([
      newPagePromise,
      navigationPromise
    ]);

    // Determine which page we ended up on
    const resultPage = newPage ?? page;
    
    // Wait for the page to stabilize
    await resultPage.waitForLoadState('networkidle', { 
      timeout: 60_000 
    }).catch(() => console.log('⚠️ Page did not reach networkidle state'));

    /* ------------------------------------------------------------------ *
     * 4) Analyze the result page                                         *
     * ------------------------------------------------------------------ */
    console.log(`📄 Result page URL: ${resultPage.url()}`);
    
    // Look for heading elements
    let heading = '';
    try {
      heading = await resultPage.locator('h1, h2, h3').first().innerText();
    } catch (error) {
      heading = 'No heading found';
    }
    console.log(`🔍 Result page heading: "${heading}"`);
    
    // Take final screenshot
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
