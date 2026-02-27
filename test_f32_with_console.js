const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const consoleMessages = [];
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  console.log('Navigating to editor...');
  await page.goto('http://localhost:5198/editor/4');
  await page.waitForTimeout(2000);

  console.log('=== Initial Console Messages ===');
  consoleMessages.forEach(m => console.log(m));
  consoleMessages.length = 0;

  console.log('\n=== Starting Drag Test ===');
  const source = await page.locator('text=Modern Chair').locator('..').locator('..').first();
  const target = await page.locator('canvas').first();

  console.log('Performing drag...');
  await source.dragTo(target, {
    sourcePosition: { x: 50, y: 50 },
    targetPosition: { x: 400, y: 300 },
  });

  await page.waitForTimeout(2000);

  console.log('\n=== Console Messages During/After Drag ===');
  consoleMessages.forEach(m => console.log(m));

  console.log('\n=== Console Errors ===');
  if (consoleErrors.length > 0) {
    consoleErrors.forEach(e => console.log('ERROR:', e));
  } else {
    console.log('No console errors!');
  }

  await page.screenshot({ path: 'f32-console-final.png' });

  await browser.close();
  console.log('\nTest complete');
})();
