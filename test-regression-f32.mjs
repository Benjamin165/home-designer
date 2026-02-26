#!/usr/bin/env node
/**
 * Regression test for Feature #32: Drag furniture from library to 3D scene
 */

import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen to console messages
  page.on('console', msg => {
    console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
  });

  try {
    console.log('Testing Feature #32: Drag furniture from library to 3D scene\n');

    await page.goto('http://localhost:5173/editor/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('✓ Project loaded');

    // Find furniture card with draggable attribute
    const furnitureCard = page.locator('[draggable="true"]').filter({ hasText: 'Modern Chair' }).first();
    const canvas = page.locator('canvas').first();

    await furnitureCard.waitFor({ state: 'visible', timeout: 5000 });
    await canvas.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Found Modern Chair and canvas');

    // Use known room ID from project 1
    const roomId = 1;

    const initialCount = await page.evaluate(async (rid) => {
      const res = await fetch(`/api/rooms/${rid}/furniture`);
      const data = await res.json();
      return data.furniture?.length || 0;
    }, roomId);

    console.log(`Initial furniture count: ${initialCount}`);

    // Perform drag and drop - drop in center of canvas
    console.log('Performing drag operation...');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) {
      console.log('❌ Could not get canvas bounding box');
      return false;
    }

    await furnitureCard.dragTo(canvas, {
      force: true,
      sourcePosition: { x: 50, y: 50 },
      targetPosition: { x: canvasBox.width / 2, y: canvasBox.height / 2 }
    });

    console.log('✓ Drag completed');

    // Wait for placement to process
    await page.waitForTimeout(2000);

    // Check new count
    const newCount = await page.evaluate(async (rid) => {
      const res = await fetch(`/api/rooms/${rid}/furniture`);
      const data = await res.json();
      return data.furniture?.length || 0;
    }, roomId);

    console.log(`Furniture count after drag: ${newCount}`);

    if (newCount > initialCount) {
      console.log(`\n✅ PASS: Furniture placed successfully (${initialCount} -> ${newCount})`);
      return true;
    } else {
      console.log(`\n❌ FAIL: No furniture placed`);
      return false;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

test().then(success => process.exit(success ? 0 : 1));
