// Thought into existence by Darbot
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

async function createInventoryAgent() {
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots', 'inventory-agent');
  await fs.mkdir(screenshotsDir, { recursive: true }).catch(() => {});
    console.log('Connecting to Microsoft Edge browser on port 9222...');
  
  try {
    // Connect to the browser launched with remote debugging
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to browser successfully!');
    
    // Get existing contexts (browser windows/tabs)
    const contexts = browser.contexts();
    console.log(`Found ${contexts.length} browser contexts (windows)`);
    
    // Use the first context
    const context = contexts[0];
    console.log('Using existing browser context');
    
    // Get all pages in this context
    const pages = context.pages();
    console.log(`Found ${pages.length} pages (tabs)`);
    
    // Use the first page
    const page = pages[0];
    console.log(`Current page URL: ${page.url()}`);
    
    // Define our inventory agent details
    const agentDetails = {
      name: 'Inventory Manager',
      description: 'manages inventory tracking, stock levels, and product information',
      instructions: {
        checkStock: 'For stock level inquiries, check current inventory levels by product ID or name, and return quantity available, location, and reorder status.',
        updateInventory: 'For inventory updates, verify user authorization, then accept product ID, new quantity, and reason for change. Log all changes with timestamp and user info.',
        locateItems: 'For item location requests, identify where products are stored by checking warehouse, aisle, shelf, and bin information. Provide clear navigation instructions.',
        lowStockAlert: 'Monitor inventory levels and alert when items fall below threshold. Prioritize by criticality and lead time for reordering.'
      },
      knowledgeSources: [
        'https://inventory.example.com/api',
        'https://products.example.com/catalog',
        'https://warehouse.example.com/locations'
      ]
    };
    
    // UI validation function
    async function validateElement(selector, description) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`✅ Validated: ${description} is present`);
        return true;
      } catch (error) {
        console.error(`❌ Validation failed: ${description} not found`);
        await page.screenshot({ path: path.join(screenshotsDir, `error-${description.replace(/\s+/g, '-')}.png`) });
        return false;
      }
    }
    
    // Start agent creation process
    console.log('Starting inventory agent creation process...');
    
    // Make sure we're on Copilot Studio
    if (!page.url().includes('copilotstudio')) {
      console.log('Navigating to Copilot Studio...');
      await page.goto('https://copilotstudio.microsoft.com');
    }
    
    await page.waitForLoadState('networkidle');
    console.log('Page loaded. Taking screenshot...');
    await page.screenshot({ path: path.join(screenshotsDir, '01-initial-page.png') });
    
    // Validate main UI components
    console.log('Validating main UI components...');
    
    // Try different possible selectors for Create
    let createFound = await validateElement('text=Create', 'Create tab');
    if (!createFound) {
      createFound = await validateElement('button:has-text("Create")', 'Create button');
    }
    
    if (createFound) {
      console.log('Navigating to Create tab...');
      try {
        await page.click('text=Create').catch(() => page.click('button:has-text("Create")'));
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotsDir, '02-create-tab.png') });
      } catch (error) {
        console.error(`❌ Failed to click Create: ${error.message}`);
      }
    }
    
    // Validate New agent button presence
    const newAgentFound = await validateElement('text=New agent', 'New agent button') || 
                          await validateElement('button:has-text("New agent")', 'New agent button');
    
    if (newAgentFound) {
      console.log('Clicking New agent button...');
      try {
        await page.click('text=New agent').catch(() => page.click('button:has-text("New agent")'));
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotsDir, '03-new-agent.png') });
      } catch (error) {
        console.error(`❌ Failed to click New agent: ${error.message}`);
      }
    }
    
    // Validate chat interface
    const chatInputFound = await validateElement('textarea[placeholder="Type your message"]', 'Chat input field');
    
    if (chatInputFound) {
      // Describe the agent
      const initialDescription = `I want to create an agent named '${agentDetails.name}' that ${agentDetails.description}`;
      console.log(`Sending initial description: ${initialDescription}`);
      
      await page.fill('textarea[placeholder="Type your message"]', initialDescription);
      await page.press('textarea[placeholder="Type your message"]', 'Enter');
      
      // Wait for response
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(screenshotsDir, '04-initial-description.png') });
      
      // Add detailed instructions
      for (const [functionName, instruction] of Object.entries(agentDetails.instructions)) {
        console.log(`Adding instructions for: ${functionName}`);
        await page.waitForTimeout(3000); // Wait for previous response
        
        // Validate chat input is still available
        await validateElement('textarea[placeholder="Type your message"]', 'Chat input field');
        
        await page.fill('textarea[placeholder="Type your message"]', 
          `For ${functionName}, the agent should: ${instruction}`);
        await page.press('textarea[placeholder="Type your message"]', 'Enter');
        
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(screenshotsDir, `05-instruction-${functionName}.png`) });
      }
      
      // Add knowledge sources
      console.log('Adding knowledge sources...');
      await page.waitForTimeout(3000);
      
      // Validate chat input is still available
      await validateElement('textarea[placeholder="Type your message"]', 'Chat input field');
      
      const knowledgeSourcesText = `Yes, I would like to add these knowledge sources:\n` +
        agentDetails.knowledgeSources.map((url, i) => `${i+1}. ${url}`).join('\n');
      
      await page.fill('textarea[placeholder="Type your message"]', knowledgeSourcesText);
      await page.press('textarea[placeholder="Type your message"]', 'Enter');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(screenshotsDir, '06-knowledge-sources.png') });
      
      // Check for ownership checkboxes
      console.log('Checking for ownership confirmation boxes...');
      const checkboxes = await page.$$('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        console.log(`Found ${checkboxes.length} checkbox(es) to check`);
        
        for (const checkbox of checkboxes) {
          await checkbox.check();
        }
        console.log(`✅ Checked ${checkboxes.length} ownership boxes`);
        
        // Look for Skip to configure button
        const skipButtonFound = await validateElement('button:has-text("Skip to configure")', 'Skip to configure button');
        
        if (skipButtonFound) {
          await page.click('button:has-text("Skip to configure")');
          console.log('Clicked Skip to configure button');
        }
      }
      
      // Wait for configuration page
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(screenshotsDir, '07-configuration.png') });
      
      // Validate we're on agent configuration page by checking for common UI elements
      const configElements = [
        { selector: 'text=Agent details', description: 'Agent details section' },
        { selector: 'text=Settings', description: 'Settings tab' },
        { selector: 'text=Topics', description: 'Topics section' }
      ];
      
      let configValid = false;
      for (const element of configElements) {
        if (await validateElement(element.selector, element.description)) {
          configValid = true;
          break;
        }
      }
      
      if (configValid) {
        console.log('🎉 Successfully reached agent configuration page!');
      } else {
        console.log('⚠️ Could not confirm we reached the configuration page');
      }
    }
    
    console.log(`🎉 Inventory Management Agent creation process completed!`);
    console.log(`Screenshots saved to ${screenshotsDir}`);
    
    // Keep the browser open for manual review
    console.log('Browser remains open for manual interaction');
    console.log('Press Ctrl+C to disconnect');
    
    // Keep the script running to maintain the connection
    await new Promise(resolve => {
      process.on('SIGINT', async () => {
        console.log('Disconnecting from browser...');
        await browser.close();
        resolve();
      });
    });
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error('Make sure the browser is running with the remote debugging port enabled');
    console.error('Example: Start-Process msedge -ArgumentList "--remote-debugging-port=9223"');
  }
}

// Run the script
createInventoryAgent();
