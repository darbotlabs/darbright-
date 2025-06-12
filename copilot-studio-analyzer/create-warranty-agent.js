// Thought into existence by Darbot
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs').promises;

const CONFIG = {
  cdpPort: 9222,
  copilotStudioUrl: 'https://copilotstudio.microsoft.com',
  screenshotsDir: './screenshots/warranty-agent-creation',
  waitTimeout: 15000,
  agent: {
    name: 'WarrantyBot',
    description: 'A comprehensive hardware and warranty support agent that helps customers with product warranties, hardware troubleshooting, repair services, and replacement procedures.',
    
    // Core Instructions
    warrantyInstructions: `WarrantyBot should provide comprehensive warranty support including: 1) Warranty status verification using product serial numbers and purchase information, 2) Detailed warranty coverage explanations including what's covered, excluded, and duration remaining, 3) Step-by-step claim filing process with required documentation, 4) Repair vs replacement decision guidance based on warranty terms, 5) Authorized service center locations and contact information, 6) Expedited processing for critical business equipment, and 7) Integration with manufacturer warranty databases when available. For warranty claims, WarrantyBot should collect: serial number, purchase date, retailer information, problem description, and photos of defects when applicable.`,
    
    hardwareTroubleshootingInstructions: `For hardware troubleshooting, WarrantyBot should offer comprehensive diagnostic workflows: 1) Initial symptom assessment with detailed questioning about the specific hardware issue, 2) Progressive troubleshooting steps starting with simple solutions (power cycling, cable checks, driver updates), 3) Advanced diagnostics including system information gathering, error code interpretation, and hardware stress testing guidance, 4) Component-specific troubleshooting for CPUs, RAM, storage devices, graphics cards, motherboards, and peripherals, 5) Environmental factor assessment (temperature, humidity, power quality), 6) Integration with hardware diagnostic tools and utilities, and 7) Clear escalation paths to technical specialists when software troubleshooting is insufficient. Each troubleshooting session should document attempted solutions and results for warranty claim purposes.`,
    
    repairServicesInstructions: `WarrantyBot should guide customers through repair service options: 1) In-warranty vs out-of-warranty repair cost estimates, 2) Authorized repair center recommendations based on location and specialization, 3) Mail-in repair service coordination with shipping labels and tracking, 4) On-site repair scheduling for eligible business equipment, 5) Repair timeline estimates and status tracking, 6) Loaner equipment availability for critical business needs, 7) Repair quality guarantees and follow-up support, 8) Cost comparison between repair and replacement options, and 9) Data backup and security guidance before repair submission. WarrantyBot should maintain a database of certified repair providers and their specializations.`,
    
    replacementInstructions: `For product replacements, WarrantyBot should handle: 1) Replacement eligibility verification based on warranty terms and failure frequency, 2) Like-for-like replacement vs upgrade options within warranty coverage, 3) Express replacement services for business-critical equipment, 4) Advanced replacement programs with immediate shipping, 5) Cross-shipment coordination to minimize downtime, 6) Return merchandise authorization (RMA) generation and tracking, 7) Packaging and shipping instructions for defective units, 8) Data migration assistance between old and new hardware, 9) Extended warranty transfer to replacement units, and 10) Follow-up support to ensure replacement unit satisfaction. For business customers, WarrantyBot should prioritize minimal downtime solutions.`,
    
    knowledgeSources: [
      'support.hardwaretech.com/warranty-portal',
      'docs.hardwaretech.com/troubleshooting-guides',
      'repair.hardwaretech.com/service-centers',
      'warranty.hardwaretech.com/coverage-database',
      'support.hardwaretech.com/replacement-procedures',
      'business.hardwaretech.com/enterprise-support'
    ]
  }
};

async function createDirectories() {
  try {
    await fs.mkdir(path.resolve(__dirname, CONFIG.screenshotsDir), { recursive: true });
    console.log(`📁 Created screenshots directory: ${CONFIG.screenshotsDir}`);
  } catch (error) {
    console.error(`❌ Error creating directories: ${error.message}`);
    throw error;
  }
}

