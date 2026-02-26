#!/usr/bin/env node
/**
 * Complete Feature #32 Test: Drag furniture from library to 3D scene
 */

import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== Feature #32 Verification ===\n');

    // Navigate to project with a room
    console.log('1. Opening project with room...');
    await page.goto('http://localhost:5190/editor/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✓ Project loaded\n');

    // Verify asset library is visible
    console.log('2. Checking asset library...');
    const libVisible = await page.locator('text=Asset Library').isVisible();
    console.log(`✓ Asset library visible: ${libVisible}\n`);

    // Find Dining Table furniture item
    console.log('3. Finding furniture item (Dining Table)...');
    await page.locator('text=Dining Table').first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Found Dining Table\n');

    // Get initial furniture count
    console.log('4. Getting initial furniture count...');
    const initialCount = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/rooms/1/furniture');
      const data = await res.json();
      return data.placements?.length || 0;
    });
    console.log(`✓ Initial furniture count: ${initialCount}\n`);

    // Perform HTML5 drag and drop
    console.log('5. Performing drag and drop...');

    // Get the draggable furniture card and the canvas
    const furnitureCard = page.locator('[draggable="true"]').filter({ hasText: 'Dining Table' }).first();
    const canvas = page.locator('canvas').first();

    await furnitureCard.waitFor({ state: 'visible' });
    await canvas.waitFor({ state: 'visible' });

    const furnitureBox = await furnitureCard.boundingBox();
    const canvasBox = await canvas.boundingBox();

    if (!furnitureBox || !canvasBox) {
      throw new Error('Could not get element positions');
    }

    // Calculate drag start and drop positions
    const startX = furnitureBox.x + furnitureBox.width / 2;
    const startY = furnitureBox.y + furnitureBox.height / 2;
    const dropX = canvasBox.x + canvasBox.width / 2;
    const dropY = canvasBox.y + canvasBox.height / 2;

    console.log(`   Dragging from (${Math.round(startX)}, ${Math.round(startY)})`);
    console.log(`   Dropping at  (${Math.round(dropX)}, ${Math.round(dropY)})`);

    // Execute HTML5 drag and drop via JavaScript
    await page.evaluate(({ startX, startY, dropX, dropY }) => {
      // Helper function to create drag event
      function createDragEvent(type, clientX, clientY, dataTransfer) {
        const event = new DragEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          dataTransfer: dataTransfer
        });
        return event;
      }

      // Get the furniture element and viewport
      const furniture = document.querySelector('[draggable="true"]');
      const viewport = document.querySelector('canvas').parentElement;

      // Create dataTransfer
      const dataTransfer = new DataTransfer();

      // Dispatch dragstart on furniture
      const dragStartEvent = createDragEvent('dragstart', startX, startY, dataTransfer);
      furniture.dispatchEvent(dragStartEvent);

      // Dispatch dragover on viewport
      const dragOverEvent = createDragEvent('dragover', dropX, dropY, dataTransfer);
      viewport.dispatchEvent(dragOverEvent);

      // Dispatch drop on viewport
      const dropEvent = createDragEvent('drop', dropX, dropY, dataTransfer);
      viewport.dispatchEvent(dropEvent);

      // Dispatch dragend on furniture
      const dragEndEvent = createDragEvent('dragend', dropX, dropY, dataTransfer);
      furniture.dispatchEvent(dragEndEvent);

      console.log('[TEST] Dispatched drag events');
    }, { startX, startY, dropX, dropY });

    console.log('✓ Drag and drop events dispatched\n');

    // Wait for furniture placement
    console.log('6. Waiting for furniture placement...');
    await page.waitForTimeout(1500);

    // Check updated furniture count
    const newCount = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/rooms/1/furniture');
      const data = await res.json();
      return data.placements?.length || 0;
    });

    console.log(`   Furniture count after drop: ${newCount}`);

    if (newCount > initialCount) {
      console.log(`✓ SUCCESS! Furniture placed (${initialCount} -> ${newCount})\n`);
    } else {
      console.log(`⚠️  No new furniture detected\n`);
    }

    // Take final screenshot
    console.log('7. Taking final screenshot...');
    await page.screenshot({ path: 'test-f32-final.png', fullPage: false });
    console.log('✓ Screenshot saved: test-f32-final.png\n');

    // Check console for errors
    console.log('8. Checking console...');
    const messages = [];
    page.on('console', msg => messages.push(`[${msg.type()}] ${msg.text()}`));
    await page.waitForTimeout(500);

    const errors = messages.filter(m => m.includes('[error]'));
    if (errors.length > 0) {
      console.log('❌ Console errors detected:');
      errors.forEach(e => console.log(`   ${e}`));
    } else {
      console.log('✓ No console errors\n');
    }

    // Summary
    console.log('═══════════════════════════════════════');
    if (newCount > initialCount) {
      console.log('✅ Feature #32: PASSING');
      console.log('   Furniture successfully dragged from library to 3D scene');
    } else {
      console.log('⚠️  Feature #32: Needs investigation');
      console.log('   Drag events dispatched but furniture not placed');
    }
    console.log('═══════════════════════════════════════\n');

    return newCount > initialCount;

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'test-f32-error.png' });
    return false;
  } finally {
    await browser.close();
  }
}

test().then(success => process.exit(success ? 0 : 1)).catch(err => {
  console.error(err);
  process.exit(1);
});
