const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    console.log('[CONSOLE]', text);
  });

  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('\n=== Testing Furniture Drag and Drop ===\n');

  // Take initial screenshot
  await page.screenshot({ path: '.playwright-cli/test-initial.png' });

  // Find the Modern Chair item
  const chairCard = page.locator('div').filter({ hasText: /^Modern Chair/ }).filter({ has: page.locator('img') }).first();

  console.log('1. Looking for Modern Chair...');
  const chairVisible = await chairCard.isVisible();
  console.log('   Modern Chair visible:', chairVisible);

  // Check if it's draggable
  const isDraggable = await chairCard.evaluate(el => el.getAttribute('draggable'));
  console.log('   Draggable attribute:', isDraggable);

  // Get the canvas
  const canvas = page.locator('canvas').first();
  const canvasVisible = await canvas.isVisible();
  console.log('2. Canvas visible:', canvasVisible);

  // Perform the drag
  console.log('3. Starting drag operation...');
  await chairCard.dragTo(canvas, {
    targetPosition: { x: 400, y: 400 }
  });
  console.log('   Drag completed');

  await page.waitForTimeout(2000);

  // Take screenshot after drag
  await page.screenshot({ path: '.playwright-cli/test-after-drag.png' });

  // Check console for dropFurniture event
  const hasDropEvent = consoleMessages.some(msg => msg.includes('dropFurniture') || msg.includes('Placed furniture'));
  console.log('4. Drop event found in console:', hasDropEvent);

  // Check for furniture in the properties panel or scene
  const propertiesText = await page.locator('text=/Furniture|Objects/').count();
  console.log('5. Furniture count indicators:', propertiesText);

  console.log('\n=== Console Messages ===');
  consoleMessages.forEach(msg => {
    if (msg.includes('drag') || msg.includes('drop') || msg.includes('furniture') || msg.includes('DEBUG')) {
      console.log('  -', msg);
    }
  });

  await page.waitForTimeout(1000);
  await browser.close();
})();
