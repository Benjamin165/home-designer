#!/usr/bin/env node

/**
 * Feature #34 UI Test: Select furniture and verify rotation controls
 */

import { chromium } from 'playwright';

async function main() {
  console.log('=== Feature #34 UI Test ===\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to the editor with test project
  console.log('Step 1: Opening test project in editor...');
  await page.goto('http://localhost:5173/editor/12');
  await page.waitForTimeout(3000); // Wait for 3D scene to load

  // Step 2: Select the furniture via store manipulation
  console.log('Step 2: Selecting furniture via store...');
  await page.evaluate(() => {
    // Access the Zustand store and select the furniture
    const store = window.__zustand_store__;
    if (store) {
      store.setState({ selectedFurnitureId: 4 });
    }
  });
  await page.waitForTimeout(500);

  // Step 3: Take screenshot showing properties panel
  console.log('Step 3: Taking screenshot...');
  await page.screenshot({ path: 'test-feature-34-furniture-selected.png', fullPage: true });
  console.log('✓ Screenshot saved: test-feature-34-furniture-selected.png\n');

  // Step 4: Verify rotation controls are visible
  console.log('Step 4: Verifying rotation controls...');
  const rotationLabel = await page.getByText('Rotation').isVisible().catch(() => false);
  const rotationInput = await page.locator('input[type="number"]').filter({ hasText: /degrees/ }).count();
  console.log(`Rotation label visible: ${rotationLabel}`);
  console.log(`Rotation input fields found: ${rotationInput}\n`);

  // Step 5: Test rotation input
  console.log('Step 5: Testing rotation input...');
  const rotationInputField = page.locator('input[type="number"]').first();
  await rotationInputField.fill('90');
  await rotationInputField.press('Enter');
  await page.waitForTimeout(1000);

  console.log('✓ Entered 90 degrees rotation\n');

  // Step 6: Take screenshot after rotation
  await page.screenshot({ path: 'test-feature-34-rotated-90.png', fullPage: true });
  console.log('✓ Screenshot saved: test-feature-34-rotated-90.png\n');

  // Step 7: Test quick rotation button
  console.log('Step 7: Testing quick rotation button (+90°)...');
  await page.getByRole('button', { name: '+90°' }).click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'test-feature-34-rotated-180.png', fullPage: true });
  console.log('✓ Screenshot saved: test-feature-34-rotated-180.png\n');

  console.log('✅ UI Test Complete!');
  console.log('\nManual verification:');
  console.log('1. Check test-feature-34-furniture-selected.png - rotation controls should be visible');
  console.log('2. Check test-feature-34-rotated-90.png - furniture rotated to 90°');
  console.log('3. Check test-feature-34-rotated-180.png - furniture rotated to 180°\n');

  await browser.close();
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
