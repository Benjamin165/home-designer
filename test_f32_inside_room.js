const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  console.log('Navigating to editor...');
  await page.goto('http://localhost:5198/editor/4');
  await page.waitForTimeout(2000);

  console.log('Taking initial screenshot...');
  await page.screenshot({ path: 'f32-inside-01-initial.png' });

  consoleMessages.length = 0; // Clear initial messages

  console.log('Dragging Modern Chair into the center of the viewport (inside a room)...');
  const source = await page.locator('text=Modern Chair').locator('..').locator('..').first();
  const canvas = await page.locator('canvas').first();

  // Get canvas center (more likely to be inside a room)
  const canvasBox = await canvas.boundingBox();
  const centerX = canvasBox.width / 2;
  const centerY = canvasBox.height / 2;

  console.log(`Canvas center: (${centerX}, ${centerY})`);

  await source.dragTo(canvas, {
    sourcePosition: { x: 50, y: 50 },
    targetPosition: { x: centerX, y: centerY },
  });

  await page.waitForTimeout(2000);

  console.log('Taking final screenshot...');
  await page.screenshot({ path: 'f32-inside-02-final.png', fullPage: true });

  console.log('\n=== Drag/Drop Related Console Messages ===');
  const relevantMessages = consoleMessages.filter(m =>
    m.includes('drop') || m.includes('Drop') || m.includes('furniture') || m.includes('Furniture') || m.includes('place') || m.includes('Place')
  );
  relevantMessages.forEach(m => console.log(m));

  // Check if furniture was added
  const hasError = consoleMessages.some(m => m.includes('ERROR') && m.includes('No room found'));
  const hasWarning = consoleMessages.some(m => m.includes('outside of any room'));
  const hasSuccess = consoleMessages.some(m => m.includes('dropFurniture event') && !hasError);

  console.log('\n=== Result ===');
  console.log('Drop event triggered:', hasSuccess);
  console.log('Dropped outside room:', hasWarning);
  console.log('Error occurred:', hasError);

  if (!hasError && !hasWarning && hasSuccess) {
    console.log('✓ Furniture should have been placed successfully!');
  } else {
    console.log('✗ Furniture placement failed - dropped outside room');
  }

  await browser.close();
  console.log('\nTest complete');
})();
