#!/usr/bin/env node
/**
 * Feature #116: Viewport maintains 60fps during camera movement
 *
 * This test measures FPS during camera orbit, pan, and zoom operations.
 * It uses the Performance API to track frame rates.
 */

import { chromium } from 'playwright';

async function testFPS() {
  console.log('\n=== Feature #116: FPS Performance Test ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Navigate to the editor
    console.log('1. Opening Home Designer...');
    await page.goto('http://localhost:5184');
    await page.waitForLoadState('networkidle');

    // Open the "Regression Test Living Room" project
    console.log('2. Opening project with room and furniture...');
    await page.click('text=Regression Test Living Room');
    await page.waitForURL('**/editor/**');
    await page.waitForTimeout(2000); // Wait for 3D scene to load

    // Inject FPS monitoring script
    console.log('3. Injecting FPS monitoring script...');
    await page.evaluate(() => {
      window.fpsData = {
        frames: [],
        lastTime: performance.now(),
        frameCount: 0,
        recording: false
      };

      function measureFPS() {
        if (!window.fpsData.recording) return;

        const now = performance.now();
        const delta = now - window.fpsData.lastTime;

        if (delta >= 1000) { // Measure every second
          const fps = Math.round((window.fpsData.frameCount / delta) * 1000);
          window.fpsData.frames.push(fps);
          window.fpsData.frameCount = 0;
          window.fpsData.lastTime = now;
        }

        window.fpsData.frameCount++;
        requestAnimationFrame(measureFPS);
      }

      window.startFPSMonitoring = () => {
        window.fpsData.recording = true;
        window.fpsData.frames = [];
        window.fpsData.frameCount = 0;
        window.fpsData.lastTime = performance.now();
        requestAnimationFrame(measureFPS);
      };

      window.stopFPSMonitoring = () => {
        window.fpsData.recording = false;
        return window.fpsData.frames;
      };
    });

    // Test 1: Orbit camera movement
    console.log('\n4. Testing camera orbit (10 seconds)...');
    await page.evaluate(() => window.startFPSMonitoring());

    // Simulate dragging to orbit the camera
    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      // Continuous circular orbit motion
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 200;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(x, y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(100);
      }
    }

    const orbitFPS = await page.evaluate(() => window.stopFPSMonitoring());
    console.log('   Orbit FPS samples:', orbitFPS);

    const orbitAvg = orbitFPS.reduce((a, b) => a + b, 0) / orbitFPS.length;
    const orbitMin = Math.min(...orbitFPS);
    console.log(`   Average FPS: ${orbitAvg.toFixed(1)}`);
    console.log(`   Minimum FPS: ${orbitMin}`);

    await page.waitForTimeout(1000);

    // Test 2: Pan camera movement
    console.log('\n5. Testing camera pan (10 seconds)...');
    await page.evaluate(() => window.startFPSMonitoring());

    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      // Right-click drag for panning
      for (let i = 0; i < 20; i++) {
        const direction = i % 4;
        let targetX = centerX;
        let targetY = centerY;

        switch(direction) {
          case 0: targetX += 150; break; // Right
          case 1: targetY += 150; break; // Down
          case 2: targetX -= 150; break; // Left
          case 3: targetY -= 150; break; // Up
        }

        await page.mouse.move(centerX, centerY);
        await page.mouse.down({ button: 'right' });
        await page.mouse.move(targetX, targetY, { steps: 10 });
        await page.mouse.up({ button: 'right' });
        await page.waitForTimeout(100);
      }
    }

    const panFPS = await page.evaluate(() => window.stopFPSMonitoring());
    console.log('   Pan FPS samples:', panFPS);

    const panAvg = panFPS.reduce((a, b) => a + b, 0) / panFPS.length;
    const panMin = Math.min(...panFPS);
    console.log(`   Average FPS: ${panAvg.toFixed(1)}`);
    console.log(`   Minimum FPS: ${panMin}`);

    await page.waitForTimeout(1000);

    // Test 3: Zoom (mouse wheel)
    console.log('\n6. Testing camera zoom (10 seconds)...');
    await page.evaluate(() => window.startFPSMonitoring());

    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      // Zoom in and out repeatedly
      for (let i = 0; i < 40; i++) {
        const delta = i % 2 === 0 ? -120 : 120; // Alternate zoom in/out
        await page.mouse.move(centerX, centerY);
        await page.mouse.wheel(0, delta);
        await page.waitForTimeout(100);
      }
    }

    const zoomFPS = await page.evaluate(() => window.stopFPSMonitoring());
    console.log('   Zoom FPS samples:', zoomFPS);

    const zoomAvg = zoomFPS.reduce((a, b) => a + b, 0) / zoomFPS.length;
    const zoomMin = Math.min(...zoomFPS);
    console.log(`   Average FPS: ${zoomAvg.toFixed(1)}`);
    console.log(`   Minimum FPS: ${zoomMin}`);

    // Overall assessment
    console.log('\n=== Results Summary ===');
    console.log(`Orbit - Avg: ${orbitAvg.toFixed(1)} fps, Min: ${orbitMin} fps`);
    console.log(`Pan   - Avg: ${panAvg.toFixed(1)} fps, Min: ${panMin} fps`);
    console.log(`Zoom  - Avg: ${zoomAvg.toFixed(1)} fps, Min: ${zoomMin} fps`);

    const overallMin = Math.min(orbitMin, panMin, zoomMin);
    const overallAvg = (orbitAvg + panAvg + zoomAvg) / 3;

    console.log(`\nOverall - Avg: ${overallAvg.toFixed(1)} fps, Min: ${overallMin} fps`);

    if (overallMin >= 55 && overallAvg >= 58) {
      console.log('\n✓ PASS: Viewport maintains 60fps during camera movement');
      console.log('  All camera operations (orbit, pan, zoom) are smooth.');
      return true;
    } else if (overallMin >= 45) {
      console.log('\n⚠ MARGINAL: FPS is acceptable but below target');
      console.log(`  Minimum FPS: ${overallMin} (target: 55+)`);
      console.log('  Consider performance optimizations.');
      return false;
    } else {
      console.log('\n✗ FAIL: FPS drops below acceptable levels');
      console.log(`  Minimum FPS: ${overallMin} (target: 55+)`);
      console.log('  Performance optimization required.');
      return false;
    }

  } catch (error) {
    console.error('Error during FPS test:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testFPS()
  .then(passed => {
    process.exit(passed ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
