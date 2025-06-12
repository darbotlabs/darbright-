# Thought into existence by Darbot
# Run all the Dataverse Hero quest levels in sequence

# Create screenshots directory if it doesn't exist
if (-not (Test-Path -Path ".\screenshots")) {
    New-Item -Path ".\screenshots" -ItemType Directory | Out-Null
}

Write-Host "🎮 Starting Dataverse Hero Quest..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Level 1: Boot & Login
Write-Host "🏆 Level 1: Edge Boots - Setting up authentication..." -ForegroundColor Yellow
npx playwright test mcp-level1-login.spec.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Level 1 failed! Please check the error and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Level 1 complete! Achievement unlocked: Edge Boots" -ForegroundColor Green
Write-Host ""

# Level 2: Data Scrolls
Write-Host "🏆 Level 2: Data Scrolls - Attaching Dataverse knowledge..." -ForegroundColor Yellow
npx playwright test mcp-level2-knowledge.spec.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Level 2 failed! Please check the error and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Level 2 complete! Achievement unlocked: Data Scrolls" -ForegroundColor Green
Write-Host ""

# Level 3: Publisher Cape
Write-Host "🏆 Level 3: Publisher Cape - Fixing validation errors..." -ForegroundColor Yellow
npx playwright test mcp-level3-fix-errors.spec.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Level 3 failed! Please check the error and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Level 3 complete! Achievement unlocked: Publisher Cape" -ForegroundColor Green
Write-Host ""

# Level 4: Flow Hammer
Write-Host "🏆 Level 4: Flow Hammer - Creating Order Status Flow..." -ForegroundColor Yellow
npx playwright test mcp-level4-flow.spec.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Level 4 failed! Please check the error and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Level 4 complete! Achievement unlocked: Flow Hammer" -ForegroundColor Green
Write-Host ""

# Level 5: Dataverse Hero
Write-Host "🏆 Level 5: Boss Battle - End-to-end testing..." -ForegroundColor Yellow
npx playwright test mcp-level5-e2e.spec.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Level 5 failed! Please check the error and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Level 5 complete! Achievement unlocked: Dataverse Hero" -ForegroundColor Green
Write-Host ""

Write-Host "🎉🎉🎉 Congratulations! You've completed all levels and earned the Dataverse Hero badge! 🎉🎉🎉" -ForegroundColor Magenta
Write-Host "📊 View your test report with: npx playwright show-report" -ForegroundColor Cyan
