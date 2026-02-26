// Simulate drag operation for Feature 21 using browser evaluation
const { execSync } = require('child_process');
const fs = require('fs');

// JavaScript code to execute in the browser
const browserCode = `
(async () => {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    return { success: false, error: 'Canvas not found' };
  }

  const rect = canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Create mouse events
  const startX = centerX - 100;
  const startY = centerY - 75;
  const endX = centerX + 100;
  const endY = centerY + 75;

  // Dispatch mousedown event
  canvas.dispatchEvent(new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: rect.left + startX,
    clientY: rect.top + startY,
    button: 0
  }));

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 100));

  // Dispatch mousemove events
  for (let i = 0; i <= 10; i++) {
    const x = startX + (endX - startX) * (i / 10);
    const y = startY + (endY - startY) * (i / 10);
    canvas.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + x,
      clientY: rect.top + y,
      button: 0
    }));
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Wait to capture dimensions display
  await new Promise(resolve => setTimeout(resolve, 500));

  // Dispatch mouseup event
  canvas.dispatchEvent(new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    clientX: rect.left + endX,
    clientY: rect.top + endY,
    button: 0
  }));

  // Wait for room creation
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check if room was created
  const roomInfo = document.querySelector('[data-testid="room-count"]') ||
                  document.body.innerText.match(/Rooms:\\s*(\\d+)/);

  return {
    success: true,
    message: 'Drag simulation completed',
    roomInfo: roomInfo ? roomInfo[1] : 'unknown'
  };
})();
`;

console.log('Executing drag simulation in browser...');
console.log(browserCode);
