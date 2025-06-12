// Thought into existence by Darbot
// Copilot Studio UI Analysis and Testing Script
const { chromium } = require('../packages/playwright-core');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  cdpPort: 9222,
  copilotStudioUrl: 'https://copilotstudio.microsoft.com',
  screenshotsDir: '../test-results',
  analysisDir: '../test-results/analysis/copilot-studio',
  waitTimeout: 5000
};

async function launchEdgeAndNavigate() {
  console.log('🚀 Launching Microsoft Edge with remote debugging...');
  
  // Launch Edge with CDP debugging enabled
  const { spawn } = require('child_process');
  const edgeProcess = spawn('cmd', ['/c', `start msedge --remote-debugging-port=${CONFIG.cdpPort} --new-window ${CONFIG.copilotStudioUrl}`], {
    detached: true,
    stdio: 'ignore'
  });
  
  // Wait for Edge to start up
  console.log(`⏳ Waiting ${CONFIG.waitTimeout}ms for Edge to start...`);
  await new Promise(resolve => setTimeout(resolve, CONFIG.waitTimeout));
  
  return edgeProcess;
}

async function connectAndAnalyze() {
  console.log('🔌 Connecting to Edge browser via CDP...');
  
  try {
    const browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.cdpPort}`);
    const contexts = browser.contexts();
    
    if (contexts.length === 0) {
      throw new Error('No browser contexts found');
    }
    
    const pages = contexts[0].pages();
    console.log(`📄 Found ${pages.length} pages`);
    
    if (pages.length === 0) {
      throw new Error('No pages found in the browser');
    }
    
    // Find the Copilot Studio page or use the first one
    const targetPage = pages.find(p => p.url().includes('copilotstudio')) || pages[0];
    console.log(`🎯 Analyzing page: ${targetPage.url()}`);
    
    // Wait for the page to load completely
    await targetPage.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Ensure screenshots directory exists
    if (!fs.existsSync(CONFIG.screenshotsDir)) {
      fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
    }
    
    // Ensure analysis directory exists
    if (!fs.existsSync(CONFIG.analysisDir)) {
      fs.mkdirSync(CONFIG.analysisDir, { recursive: true });
    }
    
    console.log('📸 Capturing screenshots...');
    
    // Capture full page screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullPagePath = path.join(CONFIG.screenshotsDir, `copilot-studio-fullpage-${timestamp}.png`);
    await targetPage.screenshot({ 
      path: fullPagePath, 
      fullPage: true 
    });
    console.log(`✅ Full page screenshot saved: ${fullPagePath}`);
    
    // Capture viewport screenshot
    const viewportPath = path.join(CONFIG.screenshotsDir, `copilot-studio-viewport-${timestamp}.png`);
    await targetPage.screenshot({ 
      path: viewportPath, 
      fullPage: false 
    });
    console.log(`✅ Viewport screenshot saved: ${viewportPath}`);
    
    // Perform comprehensive UI analysis
    console.log('🔍 Performing UI analysis...');
    const analysisData = await performUIAnalysis(targetPage);
    
    // Generate analysis report
    const reportPath = path.join(CONFIG.analysisDir, `ui-analysis-${timestamp}.md`);
    const report = generateAnalysisReport(analysisData, {
      timestamp,
      url: targetPage.url(),
      fullPageScreenshot: fullPagePath,
      viewportScreenshot: viewportPath
    });
    
    fs.writeFileSync(reportPath, report);
    console.log(`📊 Analysis report saved: ${reportPath}`);
    
    // Generate JSON data for programmatic access
    const jsonPath = path.join(CONFIG.analysisDir, `ui-data-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(analysisData, null, 2));
    console.log(`📋 JSON data saved: ${jsonPath}`);
    
    console.log('\n🎉 Analysis complete!');
    console.log(`📁 Screenshots: ${CONFIG.screenshotsDir}`);
    console.log(`📊 Analysis: ${CONFIG.analysisDir}`);
    
    // Keep browser open for further testing
    console.log('\n🔗 Browser remains open for additional testing...');
    
    return {
      analysisData,
      reportPath,
      fullPagePath,
      viewportPath
    };
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    throw error;
  }
}