async function launchBrowserAndConnect() {
  console.log('🌐 Launching Microsoft Edge with remote debugging...');
  
  // Launch Edge with CDP
  const { exec } = require('child_process');
  exec(`Start-Process msedge -ArgumentList "--remote-debugging-port=${CONFIG.cdpPort}", "--new-window", "${CONFIG.copilotStudioUrl}"`, { shell: 'powershell.exe' });
  
  // Wait for Edge to start
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  try {
    console.log('🔗 Connecting to Edge via Chrome DevTools Protocol...');
    const browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.cdpPort}`);
    const contexts = browser.contexts();
    
    if (contexts.length === 0) {
      throw new Error('No browser contexts found');
    }
    
    const pages = contexts[0].pages();
    const targetPage = pages.find(p => p.url().includes('copilotstudio')) || pages[0];
    
    if (!targetPage) {
      throw new Error('No suitable page found');
    }
    
    console.log(`📄 Connected to page: ${targetPage.url()}`);
    return { browser, page: targetPage };
    
  } catch (error) {
    console.error(`❌ Failed to connect to browser: ${error.message}`);
    throw error;
  }
}

async function waitForAuthentication(page) {
  console.log('🔐 Waiting for authentication to complete...');
  
  try {
    // Wait for either the main Copilot Studio interface or login completion
    await page.waitForFunction(
      () => {
        return document.title.includes('Copilot Studio') || 
               document.querySelector('[data-testid="create-button"]') ||
               document.querySelector('[aria-label="Create"]') ||
               document.querySelector('text=Create') ||
               document.querySelector('[data-automation-id="create"]');
      },
      { timeout: 60000 }
    );
    
    console.log('✅ Authentication completed successfully');
    
    // Take screenshot after auth
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'post-authentication.png'),
      fullPage: true 
    });
    
  } catch (error) {
    console.log('⚠️ Authentication timeout - continuing with manual intervention expected');
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'authentication-timeout.png'),
      fullPage: true 
    });
  }
}

async function navigateToAgentCreation(page) {
  console.log('🎯 Navigating to agent creation...');
  
  try {
    // Wait for the page to be ready
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Multiple selector strategies for the Create tab/button
    const createSelectors = [
      'text=Create',
      '[data-testid="create-button"]',
      '[aria-label="Create"]',
      '[data-automation-id="create"]',
      'button:has-text("Create")',
      'a:has-text("Create")',
      '.create-button',
      '#create-tab'
    ];
    
    let createElement = null;
    for (const selector of createSelectors) {
      try {
        createElement = await page.waitForSelector(selector, { timeout: 3000 });
        if (createElement) {
          console.log(`✅ Found Create element with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (createElement) {
      await createElement.click();
      console.log('🔄 Clicked Create tab');
    } else {
      console.log('⚠️ Create tab not found - may already be on create page');
    }
    
    // Wait a moment for navigation
    await page.waitForTimeout(3000);
    
    // Look for "New agent" or "Create agent" button
    const newAgentSelectors = [
      'text=New agent',
      'text=Create agent',
      '[data-testid="new-agent-button"]',
      '[aria-label="New agent"]',
      'button:has-text("New agent")',
      'button:has-text("Create agent")',
      '.new-agent-button',
      '[data-automation-id="new-agent"]'
    ];
    
    let newAgentElement = null;
    for (const selector of newAgentSelectors) {
      try {
        newAgentElement = await page.waitForSelector(selector, { timeout: 3000 });
        if (newAgentElement) {
          console.log(`✅ Found New Agent element with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (newAgentElement) {
      await newAgentElement.click();
      console.log('🤖 Clicked New Agent button');
    } else {
      throw new Error('Could not find New Agent button');
    }
    
    // Take screenshot after navigation
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'agent-creation-page.png'),
      fullPage: true 
    });
    
  } catch (error) {
    console.error(`❌ Error navigating to agent creation: ${error.message}`);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'navigation-error.png'),
      fullPage: true 
    });
    throw error;
  }
}

async function createWarrantyAgent(page) {
  console.log('🛠️ Creating WarrantyBot agent...');
  
  try {
    // Wait for the chat interface to be ready
    const messageSelectors = [
      'textarea[placeholder="Type your message"]',
      'textarea[placeholder*="message"]',
      'input[placeholder="Type your message"]',
      'input[placeholder*="message"]',
      '[data-testid="message-input"]',
      '[aria-label="Type your message"]',
      '.message-input',
      'textarea'
    ];
    
    let messageInput = null;
    for (const selector of messageSelectors) {
      try {
        messageInput = await page.waitForSelector(selector, { timeout: 5000 });
        if (messageInput) {
          console.log(`✅ Found message input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!messageInput) {
      throw new Error('Could not find message input field');
    }
    
    // Step 1: Initial agent description
    const initialDescription = `I want to create a comprehensive hardware and warranty support agent named '${CONFIG.agent.name}' that ${CONFIG.agent.description}`;
    
    console.log('📝 Sending initial agent description...');
    await messageInput.fill(initialDescription);
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(8000);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'step1-initial-description.png'),
      fullPage: true 
    });
    
    // Step 2: Warranty support instructions
    console.log('📋 Adding warranty support instructions...');
    await page.waitForTimeout(3000);
    
    // Find message input again (it might have refreshed)
    messageInput = await page.waitForSelector(messageSelectors[0], { timeout: 5000 });
    await messageInput.fill(CONFIG.agent.warrantyInstructions);
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(8000);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'step2-warranty-instructions.png'),
      fullPage: true 
    });
    
    // Step 3: Hardware troubleshooting instructions
    console.log('🔧 Adding hardware troubleshooting instructions...');
    await page.waitForTimeout(3000);
    
    messageInput = await page.waitForSelector(messageSelectors[0], { timeout: 5000 });
    await messageInput.fill(CONFIG.agent.hardwareTroubleshootingInstructions);
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(8000);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'step3-troubleshooting-instructions.png'),
      fullPage: true 
    });
    
    // Step 4: Repair services instructions
    console.log('🔨 Adding repair services instructions...');
    await page.waitForTimeout(3000);
    
    messageInput = await page.waitForSelector(messageSelectors[0], { timeout: 5000 });
    await messageInput.fill(CONFIG.agent.repairServicesInstructions);
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(8000);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'step4-repair-instructions.png'),
      fullPage: true 
    });
    
    // Step 5: Replacement procedures instructions
    console.log('🔄 Adding replacement procedures instructions...');
    await page.waitForTimeout(3000);
    
    messageInput = await page.waitForSelector(messageSelectors[0], { timeout: 5000 });
    await messageInput.fill(CONFIG.agent.replacementInstructions);
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(8000);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'step5-replacement-instructions.png'),
      fullPage: true 
    });
    
    // Step 6: Add knowledge sources
    console.log('📚 Adding knowledge sources...');
    await page.waitForTimeout(3000);
    
    const knowledgeSourcesText = `Yes, I would like to add the following knowledge sources to ${CONFIG.agent.name}:\n` +
      CONFIG.agent.knowledgeSources.map((url, i) => `${i+1}. ${url}`).join('\n');
    
    messageInput = await page.waitForSelector(messageSelectors[0], { timeout: 5000 });
    await messageInput.fill(knowledgeSourcesText);
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(10000);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'step6-knowledge-sources.png'),
      fullPage: true 
    });
    
  } catch (error) {
    console.error(`❌ Error creating agent: ${error.message}`);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'agent-creation-error.png'),
      fullPage: true 
    });
    throw error;
  }
}

