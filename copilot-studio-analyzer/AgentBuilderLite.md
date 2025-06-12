# Agent Builder Lite

*Thought into existence by Darbot*

> A simplified guide for creating Microsoft Copilot Studio agents using Playwright automation.

## Quick Start

### Prerequisites
- Microsoft Edge browser
- Node.js v14+
- Playwright Core (`npm install playwright-core`)
- Microsoft account with Copilot Studio access

### Setup
```bash
cd copilot-studio-analyzer
npm install
```

## Agent Planning Checklist

Before coding, prepare these details for your agent:

### 1. Basic Information
- **Agent Name**: What will you call your agent?
- **Purpose**: One sentence describing what it does
- **Target Users**: Who will interact with it?

### 2. Core Functions
List 3-5 main tasks your agent will handle:
- ✅ Function 1 (e.g., "Answer product questions")
- ✅ Function 2 (e.g., "Process returns")
- ✅ Function 3 (e.g., "Track orders")

### 3. Detailed Instructions
For each function, prepare specific instructions:

**Template:**
```
For [FUNCTION NAME], the agent should:
1. [First step/requirement]
2. [How to handle the request]
3. [What information to collect]
4. [Expected response format]
5. [Escalation criteria]
```

### 4. Knowledge Sources
List URLs the agent can reference:
- Company website
- Documentation site
- FAQ pages
- Policy pages

### 5. Test Scenarios
Prepare 3-5 realistic user inputs to test:
- "I need help with..."
- "How do I..."
- "What's the status of..."

## Automation Script Template

Create a new file (e.g., `create-my-agent.js`):

```javascript
// Thought into existence by Darbot
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const CONFIG = {
  agent: {
    name: 'YourAgentName',
    description: 'Brief description of what your agent does',
    
    // Add your detailed instructions here
    instructions: {
      function1: 'Detailed instructions for first function...',
      function2: 'Detailed instructions for second function...',
      function3: 'Detailed instructions for third function...'
    },
    
    // Add your knowledge sources
    knowledgeSources: [
      'https://your-website.com',
      'https://docs.your-website.com',
      'https://support.your-website.com'
    ]
  },
  
  copilotStudioUrl: 'https://copilotstudio.microsoft.com',
  screenshotsDir: './screenshots/my-agent'
};

async function createAgent() {
  // Create screenshots directory
  await fs.mkdir(path.resolve(__dirname, CONFIG.screenshotsDir), { recursive: true });
  
  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge'
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to Copilot Studio
    await page.goto(CONFIG.copilotStudioUrl);
    console.log('📍 Navigated to Copilot Studio');
    
    // Wait for manual login (if needed)
    console.log('⏳ Please complete login if required...');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Create tab
    await page.click('text=Create');
    console.log('✅ Clicked Create tab');
    
    // Click New agent
    await page.click('text=New agent');
    console.log('✅ Clicked New agent');
    
    // Describe the agent
    await page.waitForSelector('textarea[placeholder="Type your message"]');
    const initialDescription = `I want to create an agent named '${CONFIG.agent.name}' that ${CONFIG.agent.description}`;
    
    await page.fill('textarea[placeholder="Type your message"]', initialDescription);
    await page.press('textarea[placeholder="Type your message"]', 'Enter');
    console.log('✅ Sent initial description');
    
    // Add detailed instructions (adjust based on your needs)
    for (const [functionName, instruction] of Object.entries(CONFIG.agent.instructions)) {
      await page.waitForTimeout(2000); // Wait for response
      await page.fill('textarea[placeholder="Type your message"]', instruction);
      await page.press('textarea[placeholder="Type your message"]', 'Enter');
      console.log(`✅ Added instructions for ${functionName}`);
    }
    
    // Add knowledge sources
    await page.waitForTimeout(2000);
    const knowledgeSourcesText = `Yes, I would like to add these knowledge sources:\n` +
      CONFIG.agent.knowledgeSources.map((url, i) => `${i+1}. ${url}`).join('\n');
    
    await page.fill('textarea[placeholder="Type your message"]', knowledgeSourcesText);
    await page.press('textarea[placeholder="Type your message"]', 'Enter');
    console.log('✅ Added knowledge sources');
    
    // Confirm ownership (wait and check boxes)
    await page.waitForTimeout(3000);
    const checkboxes = await page.$$('input[type="checkbox"]');
    for (const checkbox of checkboxes) {
      await checkbox.check();
    }
    console.log('✅ Confirmed knowledge source ownership');
    
    // Skip to configure
    await page.click('button:text("Skip to configure")');
    console.log('✅ Navigated to configuration');
    
    // Take final screenshot
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'agent-configured.png'),
      fullPage: true 
    });
    
    console.log(`🎉 Agent '${CONFIG.agent.name}' created successfully!`);
    console.log('Browser staying open for manual testing...');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, 'error.png'),
      fullPage: true 
    });
  }
}

// Run the script
createAgent();
```

