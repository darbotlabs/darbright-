// Thought into existence by Darbot
const { chromium } = require('../packages/playwright-core');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  cdpPort: 9222,
  copilotStudioUrl: 'https://copilotstudio.microsoft.com',
  outputDir: '../test-results/analysis/copilot-studio',
  waitTimeout: 5000
};

async function launchEdgeAndNavigate() {
  const { spawn } = require('child_process');
  spawn('cmd', ['/c', `start msedge --remote-debugging-port=${CONFIG.cdpPort} --new-window ${CONFIG.copilotStudioUrl}`], {
    detached: true,
    stdio: 'ignore'
  });
  await new Promise(resolve => setTimeout(resolve, CONFIG.waitTimeout));
}

async function extractSitemap(page) {
  // Wait for environments dropdown to be visible
  await page.waitForTimeout(3000);

  // Try to find the environments dropdown/button and click to expand if needed
  let environments = [];
  try {
    // Try to click the environment selector if it exists
    const envButton = await page.locator('button:has-text("Environment")').first();
    if (await envButton.isVisible()) {
      await envButton.click();
      await page.waitForTimeout(1000);
    }
  } catch {}

  // Extract environment names and ids/urls
  environments = await page.evaluate(() => {
    // Try to find environment list in dropdown or sidebar
    const envs = [];
    // Dropdown menu
    document.querySelectorAll('[role="menuitem"], [data-testid*="environment"]').forEach(el => {
      const name = el.textContent?.trim();
      const url = el.href || '';
      if (name && !envs.some(e => e.name === name)) {
        envs.push({ name, url });
      }
    });
    // Fallback: try to find environment switcher in header
    const headerEnv = document.querySelector('[aria-label*="environment"], [class*="environment"]');
    if (headerEnv && !envs.some(e => e.name === headerEnv.textContent?.trim())) {
      envs.push({ name: headerEnv.textContent?.trim(), url: window.location.href });
    }
    return envs;
  });

  // For the currently selected environment, extract main navigation tabs/components
  const mainNav = await page.evaluate(() => {
    const navTabs = [];
    document.querySelectorAll('[role="tab"], nav a, nav button').forEach(el => {
      const text = el.textContent?.trim();
      const url = el.href || '';
      if (text && !navTabs.some(t => t.text === text)) {
        navTabs.push({ text, url });
      }
    });
    return navTabs;
  });

  return { environments, mainNav };
}