async function confirmKnowledgeSourcesAndConfigure(page) {
  console.log('✅ Confirming knowledge sources and configuring agent...');
  
  try {
    // Wait for knowledge sources to be processed
    await page.waitForTimeout(5000);
    
    // Look for checkboxes to confirm ownership
    const checkboxes = await page.$$('input[type="checkbox"]');
    console.log(`📋 Found ${checkboxes.length} checkboxes for knowledge source confirmation`);
    
    for (let i = 0; i < checkboxes.length; i++) {
      try {
        await checkboxes[i].check();
        console.log(`✅ Checked checkbox ${i + 1}`);
      } catch (e) {
        console.log(`⚠️ Could not check checkbox ${i + 1}: ${e.message}`);
      }
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'knowledge-sources-confirmed.png'),
      fullPage: true 
    });
    
    // Look for "Skip to configure" or similar button
    const configureSelectors = [
      'button:has-text("Skip to configure")',
      'button:has-text("Configure")',
      'button:has-text("Continue")',
      'button:has-text("Next")',
      '[data-testid="skip-to-configure"]',
      '[data-testid="configure-button"]'
    ];
    
    let configureButton = null;
    for (const selector of configureSelectors) {
      try {
        configureButton = await page.waitForSelector(selector, { timeout: 3000 });
        if (configureButton) {
          console.log(`✅ Found configure button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (configureButton) {
      await configureButton.click();
      console.log('🔧 Clicked configure button');
      await page.waitForTimeout(5000);
    }
    
    // Take final configuration screenshot
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'agent-configured.png'),
      fullPage: true 
    });
    
    console.log(`✅ ${CONFIG.agent.name} created and configured successfully!`);
    
  } catch (error) {
    console.error(`❌ Error confirming knowledge sources: ${error.message}`);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'configuration-error.png'),
      fullPage: true 
    });
    throw error;
  }
}

async function testAgent(page) {
  console.log('🧪 Testing WarrantyBot agent...');
  
  try {
    // Look for test button
    const testSelectors = [
      'button:has-text("Test")',
      '[data-testid="test-button"]',
      '[aria-label="Test"]',
      '.test-button'
    ];
    
    let testButton = null;
    for (const selector of testSelectors) {
      try {
        testButton = await page.waitForSelector(selector, { timeout: 3000 });
        if (testButton) {
          console.log(`✅ Found test button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (testButton) {
      await testButton.click();
      console.log('🧪 Opened test interface');
      await page.waitForTimeout(3000);
    }
    
    // Test scenarios
    const testScenarios = [
      "My laptop is only 6 months old but the screen is flickering. Is this covered under warranty?",
      "I need to troubleshoot my graphics card - it's showing artifacts on the screen",
      "How do I file a warranty claim for my defective SSD?",
      "I need a replacement for my business server that failed - what are my options?"
    ];
    
    for (let i = 0; i < testScenarios.length; i++) {
      try {
        console.log(`🔍 Testing scenario ${i + 1}: ${testScenarios[i].substring(0, 50)}...`);
        
        // Find test message input
        const testMessageInput = await page.waitForSelector('textarea, input[type="text"]', { timeout: 5000 });
        await testMessageInput.fill(testScenarios[i]);
        await page.keyboard.press('Enter');
        
        // Wait for response
        await page.waitForTimeout(8000);
        
        await page.screenshot({ 
          path: path.join(CONFIG.screenshotsDir, `test-scenario-${i + 1}.png`),
          fullPage: true 
        });
        
      } catch (e) {
        console.log(`⚠️ Could not complete test scenario ${i + 1}: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error testing agent: ${error.message}`);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'testing-error.png'),
      fullPage: true 
    });
  }
}

async function main() {
  let browser, page;
  
  try {
    console.log('🚀 Starting WarrantyBot creation process...');
    
    // Step 1: Create directories
    await createDirectories();
    
    // Step 2: Launch browser and connect
    ({ browser, page } = await launchBrowserAndConnect());
    
    // Step 3: Wait for authentication
    await waitForAuthentication(page);
    
    // Step 4: Navigate to agent creation
    await navigateToAgentCreation(page);
    
    // Step 5: Create the warranty agent
    await createWarrantyAgent(page);
    
    // Step 6: Confirm knowledge sources and configure
    await confirmKnowledgeSourcesAndConfigure(page);
    
    // Step 7: Test the agent
    await testAgent(page);
    
    console.log('\n🎉 WarrantyBot creation completed successfully!');
    console.log('📸 Screenshots saved to:', CONFIG.screenshotsDir);
    console.log('🌐 Browser will remain open for manual testing and review');
    console.log('\n🔍 Review the agent configuration and test responses before publishing');
    
    // Create summary report
    const summaryReport = `
# WarrantyBot Creation Summary

## Agent Details
- **Name**: ${CONFIG.agent.name}
- **Purpose**: ${CONFIG.agent.description}
- **Created**: ${new Date().toISOString()}

## Knowledge Sources Added
${CONFIG.agent.knowledgeSources.map(source => `- ${source}`).join('\n')}

## Screenshots Location
${CONFIG.screenshotsDir}

## Next Steps
1. Review agent responses in test interface
2. Refine instructions if needed
3. Publish agent when satisfied
4. Configure deployment channels

---
*Thought into existence by Darbot*
`;
    
    await fs.writeFile(
      path.join(CONFIG.screenshotsDir, 'creation-summary.md'), 
      summaryReport
    );
    
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error('Stack trace:', error.stack);
    
    if (page) {
      await page.screenshot({ 
        path: path.join(CONFIG.screenshotsDir, 'fatal-error.png'),
        fullPage: true 
      });
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Graceful shutdown requested...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Graceful shutdown requested...');
  process.exit(0);
});

// Start the process
main();
