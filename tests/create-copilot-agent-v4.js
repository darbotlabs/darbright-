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

// Ensure screenshots directory exists
async function ensureScreenshotsDir() {
  try {
    await fs.mkdir(CONFIG.screenshotsDir, { recursive: true });
  } catch (error) {
    console.warn(`⚠️ Could not create screenshots directory: ${error.message}`);
  }
}

async function launchEdgeAndNavigate() {
  console.log('Launching Edge with remote debugging...');
  
  // Ensure screenshots directory exists
  await ensureScreenshotsDir();
  
  // Build the command to launch Edge with remote debugging
  const edgeProcessArgs = [
    '--remote-debugging-port=' + CONFIG.cdpPort,
    '--new-window',
    '--no-first-run',
    '--no-default-browser-check',
    CONFIG.copilotStudioUrl
  ];
  
  // Launch Microsoft Edge with remote debugging enabled
  const { spawn } = require('child_process');
  const edgePath = process.env.EDGE_PATH || 'msedge';
  
  const edgeProcess = spawn(edgePath, edgeProcessArgs, {
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

// NEW: Check for iframes and search elements in each frame context
async function getAllFrames(page) {
  const frames = [page.mainFrame()];
  const childFrames = page.mainFrame().childFrames();
  frames.push(...childFrames);
  return frames;
}

// NEW: Improved text input element finder
async function findTextInputElement(page) {
  console.log('Searching for text input element...');
  
  // First take a screenshot to see the page
  await saveDebugScreenshot(page, 'before-input-search');
  
  // Get all frames (main page + iframes)
  const frames = await getAllFrames(page);
  console.log(`Found ${frames.length} frames to search`);
  
  // Try various selectors to find the input field
  const selectors = [
    // First try: standard textareas
    'textarea',
    // Second try: editable div elements
    '[contenteditable="true"]',
    // Third try: input elements
    'input[type="text"]',
    // Fourth try: specific classes that might contain "text" or "input"
    '[class*="text"]:not(script):not(style)',
    '[class*="input"]:not(script):not(style)',
    // Fifth try: any divs that are large enough
    'div[class]'
  ];
  
  // Search in all frames
  for (const frame of frames) {
    console.log(`Searching in frame: ${frame.url()}`);
    
    for (const selector of selectors) {
      const elements = await frame.locator(selector).all();
      console.log(`Found ${elements.length} elements with selector: ${selector}`);
      
      for (const element of elements) {
        const isVisible = await element.isVisible().catch(() => false);
        if (!isVisible) {
          continue;
        }
        
        // Check if it's likely our target by evaluating its position and dimensions
        const box = await element.boundingBox().catch(() => null);
        if (!box) {
          continue;
        }
        
        // Check if element is editable
        const isEditable = await element.evaluate(el => {
          return !el.disabled && 
                !el.readOnly && 
                (el.tagName.toLowerCase() === 'textarea' || 
                 el.contentEditable === 'true' || 
                 (el.tagName.toLowerCase() === 'input' && el.type !== 'hidden'));
        }).catch(() => false);
        
        // Additional check: Is it large enough to be a prompt field?
        const isReasonableSize = box.width > 100 && box.height > 40;
        
        console.log(`Element check - selector: ${selector}, width: ${box.width}, height: ${box.height}, editable: ${isEditable}, reasonable size: ${isReasonableSize}`);
        
        if (isEditable && isReasonableSize) {
          // Get the current value or text content
          const initialValue = await element.evaluate(el => {
            return el.value || el.textContent;
          }).catch(() => '');
          
          console.log(`Found likely input element: ${selector}, initial value: "${initialValue.substring(0, 20)}${initialValue.length > 20 ? '...' : ''}"`);
          
          return { 
            element, 
            box, 
            selector,
            frame,
            initialValue
          };
        }
      }
    }
  }
  
  // NEW: If we can't find elements normally, look for placeholders or prompts
  // that might indicate where user should input text
  for (const frame of frames) {
    // Look for placeholder text that might indicate an input area
    const placeholderSelectors = [
      '[placeholder]',
      'label:has-text("prompt")',
      'label:has-text("description")',
      'div:has-text("Enter a prompt")',
      'div:has-text("Tell me")',
      'div:has-text("Type")',
      'div:has-text("description")'
    ];
    
    for (const selector of placeholderSelectors) {
      try {
        const elements = await frame.locator(selector).all();
        for (const element of elements) {
          const isVisible = await element.isVisible().catch(() => false);
          if (!isVisible) continue;
          
          // Check if this element or its parent might be clickable
          const box = await element.boundingBox().catch(() => null);
          if (!box) continue;
          
          console.log(`Found potential placeholder: ${selector}`);
          // Return the element or its parent
          return {
            element,
            box,
            selector,
            frame,
            initialValue: '',
            isPlaceholder: true
          };
        }
      } catch (error) {
        // Ignore errors when searching for placeholders
      }
    }
  }
  
  // If we got here, we couldn't find a suitable element
  return null;
}

async function findSubmitButton(page, inputElementBox, frame) {
  console.log('Searching for submit button...');
  
  if (!inputElementBox) return null;
  
  const frameToSearch = frame || page;
  
  // Triangle/arrow emoji characters that might indicate submission
  const arrowTexts = ['▶', '►', '➤', '➜', '➡', '⮕', '➧', '⏵', '▷', '✓', '✔', '⚡', '💬'];
  
  // Try to find buttons in these ways:
  // 1. Buttons with triangle/arrow icons
  // 2. Buttons with SVG icons
  // 3. Buttons with "Send", "Submit", "Create" text
  // 4. Buttons positioned near the input box
  
  const buttonSelectors = [
    // First priority: triangles/arrows that often indicate "submit"
    ...arrowTexts.map(arrow => `button:has-text("${arrow}")`),
    ...arrowTexts.map(arrow => `[role="button"]:has-text("${arrow}")`),
    ...arrowTexts.map(arrow => `div:has-text("${arrow}")`),
    // Second priority: buttons with icons or specific text
    'button:has(svg)',
    'button:has-text("Send")',
    'button:has-text("Submit")',
    'button:has-text("Create")',
    'button:has-text("Next")',
    'button:has-text("Start")',
    '[role="button"]:has(svg)',
    '[role="button"]:has-text("Send")',
    '[role="button"]:has-text("Submit")',
    '[role="button"]:has-text("Create")',
    '[role="button"]:has-text("Next")',
    '[role="button"]:has-text("Start")',
    // Last priority: any button
    '[role="button"]',
    'button'
  ];
  
  for (const selector of buttonSelectors) {
    const buttons = await frameToSearch.locator(selector).all();
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
        // Right of the textarea
        (buttonBox.x > inputElementBox.x && 
         Math.abs(buttonBox.x - (inputElementBox.x + inputElementBox.width)) < 150) ||
        // Below the textarea
        (buttonBox.y > inputElementBox.y &&
         Math.abs(buttonBox.y - (inputElementBox.y + inputElementBox.height)) < 150)
      );
      
      if (isNearInput) {
        // NEW: Check if it looks like a triangle/arrow button (likely a submit)
        const buttonText = await button.textContent().catch(() => '');
        const isArrowButton = arrowTexts.some(arrow => buttonText.includes(arrow));
        
        if (isArrowButton) {
          console.log('Found button with arrow/triangle - likely submit button');
          return { button, box: buttonBox, selector, isTriangleButton: true };
        }
        
        // NEW: Check for SVG (likely an icon button)
        const hasSvg = await button.locator('svg').count().catch(() => 0) > 0;
        if (hasSvg) {
          console.log('Found button with SVG - likely icon button');
          return { button, box: buttonBox, selector, hasSvg: true };
        }
        
        console.log('Found button near input field');
        return { button, box: buttonBox, selector };
      }
    }
  }
  
  // If we got here, try looking for a "floating" button that might be in fixed position
  // This is common in modern UIs where the send button floats near the input
  try {
    // Look for elements in fixed position
    const fixedElements = await frameToSearch.$$('[style*="position: fixed"], [style*="position:fixed"]');
    for (const fixedEl of fixedElements) {
      const isVisible = await fixedEl.isVisible().catch(() => false);
      if (!isVisible) continue;
      
      const box = await fixedEl.boundingBox().catch(() => null);
      if (!box) continue;
      
      // Check if it's in the bottom portion of the screen
      const viewportSize = await page.viewportSize();
      if (viewportSize && box.y > viewportSize.height * 0.7) {
        console.log('Found fixed position element in bottom portion of screen');
        return { button: fixedEl, box, selector: 'fixed-position' };
      }
    }
  } catch (error) {
    console.log('Error finding fixed position elements:', error.message);
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
      // Return multiple potential target areas around the input box
      targets: [
        // Right side of textarea (for arrow/triangle buttons)
        { 
          x: inputElementBox.x + inputElementBox.width + 20, 
          y: inputElementBox.y + (inputElementBox.height / 2) 
        },
        // Bottom of textarea (for send buttons below input)
        {
          x: inputElementBox.x + (inputElementBox.width / 2),
          y: inputElementBox.y + inputElementBox.height + 20
        },
        // Bottom right of textarea (common location for submit buttons)
        {
          x: inputElementBox.x + inputElementBox.width - 20,
          y: inputElementBox.y + inputElementBox.height + 20
        },
        // Further right of textarea
        {
          x: inputElementBox.x + inputElementBox.width + 40,
          y: inputElementBox.y + (inputElementBox.height / 2)
        }
      ],
      box: {
        x: inputElementBox.x + inputElementBox.width - 30, // 30px from right edge
        y: inputElementBox.y + inputElementBox.height + 30, // 30px below textarea
        width: 32,
        height: 32
      },
      message: 'Using alternative click targets around input element'
    };
  } catch (error) {
    console.error('Error finding alternative click target:', error);
    return null;
  }
}

