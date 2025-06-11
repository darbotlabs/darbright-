/**
 * Build script for MSIX package
 */

const fs = require('fs');
const path = require('path');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copy manifest
fs.copyFileSync(
    path.join(__dirname, 'Package.appxmanifest'),
    path.join(distDir, 'Package.appxmanifest')
);

// Create Images directory
const imagesDir = path.join(distDir, 'Images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Create placeholder images (in a real scenario, you'd provide actual images)
const createPlaceholderImage = (size, filename) => {
    const filePath = path.join(imagesDir, filename);
    // Create a minimal PNG placeholder
    const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, size, 0x00, 0x00, 0x00, size, // width, height
        0x08, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // bit depth, color type, etc.
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
    ]);
    fs.writeFileSync(filePath, pngData);
};

// Create required image assets
createPlaceholderImage(150, 'Square150x150Logo.png');
createPlaceholderImage(44, 'Square44x44Logo.png');
createPlaceholderImage(50, 'StoreLogo.png');
createPlaceholderImage(620, 'SplashScreen.png');

// Create Wide310x150Logo.png (310x150)
const wideLogoPath = path.join(imagesDir, 'Wide310x150Logo.png');
const widePngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x01, 0x36, 0x00, 0x00, 0x00, 0x96, // 310x150
    0x08, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);
fs.writeFileSync(wideLogoPath, widePngData);

// Create a simple executable stub
const executableContent = `#!/usr/bin/env node
console.log("DarBright Playwright MSIX Package");
console.log("This would launch the VSCode extension installation or configuration tool");
process.exit(0);
`;

fs.writeFileSync(
    path.join(distDir, 'DarBrightPlaywright.exe'),
    executableContent
);

// Copy VSCode extension if it exists
const vsixSource = path.join(__dirname, '../playwright-vscode/darbright-playwright-1.0.0.vsix');
if (fs.existsSync(vsixSource)) {
    fs.copyFileSync(vsixSource, path.join(distDir, 'darbright-playwright-1.0.0.vsix'));
}

// Create installation script
const installScript = `@echo off
echo Installing DarBright Playwright Extension...
echo.
echo This package includes:
echo - VSCode Extension: darbright-playwright-1.0.0.vsix
echo - MCP Server support
echo - Power Platform integration
echo.
echo To install the VSCode extension manually:
echo   code --install-extension darbright-playwright-1.0.0.vsix
echo.
echo For MCP server setup, see documentation.
echo.
pause
`;

fs.writeFileSync(path.join(distDir, 'install.bat'), installScript);

console.log('MSIX package built successfully in dist/ directory');
console.log('Contents:');
console.log('- Package.appxmanifest');
console.log('- Images/ (placeholder assets)');
console.log('- DarBrightPlaywright.exe (stub)');
console.log('- darbright-playwright-1.0.0.vsix (if available)');
console.log('- install.bat (installation helper)');