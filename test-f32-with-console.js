const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  const consoleMessages = [];
  const errors = [];

  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`Console [${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.log('Page error:', err.message);
  });

  console.log('=== Opening project ===');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  await page.locator('text=Test Project Open').first().click();
  await page.waitForTimeout(3000);

  console.log('\n=== Looking for furniture items ===');
  await page.locator('text=Asset Library').first().click().catch(() => {});
  await page.waitForTimeout(1000);

  const draggableItems = await page.locator('[draggable="true"]').all();
  console.log(`Found ${draggableItems.length} draggable items`);

  if (draggableItems.length > 0) {
    const item = draggableItems[0];

    // Get item details
    const itemText = await item.textContent();
    console.log('Item text:', itemText.trim().substring(0, 100));

    await page.screenshot({ path: 'test-f32-console-before.png', fullPage: true });

    const itemBox = await item.boundingBox();
    const canvas = await page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();

    if (itemBox && canvasBox) {
      console.log('\n=== Starting drag operation ===');

      const startX = itemBox.x + itemBox.width / 2;
      const startY = itemBox.y + itemBox.height / 2;
      const endX = canvasBox.x + canvasBox.width / 2;
      const endY = canvasBox.y + canvasBox.height / 2;

      // Try using the built-in drag-and-drop
      console.log('Attempting drag with page.dragAndDrop...');
      try {
        await item.dragTo(canvas, {
          targetPosition: {
            x: canvasBox.width / 2,
            y: canvasBox.height / 2
          }
        });
        await page.waitForTimeout(2000);
        console.log('Drag completed');
      } catch (e) {
        console.log('dragTo failed:', e.message);
        console.log('Trying manual drag...');

        // Manual drag
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.waitForTimeout(300);

        await page.mouse.move(endX, endY, { steps: 10 });
        await page.waitForTimeout(300);

        await page.mouse.up();
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: 'test-f32-console-after.png', fullPage: true });

      // Check if furniture was added to the scene
      console.log('\n=== Checking scene ===');

      // Look for furniture in the scene list or properties panel
      const sceneText = await page.textContent('body');
      const hasFurniture = sceneText.includes('Sofa') || sceneText.includes('Chair') ||
                          sceneText.includes('Table') || sceneText.includes('furniture');

      console.log('Scene contains furniture keywords:', hasFurniture);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Console messages:', consoleMessages.length);
  console.log('Errors:', errors.length);

  if (errors.length > 0) {
    console.log('\nErrors found:');
    errors.forEach(err => console.log('  -', err));
  }

  if (consoleMessages.filter(m => m.includes('error')).length > 0) {
    console.log('\nConsole errors:');
    consoleMessages.filter(m => m.includes('error')).forEach(msg => console.log('  -', msg));
  }

  await browser.close();
})();
