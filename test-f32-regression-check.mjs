#!/usr/bin/env node
import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Testing Feature #32: Drag furniture from library\n');

    await page.goto('http://localhost:5173/editor/4');
    await page.waitForTimeout(3000);

    // Get initial furniture count
    const roomId = 10;
    const initialCount = await page.evaluate(async (roomId) => {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/furniture`);
      const data = await res.json();
      return data.furniture?.length || 0;
    }, roomId);
    console.log(`Initial furniture count: ${initialCount}`);

    // Dispatch dropFurniture event
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();

      window.dispatchEvent(new CustomEvent('dropFurniture', {
        detail: {
          asset: {
            id: 1,
            name: 'Modern Chair',
            category: 'Furniture',
            width: 0.5,
            height: 0.8,
            depth: 0.5,
            model_path: '/models/chair.glb'
          },
          screenPosition: {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          },
          canvasRect: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          }
        }
      }));
    });

    await page.waitForTimeout(3000);

    const newCount = await page.evaluate(async (roomId) => {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/furniture`);
      const data = await res.json();
      return data.furniture?.length || 0;
    }, roomId);

    console.log(`New furniture count: ${newCount}`);
    console.log(`Increase: ${newCount - initialCount}`);

    await page.screenshot({ path: 'test-f32-regression.png' });

    if (newCount > initialCount) {
      console.log('\n✅ Feature #32 PASSING - Furniture added successfully');
      await browser.close();
      process.exit(0);
    } else {
      console.log('\n❌ Feature #32 FAILING - No furniture added (REGRESSION)');
      await browser.close();
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

test();
