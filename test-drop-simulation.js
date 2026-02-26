// Simulate a furniture drop event to test Feature #32

// First, get an asset from the store or use a known asset ID
const testAsset = {
  id: 1,  // Modern Chair
  name: 'Modern Chair',
  category: 'Furniture',
  width: 0.5,
  height: 0.8,
  depth: 0.5
};

// Simulate screen position (center of viewport)
const canvas = document.querySelector('canvas');
const rect = canvas.getBoundingClientRect();
const centerX = rect.left + rect.width / 2;
const centerY = rect.top + rect.height / 2;

console.log('Simulating furniture drop...');
console.log('Asset:', testAsset);
console.log('Screen position:', { x: centerX, y: centerY });

// Dispatch dropFurniture event
window.dispatchEvent(
  new CustomEvent('dropFurniture', {
    detail: {
      asset: testAsset,
      screenPosition: { x: centerX, y: centerY },
      canvasRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    },
  })
);

console.log('Drop event dispatched! Check if placeFurniture event follows...');