async function extractDetailedSitemap(page) {
  // Wait for UI to settle
  await page.waitForTimeout(3000);
  // Extract environments - improved to better capture the current environment name
  let environments = await page.evaluate(() => {
    const envs = [];
    
    // Look for environment selector in header (most reliable)
    const environmentButtons = document.querySelectorAll('button');
    let environmentButton = null;
    
    // Find button with environment text
    for (const btn of environmentButtons) {
      const text = btn.textContent || '';
      if (text.toLowerCase().includes('environment') || text.includes('Cypherdyne')) {
        environmentButton = btn;
        break;
      }
    }
    
    // Also look for elements with environment-related aria labels
    if (!environmentButton) {
      environmentButton = document.querySelector('[aria-label*="environment"]');
    }
    
    if (environmentButton) {
      const envName = environmentButton.textContent?.trim() || '';
      // Clean up the environment name - many formats exist like "Environment: Cypherdyne (default)"
      const cleanName = envName.replace(/^Environment:?\s*/i, '').trim();
      
      if (cleanName) {
        envs.push({ 
          name: cleanName, 
          isDefault: cleanName.includes('default'),
          url: window.location.href 
        });
      }
    }
    
    // Look for environment dropdown items
    document.querySelectorAll('[role="menuitem"]').forEach(el => {
      const name = el.textContent?.trim();
      const url = el.href || '';
      const isSelected = el.getAttribute('aria-selected') === 'true' || 
                        el.classList.contains('selected') || 
                        el.classList.contains('active');
      if (name && !envs.some(e => e.name === name)) {
        envs.push({ 
          name: name, 
          isSelected,
          isDefault: name.toLowerCase().includes('default'),
          url: url 
        });
      }
    });
    
    return envs;
  });
  // Extract UI regions and group elements by their visual/functional areas
  const uiStructure = await page.evaluate(() => {
    // Helper to get text content safely
    const safeText = el => (el.textContent || '').trim();
    
    // Get page regions and their boundaries
    const regions = {
      header: {
        element: document.querySelector('header') || document.querySelector('[role="banner"]'),
        items: []
      },
      navigation: {
        element: document.querySelector('nav') || document.querySelector('[role="navigation"]'),
        items: []
      },
      mainContent: {
        element: document.querySelector('main') || document.querySelector('[role="main"]'),
        items: []
      },
      sidebar: {
        element: document.querySelector('aside') || document.querySelector('.sidebar'),
        items: []
      },
      footer: {
        element: document.querySelector('footer'),
        items: []
      }
    };

    // Calculate region bounds for elements without clear container
    Object.keys(regions).forEach(key => {
      const region = regions[key];
      if (region.element) {
        const rect = region.element.getBoundingClientRect();
        region.bounds = {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right
        };
      }
    });
    
    // Get all headings for structuring content
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
      tag: h.tagName,
      text: safeText(h),
      id: h.id || null,
      position: {
        top: h.getBoundingClientRect().top,
        left: h.getBoundingClientRect().left
      }
    }));
    
    // Get all actionable elements
    const allActions = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"], [role="menuitem"]')).map(el => ({
      tag: el.tagName,
      text: safeText(el),
      role: el.getAttribute('role') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      href: el.href || '',
      id: el.id || '',
      className: el.className || '',
      position: {
        top: el.getBoundingClientRect().top,
        left: el.getBoundingClientRect().left
      }
    })).filter(a => a.text || a.ariaLabel); // Only include elements with text or aria-label
    
    // Get all form fields
    const allForms = Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
      tag: el.tagName,
      type: el.type || el.tagName.toLowerCase(),
      placeholder: el.placeholder || '',
      name: el.name || '',
      id: el.id || '',
      required: el.required || false,
      position: {
        top: el.getBoundingClientRect().top,
        left: el.getBoundingClientRect().left
      }
    }));
    
    // Assign elements to regions based on position
    [...headings, ...allActions, ...allForms].forEach(item => {
      let assigned = false;
      
      // Check if element is within a known region
      Object.keys(regions).forEach(key => {
        const region = regions[key];
        if (region.bounds && 
            item.position.top >= region.bounds.top && 
            item.position.top <= region.bounds.bottom &&
            item.position.left >= region.bounds.left && 
            item.position.left <= region.bounds.right) {
          region.items.push(item);
          assigned = true;
        }
      });
      
      // If not assigned to a region, put in mainContent by default
      if (!assigned) {
        regions.mainContent.items.push(item);
      }
    });
    
    // Create sections with headings and related elements
    const sections = headings.map((heading, i) => {
      const nextHeading = headings[i + 1];
      const nextTop = nextHeading ? nextHeading.position.top : Infinity;
      
      // Find elements that belong to this heading's section
      const sectionActions = allActions.filter(a => 
        a.position.top >= heading.position.top && 
        a.position.top < nextTop
      );
      
      const sectionForms = allForms.filter(f => 
        f.position.top >= heading.position.top && 
        f.position.top < nextTop
      );
      
      return {
        heading,
        actions: sectionActions,
        forms: sectionForms
      };
    });
    
    // Get templated agent options specifically (important for agent creation)
    const agentTemplates = Array.from(document.querySelectorAll('[class*="template"], [aria-label*="template"], [class*="card"]')).map(el => {
      const title = el.querySelector('h2, h3, [class*="title"]')?.textContent?.trim() || '';
      const description = el.querySelector('p, [class*="description"]')?.textContent?.trim() || '';
      
      return {
        title: title || safeText(el),
        description,
        element: {
          tag: el.tagName,
          id: el.id || '',
          className: el.className || ''
        }
      };
    }).filter(t => t.title);
    
    return { regions, sections, agentTemplates };
  });
  // Extract navigation with more detail
  const mainNav = await page.evaluate(() => {
    const navTabs = [];
    document.querySelectorAll('[role="tab"], nav a, nav button').forEach(el => {
      const text = el.textContent?.trim();
      const url = el.href || '';
      const isActive = el.getAttribute('aria-selected') === 'true' || 
                      el.classList.contains('active') ||
                      el.classList.contains('selected');
      
      if (text && !navTabs.some(t => t.text === text)) {
        navTabs.push({ 
          text, 
          url,
          isActive,
          role: el.getAttribute('role') || '',
          id: el.id || ''
        });
      }
    });
    return navTabs;
  });

  // Accessibility summary
  const accessibility = await page.evaluate(() => {
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
  });
  
  // Extract agent creation workflow steps
  const agentCreationSteps = await page.evaluate(() => {
    // Look for step indicators, progress trackers, or wizard elements
    const stepElements = Array.from(document.querySelectorAll('[class*="step"], [class*="wizard"], [class*="progress"], ol li, [role="listitem"]'));
    
    const steps = stepElements.map(el => ({
      text: el.textContent?.trim() || '',
      isActive: el.classList.contains('active') || el.getAttribute('aria-current') === 'true',
      index: el.dataset.step || el.dataset.index || null
    })).filter(step => step.text);
    
    // If no explicit steps found, create a synthetic workflow based on common patterns
    if (steps.length === 0) {
      return [
        { text: "Describe your agent", isActive: true, index: 1 },
        { text: "Choose a template", isActive: false, index: 2 },
        { text: "Configure settings", isActive: false, index: 3 },
        { text: "Add topics and messages", isActive: false, index: 4 },
        { text: "Test and publish", isActive: false, index: 5 }
      ];
    }
    
    return steps;
  });

  return { 
    environments, 
    mainNav, 
    uiStructure, 
    accessibility,
    agentCreationSteps
  };
}

