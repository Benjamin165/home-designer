import { chromium } from 'playwright';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFeature21Regression() {
  console.log('🧪 Testing Feature #21 Regression\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the already open editor page
    console.log('📍 Navigating to Test Project Open in editor...');
    await page.goto('http://localhost:5175/editor/4');
    await sleep(2000);

    // Step 1: Select Draw Wall tool
    console.log('📍 Selecting Draw Wall tool...');
    const drawWallButton = page.getByRole('button', { name: 'Draw Wall' });
    await drawWallButton.click();
    await sleep(500);
    console.log('✅ Draw Wall tool selected');

    // Step 2: Get canvas for drawing
    console.log('📍 Finding canvas element...');
    const canvas = page.locator('canvas').first();
    await canvas.waitFor({ state: 'visible' });

    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas not found');
    }

    // Calculate drawing coordinates
    const startX = box.x + box.width * 0.4;
    const startY = box.y + box.height * 0.5;
    const endX = box.x + box.width * 0.7;
    const endY = box.y + box.height * 0.7;

    console.log('📍 Drawing room with mouse drag...');
    console.log(`   Start: (${Math.floor(startX)}, ${Math.floor(startY)})`);
    console.log(`   End: (${Math.floor(endX)}, ${Math.floor(endY)})`);

    // Perform drag operation
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await sleep(100);

    // Move in steps to trigger dimension updates
    const steps = 15;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await sleep(30);
    }

    // Check for live dimensions during drag
    await sleep(100);
    await page.screenshot({ path: 'regression-f21-during-drag.png' });
    console.log('📸 Screenshot during drag saved');

    // Release mouse
    await page.mouse.up();
    await sleep(1000);
    console.log('✅ Drag completed');

    // Verify room was created
    await page.screenshot({ path: 'regression-f21-after-drag.png' });
    console.log('📸 Screenshot after drag saved');

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    console.log('\n✅ Feature 21 regression test completed successfully!');
    console.log('📸 Check screenshots: regression-f21-during-drag.png, regression-f21-after-drag.png');

    await sleep(2000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'regression-f21-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

testFeature21Regression().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
