// Thought into existence by Darbot
const { chromium } = require('playwright');

async function connectToBrowser() {
  console.log('Connecting to Microsoft Edge browser on port 9223...');
  
  try {
    // Connect to the browser launched with remote debugging
    const browser = await chromium.connectOverCDP('http://localhost:9223');
    console.log('✅ Connected to browser successfully!');
    
    // Get existing contexts (browser windows/tabs)
    const contexts = browser.contexts();
    console.log(`Found ${contexts.length} browser contexts (windows)`);
    
    // Use the first context if available
    let context;
    if (contexts.length > 0) {
      context = contexts[0];
      console.log('Using existing browser context');
    } else {
      context = await browser.newContext();
      console.log('Created new browser context');
    }
    
    // Get all pages in this context
    const pages = context.pages();
    console.log(`Found ${pages.length} pages (tabs)`);
    
    // Use the first page or create a new one
    let page;
    if (pages.length > 0) {
      page = pages[0];
      console.log(`Current page URL: ${page.url()}`);
    } else {
      page = await context.newPage();
      console.log('Created new page');
    }
    
    // Now we can automate this page
    console.log('Ready to automate the browser!');
    console.log('Press Ctrl+C to disconnect');
    
    // Keep the script running to maintain the connection
    await new Promise(resolve => {
      // We'll keep the connection open until the script is manually terminated
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
connectToBrowser();
