// Thought into existence by Darbot
const { chromium } = require('./packages/playwright-core');

(async () => {
  try {
    console.log('🔍 Performing detailed Copilot Studio UI Analysis...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    
    if (contexts.length > 0) {
      const pages = contexts[0].pages();
      const targetPage = pages.find(p => p.url().includes('copilotstudio')) || pages[0];
      
      console.log(`\n📄 Analyzing: ${targetPage.url()}`);
      await targetPage.waitForLoadState('networkidle');
      
      // Enhanced UI Analysis
      console.log('\n🎨 === DETAILED UI STRUCTURE ANALYSIS ===');
      
      // Get all interactive elements with their properties
      const interactiveElements = await targetPage.evaluate(() => {
        const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]');
        return Array.from(elements).map(el => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 50) || '',
          type: el.type || '',
          role: el.getAttribute('role') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          className: el.className || '',
          id: el.id || '',
          href: el.href || '',
          visible: el.offsetParent !== null
        })).filter(el => el.visible && (el.text || el.ariaLabel));
      });
      
      console.log(`\n🔘 Interactive Elements (${interactiveElements.length} total):`);
      interactiveElements.slice(0, 15).forEach((el, index) => {
        const identifier = el.text || el.ariaLabel || el.id;
        console.log(`  ${index + 1}. ${el.tag.toUpperCase()}: "${identifier}" ${el.role ? `[${el.role}]` : ''}`);
      });
      
      // Analyze main navigation structure
      const navigationStructure = await targetPage.evaluate(() => {
        const navs = document.querySelectorAll('nav, [role="navigation"], [class*="nav"]');
        return Array.from(navs).map(nav => ({
          text: nav.textContent?.trim().substring(0, 100) || '',
          childCount: nav.children.length,
          className: nav.className || '',
          role: nav.getAttribute('role') || nav.tagName.toLowerCase()
        }));
      });
      
      console.log(`\n🧭 Navigation Structure:`);
      navigationStructure.forEach((nav, index) => {
        console.log(`  ${index + 1}. ${nav.role}: ${nav.childCount} items - "${nav.text.substring(0, 60)}..."`);
      });
      
      // Find form elements and input fields
      const formElements = await targetPage.evaluate(() => {
        const inputs = document.querySelectorAll('input, textarea, select');
        return Array.from(inputs).map(input => ({
          type: input.type || input.tagName.toLowerCase(),
          placeholder: input.placeholder || '',
          name: input.name || '',
          id: input.id || '',
          required: input.required,
          visible: input.offsetParent !== null
        })).filter(el => el.visible);
      });
      
      console.log(`\n📝 Form Elements (${formElements.length} total):`);
      formElements.forEach((form, index) => {
        const identifier = form.placeholder || form.name || form.id || form.type;
        console.log(`  ${index + 1}. ${form.type.toUpperCase()}: "${identifier}" ${form.required ? '[REQUIRED]' : ''}`);
      });
      
      // Check for Copilot-specific UI patterns
      console.log('\n🤖 === COPILOT STUDIO SPECIFIC UI PATTERNS ===');
      
      // Look for agent/bot related elements
      const agentElements = await targetPage.locator(':has-text("agent"), :has-text("bot"), :has-text("copilot")').count();
      console.log(`Agent/Bot related elements: ${agentElements}`);
      
      // Check for create/build functionality
      const createElements = await targetPage.locator('button:has-text("Create"), button:has-text("Build"), button:has-text("New")').allTextContents();
      console.log(`Create/Build buttons: ${createElements.length}`);
      createElements.slice(0, 5).forEach((text, index) => {
        console.log(`  ${index + 1}. "${text.trim()}"`);
      });
      
      // Look for environment/workspace indicators
      const environmentInfo = await targetPage.evaluate(() => {
        const envElements = document.querySelectorAll('[class*="environment"], [class*="workspace"], [data-testid*="environment"]');
        return Array.from(envElements).map(el => el.textContent?.trim()).filter(text => text && text.length > 0);
      });
      
      console.log(`\n🌍 Environment/Workspace Info:`);
      environmentInfo.slice(0, 5).forEach((info, index) => {
        console.log(`  ${index + 1}. "${info.substring(0, 80)}"`);
      });
      
      // Check page layout structure
      const layoutStructure = await targetPage.evaluate(() => {
        const mainAreas = document.querySelectorAll('main, [role="main"], header, [role="banner"], aside, [role="complementary"], footer');
        return Array.from(mainAreas).map(area => ({
          tag: area.tagName.toLowerCase(),
          role: area.getAttribute('role') || '',
          className: area.className || '',
          childCount: area.children.length
        }));
      });
      
      console.log(`\n📐 Page Layout Structure:`);
      layoutStructure.forEach((area, index) => {
        const identifier = area.role || area.tag;
        console.log(`  ${index + 1}. ${identifier.toUpperCase()}: ${area.childCount} children`);
      });
        // Check for accessibility features
      const accessibilityFeatures = await targetPage.evaluate(() => {
        const ariaElements = document.querySelectorAll('[aria-label], [aria-describedby], [role]');
        const skipLinks = document.querySelectorAll('[href="#main"], [href="#content"]');
        const skipTexts = Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent && el.textContent.toLowerCase().includes('skip'));
        return {
          ariaLabeled: ariaElements.length,
          skipLinks: skipLinks.length + skipTexts.length,
          headingStructure: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.tagName)
        };
      });
      
      console.log(`\n♿ Accessibility Features:`);
      console.log(`  ARIA labeled elements: ${accessibilityFeatures.ariaLabeled}`);
      console.log(`  Skip links: ${accessibilityFeatures.skipLinks}`);
      console.log(`  Heading structure: ${accessibilityFeatures.headingStructure.join(' → ')}`);
      
      // Capture additional screenshots for different sections
      console.log('\n📸 Capturing additional analysis screenshots...');
      
      // Try to scroll and capture different sections
      await targetPage.screenshot({ 
        path: 'copilot-studio-overview.png',
        fullPage: false
      });
      
      // Scroll down to see more content
      await targetPage.evaluate(() => window.scrollTo(0, 500));
      await targetPage.waitForTimeout(1000);
      
      await targetPage.screenshot({ 
        path: 'copilot-studio-content.png',
        fullPage: false
      });
      
      console.log('\n✅ Analysis Complete!');
      console.log('📁 Screenshots saved:');
      console.log('  • edge-copilot-studio.png (full page)');
      console.log('  • copilot-studio-overview.png (viewport)');
      console.log('  • copilot-studio-content.png (scrolled content)');
      
    }
    
    // Don't close browser to keep it available for further testing
    console.log('\n🔗 Browser remains open for additional testing...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
