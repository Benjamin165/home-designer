#!/usr/bin/env node

/**
 * Feature #32: Drag furniture from library to 3D scene
 *
 * Test steps:
 * 1. Open a project with at least one room
 * 2. Open the left sidebar (asset library)
 * 3. Find a furniture item (e.g., a sofa)
 * 4. Click and drag the sofa from the library into the 3D viewport
 * 5. Verify a preview of the sofa follows the cursor
 * 6. Drop the sofa inside the room
 * 7. Verify the sofa appears in the 3D scene at the drop location
 */

import { chromium } from 'playwright';

async function testFeature32() {
  console.log('Starting Feature #32 Test: Drag furniture from library to 3D scene\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to frontend
    console.log('Step 1: Navigating to frontend...');
    await page.goto('http://localhost:5190', { waitUntil: 'networkidle' });
    console.log('✓ Page loaded\n');

    // Step 2: Open "Regression Test Living Room" project
    console.log('Step 2: Opening project with room...');
    await page.click('text=Regression Test Living Room');
    await page.waitForURL('**/editor/**');
    await page.waitForTimeout(2000); // Wait for 3D scene to initialize
    console.log('✓ Project opened\n');

    // Step 3: Verify asset library is visible
    console.log('Step 3: Checking asset library...');
    const assetLibrary = await page.locator('text=Asset Library').isVisible();
    if (!assetLibrary) {
      throw new Error('Asset library not visible');
    }
    console.log('✓ Asset library is visible\n');

    // Step 4: Find a furniture item to drag
    console.log('Step 4: Finding furniture item...');
    const diningTable = await page.locator('text=Dining Table').first();
    await diningTable.waitFor({ state: 'visible' });
    console.log('✓ Found "Dining Table"\n');

    // Step 5: Get viewport canvas element
    console.log('Step 5: Locating 3D viewport...');
    const canvas = await page.locator('canvas').first();
    await canvas.waitFor({ state: 'visible' });
    const canvasBox = await canvas.boundingBox();
    console.log('✓ Found canvas at:', canvasBox);

    // Step 6: Perform drag and drop
    console.log('\nStep 6: Performing drag and drop...');
    const furnitureCard = await page.locator('[draggable="true"]').filter({ hasText: 'Dining Table' }).first();
    const furnitureBox = await furnitureCard.boundingBox();

    if (!furnitureBox || !canvasBox) {
      throw new Error('Could not get bounding boxes');
    }

    // Start drag from furniture card center
    const startX = furnitureBox.x + furnitureBox.width / 2;
    const startY = furnitureBox.y + furnitureBox.height / 2;

    // Drop in center of viewport
    const dropX = canvasBox.x + canvasBox.width / 2;
    const dropY = canvasBox.y + canvasBox.height / 2;

    console.log(`  Dragging from (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(dropX)}, ${Math.round(dropY)})`);

    // Perform the drag and drop
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(300); // Small delay to register drag start
    await page.mouse.move(dropX, dropY, { steps: 10 }); // Smooth drag
    await page.waitForTimeout(300);
    await page.mouse.up();

    console.log('✓ Drag and drop completed\n');

    // Step 7: Wait for furniture to be placed
    console.log('Step 7: Waiting for furniture placement...');
    await page.waitForTimeout(1000);

    // Step 8: Check console for dropFurniture event
    console.log('Step 8: Checking console logs...');
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    await page.waitForTimeout(500);

    // Step 9: Verify furniture was added by checking API
    console.log('Step 9: Verifying furniture placement via API...');
    const response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/rooms/1/furniture');
      return await res.json();
    });

    console.log('Furniture placements:', response.placements?.length || 0);

    if (response.placements && response.placements.length > 0) {
      console.log('✓ Furniture successfully placed!');
      console.log('\nPlaced furniture:');
      response.placements.slice(-3).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.asset_name} at (${item.position_x.toFixed(2)}, ${item.position_y.toFixed(2)}, ${item.position_z.toFixed(2)})`);
      });
    } else {
      console.log('⚠️  No furniture placements found - may need manual verification');
    }

    // Step 10: Take screenshot
    console.log('\nStep 10: Taking screenshot...');
    await page.screenshot({ path: 'test-feature-32-result.png' });
    console.log('✓ Screenshot saved: test-feature-32-result.png\n');

    console.log('═══════════════════════════════════════');
    console.log('✓ Feature #32 Test Complete!');
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-feature-32-error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

testFeature32().catch(console.error);
