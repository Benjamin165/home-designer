// Test Feature #21 - Draw wall by dragging
// This script attempts to trigger pointer events on the invisible plane

async function testDrawWall() {
  console.log('=== Testing Feature #21: Draw Wall ===');

  // Get the canvas element
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    console.error('❌ Canvas not found');
    return;
  }

  console.log('✓ Canvas found');
  console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
  console.log('Canvas client dimensions:', canvas.clientWidth, 'x', canvas.clientHeight);

  // Calculate center of canvas
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  console.log('Canvas center:', centerX, centerY);

  // Create and dispatch pointer events
  console.log('\n--- Simulating Drag Operation ---');

  // Mouse down at center
  const downEvent = new PointerEvent('pointerdown', {
    clientX: centerX,
    clientY: centerY,
    button: 0,
    bubbles: true,
    cancelable: true
  });

  console.log('Dispatching pointerdown...');
  canvas.dispatchEvent(downEvent);

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 100));

  // Mouse move (drag 200px right and down)
  const moveEvent = new PointerEvent('pointermove', {
    clientX: centerX + 200,
    clientY: centerY + 200,
    bubbles: true,
    cancelable: true
  });

  console.log('Dispatching pointermove...');
  canvas.dispatchEvent(moveEvent);

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 100));

  // Mouse up
  const upEvent = new PointerEvent('pointerup', {
    clientX: centerX + 200,
    clientY: centerY + 200,
    button: 0,
    bubbles: true,
    cancelable: true
  });

  console.log('Dispatching pointerup...');
  canvas.dispatchEvent(upEvent);

  console.log('\n--- Drag simulation complete ---');
  console.log('Check console for [DEBUG handlePointerDown] messages');
  console.log('Check if blue preview rectangle appeared');
}

// Run the test
testDrawWall().catch(console.error);
