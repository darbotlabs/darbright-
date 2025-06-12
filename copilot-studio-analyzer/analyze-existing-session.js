// Thought into existence by Darbot
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    console.log('🔍 MCP Direct Analysis - Connecting to existing Edge session...');
    
    // Define paths - relative to the script location
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

    // Connect directly to Edge via CDP without launching a new instance
    console.log('🔗 Connecting to Edge via CDP...');
    try {
      const browser = await chromium.connectOverCDP('http://localhost:9223');
      console.log('✅ Connected to browser!');
      
      const contexts = browser.contexts();
      
      if (contexts.length > 0) {
        console.log(`Found ${contexts.length} browser context(s)`);
        const pages = contexts[0].pages();
        console.log(`Found ${pages.length} page(s) in first context`);
        
        // Print all open pages
        console.log('\n📄 Open Pages:');
        for (let i = 0; i < pages.length; i++) {
          console.log(`  ${i+1}. ${pages[i].url()}`);
        }
        
        // Select the Copilot Studio page if available
        let targetPage = pages.find(p => p.url().includes('copilotstudio'));
        if (!targetPage) {
          console.log('❌ No Copilot Studio page found. Using first page instead.');
          targetPage = pages[0];
        }
        
        console.log(`\n🔍 Analyzing: ${targetPage.url()}`);
        
        // Capture timestamp for filenames
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Take screenshot with error handling
        try {
          const fullPagePath = path.join(screenshotsPath, `mcp-direct-full-${timestamp}.png`);
          await targetPage.screenshot({ 
            path: fullPagePath,
            fullPage: true,
            timeout: 60000
          });
          console.log(`✅ Full page screenshot: ${path.basename(fullPagePath)}`);
        } catch (screenshotError) {
          console.error(`❌ Error taking full page screenshot: ${screenshotError.message}`);
          // Try viewport screenshot as fallback
          try {
            const viewportPath = path.join(screenshotsPath, `mcp-direct-viewport-${timestamp}.png`);
            await targetPage.screenshot({ 
              path: viewportPath,
              fullPage: false,
              timeout: 30000
            });
            console.log(`✅ Viewport screenshot: ${path.basename(viewportPath)}`);
          } catch (fallbackError) {
            console.error(`❌ Fallback screenshot also failed: ${fallbackError.message}`);
          }
        }
        
        // Begin UI analysis
        console.log('\n🔍 === DIRECT MCP UI ANALYSIS ===');
        
        const analysisData = {
          timestamp: new Date().toISOString(),
          url: targetPage.url(),
          title: await targetPage.title(),
          analysis: {}
        };
        
        // Get page title and URL
        console.log(`📄 Page Title: ${analysisData.title}`);
        console.log(`🔗 URL: ${analysisData.url()}`);
        
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
        interactiveElements.slice(0, 15).forEach((el, index) => {
          const identifier = el.text || el.ariaLabel;
          console.log(`  ${index + 1}. ${el.tag.toUpperCase()}: "${identifier}" ${el.role ? `[${el.role}]` : ''}`);
        });
        
        // Copilot-specific analysis
        console.log(`\n🤖 Copilot Studio Element Analysis:`);
        
        // Check for common Copilot Studio UI elements to determine what screen we're on
        const agentElements = await targetPage.locator(':has-text("agent"), :has-text("bot"), :has-text("copilot")').count();
        const createElements = await targetPage.locator('button:has-text("Create"), button:has-text("Build"), button:has-text("New")').allTextContents();
        const environmentSelector = await targetPage.locator('[aria-label="Environment selector"]').count();
        const editModeToggle = await targetPage.locator('[aria-label="Edit mode"]').count();
        const testChatButton = await targetPage.locator('button:has-text("Test chat")').count();
        
        console.log(`- Agent/Bot elements: ${agentElements}`);
        console.log(`- Create/Build buttons: ${createElements.length}`);
        console.log(`- Environment selector: ${environmentSelector > 0 ? 'Present' : 'Not found'}`);
        console.log(`- Edit mode toggle: ${editModeToggle > 0 ? 'Present' : 'Not found'}`);
        console.log(`- Test chat button: ${testChatButton > 0 ? 'Present' : 'Not found'}`);
        
        // Determine what part of Copilot Studio we're in
        let currentSection = "Unknown";
        if (targetPage.url().includes('/home')) {
          currentSection = "Home";
        } else if (targetPage.url().includes('/agents/')) {
          currentSection = "Agent Details";
        } else if (targetPage.url().includes('/create/')) {
          currentSection = "Create New Agent";
        } else if (targetPage.url().includes('/flows')) {
          currentSection = "Flows";
        } else if (targetPage.url().includes('/knowledge')) {
          currentSection = "Knowledge Base";
        }
        
        console.log(`\n📍 Current Copilot Studio Section: ${currentSection}`);
        
        // Save detailed analysis to JSON
        const analysisReportPath = path.join(analysisPath, `mcp-direct-analysis-${timestamp}.json`);
        fs.writeFileSync(analysisReportPath, JSON.stringify(analysisData, null, 2));
        
        console.log(`\n✅ Analysis Complete!`);
        console.log(`📊 JSON Report: ${path.basename(analysisReportPath)}`);
        
        // Keep browser connection open for manual interaction
        console.log('\n🔗 Browser connection remains open for further interaction...');
        console.log('📌 Press Ctrl+C to disconnect when done.\n');
        
      } else {
        console.error('❌ No browser contexts found! Make sure Edge is running with remote debugging enabled.');
      }
    } catch (cdpError) {
      console.error(`❌ CDP Connection Error: ${cdpError.message}`);
      console.log('\n⚠️ Please make sure Edge is running with remote debugging enabled.');
      console.log('Run this command in PowerShell to launch Edge correctly:');
      console.log('Start-Process msedge -ArgumentList "--remote-debugging-port=9222", "--new-window", "https://copilotstudio.microsoft.com"');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
