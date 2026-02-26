#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Capture console logs
const logs = [];
page.on('console', msg => {
  const text = msg.text();
  logs.push(text);
  console.log('[Console]', text);
});

try {
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click Draw Wall tool
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(1000);

  console.log('\n=== Performing drag ===\n');

  // Get canvas
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error('Canvas not found');
  }

  const startX = box.x + box.width * 0.4;
  const startY = box.y + box.height * 0.5;
  const endX = box.x + box.width * 0.6;
  const endY = box.y + box.height * 0.7;

  // Perform drag
  await page.mouse.move(startX, startY);
  await page.waitForTimeout(200);

  console.log('Mouse down...');
  await page.mouse.down();
  await page.waitForTimeout(500);

  console.log('Mouse move...');
  await page.mouse.move(endX, endY);
  await page.waitForTimeout(500);

  console.log('Mouse up...');
  await page.mouse.up();
  await page.waitForTimeout(2000);

  console.log('\n=== Console Logs Summary ===');
  console.log('Total logs:', logs.length);
  console.log('PointerDown logs:', logs.filter(l => l.includes('PointerDown') || l.includes('pointerdown')).length);
  console.log('PointerMove logs:', logs.filter(l => l.includes('PointerMove') || l.includes('pointermove')).length);
  console.log('PointerUp logs:', logs.filter(l => l.includes('PointerUp') || l.includes('pointerup')).length);
  console.log('CreateRoom logs:', logs.filter(l => l.includes('createRoom')).length);

  await page.screenshot({ path: 'test-f21-debug-console.png' });

} catch (error) {
  console.error('Error:', error);
} finally {
  await browser.close();
}
