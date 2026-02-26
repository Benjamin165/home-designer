// Test Feature 32: Drag furniture from library to 3D scene
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to the editor
  await page.goto('http://localhost:5173/editor/10');
  await page.waitForTimeout(2000);

  console.log('Page loaded, looking for Modern Sofa...');

  // Find the Modern Sofa element
  const sofa = await page.waitForSelector('text=Modern Sofa');
  const sofaBox = await sofa.boundingBox();

  console.log('Modern Sofa found at:', sofaBox);

  // Get the 3D viewport (canvas element)
  const canvas = await page.$('canvas');
  const canvasBox = await canvas.boundingBox();

  console.log('Canvas found at:', canvasBox);

  // Calculate drag coordinates
  const startX = sofaBox.x + sofaBox.width / 2;
  const startY = sofaBox.y + sofaBox.height / 2;
  const endX = canvasBox.x + canvasBox.width / 2;
  const endY = canvasBox.y + canvasBox.height / 2;

  console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

  // Perform drag and drop
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100);

  // Move in steps to simulate drag
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps);
    const y = startY + (endY - startY) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(50);
  }

  await page.mouse.up();
  await page.waitForTimeout(1000);

  console.log('Drag completed, taking screenshot...');

  // Take screenshot
  await page.screenshot({ path: 'furniture-dragged-feature32.png', fullPage: true });

  console.log('Screenshot saved to furniture-dragged-feature32.png');

  // Check console for errors
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.waitForTimeout(1000);

  console.log('Test complete!');

  await browser.close();
})();
