# Thought into existence by Darbot
# Run all the Dataverse Hero quest levels in sequence

# Create screenshots directory if it doesn't exist
mkdir -p ./screenshots

echo "🎮 Starting Dataverse Hero Quest..."
echo "===================================="

# Level 1: Boot & Login
echo "🏆 Level 1: Edge Boots - Setting up authentication..."
npx playwright test mcp-level1-login.spec.ts
if [ $? -ne 0 ]; then
  echo "❌ Level 1 failed! Please check the error and try again."
  exit 1
fi
echo "✅ Level 1 complete! Achievement unlocked: Edge Boots"
echo ""

# Level 2: Data Scrolls
echo "🏆 Level 2: Data Scrolls - Attaching Dataverse knowledge..."
npx playwright test mcp-level2-knowledge.spec.ts
if [ $? -ne 0 ]; then
  echo "❌ Level 2 failed! Please check the error and try again."
  exit 1
fi
echo "✅ Level 2 complete! Achievement unlocked: Data Scrolls"
echo ""

# Level 3: Publisher Cape
echo "🏆 Level 3: Publisher Cape - Fixing validation errors..."
npx playwright test mcp-level3-fix-errors.spec.ts
if [ $? -ne 0 ]; then
  echo "❌ Level 3 failed! Please check the error and try again."
  exit 1
fi
echo "✅ Level 3 complete! Achievement unlocked: Publisher Cape"
echo ""

# Level 4: Flow Hammer
echo "🏆 Level 4: Flow Hammer - Creating Order Status Flow..."
npx playwright test mcp-level4-flow.spec.ts
if [ $? -ne 0 ]; then
  echo "❌ Level 4 failed! Please check the error and try again."
  exit 1
fi
echo "✅ Level 4 complete! Achievement unlocked: Flow Hammer"
echo ""

# Level 5: Dataverse Hero
echo "🏆 Level 5: Boss Battle - End-to-end testing..."
npx playwright test mcp-level5-e2e.spec.ts
if [ $? -ne 0 ]; then
  echo "❌ Level 5 failed! Please check the error and try again."
  exit 1
fi
echo "✅ Level 5 complete! Achievement unlocked: Dataverse Hero"
echo ""

echo "🎉🎉🎉 Congratulations! You've completed all levels and earned the Dataverse Hero badge! 🎉🎉🎉"
echo "📊 View your test report with: npx playwright show-report"