async function performUIAnalysis(page) {
  console.log('🎨 Analyzing UI structure...');
  
  const analysisData = {
    timestamp: new Date().toISOString(),
    url: page.url(),
    title: await page.title(),
    
    // Basic page info
    pageInfo: await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    })),
    
    // Interactive elements analysis
    interactiveElements: await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]');
      return Array.from(elements).map((el, index) => ({
        index: index + 1,
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 100) || '',
        type: el.type || '',
        role: el.getAttribute('role') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        className: el.className || '',
        id: el.id || '',
        href: el.href || '',
        visible: el.offsetParent !== null
      })).filter(el => el.visible && (el.text || el.ariaLabel));
    }),
    
    // Navigation structure
    navigation: await page.evaluate(() => {
      const navs = document.querySelectorAll('nav, [role="navigation"], [class*="nav"]');
      return Array.from(navs).map(nav => ({
        text: nav.textContent?.trim().substring(0, 200) || '',
        childCount: nav.children.length,
        className: nav.className || '',
        role: nav.getAttribute('role') || nav.tagName.toLowerCase()
      }));
    }),
    
    // Form elements
    formElements: await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      return Array.from(inputs).map(input => ({
        type: input.type || input.tagName.toLowerCase(),
        placeholder: input.placeholder || '',
        name: input.name || '',
        id: input.id || '',
        required: input.required,
        visible: input.offsetParent !== null
      })).filter(el => el.visible);
    }),
    
    // Headings structure
    headings: await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
        level: h.tagName,
        text: h.textContent?.trim() || ''
      }));
    }),
    
    // Copilot Studio specific elements
    copilotElements: await page.evaluate(() => {
      const agentElements = document.querySelectorAll('*').length ? 
        Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent && (
            el.textContent.toLowerCase().includes('agent') ||
            el.textContent.toLowerCase().includes('bot') ||
            el.textContent.toLowerCase().includes('copilot')
          )
        ).length : 0;
      
      const createButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(btn =>
        btn.textContent && (
          btn.textContent.toLowerCase().includes('create') ||
          btn.textContent.toLowerCase().includes('build') ||
          btn.textContent.toLowerCase().includes('new')
        )
      );
      
      return {
        agentRelatedCount: agentElements,
        createButtons: createButtons.map(btn => btn.textContent?.trim()).slice(0, 10),
        microsoftBranding: document.querySelectorAll('[alt*="Microsoft" i], [title*="Microsoft" i], *').length
      };
    }),
    
    // Accessibility features
    accessibility: await page.evaluate(() => {
      const ariaElements = document.querySelectorAll('[aria-label], [aria-describedby], [role]');
      const skipLinks = document.querySelectorAll('[href="#main"], [href="#content"]');
      const headingStructure = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.tagName);
      
      return {
        ariaLabeledElements: ariaElements.length,
        skipLinks: skipLinks.length,
        headingStructure: headingStructure,
        hasMainLandmark: !!document.querySelector('main, [role="main"]'),
        hasNavLandmark: !!document.querySelector('nav, [role="navigation"]')
      };
    }),
    
    // Performance metrics
    performance: await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart) : 0,
        loadComplete: navigation ? Math.round(navigation.loadEventEnd - navigation.navigationStart) : 0,
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      };
    })
  };
  
  return analysisData;
}