## Quick Examples

### Customer Service Agent
```javascript
const CONFIG = {
  agent: {
    name: 'SupportBot',
    description: 'helps customers with orders, returns, and product questions',
    instructions: {
      orders: 'For order inquiries, verify customer identity with order number and email, then provide tracking status...',
      returns: 'For returns, explain the 30-day policy, verify purchase date, and guide through return process...',
      products: 'For product questions, provide detailed specifications and help with compatibility...'
    },
    knowledgeSources: [
      'https://shop.example.com',
      'https://support.example.com/faq'
    ]
  }
};
```

### IT Help Desk Agent
```javascript
const CONFIG = {
  agent: {
    name: 'TechHelper',
    description: 'provides IT support for common technical issues',
    instructions: {
      passwords: 'For password resets, verify user identity, then guide through self-service reset...',
      software: 'For software issues, gather system info, provide step-by-step troubleshooting...',
      hardware: 'For hardware problems, diagnose remotely, escalate if physical repair needed...'
    },
    knowledgeSources: [
      'https://itdocs.company.com',
      'https://helpdesk.company.com'
    ]
  }
};
```

### HR Assistant Agent
```javascript
const CONFIG = {
  agent: {
    name: 'HRHelper',
    description: 'assists employees with HR policies, benefits, and requests',
    instructions: {
      benefits: 'For benefits questions, explain available options, enrollment periods, and provide forms...',
      policies: 'For policy questions, reference employee handbook and provide clear explanations...',
      timeoff: 'For time-off requests, guide through approval process and check balances...'
    },
    knowledgeSources: [
      'https://hr.company.com/handbook',
      'https://hr.company.com/benefits'
    ]
  }
};
```

## Running Your Script

```bash
node create-my-agent.js
```

## Testing Your Agent

After creation, test with scenarios like:
- **Happy path**: Normal requests your agent should handle perfectly
- **Edge cases**: Unusual or complex requests
- **Out of scope**: Requests your agent should politely decline

## Tips for Success

1. **Be Specific**: Detailed instructions = better agent responses
2. **Test Early**: Create a simple version first, then enhance
3. **Iterate**: Refine based on testing results
4. **Document**: Keep notes on what works and what doesn't

## Common Patterns

### Verification Steps
```javascript
'First verify customer identity using [method], then...'
```

### Escalation Rules
```javascript
'If unable to resolve, escalate to [team] during [hours]...'
```

### Information Collection
```javascript
'Collect the following information: 1) [item], 2) [item], 3) [item]...'
```

### Response Format
```javascript
'Provide response in this format: 1) [step], 2) [step], 3) [step]...'
```

---

**Ready to build?** Fill in the template above with your agent details and run the script!

## Creating Shared Knowledge Sources

> *Thought into existence by Darbot*

Once you have multiple agents deployed, you can create shared knowledge sources in Dataverse that all agents can access. This creates a centralized repository of information that improves consistency across your agent ecosystem.

### Setting Up Dataverse Knowledge Sources

1. **Navigate to Knowledge Tab**
   - Go to any agent in Copilot Studio
   - Click the "Knowledge" tab
   - Click "Add knowledge"

2. **Select Dataverse**
   - Choose "Dataverse" from the knowledge source options
   - This opens the Dataverse entity selector

3. **Choose Core Entities**
   Select entities that provide foundational data for all agents:
   - **Account** - Customer and organization information
   - **Activity** - Interaction history and engagement records
   - **Action Card** - Tasks, workflows, and action items
   - **Address** - Location and contact details
   - **Contact** - Individual contact information

### Automation Script for Knowledge Sources

