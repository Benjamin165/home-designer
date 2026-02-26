const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all errors with stack traces
  const errors = [];
  page.on('pageerror', err => {
    errors.push({
      message: err.message,
      stack: err.stack,
    });
    console.log('\n=== PAGE ERROR ===');
    console.log('Message:', err.message);
    console.log('Stack:', err.stack);
  });

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  await page.locator('text=Test Project Open').first().click();
  await page.waitForTimeout(3000);

  await page.locator('text=Asset Library').first().click().catch(() => {});
  await page.waitForTimeout(1000);

  const draggableItems = await page.locator('[draggable="true"]').all();

  if (draggableItems.length > 0) {
    const item = draggableItems[0];
    const canvas = await page.locator('canvas').first();

    const itemBox = await item.boundingBox();
    const canvasBox = await canvas.boundingBox();

    if (itemBox && canvasBox) {
      console.log('Performing drag operation...');

      try {
        await item.dragTo(canvas, {
          targetPosition: {
            x: canvasBox.width / 2,
            y: canvasBox.height / 2
          }
        });
      } catch (e) {
        console.log('Drag error:', e.message);
      }

      await page.waitForTimeout(2000);
    }
  }

  console.log('\n=== TOTAL ERRORS:', errors.length, '===');
  errors.forEach((err, i) => {
    console.log(`\nError ${i + 1}:`);
    console.log(err.message);
    console.log(err.stack);
  });

  await browser.close();
})();