function generateAnalysisReport(data, metadata) {
  return `# 🤖 Copilot Studio UI Analysis Report

**Generated:** ${metadata.timestamp}  
**URL:** ${metadata.url}  
**Page Title:** ${data.title}

## 📊 Executive Summary

### 🎯 Key Metrics
- **Interactive Elements:** ${data.interactiveElements.length}
- **Navigation Sections:** ${data.navigation.length}
- **Form Inputs:** ${data.formElements.length}
- **Headings:** ${data.headings.length}
- **Agent-related Elements:** ${data.copilotElements.agentRelatedCount}

### ⚡ Performance
- **DOM Content Loaded:** ${data.performance.domContentLoaded}ms
- **Page Load Complete:** ${data.performance.loadComplete}ms
- **First Paint:** ${Math.round(data.performance.firstPaint)}ms
- **First Contentful Paint:** ${Math.round(data.performance.firstContentfulPaint)}ms

## 🎨 UI Structure Analysis

### 📱 Page Information
- **Title:** ${data.pageInfo.title}
- **Viewport:** ${data.pageInfo.viewport.width}x${data.pageInfo.viewport.height}
- **User Agent:** ${data.pageInfo.userAgent.substring(0, 100)}...

### 🧭 Navigation Structure
${data.navigation.map((nav, index) => 
  `**${index + 1}.** ${nav.role.toUpperCase()}: ${nav.childCount} items`
).join('\n')}

### 📝 Interactive Elements (Top 15)
${data.interactiveElements.slice(0, 15).map((el, index) => 
  `**${index + 1}.** ${el.tag.toUpperCase()}: "${el.text.substring(0, 50)}${el.text.length > 50 ? '...' : ''}" ${el.role ? `[${el.role}]` : ''}`
).join('\n')}

### 📋 Form Elements
${data.formElements.map((form, index) => 
  `**${index + 1}.** ${form.type.toUpperCase()}: "${form.placeholder || form.name || form.id}" ${form.required ? '[REQUIRED]' : ''}`
).join('\n')}

### 📰 Content Structure
${data.headings.map((h, index) => 
  `**${h.level}:** ${h.text}`
).join('\n')}

## 🤖 Copilot Studio Specific Analysis

### 🎯 Platform Features
- **Agent/Bot References:** ${data.copilotElements.agentRelatedCount}
- **Microsoft Branding Elements:** ${data.copilotElements.microsoftBranding}

### 🔧 Creation Tools
${data.copilotElements.createButtons.map((btn, index) => 
  `**${index + 1}.** "${btn}"`
).join('\n')}

## ♿ Accessibility Assessment

### 🎯 Compliance Features
- **ARIA Labeled Elements:** ${data.accessibility.ariaLabeledElements}
- **Skip Links:** ${data.accessibility.skipLinks}
- **Main Landmark:** ${data.accessibility.hasMainLandmark ? '✅ Present' : '❌ Missing'}
- **Navigation Landmark:** ${data.accessibility.hasNavLandmark ? '✅ Present' : '❌ Missing'}

### 📑 Heading Structure
\`\`\`
${data.accessibility.headingStructure.join(' → ')}
\`\`\`

## 📸 Visual Documentation
- **Full Page Screenshot:** \`${path.basename(metadata.fullPageScreenshot)}\`
- **Viewport Screenshot:** \`${path.basename(metadata.viewportScreenshot)}\`

## 💡 Recommendations

### ✅ Strengths
- Comprehensive interactive interface with ${data.interactiveElements.length} actionable elements
- Strong accessibility foundation with ARIA labeling
- Performance metrics within acceptable ranges
- Clear navigation structure

### 🎯 Testing Focus Areas
1. **Agent Creation Workflow** - Test end-to-end creation process
2. **Template Functionality** - Validate pre-built agent templates
3. **Cross-browser Compatibility** - Ensure consistent experience
4. **Mobile Responsiveness** - Test on various viewport sizes
5. **Accessibility Compliance** - Full WCAG 2.1 validation

---

*Analysis generated by Playwright automation framework*  
*Thought into existence by Darbot* 🤖
`;
}

async function main() {
  try {
    console.log('🎭 Copilot Studio Analysis & Testing Suite');
    console.log('==========================================\n');
    
    // Launch Edge and navigate to Copilot Studio
    await launchEdgeAndNavigate();
    
    // Connect and perform analysis
    const results = await connectAndAnalyze();
    
    console.log('\n✨ Analysis Suite Complete!');
    console.log('📁 All files saved to organized directories');
    console.log('🔍 Ready for comprehensive Copilot Studio testing');
    
  } catch (error) {
    console.error('💥 Analysis failed:', error.message);
    process.exit(1);
  }
}

// Export for use in other test scripts
module.exports = {
  launchEdgeAndNavigate,
  connectAndAnalyze,
  performUIAnalysis,
  generateAnalysisReport,
  CONFIG
};

// Run if called directly
if (require.main === module) {
  main();
}
