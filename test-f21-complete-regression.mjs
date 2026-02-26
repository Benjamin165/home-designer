#!/usr/bin/env node
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to project hub
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    console.log('✓ Loaded project hub');

    // Click on "Test Project Open"
    await page.getByRole('heading', { name: 'Test Project Open' }).click();
    await page.waitForTimeout(2000);
    console.log('✓ Opened Test Project Open');

    // Wait for editor to load
    await page.waitForURL(/\/editor\/\d+/);
    console.log('✓ Editor loaded, URL:', page.url());

    // Take initial screenshot
    await page.screenshot({ path: 'test-f21-complete-initial.png' });

    // Click on Draw Wall button
    await page.getByRole('button', { name: 'Draw Wall' }).click();
    await page.waitForTimeout(1000);
    console.log('✓ Draw Wall tool selected');

    // Take screenshot after selecting tool
    await page.screenshot({ path: 'test-f21-complete-tool-selected.png' });

    // Get canvas bounds
    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (!box) {
      console.error('❌ Canvas not found');
      await browser.close();
      return;
    }

    // Listen to console messages
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Perform drag in the middle of the canvas
    const startX = box.x + box.width * 0.35;
    const startY = box.y + box.height * 0.45;
    const endX = box.x + box.width * 0.65;
    const endY = box.y + box.height * 0.75;

    console.log(`\n🖱️  Starting drag from (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(endX)}, ${Math.round(endY)})`);

    // Mouse down
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(500);
    console.log('✓ Mouse down');

    // Take during-drag screenshot
    await page.mouse.move(endX, endY);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-f21-complete-during-drag.png' });
    console.log('✓ Mouse moved to end position');

    // Mouse up
    await page.mouse.up();
    await page.waitForTimeout(1000);
    console.log('✓ Mouse up');

    // Take final screenshot
    await page.screenshot({ path: 'test-f21-complete-after-release.png' });
    console.log('✓ Final screenshot taken');

    // Print console messages
    console.log('\n📋 Console messages:');
    const debugMessages = consoleMessages.filter(msg => msg.includes('[DEBUG'));
    if (debugMessages.length > 0) {
      debugMessages.slice(0, 20).forEach(msg => console.log(msg));
      if (debugMessages.length > 20) {
        console.log(`... and ${debugMessages.length - 20} more debug messages`);
      }
    } else {
      console.log('No debug messages found (THIS IS THE PROBLEM!)');
    }

    // Check for specific debug messages that should appear
    const hasPointerDown = consoleMessages.some(m => m.includes('handleCanvasPointerDown') || m.includes('handlePointerDown'));
    const hasPointerMove = consoleMessages.some(m => m.includes('handleCanvasPointerMove') || m.includes('handlePointerMove'));
    const hasPointerUp = consoleMessages.some(m => m.includes('handleCanvasPointerUp') || m.includes('handlePointerUp'));

    console.log('\n🔍 Event Handler Status:');
    console.log(`  Pointer Down: ${hasPointerDown ? '✓' : '✗'}`);
    console.log(`  Pointer Move: ${hasPointerMove ? '✓' : '✗'}`);
    console.log(`  Pointer Up: ${hasPointerUp ? '✓' : '✗'}`);

    if (!hasPointerDown && !hasPointerMove && !hasPointerUp) {
      console.log('\n❌ REGRESSION CONFIRMED: Event handlers are not being triggered!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