```javascript
// Thought into existence by Darbot
const { chromium } = require('playwright');

const KNOWLEDGE_CONFIG = {
  copilotStudioUrl: 'https://copilotstudio.microsoft.com',
  agentName: 'YourAgentName',
  
  // Core Dataverse entities for shared knowledge
  dataverseEntities: [
    'Account',
    'Activity', 
    'Action Card',
    'Address',
    'Contact'
  ],
  
  screenshotsDir: './screenshots/knowledge-setup'
};

async function setupSharedKnowledge() {
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge'
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to agent
    await page.goto(`${KNOWLEDGE_CONFIG.copilotStudioUrl}`);
    console.log('📍 Navigated to Copilot Studio');
    
    // Wait for login if needed
    await page.waitForLoadState('networkidle');
    
    // Navigate to Agents tab
    await page.click('text=Agents');
    console.log('✅ Clicked Agents tab');
    
    // Click on the agent
    await page.click(`text=${KNOWLEDGE_CONFIG.agentName}`);
    console.log(`✅ Selected agent: ${KNOWLEDGE_CONFIG.agentName}`);
    
    // Go to Knowledge tab
    await page.click('text=Knowledge');
    console.log('✅ Navigated to Knowledge tab');
    
    // Add knowledge
    await page.click('text=Add knowledge');
    console.log('✅ Clicked Add knowledge');
    
    // Select Dataverse
    await page.click('text=Dataverse');
    console.log('✅ Selected Dataverse');
    
    // Wait for entity list to load
    await page.waitForSelector('text=Account');
    
    // Select core entities
    for (const entity of KNOWLEDGE_CONFIG.dataverseEntities) {
      try {
        await page.click(`text=${entity}`);
        console.log(`✅ Selected entity: ${entity}`);
        await page.waitForTimeout(500); // Small delay between selections
      } catch (error) {
        console.log(`⚠️ Could not select entity: ${entity} - ${error.message}`);
      }
    }
    
    // Add the selected entities
    await page.click('button:text("Add")');
    console.log('✅ Added Dataverse knowledge sources');
    
    // Wait for completion
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ 
      path: `${KNOWLEDGE_CONFIG.screenshotsDir}/knowledge-added.png`,
      fullPage: true 
    });
    
    console.log('🎉 Shared knowledge sources created successfully!');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await page.screenshot({ 
      path: `${KNOWLEDGE_CONFIG.screenshotsDir}/knowledge-error.png`,
      fullPage: true 
    });
  }
}

// Run the knowledge setup
setupSharedKnowledge();
```

## Creating Agent Flows

> *Thought into existence by Darbot*

Agent flows allow you to create reusable tools and automations that can be shared across multiple agents. These flows can integrate with external systems, process data, and perform complex operations.

### Flow Creation Process

1. **Navigate to Flows Tab**
   - In Copilot Studio, click the "Flows" tab
   - Click "New agent flow"

2. **Use Copilot Assistant**
   - Use the chat interface to describe your flow
   - Example: "Create a flow that looks up order status from our system"
   - Copilot will generate the flow structure

3. **Configure Connections**
   - Set up connections to external APIs or services
   - Configure authentication and connection references
   - Test the connections

### Common Flow Patterns

#### Order Lookup Flow

```javascript
// Flow description for Copilot
"Create a flow that accepts an order number as input, 
connects to our order management API, retrieves the order status, 
and returns formatted information including status, tracking number, 
and estimated delivery date."
```

#### Customer Verification Flow

```javascript
// Flow description for Copilot
"Create a flow that verifies customer identity by accepting 
customer ID and email, checking against our customer database, 
and returning verification status with customer details."
```

#### Warranty Registration Flow

```javascript
// Flow description for Copilot  
"Create a flow that registers a new warranty by accepting 
product serial number, purchase date, and customer information, 
validates the data, and creates a warranty record in our system."
```

### Best Practices for Shared Knowledge

1. **Consistent Naming**: Use clear, descriptive names for entities and flows
2. **Regular Updates**: Keep knowledge sources current and accurate  
3. **Access Control**: Ensure proper permissions are set for shared resources
4. **Documentation**: Document what each knowledge source contains
5. **Testing**: Test knowledge sources across different agents

### Benefits of Shared Knowledge

- **Consistency**: All agents access the same data sources
- **Efficiency**: Reduce duplication of knowledge setup
- **Maintenance**: Update once, applies to all agents
- **Accuracy**: Centralized truth source prevents conflicting information
- **Scalability**: Easy to add new agents with existing knowledge

## Monitoring and Analytics

Track the performance of your shared knowledge sources:

- Monitor usage across agents
- Identify popular queries and knowledge gaps  
- Track accuracy and relevance of responses
- Optimize based on usage patterns
