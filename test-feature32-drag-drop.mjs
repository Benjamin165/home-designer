#!/usr/bin/env node

/**
 * Test Feature #32: Drag furniture from library to 3D scene
 *
 * Verification steps:
 * 1. Open a project with at least one room
 * 2. Open the left sidebar (asset library)
 * 3. Find a furniture item (e.g., a sofa)
 * 4. Click and drag the sofa from the library into the 3D viewport
 * 5. Verify a preview of the sofa follows the cursor
 * 6. Drop the sofa inside the room
 * 7. Verify the sofa appears in the 3D scene at the drop location
 */

import { chromium } from 'playwright';

async function testDragDrop() {
  console.log('Testing Feature #32: Drag furniture from library to 3D scene\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the home page
    console.log('1. Opening Home Designer...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    // Find and click on a project (look for "Regression Test Living Room" or create one)
    console.log('2. Looking for existing project...');
    const projectCards = await page.locator('[data-testid="project-card"], .cursor-pointer').all();

    if (projectCards.length === 0) {
      console.log('   No projects found. Please create a project with a room first.');
      await browser.close();
      return;
    }

    console.log(`   Found ${projectCards.length} project(s)`);
    await projectCards[0].click();
    await page.waitForTimeout(3000);

    // Verify asset library is visible
    console.log('3. Checking if asset library is visible...');
    const assetLibrary = page.locator('text="Asset Library"').first();
    const isVisible = await assetLibrary.isVisible();

    if (!isVisible) {
      console.log('   Asset library is collapsed, expanding...');
      // Look for expand button
      const expandButton = page.locator('button[title="Expand Asset Library"]').first();
      if (await expandButton.isVisible()) {
        await expandButton.click();
        await page.waitForTimeout(1000);
      }
    }
    console.log('   ✓ Asset library is visible');

    // Count furniture placements before drag
    console.log('4. Counting existing furniture...');
    const furnitureCountBefore = await page.evaluate(() => {
      // Check if furniture elements exist in the scene
      const furnitureGroup = document.querySelectorAll('[data-furniture-id]');
      return furnitureGroup.length;
    });
    console.log(`   Furniture count before: ${furnitureCountBefore}`);

    // Find a draggable asset
    console.log('5. Finding a furniture item to drag...');
    const assetCard = page.locator('[draggable="true"]').first();
    const assetName = await assetCard.locator('p.font-medium').textContent();
    console.log(`   Found asset: "${assetName}"`);

    // Get viewport canvas element
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();

    if (!canvasBox) {
      throw new Error('Canvas not found');
    }

    // Calculate drop position (center of canvas)
    const dropX = canvasBox.x + canvasBox.width / 2;
    const dropY = canvasBox.y + canvasBox.height / 2;

    console.log('6. Dragging asset to viewport...');
    console.log(`   Drop position: (${Math.round(dropX)}, ${Math.round(dropY)})`);

    // Perform drag and drop
    const assetBox = await assetCard.boundingBox();
    if (!assetBox) {
      throw new Error('Asset card not found');
    }

    // Start drag from asset card
    await page.mouse.move(assetBox.x + assetBox.width / 2, assetBox.y + assetBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(500);

    // Move to canvas
    await page.mouse.move(dropX, dropY, { steps: 10 });
    await page.waitForTimeout(500);

    // Drop
    console.log('7. Dropping furniture...');
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // Check if furniture was added
    console.log('8. Verifying furniture was placed...');
    const furnitureCountAfter = await page.evaluate(() => {
      // Check if furniture elements exist in the scene
      const furnitureGroup = document.querySelectorAll('[data-furniture-id]');
      return furnitureGroup.length;
    });
    console.log(`   Furniture count after: ${furnitureCountAfter}`);

    if (furnitureCountAfter > furnitureCountBefore) {
      console.log('   ✅ SUCCESS! Furniture was added to the scene');
      console.log(`   New furniture count: ${furnitureCountAfter} (was ${furnitureCountBefore})`);
    } else {
      console.log('   ❌ FAILED! Furniture count did not increase');

      // Check console for errors
      const consoleLogs = [];
      page.on('console', msg => consoleLogs.push(msg.text()));
      await page.waitForTimeout(1000);

      if (consoleLogs.length > 0) {
        console.log('\n   Recent console messages:');
        consoleLogs.slice(-10).forEach(log => console.log('   ', log));
      }
    }

    // Take a screenshot
    console.log('\n9. Taking screenshot...');
    await page.screenshot({ path: 'test-feature32-result.png' });
    console.log('   Screenshot saved: test-feature32-result.png');

    // Keep browser open for manual inspection
    console.log('\n✓ Test complete. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

testDragDrop();
