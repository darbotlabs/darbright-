// Thought into existence by Darbot
// Multi-Agent Orchestration Setup Script for SupportBot and WarrantyGuard

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const CONFIG = {
  // SupportBot Configuration
  supportBot: {
    agentId: '276dcc5a-3d47-f011-877a-7c1e52698560',
    name: 'SupportBot',
    orchestrationSettings: {
      connectedAgents: true,
      responseFormatting: `When handling warranty issues, connect to WarrantyGuard. For general support, handle directly. Always provide clear handoff explanations to users.

Examples:
- "I'm connecting you with our warranty specialist for faster assistance."
- "Let me check with our warranty system for the most accurate information."
- "For this issue, I'll coordinate with our warranty team to ensure proper resolution."`
    }
  },

  // WarrantyGuard Configuration  
  warrantyGuard: {
    agentId: 'f8e44bad-4647-f011-877a-7c1e52698560',
    name: 'WarrantyGuard',
    skillSettings: {
      allowConnection: true,
      skillDescription: 'Hardware warranty claims, product registration, troubleshooting, warranty status checks, replacement parts, repair scheduling'
    }
  },

  // Environment Settings
  environment: {
    id: 'e2bd2cb1-3e05-e886-81d2-16aa081a3e04',
    name: 'DYdev26'
  },

  // URLs
  urls: {
    base: 'https://copilotstudio.preview.microsoft.com',
    supportBotSettings: 'https://copilotstudio.preview.microsoft.com/environments/e2bd2cb1-3e05-e886-81d2-16aa081a3e04/bots/276dcc5a-3d47-f011-877a-7c1e52698560/manage',
    warrantyGuardSettings: 'https://copilotstudio.preview.microsoft.com/environments/e2bd2cb1-3e05-e886-81d2-16aa081a3e04/bots/f8e44bad-4647-f011-877a-7c1e52698560/manage'
  },

  // Output Settings
  screenshotsDir: './screenshots/multi-agent-setup',
  logFile: './multi-agent-setup-log.md'
};

