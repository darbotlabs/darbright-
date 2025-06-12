// Thought into existence by Darbot
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Launching Edge and analyzing Copilot Studio...');
    
    // Define paths - now relative to the script location
    const scriptDir = __dirname;
    const screenshotsPath = path.join(scriptDir, 'screenshots');
    const analysisPath = path.join(scriptDir, 'analysis');
    
    // Ensure directories exist
    if (!fs.existsSync(screenshotsPath)) {
      fs.mkdirSync(screenshotsPath, { recursive: true });
    }
    if (!fs.existsSync(analysisPath)) {
      fs.mkdirSync(analysisPath, { recursive: true });
    }
    
    console.log('📁 Directory structure ready');
    console.log(`  Screenshots: ${screenshotsPath}`);
    console.log(`  Analysis: ${analysisPath}`);
      // Launch Edge with remote debugging (using PowerShell)
    console.log('\n🌐 Launching Microsoft Edge with specific environment...');
    const { exec } = require('child_process');
    
    exec('Start-Process msedge -ArgumentList "--remote-debugging-port=9222", "--new-window", "https://copilotstudio.preview.microsoft.com/environments/06fb643a-997d-e9bb-b88d-edf30effd212/home"', { shell: 'powershell.exe' });
      // Wait longer for Edge to start and page to load
    console.log('⏳ Waiting for Edge to launch and page to load...');
    await new Promise(resolve => setTimeout(resolve, 20000)); // Increased wait time to 20 seconds
    
    // Connect to Edge via CDP
    console.log('🔗 Connecting to Edge via CDP...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
      if (contexts.length > 0) {
      const pages = contexts[0].pages();
      let targetPage = pages.find(p => p.url().includes('copilotstudio')) || pages[0];
      
      // Explicitly navigate to the desired URL
      const desiredUrl = "https://copilotstudio.preview.microsoft.com/environments/06fb643a-997d-e9bb-b88d-edf30effd212/home";
      console.log(`\n🔄 Navigating to: ${desiredUrl}`);
      await targetPage.goto(desiredUrl, { timeout: 60000, waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 5000)); // Give it a moment after navigation
      
      console.log(`\n📄 Analyzing: ${targetPage.url()}`);
      
      // Wait for page to fully load
      try {
        await targetPage.waitForLoadState('networkidle', { timeout: 10000 });
      } catch (e) {
        console.log('⚠️  Page still loading, continuing analysis...');
      }
      
      // Capture screenshots
      console.log('\n📸 Capturing screenshots...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');      // Full page screenshot
      const fullPagePath = path.join(screenshotsPath, `copilot-studio-full-${timestamp}.png`);
      try {
        await targetPage.screenshot({ 
          path: fullPagePath, 
          fullPage: true,
          timeout: 60000 // Increase timeout to 60 seconds
        });
        console.log(`✅ Full page: ${path.basename(fullPagePath)}`);
      } catch (screenshotError) {
        console.error(`❌ Error taking full page screenshot: ${screenshotError.message}`);
        // Try to take a screenshot of just the viewport if full page fails
        try {
          await targetPage.screenshot({ 
            path: fullPagePath, 
            fullPage: false,
            timeout: 30000
          });
          console.log(`✅ Fallback viewport screenshot saved: ${path.basename(fullPagePath)}`);
        } catch (fallbackError) {
          console.error(`❌ Fallback screenshot also failed: ${fallbackError.message}`);
        }
      }
        // Viewport screenshot
      const viewportPath = path.join(screenshotsPath, `copilot-studio-viewport-${timestamp}.png`);
      try {
        await targetPage.screenshot({ 
          path: viewportPath, 
          fullPage: false,
          timeout: 30000
        });
        console.log(`✅ Viewport: ${path.basename(viewportPath)}`);
      } catch (viewportError) {
        console.error(`❌ Error taking viewport screenshot: ${viewportError.message}`);
      }
      
      // Enhanced UI Analysis
      console.log('\n🔍 === COPILOT STUDIO UI ANALYSIS ===');
      
      const analysisData = {
        timestamp: new Date().toISOString(),
        url: targetPage.url(),
        title: await targetPage.title(),
        analysis: {}
      };
      
      // Get page title and URL
      console.log(`📄 Page Title: ${analysisData.title}`);
      console.log(`🔗 URL: ${analysisData.url}`);
      
      // Find main headings
      const headings = await targetPage.locator('h1, h2, h3').allTextContents();
      analysisData.analysis.headings = headings;
      console.log(`\n📝 Main Headings (${headings.length}):`);
      headings.forEach((heading, index) => {
        console.log(`  ${index + 1}. ${heading.trim()}`);
      });
      
      // Get interactive elements
      const interactiveElements = await targetPage.evaluate(() => {
        const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]');
        return Array.from(elements).map(el => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 50) || '',
          type: el.type || '',
          role: el.getAttribute('role') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          visible: el.offsetParent !== null
        })).filter(el => el.visible && (el.text || el.ariaLabel));
      });
      
      analysisData.analysis.interactiveElements = interactiveElements;
      console.log(`\n🔘 Interactive Elements (${interactiveElements.length} total):`);
      interactiveElements.slice(0, 10).forEach((el, index) => {
        const identifier = el.text || el.ariaLabel;
        console.log(`  ${index + 1}. ${el.tag.toUpperCase()}: "${identifier}" ${el.role ? `[${el.role}]` : ''}`);
      });
      
      // Navigation structure
      const navigationStructure = await targetPage.evaluate(() => {
        const navs = document.querySelectorAll('nav, [role="navigation"], [class*="nav"]');
        return Array.from(navs).map(nav => ({
          text: nav.textContent?.trim().substring(0, 100) || '',
          childCount: nav.children.length,
          role: nav.getAttribute('role') || nav.tagName.toLowerCase()
        }));
      });
      
      analysisData.analysis.navigation = navigationStructure;
      console.log(`\n🧭 Navigation (${navigationStructure.length} sections):`);
      navigationStructure.forEach((nav, index) => {
        console.log(`  ${index + 1}. ${nav.role}: ${nav.childCount} items`);
      });
      
      // Form elements
      const formElements = await targetPage.evaluate(() => {
        const inputs = document.querySelectorAll('input, textarea, select');
        return Array.from(inputs).map(input => ({
          type: input.type || input.tagName.toLowerCase(),
          placeholder: input.placeholder || '',
          name: input.name || '',
          required: input.required,
          visible: input.offsetParent !== null
        })).filter(el => el.visible);
      });
      
      analysisData.analysis.forms = formElements;
      console.log(`\n📝 Form Elements (${formElements.length}):`);
      formElements.forEach((form, index) => {
        const identifier = form.placeholder || form.name || form.type;
        console.log(`  ${index + 1}. ${form.type.toUpperCase()}: "${identifier}" ${form.required ? '[REQUIRED]' : ''}`);
      });
      
      // Copilot-specific patterns
      const agentElements = await targetPage.locator(':has-text("agent"), :has-text("bot"), :has-text("copilot")').count();
      const createElements = await targetPage.locator('button:has-text("Create"), button:has-text("Build"), button:has-text("New")').allTextContents();
      const microsoftElements = await targetPage.locator('[alt*="Microsoft" i], [title*="Microsoft" i], :has-text("Microsoft")').count();
      
      analysisData.analysis.copilotSpecific = {
        agentElements,
        createButtons: createElements,
        microsoftBranding: microsoftElements
      };
      
      console.log(`\n🤖 Copilot Studio Specific:`);
      console.log(`  Agent/Bot elements: ${agentElements}`);
      console.log(`  Create buttons: ${createElements.length}`);
      console.log(`  Microsoft branding: ${microsoftElements}`);
      
      // Performance metrics
      const performanceMetrics = await targetPage.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart) : 0,
          loadComplete: navigation ? Math.round(navigation.loadEventEnd - navigation.navigationStart) : 0,
          firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0
        };
      });
      
      analysisData.analysis.performance = performanceMetrics;
      console.log(`\n⚡ Performance:`);
      console.log(`  DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
      console.log(`  Page Load Complete: ${performanceMetrics.loadComplete}ms`);
      console.log(`  First Paint: ${Math.round(performanceMetrics.firstPaint)}ms`);
      
      // Save detailed analysis
      const analysisReportPath = path.join(analysisPath, `ui-analysis-${timestamp}.json`);
      fs.writeFileSync(analysisReportPath, JSON.stringify(analysisData, null, 2));
      
      // Create markdown report
      const markdownReport = `# Copilot Studio UI Analysis Report
## Generated: ${new Date().toLocaleString()}

### Page Information
- **Title:** ${analysisData.title}
- **URL:** ${analysisData.url}

### Main Headings
${headings.map((h, i) => `${i + 1}. ${h.trim()}`).join('\n')}

### Interactive Elements Summary
- Total: ${interactiveElements.length}
- Top elements: ${interactiveElements.slice(0, 5).map(el => el.text || el.ariaLabel).join(', ')}

### Copilot Studio Features
- Agent/Bot elements: ${agentElements}
- Create functionality: ${createElements.length} buttons
- Microsoft branding: ${microsoftElements} elements

### Performance Metrics
- DOM Load: ${performanceMetrics.domContentLoaded}ms
- Full Load: ${performanceMetrics.loadComplete}ms
- First Paint: ${Math.round(performanceMetrics.firstPaint)}ms

### Screenshots
- Full page: \`${path.basename(fullPagePath)}\`
- Viewport: \`${path.basename(viewportPath)}\`

---
*Analysis generated by Playwright automation*  
*Thought into existence by Darbot* 🤖
`;
      
      const markdownReportPath = path.join(analysisPath, `ui-analysis-${timestamp}.md`);
      fs.writeFileSync(markdownReportPath, markdownReport);
      
      console.log(`\n✅ Analysis Complete!`);
      console.log(`📊 JSON Report: ${path.basename(analysisReportPath)}`);
      console.log(`📄 Markdown Report: ${path.basename(markdownReportPath)}`);
      console.log(`📁 All files saved to: ${scriptDir}`);
      
    } else {
      console.log('❌ No browser contexts found');
    }
    
    // Keep browser open for additional testing
    console.log('\n🔗 Browser remains open for further testing...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
      // === Begin: Automated UI Input Completion for Inventory Management Agent ===
      console.log('\n📝 Attempting to fill all visible input fields, textareas, and selects for Inventory Management Agent...');
      // Inventory Management Agent details
      const inventoryAgentData = {
        name: 'InventoryManager',
        description: 'manages product inventory, tracks stock levels, and generates restock alerts',
        instructions: {
          stock: 'For stock inquiries, display current inventory levels, highlight low-stock items, and provide restock recommendations.',
          add: 'For adding inventory, collect product name, SKU, quantity, and location. Confirm addition and update records.',
          remove: 'For removing inventory, verify product and quantity, check for sufficient stock, and update records accordingly.'
        },
        knowledgeSources: [
          'https://inventory.example.com',
          'https://docs.inventory.example.com'
        ]
      };
      // Step 1: Find and click the "Create" tab/button
      try {
        const createButton = await targetPage.locator('text=Create, button:has-text("Create")').first();
        if (await createButton.isVisible()) {
          await createButton.click();
          console.log('✅ Clicked Create tab/button');
        }
      } catch (e) { console.log('⚠️ Could not click Create tab/button:', e.message); }
      // Step 2: Click "New agent"
      try {
        const newAgentButton = await targetPage.locator('text=New agent, button:has-text("New agent")').first();
        if (await newAgentButton.isVisible()) {
          await newAgentButton.click();
          console.log('✅ Clicked New agent');
        }
      } catch (e) { console.log('⚠️ Could not click New agent:', e.message); }
      // Step 3: Fill agent name and description
      try {
        await targetPage.waitForSelector('textarea[placeholder="Type your message"]', { timeout: 10000 });
        const initialDescription = `I want to create an agent named '${inventoryAgentData.name}' that ${inventoryAgentData.description}`;
        await targetPage.fill('textarea[placeholder="Type your message"]', initialDescription);
        await targetPage.press('textarea[placeholder="Type your message"]', 'Enter');
        console.log('✅ Sent initial description');
      } catch (e) { console.log('⚠️ Could not fill initial description:', e.message); }
      // Step 4: Add detailed instructions
      for (const [functionName, instruction] of Object.entries(inventoryAgentData.instructions)) {
        try {
          await targetPage.waitForTimeout(2000);
          await targetPage.fill('textarea[placeholder="Type your message"]', instruction);
          await targetPage.press('textarea[placeholder="Type your message"]', 'Enter');
          console.log(`✅ Added instructions for ${functionName}`);
        } catch (e) { console.log(`⚠️ Could not add instructions for ${functionName}:`, e.message); }
      }
      // Step 5: Add knowledge sources
      try {
        await targetPage.waitForTimeout(2000);
        const knowledgeSourcesText = `Yes, I would like to add these knowledge sources:\n` +
          inventoryAgentData.knowledgeSources.map((url, i) => `${i+1}. ${url}`).join('\n');
        await targetPage.fill('textarea[placeholder="Type your message"]', knowledgeSourcesText);
        await targetPage.press('textarea[placeholder="Type your message"]', 'Enter');
        console.log('✅ Added knowledge sources');
      } catch (e) { console.log('⚠️ Could not add knowledge sources:', e.message); }
      // Step 6: Confirm ownership (check all checkboxes if present)
      try {
        await targetPage.waitForTimeout(3000);
        const checkboxes = await targetPage.$$('input[type="checkbox"]');
        for (const checkbox of checkboxes) {
          await checkbox.check();
        }
        if (checkboxes.length > 0) console.log('✅ Confirmed knowledge source ownership');
      } catch (e) { console.log('⚠️ Could not confirm knowledge source ownership:', e.message); }
      // Step 7: Skip to configure
      try {
        const skipButton = await targetPage.locator('button:has-text("Skip to configure")').first();
        if (await skipButton.isVisible()) {
          await skipButton.click();
          console.log('✅ Navigated to configuration');
        }
      } catch (e) { console.log('⚠️ Could not click Skip to configure:', e.message); }
      // Step 8: Take final screenshot
      try {
        const finalScreenshotPath = path.join(screenshotsPath, `inventory-agent-configured-${timestamp}.png`);
        await targetPage.screenshot({ path: finalScreenshotPath, fullPage: true });
        console.log(`✅ Final screenshot saved: ${path.basename(finalScreenshotPath)}`);
      } catch (e) { console.log('⚠️ Could not take final screenshot:', e.message); }
      // === End: Automated UI Input Completion for Inventory Management Agent ===
