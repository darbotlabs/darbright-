
# Copilot Studio AgentBuilder Guide

*Thought into existence by Darbot*

> This guide documents both the manual and automated approaches to creating conversational agents in Microsoft Copilot Studio, with detailed browser automation walkthrough and XML configuration examples.

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Tool Setup](#tool-setup)
4. [Agent Creation Process](#agent-creation-process)
   - [Step 1: Planning Your Agent](#step-1-planning-your-agent)
   - [Step 2: Launching the Tool](#step-2-launching-the-tool)
   - [Step 3: Creating the Agent](#step-3-creating-the-agent)
   - [Step 4: Adding Knowledge Sources](#step-4-adding-knowledge-sources)
   - [Step 5: Testing Your Agent](#step-5-testing-your-agent)
   - [Step 6: Publishing Your Agent](#step-6-publishing-your-agent)
5. [Automated Agent Creation Using Playwright](#automated-agent-creation-using-playwright)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [XML Configuration Example](#xml-configuration-example)

## Introduction

The Copilot Studio AgentBuilder is a component of the copilot-studio-analyzer tool designed to streamline the process of creating and configuring Microsoft Copilot Studio agents. This guide walks you through both manual and automated approaches to agent creation, using the SupportBot e-commerce customer service agent as a case study.

## Prerequisites

Before using the copilot-studio-analyzer tool for agent creation, ensure you have:

- **Microsoft Edge** browser installed
- **Node.js** v14 or higher
- **Playwright Core** (`npm install playwright-core`)
- **Valid Microsoft account** with access to Copilot Studio
- **Basic knowledge** of JavaScript (for automation scenarios)

## Tool Setup

1. Clone or download the copilot-studio-analyzer repository
2. Navigate to the tool directory:
   ```bash
   cd copilot-studio-analyzer
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Agent Creation Process

### Step 1: Planning Your Agent

Before creating your agent, define these key elements:

- **Purpose**: What problems will your agent solve?
- **Functionality**: What specific tasks will it handle?
- **Knowledge Sources**: What information will it need access to?

#### Example: SupportBot Planning

| Aspect | Details |
|--------|---------|
| Purpose | Customer service agent for an e-commerce electronics store |
| Primary Functions | Product inquiries, troubleshooting, returns/refunds, order tracking |
| Knowledge Sources | Main website, product documentation, support FAQs, return policies |

### Step 2: Launching the Tool

You can launch the tool manually or using the provided batch file:

**Option 1: Using the batch file**
```bash
run-analyzer.bat
```

**Option 2: Using Node.js directly**
```bash
node analyze.js
```

The tool will:
1. Create necessary directories for screenshots and analysis
2. Launch Microsoft Edge browser
3. Navigate to Copilot Studio
4. Connect to the browser using the Chrome DevTools Protocol (CDP)

### Step 3: Creating the Agent

#### Manual Creation Steps:

1. In Copilot Studio, find the initial description field on the landing page
2. Use the chat interface to describe your agent thoroughly

   ```plaintext
   I want to create a customer service agent named 'SupportBot' that helps users with product inquiries, troubleshooting common issues, processing returns and refunds, and tracking order status for an e-commerce website selling electronics.
   ```

3. Provide detailed instructions when prompted. For example:
   
   **For troubleshooting**:

   ```plaintext
   SupportBot should offer step-by-step troubleshooting guides for common issues like device setup, connectivity problems, and software errors. For more complex issues, it should provide links to relevant knowledge base articles and video tutorials. If a customer's problem cannot be resolved through the automated troubleshooting steps, SupportBot should offer to create a support ticket and connect them with a live agent during business hours (9am-5pm EST, Monday-Friday).
   ```
   
   **For returns and refunds**:

   ```plaintext
   For returns and refunds, SupportBot should first verify the purchase using order number and email. It should explain the return policy (30-day return window for most items, 14 days for open-box electronics). SupportBot should guide customers through the return process by providing a step-by-step checklist: 1) Confirm eligibility based on purchase date, 2) Provide return shipping label options (free for defective items, $5.99 for buyer's remorse), 3) Explain packaging requirements, 4) Confirm refund method (original payment method or store credit), and 5) Provide estimated refund timeline (5-7 business days after receiving the return). For damaged or defective items, SupportBot should request photos of the damage and expedite the return process.
   ```
   
   **For order tracking**:

   ```plaintext
   For order tracking, SupportBot should first verify the customer's identity using order number and email or phone number. It should provide real-time tracking information by integrating with our shipping carriers' APIs (FedEx, UPS, USPS, and DHL). SupportBot should display: 1) Current package status (ordered, processing, shipped, out for delivery, delivered), 2) Estimated delivery date and time window, 3) Last tracking update location, and 4) Any delivery exceptions or delays. If a package is delayed by more than 24 hours, SupportBot should proactively offer to either contact the carrier on behalf of the customer or provide compensation options (10% discount on next order or free expedited shipping). For lost packages (no updates for 3+ days after expected delivery), SupportBot should automatically escalate to the claims department while offering an immediate replacement for items under $100.
   ```

### Step 4: Adding Knowledge Sources

1. When prompted to add knowledge sources, provide URLs to relevant information:

   ```plaintext
   Yes, I would like to add the following knowledge sources to SupportBot:
   1. Our main electronics website: www.techelectronics.com
   2. Our product documentation library: docs.techelectronics.com
   3. Our support knowledge base: support.techelectronics.com/faq
   4. Our shipping and returns policy page: www.techelectronics.com/shipping-returns
   ```

2. Confirm ownership of all knowledge sources by checking the appropriate checkboxes
3. Click "Skip to configure" to proceed to the agent configuration page

   > **Note from our browser test session**: When adding knowledge sources through the UI, you may need to add them one at a time rather than in a list. After entering each source, look for an "Add" button or similar element to add the URL before entering the next one. This varies depending on the current Copilot Studio UI version.

### Step 5: Testing Your Agent

1. In the agent configuration page, you'll see:
   - The agent name and icon
   - Description
   - Detailed instructions
   - Knowledge sources
   - Suggested prompts (automatically generated)

2. Test your agent by clicking the "Test" button:
   - Try a sample troubleshooting scenario: "I'm having trouble connecting to my home WiFi"
   - Try a returns inquiry: "I want to return a defective laptop"
   - Try an order tracking inquiry: "Where is my order #12345?"

3. Review the responses for:
   - Accuracy and adherence to instructions
   - Ability to provide step-by-step guidance
   - Proper use of knowledge sources
   - Appropriate tone and helpfulness

### Step 6: Publishing Your Agent

Once satisfied with your agent's performance:

1. Click the "Publish" button
2. Select the appropriate channels for deployment
3. Configure any channel-specific settings
4. Complete the publishing process

## Automated Agent Creation Using Playwright

The copilot-studio-analyzer tool includes Playwright-based automation scripts for creating agents programmatically.

### Example: Automated Agent Creation

Create a new JavaScript file (e.g., `create-supportbot.js`) with the following structure:

```javascript
// Thought into existence by Darbot
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const CONFIG = {
  cdpPort: 9222,
  copilotStudioUrl: 'https://copilotstudio.microsoft.com',
  screenshotsDir: './screenshots/agent-creation',
  waitTimeout: 10000,
  agent: {
    name: 'SupportBot',
    description: 'A customer service agent that helps users with product inquiries, troubleshooting, returns, and order tracking.',
    troubleshootingInstructions: 'SupportBot should offer step-by-step troubleshooting guides for common issues like device setup, connectivity problems, and software errors...',
    returnsInstructions: 'For returns and refunds, SupportBot should first verify the purchase using order number and email...',
    trackingInstructions: 'For order tracking, SupportBot should first verify the customer\'s identity using order number and email or phone number...',
    knowledgeSources: [
      'www.techelectronics.com',
      'docs.techelectronics.com',
      'support.techelectronics.com/faq',
      'www.techelectronics.com/shipping-returns'
    ]
  }
};

async function launchBrowser() {
  // Create screenshots directory
  await fs.mkdir(path.resolve(__dirname, CONFIG.screenshotsDir), { recursive: true });
  
  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge'
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to Copilot Studio
  await page.goto(CONFIG.copilotStudioUrl);
  
  return { browser, context, page };
}

async function createAgent(page) {
  // Wait for login and authentication to complete
  // This might require manual intervention
  
  // Navigate to Create tab
  await page.click('text=Create');
  
  // Click on New agent
  await page.click('text=New agent');
  
  // Describe the agent
  await page.waitForSelector('textarea[placeholder="Type your message"]');
  await page.fill('textarea[placeholder="Type your message"]', 
    `I want to create a customer service agent named '${CONFIG.agent.name}' that ${CONFIG.agent.description}`
  );
  await page.press('textarea[placeholder="Type your message"]', 'Enter');
  
  // Wait for response and add troubleshooting instructions
  await page.waitForSelector('text=Could you provide more details');
  await page.fill('textarea[placeholder="Type your message"]', CONFIG.agent.troubleshootingInstructions);
  await page.press('textarea[placeholder="Type your message"]', 'Enter');
  
  // Add returns and refunds instructions
  await page.waitForSelector('text=Could you provide more details on how SupportBot should handle these requests');
  await page.fill('textarea[placeholder="Type your message"]', CONFIG.agent.returnsInstructions);
  await page.press('textarea[placeholder="Type your message"]', 'Enter');
  
  // Add order tracking instructions
  await page.waitForSelector('text=Next, let\'s move on to refining the guidelines for tracking order status');
  await page.fill('textarea[placeholder="Type your message"]', CONFIG.agent.trackingInstructions);
  await page.press('textarea[placeholder="Type your message"]', 'Enter');
  
  // Add knowledge sources
  await page.waitForSelector('text=do you have any specific knowledge sources');
  await page.fill('textarea[placeholder="Type your message"]', 
    `Yes, I would like to add the following knowledge sources to ${CONFIG.agent.name}:\n` +
    CONFIG.agent.knowledgeSources.map((url, i) => `${i+1}. ${url}`).join('\n')
  );
  await page.press('textarea[placeholder="Type your message"]', 'Enter');
  
  // Confirm ownership of knowledge sources
  await page.waitForSelector('text=has been added');
  const checkboxes = await page.$$('input[type="checkbox"]');
  for (const checkbox of checkboxes) {
    await checkbox.check();
  }
  
  // Skip to configure
  await page.click('button:text("Skip to configure")');
  
  // Take a screenshot of the completed configuration
  await page.screenshot({ path: path.join(CONFIG.screenshotsDir, 'agent-configured.png') });
  
  console.log(`✅ Agent ${CONFIG.agent.name} created successfully!`);
}

async function main() {
  let browser, page;
  try {
    ({ browser, page } = await launchBrowser());
    await createAgent(page);
    
    // Keep browser open for testing
    console.log('Browser remaining open for manual testing. Press Ctrl+C to exit.');
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (page) {
      await page.screenshot({ path: path.join(CONFIG.screenshotsDir, 'error-state.png') });
    }
    process.exit(1);
  }
}

main();
```

### Running the Automation Script

Execute the script using Node.js:

```bash
node create-supportbot.js
```

## Best Practices

### Agent Design
1. **Clear Purpose**: Define a specific, focused scope for your agent
2. **Conversational Flow**: Design natural conversation paths with appropriate follow-up questions
3. **Error Handling**: Include instructions for handling unclear requests or out-of-scope topics
4. **Consistent Tone**: Maintain a consistent voice that matches your brand

### Knowledge Sources
1. **Quality over Quantity**: Choose authoritative, relevant sources
2. **Regular Updates**: Keep knowledge sources current
3. **Diverse Coverage**: Include various content types (FAQs, guides, policies)
4. **Accessible Format**: Ensure content is well-structured for the agent to parse

### Testing
1. **Scenario-Based**: Test specific user scenarios from start to finish
2. **Edge Cases**: Include rare or complex situations
3. **Refinement Cycles**: Continuously improve based on test results
4. **Real-world Validation**: Have actual users test the agent before full deployment

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Browser launch failure | Ensure Microsoft Edge is installed and the path is correct |
| Authentication problems | Sign in manually before running automation scripts |
| Agent not responding correctly | Review and refine instructions, check knowledge sources accessibility |
| Knowledge sources not accepted | Verify URL format and accessibility |
| Automation script timing issues | Adjust wait times or add proper waitForSelector conditions |

## XML Configuration Example

Below is an XML configuration that captures the SupportBot agent creation process:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<AgentConfiguration>
  <Agent>
    <Name>SupportBot</Name>
    <Description>A customer service agent that helps users with product inquiries, troubleshooting common issues, processing returns and refunds, and tracking order status for an e-commerce website selling electronics.</Description>
    <Language>en-US</Language>
    <Icon>default</Icon>
  </Agent>
  
  <Instructions>
    <Instruction type="Troubleshooting">
      <Text>SupportBot should offer step-by-step troubleshooting guides for common issues like device setup, connectivity problems, and software errors. For more complex issues, it should provide links to relevant knowledge base articles and video tutorials. If a customer's problem cannot be resolved through the automated troubleshooting steps, SupportBot should offer to create a support ticket and connect them with a live agent during business hours (9am-5pm EST, Monday-Friday).</Text>
    </Instruction>
    
    <Instruction type="Returns">
      <Text>For returns and refunds, SupportBot should first verify the purchase using order number and email. It should explain the return policy (30-day return window for most items, 14 days for open-box electronics). SupportBot should guide customers through the return process by providing a step-by-step checklist: 1) Confirm eligibility based on purchase date, 2) Provide return shipping label options (free for defective items, $5.99 for buyer's remorse), 3) Explain packaging requirements, 4) Confirm refund method (original payment method or store credit), and 5) Provide estimated refund timeline (5-7 business days after receiving the return). For damaged or defective items, SupportBot should request photos of the damage and expedite the return process.</Text>
    </Instruction>
    
    <Instruction type="OrderTracking">
      <Text>For order tracking, SupportBot should first verify the customer's identity using order number and email or phone number. It should provide real-time tracking information by integrating with our shipping carriers' APIs (FedEx, UPS, USPS, and DHL). SupportBot should display: 1) Current package status (ordered, processing, shipped, out for delivery, delivered), 2) Estimated delivery date and time window, 3) Last tracking update location, and 4) Any delivery exceptions or delays. If a package is delayed by more than 24 hours, SupportBot should proactively offer to either contact the carrier on behalf of the customer or provide compensation options (10% discount on next order or free expedited shipping). For lost packages (no updates for 3+ days after expected delivery), SupportBot should automatically escalate to the claims department while offering an immediate replacement for items under $100.</Text>
    </Instruction>
  </Instructions>
  
  <KnowledgeSources>
    <Source url="https://www.techelectronics.com" confirmed="true" />
    <Source url="https://docs.techelectronics.com" confirmed="true" />
    <Source url="https://support.techelectronics.com/faq" confirmed="true" />
    <Source url="https://www.techelectronics.com/shipping-returns" confirmed="true" />
  </KnowledgeSources>
  
  <SuggestedPrompts>
    <Prompt category="ProductInquiry">Can you tell me more about the features of this product?</Prompt>
    <Prompt category="Troubleshooting">I'm having trouble setting up my device. Can you help?</Prompt>
    <Prompt category="ReturnProcess">How do I return an item I purchased?</Prompt>
    <Prompt category="RefundStatus">When will I receive my refund?</Prompt>
    <Prompt category="OrderTracking">Where is my order?</Prompt>
    <Prompt category="LiveSupport">I need to speak with a live agent.</Prompt>
  </SuggestedPrompts>
  
  <TestScenarios>
    <Scenario name="WiFiTroubleshooting">
      <Input>I recently purchased a laptop from your store but I'm having trouble connecting to my home WiFi. Can you help me troubleshoot this issue?</Input>
      <ExpectedResponseElements>
        <Element>Step-by-step guide</Element>
        <Element>WiFi switch check</Element>
        <Element>Device restart instructions</Element>
        <Element>Driver update instructions</Element>
        <Element>Support ticket option</Element>
      </ExpectedResponseElements>
    </Scenario>
    
    <Scenario name="DefectiveReturn">
      <Input>I want to return a defective laptop I purchased last week. What's your return policy and how do I start the return process?</Input>
      <ExpectedResponseElements>
        <Element>30-day return window</Element>
        <Element>Free shipping label</Element>
        <Element>Verification process</Element>
        <Element>Refund timeline</Element>
        <Element>Photo request for defects</Element>
      </ExpectedResponseElements>
    </Scenario>
  </TestScenarios>
</AgentConfiguration>
```

This guide provides a comprehensive framework for creating, configuring, and automating Copilot Studio agents using the copilot-studio-analyzer tool. By following these steps and best practices, you can efficiently build sophisticated agents like SupportBot to enhance your customer service operations.