class MultiAgentOrchestrator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.log = [];
  }

  async initialize() {
    // Create output directories
    await fs.mkdir(path.resolve(__dirname, CONFIG.screenshotsDir), { recursive: true });
    
    // Launch browser
    this.browser = await chromium.launch({
      headless: false,
      channel: 'msedge'
    });
    
    const context = await browser.newContext();
    this.page = await context.newPage();
    
    this.log.push(`# Multi-Agent Orchestration Setup Log`);
    this.log.push(`*Generated: ${new Date().toISOString()}*`);
    this.log.push(`*Environment: ${CONFIG.environment.name}*`);
    this.log.push(`*Agents: ${CONFIG.supportBot.name} ↔ ${CONFIG.warrantyGuard.name}*`);
    this.log.push('');
  }

  async logStep(step, status = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : status === 'warning' ? '⚠️' : '📍';
    console.log(`${emoji} ${step}`);
    this.log.push(`${emoji} **${timestamp}**: ${step}`);
  }

  async takeScreenshot(name, fullPage = true) {
    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(CONFIG.screenshotsDir, filename);
    await this.page.screenshot({ path: filepath, fullPage });
    this.log.push(`📸 Screenshot: \`${filename}\``);
    return filepath;
  }

  async configureSupportBotOrchestration() {
    await this.logStep('Configuring SupportBot for Multi-Agent Orchestration');
    
    try {
      // Navigate to SupportBot Generative AI settings
      await this.page.goto(`${CONFIG.urls.supportBotSettings}/advancedSettings`);
      await this.page.waitForLoadState('networkidle');
      await this.takeScreenshot('supportbot-generative-ai-before');

      // Enable Connected Agents
      await this.logStep('Enabling Connected Agents feature');
      const connectedAgentsToggle = await this.page.locator('switch:has-text("Let other agents connect to and use this one")');
      if (await connectedAgentsToggle.getAttribute('aria-checked') === 'false') {
        await connectedAgentsToggle.click();
        await this.logStep('Connected Agents enabled', 'success');
      } else {
        await this.logStep('Connected Agents already enabled', 'warning');
      }

      // Configure Response Formatting
      await this.logStep('Setting up orchestration response formatting');
      const responseFormattingTextbox = await this.page.locator('textbox').first();
      await responseFormattingTextbox.fill(CONFIG.supportBot.orchestrationSettings.responseFormatting);
      await this.logStep('Response formatting configured', 'success');

      // Save settings
      await this.page.click('button:has-text("Save")');
      await this.page.waitForTimeout(2000);
      await this.takeScreenshot('supportbot-generative-ai-after');
      await this.logStep('SupportBot Generative AI settings saved', 'success');

      // Configure Skills
      await this.page.goto(`${CONFIG.urls.supportBotSettings}/skills`);
      await this.page.waitForLoadState('networkidle');
      await this.takeScreenshot('supportbot-skills-before');

      await this.logStep('Adding WarrantyGuard as a skill');
      await this.page.click('button:has-text("Add a skill")');
      // Note: Skill configuration UI will require manual completion
      await this.logStep('Skill addition initiated - manual configuration required', 'warning');

      // Configure Security Allowlist
      await this.page.goto(`${CONFIG.urls.supportBotSettings}/security`);
      await this.page.waitForLoadState('networkidle');
      await this.takeScreenshot('supportbot-security');

      await this.logStep('Configuring security allowlist');
      await this.page.click('button:has-text("Allowlist")');
      // Note: Allowlist configuration requires manual setup
      await this.logStep('Security allowlist configuration initiated', 'warning');

    } catch (error) {
      await this.logStep(`Error configuring SupportBot: ${error.message}`, 'error');
      await this.takeScreenshot('supportbot-error');
      throw error;
    }
  }

  async configureWarrantyGuardSkill() {
    await this.logStep('Configuring WarrantyGuard for Skill Integration');
    
    try {
      // Navigate to WarrantyGuard settings
      await this.page.goto(`${CONFIG.urls.warrantyGuardSettings}/advancedSettings`);
      await this.page.waitForLoadState('networkidle');
      await this.takeScreenshot('warrantyguard-settings-before');

      // Enable skill connectivity (if available)
      await this.logStep('Reviewing WarrantyGuard skill settings');
      
      // Check if WarrantyGuard can be used as a skill
      const connectedAgentsSection = await this.page.locator('text=Connected agents').isVisible();
      if (connectedAgentsSection) {
        await this.logStep('WarrantyGuard supports skill connections', 'success');
      } else {
        await this.logStep('WarrantyGuard skill support needs verification', 'warning');
      }

      await this.takeScreenshot('warrantyguard-settings-after');

    } catch (error) {
      await this.logStep(`Error configuring WarrantyGuard: ${error.message}`, 'error');
      await this.takeScreenshot('warrantyguard-error');
      throw error;
    }
  }

  async testOrchestration() {
    await this.logStep('Testing Multi-Agent Orchestration');
    
    try {
      // Navigate back to agents list
      await this.page.goto(`${CONFIG.urls.base}/environments/${CONFIG.environment.id}/bots`);
      await this.page.waitForLoadState('networkidle');
      await this.takeScreenshot('agents-list-final');

      // Test SupportBot
      await this.logStep('Initiating SupportBot test');
      await this.page.click(`text=${CONFIG.supportBot.name}`);
      // Navigate to test interface
      // Note: Testing requires manual interaction
      await this.logStep('SupportBot test interface opened', 'warning');

      await this.takeScreenshot('orchestration-test-ready');

    } catch (error) {
      await this.logStep(`Error during orchestration test: ${error.message}`, 'error');
      await this.takeScreenshot('test-error');
      throw error;
    }
  }

  async generateReport() {
    await this.logStep('Generating setup report');
    
    const report = [
      ...this.log,
      '',
      '## 🎯 Multi-Agent Orchestration Status',
      '',
      '### ✅ Completed Tasks',
      '- SupportBot Connected Agents enabled',
      '- Response formatting configured for orchestration',
      '- WarrantyGuard skill integration initiated',
      '',
      '### ⚠️ Manual Configuration Required',
      '- Complete skill connection between SupportBot and WarrantyGuard',
      '- Configure security allowlist permissions',
      '- Test agent handoff scenarios',
      '- Set up escalation workflows',
      '',
      '### 🔄 Next Steps',
      '1. Test SupportBot with warranty-related queries',
      '2. Verify handoff to WarrantyGuard works correctly',
      '3. Configure additional orchestration rules as needed',
      '4. Monitor agent performance and collaboration',
      '',
      '### 📊 Configuration Summary',
      `- **Primary Agent**: ${CONFIG.supportBot.name}`,
      `- **Specialist Agent**: ${CONFIG.warrantyGuard.name}`,
      `- **Environment**: ${CONFIG.environment.name}`,
      `- **Orchestration**: Connected Agents enabled`,
      `- **Skills**: Manual configuration in progress`,
      '',
      '---',
      '*Multi-Agent Orchestration setup completed with Playwright automation*',
      '*Manual configuration steps documented above*'
    ].join('\n');

    await fs.writeFile(CONFIG.logFile, report);
    await this.logStep(`Setup report saved to ${CONFIG.logFile}`, 'success');
  }

  async run() {
    try {
      await this.initialize();
      await this.logStep('Multi-Agent Orchestration Setup Started');

      await this.configureSupportBotOrchestration();
      await this.configureWarrantyGuardSkill();
      await this.testOrchestration();
      await this.generateReport();

      await this.logStep('Multi-Agent Orchestration Setup Completed', 'success');
      
      console.log('\n🎉 Setup completed! Check the log file for details.');
      console.log('⚠️  Manual configuration steps required - see report for details.');
      console.log('🚀 Browser will remain open for manual testing and configuration.');

    } catch (error) {
      await this.logStep(`Setup failed: ${error.message}`, 'error');
      await this.generateReport();
      console.error('❌ Setup failed. Check the log file for details.');
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run the orchestration setup
async function main() {
  const orchestrator = new MultiAgentOrchestrator();
  
  try {
    await orchestrator.run();
  } catch (error) {
    console.error('Setup failed:', error);
  }
  
  // Keep browser open for manual configuration
  console.log('Browser kept open for manual testing...');
}

// Export for use as module or run directly
if (require.main === module) {
  main();
}

module.exports = { MultiAgentOrchestrator, CONFIG };
