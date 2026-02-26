#!/usr/bin/env node

import { chromium } from 'playwright';

async function testFeature21() {
  console.log('Starting Feature #21 verification...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // Listen for console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    if (text.includes('[DEBUG') || text.includes('createRoom')) {
      console.log('Browser console:', text);
    }
  });

  try {
    console.log('\n1. Navigate to home page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('2. Find and click on a test project...');
    // Look for projects on the page
    const projectCards = await page.locator('[class*="project"]').count();
    console.log(`   Found ${projectCards} project elements`);

    // Try to click the first project
    const firstProject = page.locator('button, a, [role="button"]').filter({ hasText: /test|project|regression/i }).first();
    const projectExists = await firstProject.count() > 0;

    if (projectExists) {
      console.log('   Clicking project...');
      await firstProject.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('   No test project found, creating new one...');
      const createBtn = page.locator('button').filter({ hasText: /create|new/i }).first();
      if (await createBtn.count() > 0) {
        await createBtn.click();
        await page.waitForTimeout(1000);
        await page.fill('input[type="text"]', 'Feature 21 Final Test');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
      }
    }

    console.log('\n3. Look for Draw Wall tool in toolbar...');
    await page.screenshot({ path: 'test-f21-final-toolbar.png' });

    // Find and click Draw Wall button
    const drawWallBtn = page.locator('button').filter({ hasText: /draw.*wall|wall/i }).first();
    const btnCount = await drawWallBtn.count();
    console.log(`   Found ${btnCount} draw wall button(s)`);

    if (btnCount > 0) {
      console.log('   Clicking Draw Wall tool...');
      await drawWallBtn.click();
      await page.waitForTimeout(1000);
      console.log('   Tool activated!');
    } else {
      console.log('   WARNING: Draw Wall button not found!');
    }

    console.log('\n4. Attempt to draw a room in viewport...');

    // Find the canvas element
    const canvas = await page.locator('canvas').first();
    const canvasExists = await canvas.count() > 0;
    console.log(`   Canvas exists: ${canvasExists}`);

    if (canvasExists) {
      // Get canvas bounding box
      const box = await canvas.boundingBox();
      if (box) {
        console.log(`   Canvas dimensions: ${box.width}x${box.height}`);

        // Calculate drag coordinates (center area)
        const startX = box.x + box.width * 0.3;
        const startY = box.y + box.height * 0.3;
        const endX = box.x + box.width * 0.6;
        const endY = box.y + box.height * 0.6;

        console.log(`   Drag from (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(endX)}, ${Math.round(endY)})`);

        // Perform drag operation
        await page.mouse.move(startX, startY);
        await page.waitForTimeout(500);

        console.log('   Mouse down...');
        await page.mouse.down();
        await page.waitForTimeout(500);

        // Take screenshot during drag
        console.log('   Moving mouse (dragging)...');
        await page.mouse.move(endX, endY, { steps: 20 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-f21-final-during-drag.png' });

        console.log('   Mouse up...');
        await page.mouse.up();
        await page.waitForTimeout(2000);

        // Take final screenshot
        await page.screenshot({ path: 'test-f21-final-after-release.png' });
        console.log('   Drag complete!');
      }
    }

    console.log('\n5. Check console for debug messages...');
    const relevantMessages = consoleMessages.filter(msg =>
      msg.includes('[DEBUG') || msg.includes('createRoom') || msg.includes('Room')
    );
    console.log(`   Found ${relevantMessages.length} relevant console messages:`);
    relevantMessages.slice(-10).forEach(msg => console.log(`     ${msg}`));

    console.log('\n6. Check for created room...');
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    const hasRoom = pageContent.includes('room') || pageContent.includes('Room');
    console.log(`   Page mentions "room": ${hasRoom}`);

    console.log('\n✅ Test completed! Check screenshots:');
    console.log('   - test-f21-final-toolbar.png (initial view)');
    console.log('   - test-f21-final-during-drag.png (during drag)');
    console.log('   - test-f21-final-after-release.png (after release)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-f21-final-error.png' });
  } finally {
    await browser.close();
  }
}

testFeature21();
