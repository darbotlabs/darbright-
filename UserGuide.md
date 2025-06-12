# Playwright User Guide

## Opening Browser Tabs in VS Code

This guide shows you how to open browser tabs directly within VS Code for viewing test reports, documentation, and web applications during Playwright development.

### Method 1: VS Code Command Palette (Recommended)

The most common and user-friendly way to open a browser tab in VS Code:

1. **Open Command Palette**: Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. **Search for Simple Browser**: Type "Simple Browser" 
3. **Select Command**: Choose "Simple Browser: Show"
4. **Enter URL**: Type or paste the URL you want to open

```
Example URLs:
- https://playwright.dev/
- http://localhost:3000
- file:///path/to/your/test-report.html
```

### Method 2: VS Code Menu Navigation

Alternative menu-based approach:

1. **View Menu**: Go to `View` → `Command Palette...`
2. **Search**: Type "Simple Browser: Show"
3. **Execute**: Press Enter and provide the URL

### Method 3: Keyboard Shortcut (If Configured)

You can set up a custom keyboard shortcut:

1. **Open Keyboard Shortcuts**: `Ctrl+K Ctrl+S`
2. **Search**: Look for "Simple Browser: Show"
3. **Assign Shortcut**: Click the pencil icon and assign your preferred key combination

### Method 4: PowerShell Command (External Browser)

For opening an external Edge browser window from PowerShell:

```powershell
# Open external Edge browser (not integrated in VS Code)
Start-Process msedge "https://playwright.dev/"

# Open with specific options
Start-Process msedge -ArgumentList "https://playwright.dev/", "--new-window"
```

### Method 5: Automated Edge Browser Screenshot Capture

For automated testing and documentation purposes, you can programmatically launch Edge, navigate to a specific URL, and capture screenshots using the darbright Playwright project:

```powershell
# Launch Edge with remote debugging enabled
Start-Process msedge -ArgumentList "--remote-debugging-port=9222", "--new-window", "https://copilotstudio.microsoft.com"

# Wait for browser to start
Start-Sleep -Seconds 5

# Use Playwright to connect and capture screenshot
cd "d:\0GH_PROD\darbright-"
node -e "
const { chromium } = require('./packages/playwright-core');
(async () => {
  try {
    console.log('Connecting to Edge browser...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    
    if (contexts.length > 0) {
      const pages = contexts[0].pages();
      if (pages.length > 0) {
        let targetPage = pages.find(p => p.url().includes('copilotstudio'));
        if (!targetPage) targetPage = pages[0];
        
        await targetPage.waitForLoadState('networkidle', { timeout: 10000 });
        await targetPage.screenshot({ 
          path: 'edge-copilot-studio.png', 
          fullPage: true
        });
        console.log('Screenshot saved as edge-copilot-studio.png');
      }
    }
    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
"
```

**Advantages of Automated Screenshot Capture:**

- ✅ **Browser-specific capture**: Only captures browser content, not desktop
- ✅ **Full page screenshots**: Captures entire scrollable content  
- ✅ **High quality**: PNG format with detailed capture
- ✅ **Automation ready**: Perfect for CI/CD pipelines
- ✅ **Authenticated content**: Can capture logged-in application states

**Note on Screenshot Analysis:**
While this method can capture high-quality screenshots of web applications, direct image analysis requires additional tools or manual review. The captured screenshots can be used for:
- Documentation purposes
- Visual regression testing setup
- Manual quality assurance review
- Automated testing evidence collection

### Common Use Cases

After running tests, view the HTML report:

```powershell
# First generate the report
npx playwright test
npx playwright show-report

# Then use Command Palette:
# Ctrl+Shift+P → "Simple Browser: Show" → 
# file:///your/project/path/playwright-report/index.html
```

#### 2. Browsing Playwright Documentation

Quick access to documentation:

```
# Use Command Palette to open:
https://playwright.dev/docs/intro
```

#### 3. Testing Local Development Servers

View your application during development:

```
# Common local development URLs:
http://localhost:3000
http://localhost:8080
http://127.0.0.1:5173
```

#### 4. Viewing Live Test Execution

