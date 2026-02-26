import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const contexts = browser.contexts();
const page = contexts[0].pages()[0];

// Drag from center-left to center-right to create a room
const viewport = await page.viewportSize();
const startX = Math.floor(viewport.width * 0.4);
const startY = Math.floor(viewport.height * 0.5);
const endX = Math.floor(viewport.width * 0.7);
const endY = Math.floor(viewport.height * 0.7);

console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

// Perform drag
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.mouse.move(endX, endY, { steps: 20 });
await page.screenshot({ path: 'during-drag-feature21.png' });
await page.mouse.up();

console.log('Drag completed');
await page.screenshot({ path: 'after-drag-feature21.png' });

await browser.close();
