import Database from 'better-sqlite3';

const db = new Database('./backend/home-designer.db');

// Get all furniture placements
const furniture = db.prepare(`
  SELECT fp.*, a.name as asset_name, a.category, a.width, a.height, a.depth
  FROM furniture_placements fp
  LEFT JOIN assets a ON fp.asset_id = a.id
  ORDER BY fp.id
`).all();

console.log('Furniture placements:', JSON.stringify(furniture, null, 2));
console.log(`Total: ${furniture.length}`);

db.close();
