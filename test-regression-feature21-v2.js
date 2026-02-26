const { chromium } = require('playwright');

(async () => {
  console.log('Starting Feature 21 regression test (v2)...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the editor
    await page.goto('http://localhost:5173/editor/10');
    await page.waitForLoadState('networkidle');
    console.log('✓ Editor page loaded');

    // Click Draw Wall button
    await page.getByRole('button', { name: 'Draw Wall' }).click();
    await page.waitForTimeout(500);
    console.log('✓ Draw Wall tool activated');

    // Test the drag operation using pointer events on canvas
    const result = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'Canvas not found' };

      const rect = canvas.getBoundingClientRect();

      const createPointerEvent = (type, x, y) => {
        return new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerType: 'mouse',
          isPrimary: true,
          button: 0,
          buttons: type === 'pointerdown' || type === 'pointermove' ? 1 : 0
        });
      };

      // Calculate drag positions in the middle of the canvas
      const startX = rect.left + rect.width * 0.4;
      const startY = rect.top + rect.height * 0.4;
      const endX = rect.left + rect.width * 0.6;
      const endY = rect.top + rect.height * 0.6;

      console.log(`Canvas rect: ${rect.width}x${rect.height}`);
      console.log(`Drag from (${startX}, ${startY}) to (${endX}, ${endY})`);

      // Start drag
      canvas.dispatchEvent(createPointerEvent('pointerdown', startX, startY));
      await new Promise(r => setTimeout(r, 100));

      // Move in steps to simulate smooth drag
      let dimensionsFound = false;
      for (let i = 1; i <= 10; i++) {
        const x = startX + (endX - startX) * (i / 10);
        const y = startY + (endY - startY) * (i / 10);
        canvas.dispatchEvent(createPointerEvent('pointermove', x, y));

        // Check for dimension display
        const bodyText = document.body.innerText;
        if (bodyText.includes('m x') || bodyText.includes('m ×') || bodyText.match(/\d+\.\d+m/)) {
          dimensionsFound = true;
        }

        await new Promise(r => setTimeout(r, 50));
      }

      // Wait a bit to see dimensions
      await new Promise(r => setTimeout(r, 500));

      // Check dimensions one more time
      const finalBodyText = document.body.innerText;
      if (finalBodyText.includes('m x') || finalBodyText.includes('m ×') || finalBodyText.match(/\d+\.\d+m/)) {
        dimensionsFound = true;
      }

      // End drag
      canvas.dispatchEvent(createPointerEvent('pointerup', endX, endY));
      await new Promise(r => setTimeout(r, 1000));

      // Check if room was created by looking for room count or room list
      const finalText = document.body.innerText;
      const roomCountMatch = finalText.match(/Rooms?:\s*(\d+)/i) || finalText.match(/(\d+)\s*rooms?/i);
      const roomCount = roomCountMatch ? parseInt(roomCountMatch[1]) : 0;

      return {
        success: true,
        dimensionsFound,
        roomCount,
        startX: Math.round(startX),
        startY: Math.round(startY),
        endX: Math.round(endX),
        endY: Math.round(endY)
      };
    });

    console.log('\nTest Results:');
    console.log(`  Drag coordinates: (${result.startX}, ${result.startY}) → (${result.endX}, ${result.endY})`);
    console.log(`  Live dimensions displayed: ${result.dimensionsFound ? '✓ YES' : '✗ NO'}`);
    console.log(`  Room created: ${result.roomCount > 0 ? '✓ YES' : '✗ NO'} (${result.roomCount} room(s))`);

    // Take final screenshot
    await page.screenshot({ path: 'feature21-regression-final.png' });
    console.log('\n✓ Screenshot saved: feature21-regression-final.png');

    // Check console errors
    let hasErrors = false;
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
        hasErrors = true;
      }
    });

    // Determine if feature passes
    const passes = !hasErrors && (result.dimensionsFound || result.roomCount > 0);

    if (passes) {
      console.log('\n✅ Feature 21 PASSES - Draw wall functionality working');
      process.exit(0);
    } else {
      console.log('\n❌ Feature 21 FAILS - Issues detected:');
      if (!result.dimensionsFound) console.log('  - Live dimensions not displayed');
      if (result.roomCount === 0) console.log('  - No room created');
      if (hasErrors) console.log('  - Console errors detected');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Feature 21 regression test ERROR:', error.message);
    await page.screenshot({ path: 'feature21-regression-error.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
