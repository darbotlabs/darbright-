# Copilot Studio Analyzer

A powerful tool for analyzing Microsoft Copilot Studio UI and generating detailed reports.

## Overview

This tool automatically launches Microsoft Edge, navigates to Copilot Studio, and performs a comprehensive analysis of the UI elements, structure, and performance. It captures screenshots and generates both JSON and Markdown reports.

## Features

- 📸 **Screenshot Capture**: Takes both full-page and viewport screenshots
- 🧠 **UI Analysis**: Identifies and counts headings, interactive elements, navigation components, and forms
- 🤖 **Copilot-Specific Analysis**: Detects agent elements, creation buttons, and Microsoft branding
- ⚡ **Performance Metrics**: Measures page load times and first paint metrics
- 📊 **Reporting**: Generates structured JSON and human-readable Markdown reports

## Requirements

- Node.js (v14+)
- Microsoft Edge browser
- Playwright Core (`npm install playwright-core`)
- A valid Microsoft account with access to Copilot Studio

## Usage

1. Clone or download this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the analyzer:
   ```
   node analyze.js
   ```

## Output

The tool creates two main types of output:

### 📂 Screenshots (`/screenshots`)

- `copilot-studio-full-[timestamp].png` - Full page screenshot
- `copilot-studio-viewport-[timestamp].png` - Viewport screenshot

### 📂 Analysis (`/analysis`)

- `ui-analysis-[timestamp].json` - Detailed JSON analysis data
- `ui-analysis-[timestamp].md` - Human-readable Markdown report

## File Structure

```
copilot-studio-analyzer/
├── analyze.js            # Main analysis script
├── README.md             # This documentation
├── screenshots/          # Generated screenshots
└── analysis/             # Generated analysis reports
```

## Example Report

The Markdown report includes:
- Page information (title, URL)
- Main headings found
- Interactive element summary
- Copilot Studio specific features
- Performance metrics
- Links to screenshots

## Notes

- The browser remains open after analysis for further manual testing
- Performance metrics may vary depending on network conditions and system performance

---
*Thought into existence by Darbot* 🤖
