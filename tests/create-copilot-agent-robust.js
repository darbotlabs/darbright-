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

async function saveDebugScreenshot(page, name) {
  if (!page) return;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${name}-${timestamp}.png`;
  
  try {
    await page.screenshot({
      path: path.join(CONFIG.screenshotsDir, filename),
      fullPage: false
    });
    console.log(`📸 Screenshot saved: ${filename}`);
    
    // Also save full-page screenshot
    await page.screenshot({
      path: path.join(CONFIG.screenshotsDir, `fullpage-${filename}`),
      fullPage: true
    });
  } catch (error) {
    console.warn(`⚠️ Could not save screenshot: ${error.message}`);
  }
}

async function findTextInputElement(page) {
  console.log('Searching for text input element...');
  
  // Try various selectors to find the input field
  const selectors = [
    // First try: standard textareas
    'textarea',
    // Second try: editable div elements
    '[contenteditable="true"]',
    // Third try: input elements
    'input[type="text"]'
  ];
  
  for (const selector of selectors) {
    const elements = await page.locator(selector).all();
    console.log(`Found ${elements.length} elements with selector: ${selector}`);
    
    for (const element of elements) {
      const isVisible = await element.isVisible().catch(() => false);
      if (!isVisible) continue;
      
      // Check if it's likely our target by evaluating its position and dimensions
      const box = await element.boundingBox().catch(() => null);
      if (!box) continue;
      
      // Check if it's in a reasonable position (middle-ish of the page)
      const pageSize = await page.viewportSize();
      if (box && 
          box.width > 200 && // Wide enough to be a text area
          box.height > 20 && // Tall enough to be a text area
          box.x > 100 && // Not at the far left edge
          box.y > 100 && // Not at the top edge
          box.y < pageSize.height - 100) { // Not at the bottom edge
        
        return { element, box, selector };
      }
    }
  }
  
  // If we got here, we couldn't find a suitable element
  return null;
}

async function findSubmitButton(page, inputElementBox) {
  console.log('Searching for submit button...');
  
  if (!inputElementBox) return null;
  
  // Try to find buttons in these ways:
  // 1. Buttons with SVG icons
  // 2. Buttons with "Send", "Submit", "Create" text
  // 3. Buttons positioned near the input box
  
  const buttonSelectors = [
    'button:has(svg)',
    'button:has-text("Send")',
    'button:has-text("Submit")',
    'button:has-text("Create")',
    'button:has-text("Next")',
    '[role="button"]',
    'button'
  ];
  
  for (const selector of buttonSelectors) {
    const buttons = await page.locator(selector).all();
    console.log(`Found ${buttons.length} elements with selector: ${selector}`);
    
    for (const button of buttons) {
      const isVisible = await button.isVisible().catch(() => false);
      if (!isVisible) continue;
      
      // Get position of the button
      const buttonBox = await button.boundingBox().catch(() => null);
      if (!buttonBox) continue;
      
      // Focus on buttons that are near the input or in the general "send" region
      // - Either to the right of the textarea
      // - Or below it
      // - And not too far away
      const isNearInput = (
        (Math.abs(buttonBox.x - (inputElementBox.x + inputElementBox.width)) < 100) ||
        (Math.abs(buttonBox.y - (inputElementBox.y + inputElementBox.height)) < 100)
      );
      
      if (isNearInput) {
        return { button, box: buttonBox, selector };
      }
    }
  }
  
  // If we got here, see if there's a paper-plane icon we can directly target
  try {
    // Get the viewport size to focus on the bottom right
    const viewportSize = await page.viewportSize();
    if (!viewportSize) return null;
    
    // The send button is likely in the bottom portion of the textbox
    // Let's try to find something clickable in that area
    return {
      // No actual button reference, we'll use page.mouse.click directly
      button: null,
      // Position the click at the right-bottom corner of the textarea area
      box: {
        x: inputElementBox.x + inputElementBox.width - 30, // 30px from right edge
        y: inputElementBox.y + inputElementBox.height + 30, // 30px below textarea
        width: 32,
        height: 32
      },
      message: 'Found both input and button elements'
    };
  } catch (error) {
    console.error('Error finding alternative click target:', error);
    return null;
  }
}

async function tryAlternativeSubmitMethods(page, inputResult) {
  console.log('Trying alternative submit methods...');
  
  // Method 1: Try clicking on various coordinates around textarea
  const positions = [
    // Bottom right of textarea (common location for send buttons)
    { x: inputResult.box.x + inputResult.box.width - 30, y: inputResult.box.y + inputResult.box.height + 30 },
    // Corner of textarea
    { x: inputResult.box.x + inputResult.box.width - 10, y: inputResult.box.y + inputResult.box.height - 10 },
    // Right side of textarea (middle)
    { x: inputResult.box.x + inputResult.box.width + 20, y: inputResult.box.y + (inputResult.box.height / 2) },
    // Further right of textarea
    { x: inputResult.box.x + inputResult.box.width + 40, y: inputResult.box.y + (inputResult.box.height / 2) },
  ];
  
  for (const pos of positions) {
    console.log(`Trying click at x: ${Math.round(pos.x)}, y: ${Math.round(pos.y)}`);
    await page.mouse.click(pos.x, pos.y);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await saveDebugScreenshot(page, `after-click-${Math.round(pos.x)}-${Math.round(pos.y)}`);
  }
  
  // Method 2: Try keyboard shortcuts commonly used for submission
  console.log('Trying keyboard shortcuts for submission');
  await inputResult.element.focus();
  
  // Try Ctrl+Enter (common shortcut for submit)
  console.log('Pressing Ctrl+Enter');
  await page.keyboard.press('Control+Enter');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await saveDebugScreenshot(page, 'after-ctrl-enter');
  
  // Try Enter key
  console.log('Pressing Enter');
  await page.keyboard.press('Enter');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await saveDebugScreenshot(page, 'after-enter');
  
  // Method 3: Try to tab to the button and press space
  console.log('Trying tab navigation');
  await inputResult.element.focus();
  await page.keyboard.press('Tab');
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.keyboard.press('Space');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await saveDebugScreenshot(page, 'after-tab-space');
}

async function createAgent() {
  let browser = null;
  
  try {
    await launchEdgeAndNavigate();

    // ⬇️ Connect to the (now surely-running) Edge instance
    console.log('🔌 Connecting to Edge browser via CDP...');
    browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.cdpPort}`);
    const context = browser.contexts()[0] ?? await browser.newContext();

    // Find Copilot Studio page
    const pages = context.pages();
    console.log(`Found ${pages.length} browser pages`);
    
    let page = pages.find(p => p.url().includes('copilotstudio')) ?? pages[0];
    if (!page) {
      console.log('No pages found, creating a new one');
      page = await context.newPage();
      await page.goto(CONFIG.copilotStudioUrl, { waitUntil: 'domcontentloaded' });
    }
    
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    console.log(`✅ Landed on: ${page.url()}`);
    
    // Take a screenshot to see what we're working with
    await saveDebugScreenshot(page, 'landing-page');
    
    // Find the text input element using our robust finder
    const inputResult = await findTextInputElement(page);
    
    if (!inputResult) {
      throw new Error('Could not find text input element');
    }
    
    // Try to input text
    try {
      await inputResult.element.fill(CONFIG.agentDescription);
      console.log('✅ Text input successful');
    } catch (error) {
      console.log(`Standard fill failed: ${error.message}`);
      
      // Try alternative input methods
      try {
        // Clear first
        await inputResult.element.click({ clickCount: 3 }); // Triple click to select all
        await page.keyboard.press('Backspace');
        
        // Then type slowly
        await inputResult.element.type(CONFIG.agentDescription, { delay: 50 });
        console.log('✅ Text input successful (using type method)');
      } catch (error) {
        console.log(`Type method failed: ${error.message}`);
        
        // Last resort: direct keyboard input
        try {
          await inputResult.element.click();
          await page.keyboard.type(CONFIG.agentDescription, { delay: 50 });
          console.log('✅ Text input successful (using keyboard method)');
        } catch (error) {
          throw new Error(`Could not input text: ${error.message}`);
        }
      }
    }
    
    // Take a screenshot after input
    await saveDebugScreenshot(page, 'after-text-input');
    
    // Find the submit button
    const buttonResult = await findSubmitButton(page, inputResult.box);
    
    if (!buttonResult) {
      throw new Error('Could not find submit button');
    }
    
    // Click the button
    if (buttonResult.button) {
      try {
        await buttonResult.button.click({ force: true });
        console.log('🚀 Submit button clicked');
      } catch (error) {
        console.log(`Standard click failed: ${error.message}`);
        
        // Try direct mouse click on the button's coordinates
        if