async function main() {
  if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  await launchEdgeAndNavigate();
  const browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.cdpPort}`);
  const page = browser.contexts()[0].pages().find(p => p.url().includes('copilotstudio')) || browser.contexts()[0].pages()[0];
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  const sitemap = await extractDetailedSitemap(page);
  // Output as JSON
  const jsonPath = path.join(CONFIG.outputDir, 'copilot-studio-sitemap-refined.json');
  fs.writeFileSync(jsonPath, JSON.stringify(sitemap, null, 2));

  // Output as Markdown with improved structure
  const mdPath = path.join(CONFIG.outputDir, 'copilot-studio-sitemap-refined.md');
  let md = `# Copilot Studio Sitemap (Refined)\n\n`;
  
  // Environment information with better formatting
  md += `## Environment\n`;
  if (sitemap.environments.length) {
    const currentEnv = sitemap.environments.find(e => e.isSelected) || sitemap.environments[0];
    md += `- **Current Environment:** ${currentEnv.name || 'Default'}${currentEnv.isDefault ? ' (Default)' : ''}\n`;
    md += `- **URL:** [${currentEnv.url}](${currentEnv.url})\n`;
    
    if (sitemap.environments.length > 1) {
      md += `\n### Available Environments\n`;
      sitemap.environments.forEach(env => {
        if (env !== currentEnv) {
          md += `- ${env.name}${env.isDefault ? ' (Default)' : ''}\n`;
        }
      });
    }
  } else {
    md += `- No environment information available\n`;
  }
  
  // Navigation with active state highlighted
  md += `\n## Main Navigation\n`;
  sitemap.mainNav.forEach(tab => {
    md += `- ${tab.isActive ? '**[ACTIVE]** ' : ''}${tab.text}${tab.url ? `: [link](${tab.url})` : ''}\n`;
  });
  
  // Agent Creation Workflow - NEW SECTION
  md += `\n## Agent Creation Workflow\n`;
  sitemap.agentCreationSteps.forEach((step, idx) => {
    md += `${idx + 1}. ${step.isActive ? '**[CURRENT]** ' : ''}${step.text}\n`;
  });
  
  // UI Structure by Regions - for better organization
  md += `\n## UI Structure\n`;
  
  // Header Region
  md += `\n### Header Region\n`;
  const headerItems = sitemap.uiStructure.regions.header.items || [];
  if (headerItems.length) {
    // Group by type
    const headerButtons = headerItems.filter(i => i.tag === 'BUTTON' || i.role === 'button');
    const headerLinks = headerItems.filter(i => i.tag === 'A');
    
    if (headerButtons.length) {
      md += `- **Buttons:**\n`;
      headerButtons.forEach(btn => {
        md += `  - ${btn.text || btn.ariaLabel}\n`;
      });
    }
    
    if (headerLinks.length) {
      md += `- **Links:**\n`;
      headerLinks.forEach(link => {
        md += `  - ${link.text}${link.href ? ` [${link.href}]` : ''}\n`;
      });
    }
  } else {
    md += `- No header elements detected\n`;
  }
  
  // Navigation Region
  md += `\n### Navigation Region\n`;
  const navItems = sitemap.uiStructure.regions.navigation.items || [];
  if (navItems.length) {
    navItems.forEach(item => {
      md += `- [${item.tag}] ${item.text || item.ariaLabel}\n`;
    });
  } else {
    md += `- Navigation items listed in Main Navigation section\n`;
  }
  
  // Main Content Region
  md += `\n### Main Content\n`;
  
  // Agent Templates Section - Critical for agent creation
  md += `\n#### Available Agent Templates\n`;
  if (sitemap.uiStructure.agentTemplates && sitemap.uiStructure.agentTemplates.length) {
    sitemap.uiStructure.agentTemplates.forEach(template => {
      md += `- **${template.title}**\n`;
      if (template.description) {
        md += `  - ${template.description}\n`;
      }
    });
  } else {
    md += `- No specific templates detected\n`;
  }
  
  // Sections with headings
  md += `\n#### Content Sections\n`;
  if (sitemap.uiStructure.sections && sitemap.uiStructure.sections.length) {
    sitemap.uiStructure.sections.forEach(section => {
      md += `\n##### ${section.heading.tag}: ${section.heading.text}\n`;
      
      if (section.actions && section.actions.length) {
        md += `- **Interactive Elements:**\n`;
        section.actions.forEach(a => {
          md += `  - [${a.tag}${a.role ? `/${a.role}` : ''}] ${a.text || a.ariaLabel}${a.href ? ` [${a.href}]` : ''}\n`;
        });
      }
      
      if (section.forms && section.forms.length) {
        md += `- **Form Fields:**\n`;
        section.forms.forEach(f => {
          md += `  - [${f.tag}/${f.type}] ${f.placeholder || f.name || f.id}${f.required ? ' [REQUIRED]' : ''}\n`;
        });
      }
    });
  }
  
  // Form fields - Critical for agent creation
  const mainContentForms = sitemap.uiStructure.regions.mainContent.items?.filter(i => 
    i.tag === 'INPUT' || i.tag === 'TEXTAREA' || i.tag === 'SELECT') || [];
  
  if (mainContentForms.length) {
    md += `\n#### Main Input Fields\n`;
    mainContentForms.forEach(form => {
      md += `- [${form.tag}/${form.type || 'text'}] ${form.placeholder || form.name || form.id || 'Unnamed field'}${form.required ? ' [REQUIRED]' : ''}\n`;
    });
  }
  
  // Accessibility - Moved to the end
  md += `\n## Accessibility\n`;
  md += `- ARIA-labeled elements: ${sitemap.accessibility.ariaLabeledElements}\n`;
  md += `- Skip links: ${sitemap.accessibility.skipLinks}\n`;
  md += `- Heading structure: ${sitemap.accessibility.headingStructure.join(' → ')}\n`;
  md += `- Main landmark: ${sitemap.accessibility.hasMainLandmark ? '✅ Present' : '❌ Missing'}\n`;
  md += `- Navigation landmark: ${sitemap.accessibility.hasNavLandmark ? '✅ Present' : '❌ Missing'}\n`;
  
  md += `\n*Thought into existence by Darbot*\n`;
  fs.writeFileSync(mdPath, md);

  console.log('✅ Copilot Studio detailed sitemap generated!');
  console.log(`- Markdown: ${mdPath}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log('\nSitemap preview:\n', md);
}

if (require.main === module) {
  main();
}