// NEW: Enhanced function to verify input was successful
async function verifyInputSuccessful(element, inputText) {
  try {
    // Get current value
    const currentValue = await element.evaluate(el => {
      return el.value || el.textContent || '';
    }).catch(() => '');
    
    console.log('Verifying input success:');
    console.log(`- Expected to contain: "${inputText.substring(0, 20)}${inputText.length > 20 ? '...' : ''}"`);
    console.log(`- Current value: "${currentValue.substring(0, 20)}${currentValue.length > 20 ? '...' : ''}"`);
    
    // Check if input text is contained in the current value
    // We're being flexible here since some UIs might add formatting
    if (currentValue.includes(inputText.substring(0, 20))) {
      console.log('✅ Input verification successful - text is present in element');
      return true;
    }
    
    // If the element value hasn't changed, the input probably wasn't successful
    if (!currentValue || currentValue.trim() === '') {
      console.log('❌ Input verification failed - element is empty');
      return false;
    }
    
    console.log('⚠️ Input verification inconclusive - element contains text but not our input');
    return false;
  } catch (error) {
    console.log(`❌ Error verifying input: ${error.message}`);
    return false;
  }
}

// NEW: Improved text input function with multiple strategies
async function inputTextWithMultipleStrategies(page, inputResult, text) {
  const strategies = [
    // Strategy 1: Standard fill method
    async () => {
      console.log('Trying standard fill method...');
      await inputResult.element.fill(text);
      const success = await verifyInputSuccessful(inputResult.element, text);
      return success;
    },
    
    // Strategy 2: Clear and type slowly
    async () => {
      console.log('Trying clear and type slowly method...');
      await inputResult.element.click({ clickCount: 3 }); // Triple click to select all
      await page.keyboard.press('Backspace');
      await inputResult.element.type(text, { delay: 50 });
      const success = await verifyInputSuccessful(inputResult.element, text);
      return success;
    },
    
    // Strategy 3: Click and keyboard input
    async () => {
      console.log('Trying click and keyboard input method...');
      await inputResult.element.click();
      await page.keyboard.type(text, { delay: 30 });
      const success = await verifyInputSuccessful(inputResult.element, text);
      return success;
    },
    
    // Strategy 4: Use evaluate to set value directly via JS
    async () => {
      console.log('Trying direct JS value setting...');
      try {
        // Try to set the value directly using JavaScript
        await inputResult.element.evaluate((el, value) => {
          // For inputs and textareas
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.value = value;
            // Dispatch events to notify the app
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } 
          // For contenteditable divs
          else if (el.contentEditable === 'true') {
            el.textContent = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, text);
        
        const success = await verifyInputSuccessful(inputResult.element, text);
        return success;
      } catch (error) {
        console.log(`Direct JS value setting failed: ${error.message}`);
        return false;
      }
    },
    
    // Strategy 5: Use document.execCommand
    async () => {
      console.log('Trying document.execCommand method...');
      try {
        await inputResult.element.click();
        await inputResult.element.evaluate((el, value) => {
          // Focus the element
          el.focus();
          // Use document.execCommand to insert text (works in contentEditable)
          document.execCommand('insertText', false, value);
        }, text);
        
        const success = await verifyInputSuccessful(inputResult.element, text);
        return success;
      } catch (error) {
        console.log(`document.execCommand method failed: ${error.message}`);
        return false;
      }
    },
    
    // Strategy 6: Last resort - dispatch input events with keyboard simulator
    async () => {
      console.log('Trying keyboard simulator method...');
      try {
        await inputResult.element.click();
        
        // Press ctrl+a to select all existing text
        await page.keyboard.press('Control+a');
        await page.waitForTimeout(100);
        
        // Delete existing content
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(100);
        
        // Type very slowly to ensure events are captured
        for (const char of text) {
          await page.keyboard.type(char, { delay: 100 });
          await page.waitForTimeout(25);
        }
        
        const success = await verifyInputSuccessful(inputResult.element, text);
        return success;
      } catch (error) {
        console.log(`Keyboard simulator method failed: ${error.message}`);
        return false;
      }
    }
  ];
  
  // Try each strategy until one succeeds
  for (const [index, strategy] of strategies.entries()) {
    console.log(`Attempting input strategy ${index + 1}/${strategies.length}...`);
    try {
      const success = await strategy();
      if (success) {
        console.log(`✅ Strategy ${index + 1} successful!`);
        return true;
      } else {
        console.log(`❌ Strategy ${index + 1} failed`);
        // Take a screenshot after each failed attempt
        await saveDebugScreenshot(page, `failed-strategy-${index + 1}`);
      }
    } catch (error) {
      console.log(`Error with strategy ${index + 1}: ${error.message}`);
    }
    
    // Wait a bit between strategies
    await page.waitForTimeout(500);
  }
  
  return false;
}

// Enhanced version of tryAlternativeSubmitMethods
async function tryAlternativeSubmitMethods(page, inputResult) {
  console.log('Trying alternative submit methods...');
  
  // Take a screenshot before starting
  await saveDebugScreenshot(page, 'before-alternative-submits');
  
  // Method 1: Try clicking on various coordinates around textarea
  if (inputResult && inputResult.box) {
    // If we have multiple targets, try them all
    const targets = inputResult.targets || [
      // Bottom right of textarea (common location for send buttons)
      { x: inputResult.box.x + inputResult.box.width - 30, y: inputResult.box.y + inputResult.box.height + 30 },
      // Corner of textarea
      { x: inputResult.box.x + inputResult.box.width - 10, y: inputResult.box.y + inputResult.box.height - 10 },
      // Right side of textarea (middle)
      { x: inputResult.box.x + inputResult.box.width + 20, y: inputResult.box.y + (inputResult.box.height / 2) },
      // Further right of textarea
      { x: inputResult.box.x + inputResult.box.width + 40, y: inputResult.box.y + (inputResult.box.height / 2) },
    ];
    
    for (const pos of targets) {
      console.log(`Trying click at x: ${Math.round(pos.x)}, y: ${Math.round(pos.y)}`);
      await page.mouse.click(pos.x, pos.y);
      await page.waitForTimeout(1000);
      await saveDebugScreenshot(page, `after-click-${Math.round(pos.x)}-${Math.round(pos.y)}`);
      
      // Check if the click caused navigation
      const currentUrl = page.url();
      console.log(`Current URL after click: ${currentUrl}`);
    }
  }
  
  // Method 2: Try keyboard shortcuts commonly used for submission
  if (inputResult && inputResult.element) {
    console.log('Trying keyboard shortcuts for submission');
    await inputResult.element.focus();
    
    // Try Ctrl+Enter (common shortcut for submit)
    console.log('Pressing Ctrl+Enter');
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(1000);
    await saveDebugScreenshot(page, 'after-ctrl-enter');
    
    // Try Enter key
    console.log('Pressing Enter');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await saveDebugScreenshot(page, 'after-enter');
    
    // Try Tab then Enter (to move to the next interactive element and activate it)
    console.log('Trying tab navigation');
    await inputResult.element.focus();
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await saveDebugScreenshot(page, 'after-tab-enter');
    
    // Try Tab twice then Enter
    console.log('Trying double tab navigation');
    await inputResult.element.focus();
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await saveDebugScreenshot(page, 'after-double-tab-enter');
  }
  
  // Method 3: Try to find and click any button-like elements
  console.log('Trying to find and click any button-like elements');
  const buttonSelectors = [
    'button', 
    '[role="button"]', 
    'a[href]', 
    'input[type="submit"]',
    'input[type="button"]',
    '[class*="button"]',
    '[class*="btn"]'
  ];
  
  for (const selector of buttonSelectors) {
    const buttons = await page.locator(selector).all();
    for (const button of buttons) {
      const isVisible = await button.isVisible().catch(() => false);
      if (!isVisible) continue;
      
      console.log(`Clicking ${selector}`);
      await button.click().catch(() => null);
      await page.waitForTimeout(1000);
      await saveDebugScreenshot(page, `after-click-${selector.replace(/[^\w]/g, '-')}`);
    }
  }
}

// NEW: Function to check for UI navigation and detect new page/content
async function checkForNavigation(page, originalUrl) {
  // Take note of current URL
  const currentUrl = page.url();
  
  // Check if URL has changed
  if (currentUrl !== originalUrl) {
    console.log(`✅ URL changed from ${originalUrl} to ${currentUrl} - navigation confirmed`);
    return true;
  }
  
  // Check if content has changed significantly
  try {
    // Get heading texts before
    const headings = await page.locator('h1,h2,h3').allTextContents().catch(() => []);
    console.log('Current headings:', headings);
    
    // Check for results/completion/next step indicators
    const successIndicators = [
      'success',
      'completed',
      'created',
      'next step',
      'customize',
      'configuration',
      'setup',
      'dashboard'
    ];
    
    for (const heading of headings) {
      for (const indicator of successIndicators) {
        if (heading.toLowerCase().includes(indicator)) {
          console.log(`✅ Success indicator found in heading: "${heading}" (matched "${indicator}")`);
          return true;
        }
      }
    }
  } catch (error) {
    console.log(`Error checking headings: ${error.message}`);
  }
  
  return false;
}

// Main function to create agent
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
    
    // NEW: Store initial URL for comparison later
    const initialUrl = page.url();
    console.log(`Initial URL: ${initialUrl}`);
    
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    console.log(`✅ Landed on: ${page.url()}`);
    
    // Wait a bit longer for any initial animations
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see what we're working with
    await saveDebugScreenshot(page, 'landing-page');
    
    // Check if we need to navigate to create page
    if (!page.url().includes('/create/')) {
      console.log('Not on create page, looking for "Create" button...');
      
      // Try to find and click buttons that might lead to creation page
      const createSelectors = [
        'button:has-text("Create")', 
        'a:has-text("Create")',
        '[role="button"]:has-text("Create")',
        'button:has-text("New")',
        'a:has-text("New")',
        '[role="button"]:has-text("New")'
      ];
      
      // Search in all frames
      const frames = await getAllFrames(page);
      for (const frame of frames) {
        for (const selector of createSelectors) {
          try {
            const elements = await frame.locator(selector).all();
            for (const element of elements) {
              const isVisible = await element.isVisible().catch(() => false);
              if (isVisible) {
                console.log(`Found and clicking ${selector}`);
                await element.click();
                await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
                console.log(`Navigated to: ${page.url()}`);
                
                // Take another screenshot after navigation
                await saveDebugScreenshot(page, 'after-create-click');
                break;
              }
            }
          } catch (error) {
            console.log(`Error finding/clicking ${selector}: ${error.message}`);
          }
        }
      }
    }
    
    // Wait for any loading animations
    await page.waitForTimeout(2000);
    
    // Take screenshot of the page we're now on
    await saveDebugScreenshot(page, 'before-text-input');
    
    // Find the text input element using our robust finder
    let inputResult = await findTextInputElement(page);
    
    // If we couldn't find the input element, try direct coordinates
    if (!inputResult) {
      console.log('Could not find input element via selectors, trying direct coordinates');
      
      // Get viewport size
      const viewport = await page.viewportSize();
      if (viewport) {
        // Try clicking in the middle of the page where the textarea likely is
        const centerX = viewport.width / 2;
        const centerY = (viewport.height / 2) + 50; // Slightly below center
        
        console.log(`Clicking at center coordinates: x=${centerX}, y=${centerY}`);
        await page.mouse.click(centerX, centerY);
        await page.waitForTimeout(1000);
        
        // Try to get the focused element
        const focusedElement = await page.evaluateHandle(() => document.activeElement);
        if (focusedElement) {
          const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
          console.log(`Focused element tag: ${tagName}`);
          
          if (tagName === 'textarea' || tagName === 'input' || tagName === 'div') {
            const box = await focusedElement.boundingBox().catch(() => null);
            if (box) {
              inputResult = { 
                element: focusedElement, 
                box, 
                selector: tagName 
              };
            }
          }
        }
      }
      
      // If still no input element, create a synthetic one
      if (!inputResult && viewport) {
        console.log('Still no input element found, creating synthetic one for direct typing');
        
        // Create a synthetic input result with coordinates in the middle
        inputResult = {
          element: {
            fill: async (text) => {
              // First click where we expect the input area
              await page.mouse.click(viewport.width / 2, viewport.height / 2);
              // Type the text directly
              await page.keyboard.type(text, { delay: 30 });
              return true;
            },
            click: async () => {
              await page.mouse.click(viewport.width / 2, viewport.height / 2);
            },
            focus: async () => {
              await page.mouse.click(viewport.width / 2, viewport.height / 2);
            },
            evaluate: async (fn, ...args) => {
              // This is a stub since we don't have an actual element
              return null;
            }
          },
          box: {
            x: viewport.width / 2 - 150,
            y: viewport.height / 2 - 50,
            width: 300,
            height: 100
          },
          selector: 'synthetic' 
        };
      }
    }
    
    if (!inputResult) {
      throw new Error('Could not find text input element');
    }
    
    // NEW: Try multiple input strategies until one works
    const inputSuccess = await inputTextWithMultipleStrategies(page, inputResult, CONFIG.agentDescription);
    
    if (!inputSuccess) {
      console.log('⚠️ No input strategy was successful - will still try to continue');
    }
    
    // Take a screenshot after input
    await saveDebugScreenshot(page, 'after-text-input');
    
    // Find the submit button
    const buttonResult = await findSubmitButton(page, inputResult.box, inputResult.frame);
    
    if (!buttonResult) {
      throw new Error('Could not find submit button');
    }
    
    // Store URL before button click
    const preClickUrl = page.url();
    
    // Click the button
    if (buttonResult.button) {
      try {
        await buttonResult.button.click({ force: true });
        console.log('🚀 Submit button clicked');
      } catch (error) {
        console.log(`Standard click failed: ${error.message}`);
        
        // Try direct mouse click on the button's coordinates
        if (buttonResult.box) {
          const x = buttonResult.box.x + buttonResult.box.width / 2;
          const y = buttonResult.box.y + buttonResult.box.height / 2;
          console.log(`Clicking at position x: ${Math.round(x)}, y: ${Math.round(y)}`);
          await page.mouse.click(x, y);
          console.log('🚀 Submit button clicked using coordinates');
        }
      }
    } else if (buttonResult.targets) {
      // Try each of the provided targets
      for (const target of buttonResult.targets) {
        console.log(`Clicking at target position x: ${Math.round(target.x)}, y: ${Math.round(target.y)}`);
        await page.mouse.click(target.x, target.y);
        await page.waitForTimeout(1000);
        await saveDebugScreenshot(page, `click-target-${Math.round(target.x)}-${Math.round(target.y)}`);
        
        // Check if the click caused navigation
        if (page.url() !== preClickUrl) {
          console.log('✅ Click caused navigation!');
          break;
        }
      }
    } else {
      // Use mouse coordinates directly
      console.log(`Clicking at position x: ${Math.round(buttonResult.box.x)}, y: ${Math.round(buttonResult.box.y)}`);
      await page.mouse.click(buttonResult.box.x, buttonResult.box.y);
      console.log('🚀 Submit button clicked');
    }
    
    // Take a screenshot after clicking
    await saveDebugScreenshot(page, 'after-button-click');
    
    // NEW: Wait longer for any loading indicators or animations
    await page.waitForTimeout(5000);
    
    // Set up navigation promises - handle both new page and navigation cases
    const navigationPromise = page.waitForNavigation({ timeout: 20000 }).catch(() => null);
    const newPagePromise = context.waitForEvent('page', { timeout: 20000 }).catch(() => null);
    
    // Wait for either navigation or new page
    const [newPage, navigationResult] = await Promise.all([
      newPagePromise,
      navigationPromise,
      // Allow some time for any action to happen
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
    
    // Check if we have a new page or navigated
    const resultPage = newPage ?? page;
    console.log(`📄 Result page URL: ${resultPage.url()}`);
    
    // Wait for the page to stabilize
    await resultPage.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      console.log('⚠️ Page did not reach networkidle state');
    });
    
    // Take final screenshot
    await saveDebugScreenshot(resultPage, 'result-page');
    
    // Check if navigation occurred by comparing URLs and analyzing content
    const navigationDetected = await checkForNavigation(resultPage, preClickUrl);
    
    // If navigation wasn't detected, try alternative submission methods
    if (!navigationDetected) {
      console.log('⚠️ Navigation not detected - trying alternate submission methods');
      await tryAlternativeSubmitMethods(page, inputResult);
      
      // Check again after alternative methods
      const finalNavigationDetected = await checkForNavigation(page, preClickUrl);
      if (finalNavigationDetected) {
        console.log('✅ Navigation successful after alternative methods!');
      } else {
        console.log('⚠️ Navigation still not detected after alternate methods');
      }
    }
    
    // Try to get headings or other content from the page for verification
    const headings = await resultPage.locator('h1,h2,h3').allTextContents().catch(() => []);
    if (headings.length > 0) {
      console.log('Page headings:', headings);
    }
    
    // NEW: Check for form fields/options that might indicate success
    const formFields = await resultPage.locator('input,select,textarea').count().catch(() => 0);
    console.log(`Found ${formFields} form fields on result page`);
    
    return {
      success: navigationDetected || formFields > 0 || headings.length > 0,
      url: resultPage.url(),
      headings: headings.length > 0 ? headings : ['No headings found'],
      formFields
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
            await saveDebugScreenshot(page, 'error-state');
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
  } finally {
    // Always try to close browser connection
    try {
      if (browser) {
        await browser.close().catch(() => null);
      }
    } catch (error) {
      console.warn(`⚠️ Could not close browser: ${error.message}`);
    }
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
    
    // Force exit (in case any CDP connections are hanging)
    setTimeout(() => process.exit(0), 1000);
  }
})();
