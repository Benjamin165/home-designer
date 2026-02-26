const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('dropFurniture') || text.includes('[DEBUG Scene]') || text.includes('furniture')) {
      console.log('[BROWSER]', text);
    }
  });

  console.log('Opening editor...');
  await page.goto('http://localhost:5173/editor/4', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('Finding Dining Table...');
  const table = await page.locator('text="Dining Table"').first();
  const tableBox = await table.boundingBox();

  const canvas = await page.locator('canvas').first();
  const canvasBox = await canvas.boundingBox();

  if (!tableBox || !canvasBox) {
    console.error('Elements not found');
    await browser.close();
    return;
  }

  console.log('Starting drag...');
  await page.mouse.move(tableBox.x + tableBox.width/2, tableBox.y + tableBox.height/2);
  await page.mouse.down();
  await page.waitForTimeout(500);

  console.log('Moving to viewport...');
  await page.mouse.move(canvasBox.x + canvasBox.width/2, canvasBox.y + canvasBox.height/2, { steps: 20 });
  await page.waitForTimeout(500);

  console.log('Dropping...');
  await page.mouse.up();
  await page.waitForTimeout(3000);

  // Check furniture count via API
  const response = await page.evaluate(async () => {
    try {
      const res = await fetch('http://localhost:5000/api/furniture');
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('\nFurniture from API:', response);
  console.log('Total furniture items:', response.length || 0);

  await page.screenshot({ path: 'test-f32-detailed-result.png' });
  await browser.close();
})();
