#!/usr/bin/env node

/**
 * Feature #21 Complete Verification Test
 * Tests: Draw walls by dragging rectangles with live dimensions
 */

import { chromium } from 'playwright';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFeature21() {
  console.log('='.repeat(60));
  console.log('Feature #21 Verification: Draw Walls by Dragging');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to editor
    console.log('\n[Step 1] Opening project in editor...');
    await page.goto('http://localhost:5173/editor/1');
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    // Count rooms before
    const roomsBefore = await page.evaluate(() => {
      const statsText = document.body.textContent;
      const match = statsText.match(/Rooms on This Floor[^0-9]*(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    console.log(`✓ Current room count: ${roomsBefore}`);

    // Step 2: Click Draw Wall tool
    console.log('\n[Step 2] Activating Draw Wall tool...');
    await page.getByRole('button', { name: 'Draw Wall' }).click();
    await sleep(500);

    // Verify tool changed
    const toolStatus = await page.evaluate(() => {
      return document.body.textContent.includes('Tool: draw-wall');
    });
    if (toolStatus) {
      console.log('✓ Draw Wall tool activated');
    } else {
      console.log('⚠ Tool status indicator not showing "draw-wall"');
    }

    // Step 3: Get canvas element and simulate drag
    console.log('\n[Step 3] Simulating rectangle drag in viewport...');

    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    console.log(`✓ Canvas found at (${box.x}, ${box.y}) size ${box.width}x${box.height}`);

    // Calculate drag coordinates (empty space in viewport)
    const startX = box.x + box.width * 0.3;
    const startY = box.y + box.height * 0.6;
    const endX = box.x + box.width * 0.6;
    const endY = box.y + box.height * 0.8;

    console.log(`  Start: (${Math.round(startX)}, ${Math.round(startY)})`);
    console.log(`  End: (${Math.round(endX)}, ${Math.round(endY)})`);

    // Enable console logging
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[DEBUG') || text.includes('handlePointer') || text.includes('dragState')) {
        logs.push(text);
        console.log(`  [Console] ${text}`);
      }
    });

    // Perform drag operation
    await page.mouse.move(startX, startY);
    await sleep(200);

    await page.mouse.down();
    console.log('  Mouse down');
    await sleep(300);

    // Move in steps to simulate real drag
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await sleep(50);
    }
    console.log('  Mouse moved (drag in progress)');
    await sleep(500);

    await page.mouse.up();
    console.log('  Mouse up (drag complete)');
    await sleep(1000);

    // Step 4: Check for debug logs
    console.log('\n[Step 4] Checking console logs...');
    const hasPointerDownLog = logs.some(log => log.includes('handlePointerDown'));
    const hasPointerMoveLog = logs.some(log => log.includes('handlePointerMove') || log.includes('isDrawing'));
    const hasDragStateLog = logs.some(log => log.includes('dragState'));

    if (hasPointerDownLog) {
      console.log('✓ handlePointerDown was called');
    } else {
      console.log('❌ handlePointerDown was NOT called');
    }

    if (hasPointerMoveLog || hasDragStateLog) {
      console.log('✓ Drag state was updated during move');
    } else {
      console.log('❌ No drag state updates detected');
    }

    // Step 5: Check if room was created
    console.log('\n[Step 5] Checking if room was created...');
    await sleep(2000); // Wait for API call to complete

    const roomsAfter = await page.evaluate(() => {
      const statsText = document.body.textContent;
      const match = statsText.match(/Rooms on This Floor[^0-9]*(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });

    console.log(`  Rooms before: ${roomsBefore}`);
    console.log(`  Rooms after: ${roomsAfter}`);

    if (roomsAfter > roomsBefore) {
      console.log(`✓ New room was created! (${roomsAfter - roomsBefore} room added)`);
    } else {
      console.log(`❌ No new room was created`);
    }

    // Step 6: Take screenshots
    console.log('\n[Step 6] Taking screenshot...');
    await page.screenshot({ path: 'test-f21-verification-result.png' });
    console.log('✓ Screenshot saved: test-f21-verification-result.png');

    // Final verdict
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS:');
    console.log('='.repeat(60));

    const pointerEventsWork = hasPointerDownLog;
    const roomCreated = roomsAfter > roomsBefore;
    const featurePassing = pointerEventsWork && roomCreated;

    console.log(`Pointer events firing: ${pointerEventsWork ? '✓ PASS' : '❌ FAIL'}`);
    console.log(`Room creation working: ${roomCreated ? '✓ PASS' : '❌ FAIL'}`);
    console.log('\n' + '='.repeat(60));
    console.log(`Feature #21: ${featurePassing ? '✅ PASSING' : '❌ FAILING'}`);
    console.log('='.repeat(60));

    return featurePassing;

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testFeature21()
  .then(passing => {
    process.exit(passing ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
