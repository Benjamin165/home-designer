// Drag in viewport to draw a room
const page = globalThis.page;
const canvas = await page.locator('canvas').first();
const box = await canvas.boundingBox();

// Calculate center and drag points
const startX = box.x + box.width * 0.4;
const startY = box.y + box.height * 0.4;
const endX = box.x + box.width * 0.6;
const endY = box.y + box.height * 0.6;

// Perform drag operation
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.mouse.move(endX, endY, { steps: 10 });
await page.mouse.up();

console.log('Drag completed from', startX, startY, 'to', endX, endY);
