// Test drag functionality by injecting into current page
// This should work with the existing playwright-cli browser session

const code = `
(async function() {
  console.log('=== Starting Feature 21 Drag Test ===');

  const canvas = document.querySelector('canvas');
  if (!canvas) {
    return { success: false, error: 'Canvas not found' };
  }

  // Get canvas position
  const rect = canvas.getBoundingClientRect();
  console.log('Canvas rect:', rect);

  // Calculate drag coordinates (center area)
  const startX = rect.width * 0.4;
  const startY = rect.height * 0.4;
  const endX = rect.width * 0.6;
  const endY = rect.height * 0.6;

  console.log(\`Drag from (\${startX}, \${startY}) to (\${endX}, \${endY})\`);

  // Get room count before
  const roomCountBefore = document.body.innerText.match(/Rooms:\\s*(\\d+)/);
  console.log('Room count before:', roomCountBefore ? roomCountBefore[1] : 'unknown');

  // Simulate mousedown
  const mouseDown = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + startX,
    clientY: rect.top + startY,
    buttons: 1
  });
  canvas.dispatchEvent(mouseDown);
  console.log('Dispatched mousedown');

  await new Promise(r => setTimeout(r, 100));

  // Simulate drag with multiple mousemove events
  for (let i = 1; i <= 10; i++) {
    const x = startX + (endX - startX) * (i / 10);
    const y = startY + (endY - startY) * (i / 10);

    const mouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + x,
      clientY: rect.top + y,
      buttons: 1
    });
    canvas.dispatchEvent(mouseMove);

    await new Promise(r => setTimeout(r, 30));
  }
  console.log('Dispatched mousemove events');

  // Check for dimension display during drag
  await new Promise(r => setTimeout(r, 200));
  const dimensionsVisible = document.body.innerText.includes('m x') ||
                            document.body.innerText.match(/\\d+\\.\\d+\\s*x\\s*\\d+\\.\\d+/);
  console.log('Dimensions visible during drag:', dimensionsVisible);

  // Simulate mouseup
  const mouseUp = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + endX,
    clientY: rect.top + endY
  });
  canvas.dispatchEvent(mouseUp);
  console.log('Dispatched mouseup');

  // Wait for room creation
  await new Promise(r => setTimeout(r, 1000));

  // Get room count after
  const roomCountAfter = document.body.innerText.match(/Rooms:\\s*(\\d+)/);
  console.log('Room count after:', roomCountAfter ? roomCountAfter[1] : 'unknown');

  const success = roomCountAfter && roomCountBefore &&
                  parseInt(roomCountAfter[1]) > parseInt(roomCountBefore[1]);

  console.log('=== Test Result ===');
  console.log('Success:', success);
  console.log('Dimensions showed:', dimensionsVisible ? 'YES' : 'NO');

  return {
    success: true,
    roomCountBefore: roomCountBefore ? roomCountBefore[1] : null,
    roomCountAfter: roomCountAfter ? roomCountAfter[1] : null,
    roomCreated: success,
    dimensionsVisible: dimensionsVisible
  };
})();
`;

console.log('Execute this in the browser console:');
console.log(code);
