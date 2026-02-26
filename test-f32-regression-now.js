// Test Feature 32 Regression: Drag furniture from library to 3D scene
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to the editor (project 1 - Feature 21 Test Project)
  await page.goto('http://localhost:5173/editor/1');
  await page.waitForTimeout(2000);

  console.log('Page loaded, looking for Modern Chair...');

  // Find the Modern Chair element
  const chair = await page.waitForSelector('text=Modern Chair', { timeout: 5000 });
  const chairBox = await chair.boundingBox();

  console.log('Modern Chair found at:', chairBox);

  // Get the 3D viewport (canvas element)
  const canvas = await page.$('canvas');
  const canvasBox = await canvas.boundingBox();

  console.log('Canvas found at:', canvasBox);

  // Calculate drag coordinates
  const startX = chairBox.x + chairBox.width / 2;
  const startY = chairBox.y + chairBox.height / 2;
  const endX = canvasBox.x + canvasBox.width / 2;
  const endY = canvasBox.y + canvasBox.height / 2;

  console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

  // Perform drag and drop
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(300);

  // Take screenshot during drag
  await page.screenshot({ path: 'D:\\repos\\home-designer\\f32-regression-during-drag.png' });
  console.log('Screenshot during drag saved');

  // Move in steps to simulate drag
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps);
    const y = startY + (endY - startY) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(30);
  }

  await page.mouse.up();
  await page.waitForTimeout(1000);

  console.log('Drag completed, taking screenshot...');

  // Take screenshot after drop
  await page.screenshot({ path: 'D:\\repos\\home-designer\\f32-regression-after-drop.png' });

  console.log('Screenshot saved');

  // Check for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.waitForTimeout(1000);

  if (errors.length > 0) {
    console.log('Console errors:', errors);
  } else {
    console.log('No console errors detected');
  }

  console.log('Test complete!');

  await browser.close();
})();
