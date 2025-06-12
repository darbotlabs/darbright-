// Thought into existence by Darbot
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const CONFIG = {
  cdpPort: 9222,
  copilotStudioUrl: 'https://copilotstudio.microsoft.com',
  screenshotsDir: '../test-results/copilot-agent',
  waitTimeout: 10000,                                        // Increased wait time for initialization
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

    // Get all pages and find the one with copilotstudio in the URL
    const pages = context.pages();
    console.log(`Found ${pages.length} browser pages`);
    
    let page = pages.find(p => p.url().includes('copilotstudio'));
    if (!page && pages.length > 0) {
      page = pages[0]; // Fallback to first page
    }
    
    if (!page) {
      console.log('No pages found, creating a new one');
      page = await context.newPage();
      await page.goto(CONFIG.copilotStudioUrl, { waitUntil: 'domcontentloaded' });
    }
    
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    console.log(`✅ Landed on: ${page.url()}`);
    
    // Take initial screenshot to see what we're working with
    await page.screenshot({
      path: path.join(CONFIG.screenshotsDir, 'initial-page.png'),
      fullPage: true
    });
    console.log('📸 Landing page screenshot saved');
    
    // Check if we need to navigate to create page
    if (!page.url().includes('/create/')) {
      console.log('Not on create page, looking for "Create" button...');
      
      // Try to find and click a "Create" button
      const createButtons = [
        'a:has-text("Create")',
        'button:has-text("Create")',
        'a:has-text("New")',
        'button:has-text("New")',
        'a:has-text("Build")',
        'button:has-text("Build")',
        '[role="button"]:has-text("Create")'
      ];
      
      for (const selector of createButtons) {
        const button = await page.locator(selector).first();
        const isVisible = await button.isVisible().catch(() => false);
        
        if (isVisible) {
          console.log(`Found and clicking create button: ${selector}`);
          await button.click();
          
          // Wait for navigation
          await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
          console.log(`Navigated to: ${page.url()}`);
          break;
        }
      }
    }
    
    // Wait for the textarea to be visible and editable
    console.log('Looking for text input area...');
    
    // First, try to identify any textarea visually
    const textareas = await page.locator('textarea').all();
    console.log(`Found ${textareas.length} textarea elements`);
    
    let inputElement = null;

    // Try to find the correct text input using various methods
    try {
      // Try more specific selectors first
      inputElement = await page.locator('textarea[placeholder*="escrib"], textarea[aria-label*="escrib"]').first();
      if (await inputElement.isVisible().catch(() => false)) {
        console.log('Found text area using primary selector');
      } else {
        // Try any visible textarea
        const allTextareas = await page.locator('textarea').all();
        for (const textarea of allTextareas) {
          if (await textarea.isVisible().catch(() => false)) {
            inputElement = textarea;
            console.log('Found visible textarea');
            break;
          }
        }
        
        // If still not found, try contenteditable divs
        if (!inputElement) {
          const editables = await page.locator('[contenteditable="true"]').all();
          for (const editable of editables) {
            if (await editable.isVisible().catch(() => false)) {
              inputElement = editable;
              console.log('Found contenteditable element');
              break;
            }
          }
        }
        
        // Last resort: try to find any element that looks like it accepts input
        if (!inputElement) {
          // Check for iframe that might contain the editor
          const frames = await page.frames();
          for (const frame of frames) {
            try {
              const frameTextarea = await frame.locator('textarea').first();
              const isVisible = await frameTextarea.isVisible().catch(() => false);
              if (isVisible) {
                inputElement = frameTextarea;
                console.log('Found textarea in iframe');
                break;
              }
            } catch (e) {
              // Continue with next frame
            }
          }
        }
      }
    } catch (error) {
      console.log(`Error finding textarea: ${error.message}`);
    }
    
    // If we found an input element, try to fill it
    if (inputElement) {
      // Try different approaches to enter text
      try {
        // Try the standard fill approach
        await inputElement.fill(CONFIG.agentDescription);
        console.log('📝 Agent description filled');
      } catch (error) {
        console.log(`Failed to fill with standard method: ${error.message}`);
        
        // Try to clear first and then type
        try {
          await inputElement.clear();
          await inputElement.type(CONFIG.agentDescription, { delay: 50 });
          console.log('📝 Agent description filled (using type method)');
        } catch (e2) {
          console.log(`Failed to use type method: ${e2.message}`);
          
          // Try using page.keyboard
          try {
            await inputElement.click();
            await page.keyboard.type(CONFIG.agentDescription, { delay: 50 });
            console.log('📝 Agent description filled (using keyboard method)');
          } catch (e3) {
            console.log(`Failed to use keyboard method: ${e3.message}`);
          }
        }
      }
    } else {
      console.log('⚠️ No text input area found');
    }

    // Take a screenshot after input attempt
    await page.screenshot({
      path: path.join(CONFIG.screenshotsDir, 'after-input.png'),
      fullPage: false
    });
    
    // Now look for the submit/send button
    console.log('Looking for send button...');
    
    let sendButton = null;
    
    // First try: look for an SVG send icon in a button
    try {
      const svgButtons = [
        'button:has(svg[aria-label="Send"])',
        'button:has(svg[data-icon-name="Send"])',
        'button:has(svg)', // Any button with SVG
        'button.primary', // Primary/main button
        'button:has-text("Next")', // Next button
        'button:has-text("Create")', // Create button
        'button:has-text("Send")' // Send button
      ];
      
      for (const selector of svgButtons) {
        const button = await page.locator(selector).first();
        if (await button.isVisible().catch(() => false)) {
          sendButton = button;
          console.log(`Found send button using selector: ${selector}`);
          break;
        }
      }
    } catch (error) {
      console.log('Error finding SVG button:', error.message);
    }
    
    // Second try: look for a button near the textarea
    if (!sendButton && inputElement) {
      try {
        // Get textarea position
        const box = await inputElement.boundingBox();
        if (box) {
          // Look for buttons near the textarea
          const allButtons = await page.locator('button').all();
          
          for (const button of allButtons) {
            const buttonBox = await button.boundingBox().catch(() => null);
            if (buttonBox && 
                Math.abs(buttonBox.x - (box.x + box.width)) < 100 && 
                Math.abs(buttonBox.y - box.y) < 100) {
              sendButton = button;
              console.log('Found button near textarea');
              break;
            }
          }
        }
      } catch (error) {
        console.log('Error finding button near textarea:', error.message);
      }
    }
    
    // If we found a button, try to click it
    if (sendButton) {
      // Take screenshot before clicking
      await page.screenshot({
        path: path.join(CONFIG.screenshotsDir, 'before-send.png')
      });
      
      console.log('🚀 Sending…');
      
      // Set up navigation promises
      const navigationPromise = page.waitForNavigation({ timeout: 30000 }).catch(() => null);
      const newPagePromise = context.waitForEvent('page', { timeout: 30000 }).catch(() => null);
      
      // Try clicking the button
      await sendButton.click({ force: true }).catch(async (error) => {
        console.log(`Failed to click with standard method: ${error.message}`);
        
        // Try using page.mouse
        const box = await sendButton.boundingBox().catch(() => null);
        if (box) {
          await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
          console.log('Clicked using mouse coordinates');
        }
      });
      
      // Wait for navigation or new page
      const [newPage, navigationResult] = await Promise.all([
        newPagePromise,
        navigationPromise
      ]);
      
      // Determine which page we're on after navigation
      const resultPage = newPage ?? page;
      
      // Wait for the page to stabilize
      await resultPage.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
        console.log('⚠️ Page did not reach networkidle state');
      });
      
      console.log(`📄 Result page URL: ${resultPage.url()}`);
      
      // Take final screenshot
      await resultPage.screenshot({
        path: path.join(CONFIG.screenshotsDir, 'result-page.png'),
        fullPage: true
      });
      
      // Try to get headings or other content from the page
      const headings = await resultPage.locator('h1,h2,h3').allTextContents().catch(() => []);
      if (headings.length > 0) {
        console.log('Page headings:', headings);
      }
      
      return {
        success: true,
        url: resultPage.url(),
        headings: headings.length > 0 ? headings : ['No headings found']
      };
    } else {
      console.log('⚠️ No send button found');
      
      // Take screenshot of current state
      await page.screenshot({
        path: path.join(CONFIG.screenshotsDir, 'no-button-found.png'),
        fullPage: true
      });
      
      return {
        success: false,
        error: 'No send button found'
      };
    }
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
  } catch (error) {
    console.error('❌ Error in main execution:', error);
  } finally {
    // Script completed
    console.log('✅ Script execution finished');
  }
})();
