import { chromium } from 'playwright';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDraw() {
  console.log('🧪 Testing draw in Feature 21 Test Project\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Capture console logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('[DEBUG')) {
        console.log('🔍', text);
      }
    });

    // Open the Feature 21 Test Project
    console.log('📍 Opening Feature 21 Test Project...');
    await page.goto('http://localhost:5175/editor/1');
    await sleep(2000);

    // Select Draw Wall tool
    console.log('📍 Selecting Draw Wall tool...');
    const drawWallButton = page.getByRole('button', { name: 'Draw Wall' });
    await drawWallButton.click();
    await sleep(500);

    // Get canvas
    console.log('📍 Finding canvas...');
    const canvas = page.locator('canvas').first();
    await canvas.waitFor({ state: 'visible' });

    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas not found');
    }

    // Calculate coordinates for drawing (away from existing room)
    const startX = box.x + box.width * 0.6;
    const startY = box.y + box.height * 0.3;
    const endX = box.x + box.width * 0.85;
    const endY = box.y + box.height * 0.55;

    console.log('📍 Drawing room...');
    console.log(`   From (${Math.floor(startX)}, ${Math.floor(startY)}) to (${Math.floor(endX)}, ${Math.floor(endY)})`);

    // Perform drag
    await page.mouse.move(startX, startY);
    await sleep(100);
    await page.mouse.down();
    await sleep(100);

    // Move in steps
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await sleep(25);
    }

    // Screenshot during drag
    await sleep(200);
    await page.screenshot({ path: 'draw-test-during-drag.png' });
    console.log('📸 Screenshot during drag');

    // Release
    await page.mouse.up();
    await sleep(1500);

    // Final screenshot
    await page.screenshot({ path: 'draw-test-after-drag.png' });
    console.log('📸 Screenshot after drag');

    // Check room count
    const roomCountElem = await page.locator('text=/Rooms: [0-9]+/i').first();
    const roomCount = await roomCountElem.textContent();
    console.log(`\n📊 ${roomCount}`);

    console.log('\n✅ Test completed!');
    await sleep(2000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'draw-test-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

testDraw().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
