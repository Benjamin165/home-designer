#!/usr/bin/env node

import { chromium } from 'playwright';

async function testFeature21() {
  console.log('Testing Feature #21 on Project 4...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to project 4
    console.log('[1] Opening Test Project Open (ID=4)...');
    await page.goto('http://localhost:5173/editor/4');
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: 'f21-test-initial.png' });
    console.log('✓ Initial screenshot saved');

    // Check initial room count
    console.log('\n[2] Checking initial room count...');
    const roomsText = await page.locator('text=Rooms on This Floor').locator('xpath=following-sibling::*[1]').textContent();
    const initialRoomCount = parseInt(roomsText.trim());
    console.log(`✓ Initial room count: ${initialRoomCount}`);

    // Click Draw Wall tool
    console.log('\n[3] Activating Draw Wall tool...');
    await page.click('button:has-text("Draw Wall")');
    await page.waitForTimeout(500);

    // Verify tool is active
    const toolText = await page.locator('text=Tool:').locator('xpath=following-sibling::*[1]').textContent();
    console.log(`✓ Current tool: ${toolText}`);

    if (!toolText.includes('draw-wall')) {
      throw new Error('❌ Draw Wall tool not activated!');
    }

    // Get canvas and perform drag
    console.log('\n[4] Performing drag operation...');
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();

    const startX = box.x + box.width * 0.35;
    const startY = box.y + box.height * 0.35;
    const endX = box.x + box.width * 0.65;
    const endY = box.y + box.height * 0.65;

    console.log(`  Start: (${Math.round(startX)}, ${Math.round(startY)})`);
    console.log(`  End: (${Math.round(endX)}, ${Math.round(endY)})`);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(200);

    await page.mouse.move(endX, endY, { steps: 15 });
    await page.waitForTimeout(500);

    // Screenshot during drag
    await page.screenshot({ path: 'f21-test-during-drag.png' });
    console.log('✓ During-drag screenshot saved');

    await page.mouse.up();
    await page.waitForTimeout(2000);

    // Screenshot after release
    await page.screenshot({ path: 'f21-test-after-release.png' });
    console.log('✓ After-release screenshot saved');

    // Check final room count
    console.log('\n[5] Verifying room creation...');
    const finalRoomsText = await page.locator('text=Rooms on This Floor').locator('xpath=following-sibling::*[1]').textContent();
    const finalRoomCount = parseInt(finalRoomsText.trim());
    console.log(`✓ Final room count: ${finalRoomCount}`);

    const roomsCreated = finalRoomCount - initialRoomCount;
    console.log(`✓ Rooms created: ${roomsCreated}`);

    // Results
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS:');
    console.log('='.repeat(60));
    console.log(`Tool activation: ${toolText.includes('draw-wall') ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Room creation: ${roomsCreated > 0 ? '✅ PASS' : '❌ FAIL (expected > 0, got ' + roomsCreated + ')' }`);
    console.log('='.repeat(60));

    if (roomsCreated > 0) {
      console.log('\n✅ Feature #21 PASSING');
    } else {
      console.log('\n⚠️  Feature #21 REGRESSION DETECTED');
      console.log('   - Draw tool activated but room not created');
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

testFeature21().catch(console.error);
