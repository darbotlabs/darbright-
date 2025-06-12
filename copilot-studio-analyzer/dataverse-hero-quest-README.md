# 🏗️ Dataverse Hero Quest
*Thought into existence by Darbot*

Complete the Copilot Studio "Dataverse Hero" quest by running the test automation scripts.

## 📋 Prerequisites

Before starting the quest, make sure you have:

- Node.js v18 or higher
- PowerShell or Bash
- Playwright Test installed: `npm i -D playwright-core @playwright/test`
- Microsoft Edge browser installed
- A Copilot Studio tenant with an agent named **WarrantyGuard**
- Environment variables set:
  - `MCP_EMAIL` - Your AAD email for Copilot Studio login
  - `MCP_PWD` - Your AAD password
  - Optionally: `PWDEBUG=console` for in-browser inspector

## 🚀 Getting Started

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   ```powershell
   # PowerShell
   $env:MCP_EMAIL = "your.email@example.com"
   $env:MCP_PWD = "your-password"
   ```
   ```bash
   # Bash
   export MCP_EMAIL="your.email@example.com"
   export MCP_PWD="your-password"
   ```

## 🎮 Running the Quest

You can run the entire quest at once using:

```powershell
# PowerShell
./run-dataverse-hero.ps1
```

```bash
# Bash
bash ./run-dataverse-hero.sh
```

Or run each level individually:

```
npx playwright test mcp-level1-login.spec.ts
```

## 🎯 Quest Levels

| Level | Name | XP | Goal |
|-------|------|----|----|
| 1 | Edge Boots | 100 | Set up Playwright and authenticate with Copilot Studio |
| 2 | Data Scrolls | 250 | Attach Dataverse knowledge sources |
| 3 | Publisher Cape | 150 | Fix validation errors and mark sources as official |
| 4 | Flow Hammer | 300 | Create an Order Status Agent Flow |
| 5 | Boss Battle | 500 | End-to-end test with screenshots |

## 📊 Viewing Results

After completing the quest, you can view the test report with:

```
npx playwright show-report
```

Screenshots for each level are saved in the `screenshots/` directory.

## 💡 Troubleshooting

- If authentication fails, make sure your MCP_EMAIL and MCP_PWD environment variables are set correctly
- For login issues, try using the `--headed` flag to see the browser: `npx playwright test mcp-level1-login.spec.ts --headed`
- If selectors don't work, try using the `--debug` flag: `npx playwright test mcp-level2-knowledge.spec.ts --debug`
- Use the "Power-Ups" mentioned in the hints section of the original quest

## 🏆 Completion

Once all levels are complete, you'll earn the **Dataverse Hero** badge! 🎉
