import { getDatabase, saveDatabase } from './src/db/connection.js';

console.log('Seeding test assets...');

const testAssets = [
  // Furniture
  { name: 'Modern Sofa', category: 'Furniture', subcategory: 'Seating', source: 'builtin', model_path: '/assets/furniture/sofa-modern.glb', thumbnail_path: '/assets/thumbnails/sofa-modern.png', width: 2.0, height: 0.8, depth: 0.9 },
  { name: 'Dining Table', category: 'Furniture', subcategory: 'Tables', source: 'builtin', model_path: '/assets/furniture/table-dining.glb', thumbnail_path: '/assets/thumbnails/table-dining.png', width: 1.6, height: 0.75, depth: 0.9 },
  { name: 'Bookshelf', category: 'Furniture', subcategory: 'Storage', source: 'builtin', model_path: '/assets/furniture/bookshelf.glb', thumbnail_path: '/assets/thumbnails/bookshelf.png', width: 1.0, height: 2.0, depth: 0.3 },
  { name: 'Queen Bed', category: 'Furniture', subcategory: 'Beds', source: 'builtin', model_path: '/assets/furniture/bed-queen.glb', thumbnail_path: '/assets/thumbnails/bed-queen.png', width: 1.6, height: 0.5, depth: 2.0 },
  { name: 'Office Chair', category: 'Furniture', subcategory: 'Seating', source: 'builtin', model_path: '/assets/furniture/chair-office.glb', thumbnail_path: '/assets/thumbnails/chair-office.png', width: 0.6, height: 1.1, depth: 0.6 },

  // Lighting
  { name: 'Floor Lamp', category: 'Lighting', subcategory: 'Floor Lamps', source: 'builtin', model_path: '/assets/lighting/floor-lamp.glb', thumbnail_path: '/assets/thumbnails/floor-lamp.png', width: 0.3, height: 1.8, depth: 0.3 },
  { name: 'Table Lamp', category: 'Lighting', subcategory: 'Table Lamps', source: 'builtin', model_path: '/assets/lighting/table-lamp.glb', thumbnail_path: '/assets/thumbnails/table-lamp.png', width: 0.25, height: 0.5, depth: 0.25 },
  { name: 'Ceiling Light', category: 'Lighting', subcategory: 'Ceiling', source: 'builtin', model_path: '/assets/lighting/ceiling-light.glb', thumbnail_path: '/assets/thumbnails/ceiling-light.png', width: 0.4, height: 0.2, depth: 0.4 },
  { name: 'Pendant Light', category: 'Lighting', subcategory: 'Pendant', source: 'builtin', model_path: '/assets/lighting/pendant.glb', thumbnail_path: '/assets/thumbnails/pendant.png', width: 0.3, height: 0.6, depth: 0.3 },

  // Plants
  { name: 'Potted Fiddle Leaf Fig', category: 'Plants', subcategory: 'Floor Plants', source: 'builtin', model_path: '/assets/plants/fiddle-leaf-fig.glb', thumbnail_path: '/assets/thumbnails/fiddle-leaf-fig.png', width: 0.5, height: 1.5, depth: 0.5 },
  { name: 'Snake Plant', category: 'Plants', subcategory: 'Floor Plants', source: 'builtin', model_path: '/assets/plants/snake-plant.glb', thumbnail_path: '/assets/thumbnails/snake-plant.png', width: 0.3, height: 0.8, depth: 0.3 },
  { name: 'Hanging Pothos', category: 'Plants', subcategory: 'Hanging Plants', source: 'builtin', model_path: '/assets/plants/hanging-pothos.glb', thumbnail_path: '/assets/thumbnails/hanging-pothos.png', width: 0.3, height: 0.6, depth: 0.3 },
  { name: 'Small Succulent', category: 'Plants', subcategory: 'Table Plants', source: 'builtin', model_path: '/assets/plants/succulent.glb', thumbnail_path: '/assets/thumbnails/succulent.png', width: 0.15, height: 0.2, depth: 0.15 },

  // Decor
  { name: 'Wall Mirror', category: 'Decor', subcategory: 'Mirrors', source: 'builtin', model_path: '/assets/decor/mirror-wall.glb', thumbnail_path: '/assets/thumbnails/mirror-wall.png', width: 0.8, height: 1.2, depth: 0.05 },
  { name: 'Abstract Painting', category: 'Decor', subcategory: 'Wall Art', source: 'builtin', model_path: '/assets/decor/painting-abstract.glb', thumbnail_path: '/assets/thumbnails/painting-abstract.png', width: 0.9, height: 0.7, depth: 0.05 },
  { name: 'Area Rug', category: 'Decor', subcategory: 'Rugs', source: 'builtin', model_path: '/assets/decor/rug-area.glb', thumbnail_path: '/assets/thumbnails/rug-area.png', width: 2.0, height: 0.01, depth: 3.0 },
  { name: 'Decorative Vase', category: 'Decor', subcategory: 'Accessories', source: 'builtin', model_path: '/assets/decor/vase.glb', thumbnail_path: '/assets/thumbnails/vase.png', width: 0.2, height: 0.4, depth: 0.2 },
  { name: 'Wall Clock', category: 'Decor', subcategory: 'Clocks', source: 'builtin', model_path: '/assets/decor/clock-wall.glb', thumbnail_path: '/assets/thumbnails/clock-wall.png', width: 0.4, height: 0.4, depth: 0.05 },
];

async function seedAssets() {
  try {
    const db = await getDatabase();

    // Check if assets already exist
    const result = db.exec('SELECT COUNT(*) as count FROM assets');
    const count = result[0].values[0][0];

    if (count > 0) {
      console.log(`Database already has ${count} assets. Skipping seed.`);
      return;
    }

    // Insert test assets
    for (const asset of testAssets) {
      db.run(
        `INSERT INTO assets (
          name, category, subcategory, source, model_path, thumbnail_path,
          width, height, depth, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          asset.name,
          asset.category,
          asset.subcategory,
          asset.source,
          asset.model_path,
          asset.thumbnail_path || null,
          asset.width || null,
          asset.height || null,
          asset.depth || null
        ]
      );
    }

    saveDatabase();
    console.log(`✓ Successfully seeded ${testAssets.length} test assets`);

    // Verify
    const verifyResult = db.exec('SELECT category, COUNT(*) as count FROM assets GROUP BY category');
    console.log('\nAssets by category:');
    verifyResult[0].values.forEach(row => {
      console.log(`  ${row[0]}: ${row[1]}`);
    });

  } catch (error) {
    console.error('Error seeding assets:', error);
    process.exit(1);
  }
}

seedAssets();
