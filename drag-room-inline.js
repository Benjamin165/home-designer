(async function() {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    console.log('ERROR: Canvas not found');
    return { error: 'Canvas not found' };
  }

  const rect = canvas.getBoundingClientRect();
  console.log('Canvas found:', rect.width, 'x', rect.height);

  const createPointerEvent = (type, x, y) => {
    return new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: type === 'pointermove' ? 1 : 0
    });
  };

  // Calculate drag positions
  const startX = rect.left + rect.width * 0.4;
  const startY = rect.top + rect.height * 0.4;
  const endX = rect.left + rect.width * 0.6;
  const endY = rect.top + rect.height * 0.6;

  console.log('Dragging from', startX, startY, 'to', endX, endY);

  // Dispatch pointer down
  canvas.dispatchEvent(createPointerEvent('pointerdown', startX, startY));
  await new Promise(r => setTimeout(r, 100));

  // Move in steps
  for (let i = 1; i <= 10; i++) {
    const x = startX + (endX - startX) * (i / 10);
    const y = startY + (endY - startY) * (i / 10);
    canvas.dispatchEvent(createPointerEvent('pointermove', x, y));
    await new Promise(r => setTimeout(r, 30));
  }

  await new Promise(r => setTimeout(r, 500));
  canvas.dispatchEvent(createPointerEvent('pointerup', endX, endY));

  console.log('Drag complete, waiting for room creation...');
  await new Promise(r => setTimeout(r, 1500));

  // Check room count
  const match = document.body.innerText.match(/Rooms:\s*(\d+)/);
  const roomCount = match ? parseInt(match[1]) : 0;

  console.log('Room count:', roomCount);
  return { success: true, roomCount };
})();
