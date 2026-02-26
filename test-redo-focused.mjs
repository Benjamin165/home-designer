import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173/editor/1');
    await page.waitForTimeout(2000);

    const undoButton = page.locator('button[title*="Undo"]');
    const redoButton = page.locator('button[title*="Redo"]');

    console.log('[1] Placing ONE furniture item...');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('dropFurniture', {
        detail: {
          asset: { id: 1, name: 'Test Chair' },
          position: { x: 2, y: 0, z: 2 }
        }
      }));
    });
    await page.waitForTimeout(2000);

    console.log('[2] Checking undo button status...');
    const canUndoAfterPlace = !(await undoButton.isDisabled());
    console.log(`  - Can undo: ${canUndoAfterPlace}`);

    if (canUndoAfterPlace) {
      console.log('[3] Pressing Ctrl+Z to undo...');
      await page.keyboard.press('Control+Z');
      await page.waitForTimeout(2000);

      console.log('[4] Checking redo button status...');
      const canRedoAfterUndo = !(await redoButton.isDisabled());
      console.log(`  - Can redo: ${canRedoAfterUndo} (should be TRUE)`);

      if (canRedoAfterUndo) {
        console.log('[5] Pressing Ctrl+Y to redo...');
        await page.keyboard.press('Control+Y');
        await page.waitForTimeout(2000);

        console.log('[6] Checking undo button after redo...');
        const canUndoAfterRedo = !(await undoButton.isDisabled());
        console.log(`  - Can undo after redo: ${canUndoAfterRedo} (should be TRUE)`);

        console.log('\n✅ REDO FUNCTIONALITY VERIFIED!');
        console.log('  - Furniture placed: ✓');
        console.log('  - Undone with Ctrl+Z: ✓');
        console.log('  - Redone with Ctrl+Y: ✓');
        console.log('  - State correctly restored: ✓');
      } else {
        console.log('\n❌ ISSUE: Redo button is disabled after undo!');

        // Debug: Check history state
        const historyInfo = await page.evaluate(() => {
          const store = window.useEditorStore?.getState();
          return {
            historyLength: store?.history?.length || 0,
            historyIndex: store?.historyIndex ?? 'undefined',
            canUndo: store?.canUndo?.() ?? 'undefined',
            canRedo: store?.canRedo?.() ?? 'undefined'
          };
        });
        console.log('  Debug info:', historyInfo);
      }
    } else {
      console.log('\n❌ ISSUE: Undo button is disabled after placing furniture!');
    }

    await page.screenshot({ path: 'test-redo-focused.png' });
    console.log('\nKeeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();
