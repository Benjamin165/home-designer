/**
 * Migration: Add room view settings columns
 * 
 * Adds opacity, show_floor, show_ceiling, show_walls, and view_mode columns
 * to the rooms table for controlling room visibility and rendering.
 */

export async function migrate(db) {
  console.log('Running migration: add_room_view_settings');
  
  // Check if columns already exist
  const tableInfo = db.exec("PRAGMA table_info(rooms)");
  const columns = tableInfo[0]?.values.map(row => row[1]) || [];
  
  if (!columns.includes('opacity')) {
    db.run("ALTER TABLE rooms ADD COLUMN opacity REAL DEFAULT 1.0");
    console.log('  Added opacity column');
  }
  
  if (!columns.includes('show_floor')) {
    db.run("ALTER TABLE rooms ADD COLUMN show_floor BOOLEAN DEFAULT 1");
    console.log('  Added show_floor column');
  }
  
  if (!columns.includes('show_ceiling')) {
    db.run("ALTER TABLE rooms ADD COLUMN show_ceiling BOOLEAN DEFAULT 1");
    console.log('  Added show_ceiling column');
  }
  
  if (!columns.includes('show_walls')) {
    db.run("ALTER TABLE rooms ADD COLUMN show_walls BOOLEAN DEFAULT 1");
    console.log('  Added show_walls column');
  }
  
  if (!columns.includes('view_mode')) {
    db.run("ALTER TABLE rooms ADD COLUMN view_mode TEXT DEFAULT 'solid' CHECK(view_mode IN ('solid', 'wireframe', 'xray'))");
    console.log('  Added view_mode column');
  }
  
  console.log('Migration complete: add_room_view_settings');
}
