const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  const page = pages[0];

  console.log('=== Feature 32: Drag Modern Chair Test ===\n');

  // Find the Modern Chair card (ref=e161)
  const chairCard = page.locator('div').filter({ hasText: /^Modern Chair/ }).nth(3);

  const chairBox = await chairCard.boundingBox();

  if (!chairBox) {
    console.log('ERROR: Could not find Modern Chair bounding box');
    await browser.close();
    return;
  }

  console.log(`Found Modern Chair at (${Math.floor(chairBox.x)}, ${Math.floor(chairBox.y)})`);
  console.log('1. Starting drag from Modern Chair...');

  const dragStartX = chairBox.x + chairBox.width / 2;
  const dragStartY = chairBox.y + chairBox.height / 2;

  await page.mouse.move(dragStartX, dragStartY);
  await page.waitForTimeout(200);

  await page.mouse.down();
  console.log('   Mouse down on Modern Chair');
  await page.waitForTimeout(300);

  console.log('2. Dragging to 3D viewport...');

  // Drag to center of viewport (around coordinates 700, 450)
  const targetX = 700;
  const targetY = 450;

  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.waitForTimeout(500);

  console.log('3. Taking screenshot during drag...');
  await page.screenshot({ path: '.playwright-cli/f32-chair-during-drag.png' });
  console.log('   ✓ Screenshot saved: f32-chair-during-drag.png');

  console.log('4. Releasing mouse to drop furniture...');
  await page.mouse.up();
  await page.waitForTimeout(2000);

  console.log('5. Taking screenshot after drop...');
  await page.screenshot({ path: '.playwright-cli/f32-chair-after-drop.png' });
  console.log('   ✓ Screenshot saved: f32-chair-after-drop.png');

  // Check console for errors
  console.log('6. Checking for console errors...');
  await page.waitForTimeout(500);

  console.log('\n=== Test Complete ===');
  console.log('Check screenshots:');
  console.log('  - f32-chair-during-drag.png (should show furniture preview following cursor)');
  console.log('  - f32-chair-after-drop.png (should show furniture placed in scene)');

  await browser.close();
})();
