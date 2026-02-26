import { chromium } from 'playwright';

async function debugFeature21() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    if (type === 'error' || type === 'warning') {
      console.log(`[${type.toUpperCase()}] ${text}`);
    }
  });

  console.log('Opening editor...');
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForTimeout(2000);

  console.log('Checking for Draw Wall button...');
  const drawWallButton = await page.locator('button').filter({ hasText: 'Draw Wall' }).first();
  const isVisible = await drawWallButton.isVisible();
  console.log('Draw Wall button visible:', isVisible);

  console.log('\nClicking Draw Wall button...');
  await drawWallButton.click();
  await page.waitForTimeout(1000);

  console.log('\nChecking for modal...');
  const modal = await page.locator('text=Draw Your First Room').isVisible();
  console.log('Modal visible:', modal);

  if (modal) {
    console.log('\nTrying to find modal structure...');
    const modalParent = page.locator('text=Draw Your First Room').locator('..');
    const modalHtml = await modalParent.innerHTML().catch(() => 'Could not get HTML');
    console.log('Modal HTML snippet:', modalHtml.substring(0, 500));

    console.log('\nLooking for close button or dismissal mechanism...');
    const closeButton = await page.locator('button').filter({ hasText: /close|dismiss|got it|ok/i }).count();
    console.log('Close buttons found:', closeButton);
  }

  console.log('\nChecking canvas accessibility...');
  const canvas = await page.locator('canvas').first();
  const canvasBox = await canvas.boundingBox();
  console.log('Canvas box:', canvasBox);

  console.log('\nAttempting to click on canvas directly...');
  await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.waitForTimeout(1000);

  const modalStillVisible = await page.locator('text=Draw Your First Room').isVisible();
  console.log('Modal still visible after click:', modalStillVisible);

  await page.screenshot({ path: 'f21-debug.png' });
  console.log('\nScreenshot saved: f21-debug.png');

  console.log('\nConsole messages captured:', consoleMessages.length);
  console.log('Errors:', consoleMessages.filter(m => m.type === 'error').length);
  console.log('Warnings:', consoleMessages.filter(m => m.type === 'warning').length);

  await browser.close();
}

debugFeature21().catch(console.error);