During test development, open the application being tested:

```
# Example: TodoMVC demo app used in Playwright examples
https://demo.playwright.dev/todomvc
```

### Advantages of VS Code Simple Browser

✅ **Integrated Workflow**: Stay within your development environment  
✅ **Side-by-Side Viewing**: Browse while coding  
✅ **No Context Switching**: Avoid switching between applications  
✅ **File System Access**: Direct access to local HTML files  
✅ **Debugging Friendly**: View sources and network activity  

### Pro Tips

#### 1. Pinning Browser Tabs
Once opened, you can pin the Simple Browser tab for quick access by right-clicking the tab.

#### 2. Multiple Browser Instances
You can open multiple Simple Browser tabs with different URLs simultaneously.

#### 3. Refresh and Navigation
The Simple Browser supports:
- **Refresh**: `Ctrl+R` or `F5`
- **Back/Forward**: Use browser navigation buttons
- **Developer Tools**: Right-click → "Inspect Element"

#### 4. Bookmarking Frequently Used URLs
Consider creating a workspace settings file with common URLs:

```json
// .vscode/settings.json
{
  "playwright.commonUrls": {
    "docs": "https://playwright.dev/docs/intro",
    "reports": "file:///playwright-report/index.html",
    "demo": "https://demo.playwright.dev/todomvc"
  }
}
```

### Troubleshooting

#### Browser Tab Not Opening
- **Check URL Format**: Ensure proper protocol (`http://`, `https://`, `file://`)
- **Local File Paths**: Use absolute paths for local files
- **Network Issues**: Verify internet connection for external URLs

#### Performance Issues
- **Close Unused Tabs**: Simple Browser tabs consume memory
- **Reload if Stuck**: Use `Ctrl+R` to refresh unresponsive pages

#### File Access Problems
```powershell
# Correct file URL format for Windows:
file:///D:/path/to/your/file.html

# Incorrect (won't work):
D:\path\to\your\file.html
```

### Alternative Browser Options

#### External Browser Integration
If you prefer external browsers, configure VS Code to open links externally:

```json
// settings.json
{
  "workbench.externalBrowser": "msedge"
}
```

#### Browser Preview Extensions
Consider installing browser preview extensions for enhanced functionality:

- **Browser Preview**: Advanced browser integration
- **Live Server**: For serving local files with live reload

### Security Considerations

When using Simple Browser:

⚠️ **Local File Access**: Be cautious with file:// URLs  
⚠️ **External Content**: Simple Browser has limited security features  
⚠️ **Sensitive Data**: Avoid entering credentials in Simple Browser  

### Integration with Playwright Workflow

#### Complete Development Cycle

1. **Write Tests**: Create Playwright test files
2. **Run Tests**: Execute with `npx playwright test`
3. **View Results**: Open reports in Simple Browser
4. **Debug Issues**: Use browser for manual verification
5. **Iterate**: Refine tests based on observations

#### Example Workflow Commands

```powershell
# Step 1: Run tests
npx playwright test

# Step 2: Generate and view report
npx playwright show-report

# Step 3: Open in VS Code browser (via Command Palette)
# Ctrl+Shift+P → "Simple Browser: Show" → 
# file:///D:/your/project/playwright-report/index.html

# Step 4: Open application for manual testing
# Ctrl+Shift+P → "Simple Browser: Show" → 
# https://your-app-url.com

# Step 5: Automated screenshot capture for documentation
# Launch Edge with debugging and capture screenshot
Start-Process msedge -ArgumentList "--remote-debugging-port=9222", "--new-window", "https://your-app-url.com"
Start-Sleep -Seconds 5
# Use Playwright from darbright project to capture screenshot
cd "d:\0GH_PROD\darbright-"
node -e "/* screenshot capture script */"
```

---

## Additional Resources

- [VS Code Simple Browser Documentation](https://code.visualstudio.com/docs/editor/browsersupport)
- [Playwright Test Reports](https://playwright.dev/docs/test-reporters)
- [Playwright Getting Started](https://playwright.dev/docs/intro)

*This guide is part of the Playwright validation project completed on June 11, 2025.*