#!/usr/bin/env node
import { chromium } from 'playwright';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });

try {
  // Navigate to editor
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');
  await sleep(2000);

  console.log('Checking room count and properties...');

  // Get all text content
  const bodyText = await page.evaluate(() => document.body.textContent);

  // Check various indicators
  const hasRoom1 = bodyText.includes('Room 1');
  const hasRoomsCount = bodyText.match(/Rooms.*\d+/);
  const hasTotalRooms = bodyText.match(/Total Rooms.*\d+/);

  console.log('\nText Content Checks:');
  console.log(`- Contains "Room 1": ${hasRoom1}`);
  console.log(`- Rooms count match: ${hasRoomsCount ? hasRoomsCount[0] : 'not found'}`);
  console.log(`- Total Rooms match: ${hasTotalRooms ? hasTotalRooms[0] : 'not found'}`);

  // Take a detailed screenshot
  await page.screenshot({ path: 'verify-f21-detailed.png', fullPage: true });
  console.log('\n✓ Screenshot saved: verify-f21-detailed.png');

  // Check if canvas has 3D content
  const hasCanvas = await page.locator('canvas').count() > 0;
  console.log(`- Canvas present: ${hasCanvas}`);

  // Look in properties panel specifically
  const propertiesText = await page.evaluate(() => {
    const props = document.querySelector('[class*="properties"]') ||
                  document.querySelector('[class*="Properties"]');
    return props ? props.textContent : '';
  });

  console.log(`\nProperties Panel: ${propertiesText.substring(0, 200)}...`);

} catch (error) {
  console.error('\n❌ Error:', error.message);
} finally {
  await browser.close();
}
