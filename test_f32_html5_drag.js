const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to editor...');
  await page.goto('http://localhost:5198/editor/4');
  await page.waitForTimeout(2000);

  console.log('Taking initial screenshot...');
  await page.screenshot({ path: 'f32-html5-01-initial.png' });

  // Use Playwright's built-in drag and drop
  console.log('Finding source (Modern Chair) and target (canvas)...');

  const source = await page.locator('text=Modern Chair').locator('..').locator('..').first();
  const target = await page.locator('canvas').first();

  const isSourceVisible = await source.isVisible();
  const isTargetVisible = await target.isVisible();

  console.log('Source visible:', isSourceVisible);
  console.log('Target visible:', isTargetVisible);

  if (isSourceVisible && isTargetVisible) {
    console.log('Performing HTML5 drag and drop...');

    // Use Playwright's dragTo method
    await source.dragTo(target, {
      sourcePosition: { x: 50, y: 50 },
      targetPosition: { x: 400, y: 300 },
    });

    console.log('Drag completed');

    await page.waitForTimeout(2000);

    console.log('Taking final screenshot...');
    await page.screenshot({ path: 'f32-html5-02-final.png', fullPage: true });

    // Check properties panel
    const propertiesPanel = await page.locator('.absolute.top-16').first().textContent();
    console.log('Properties panel:', propertiesPanel.substring(0, 300));
  } else {
    console.log('ERROR: Source or target not visible!');
  }

  await browser.close();
  console.log('Test complete');
})();
