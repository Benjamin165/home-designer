import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  console.log('Navigating to editor...');
  await page.goto('http://localhost:5173/editor/10', { waitUntil: 'networkidle2' });
  await page.waitForTimeout(2000);

  console.log('Looking for Modern Sofa in asset library...');

  // Find the Modern Sofa element
  const sofaElement = await page.waitForSelector('p:has-text("Modern Sofa")');

  if (!sofaElement) {
    console.error('Modern Sofa not found!');
    await browser.close();
    return;
  }

  console.log('Modern Sofa found!');

  // Get bounding boxes
  const sofaBox = await sofaElement.boundingBox();
  const canvas = await page.$('canvas');
  const canvasBox = await canvas.boundingBox();

  console.log('Sofa position:', sofaBox);
  console.log('Canvas position:', canvasBox);

  // Perform drag from sofa to center of canvas
  const startX = sofaBox.x + sofaBox.width / 2;
  const startY = sofaBox.y + sofaBox.height / 2;
  const endX = canvasBox.x + canvasBox.width / 2;
  const endY = canvasBox.y + canvasBox.height / 2;

  console.log(`Dragging from (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(endX)}, ${Math.round(endY)})`);

  // Perform drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(200);

  // Move in steps
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps);
    const y = startY + (endY - startY) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(30);
  }

  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(2000);

  console.log('Drag completed!');

  // Take screenshot
  await page.screenshot({ path: '../furniture-placed-feature32.png' });
  console.log('Screenshot saved to furniture-placed-feature32.png');

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

  console.log('Test completed! Check the screenshot and browser window.');
  console.log('Waiting 5 seconds before closing...');
  await page.waitForTimeout(5000);

  await browser.close();
  console.log('Browser closed.');
})();
