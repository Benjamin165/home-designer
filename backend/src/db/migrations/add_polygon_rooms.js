/**
 * Migration: Add polygon room support
 * 
 * Adds vertices column to rooms table for polygon-based room shapes.
 * The vertices column stores an array of {x, y} points that define the room outline.
 * For rectangular rooms, this will be null and dimensions_json.width/depth will be used.
 */

export async function migrate(db) {
  console.log('Running migration: add_polygon_rooms');
  
  const tableInfo = db.exec("PRAGMA table_info(rooms)");
  const columns = tableInfo[0]?.values.map(row => row[1]) || [];
  
  // Add vertices column for polygon rooms
  if (!columns.includes('vertices')) {
    db.run("ALTER TABLE rooms ADD COLUMN vertices TEXT DEFAULT NULL");
    console.log('  Added vertices column to rooms table');
  }
  
  // Add room_type column to distinguish between rectangle and polygon
  if (!columns.includes('room_type')) {
    db.run("ALTER TABLE rooms ADD COLUMN room_type TEXT DEFAULT 'rectangle' CHECK(room_type IN ('rectangle', 'polygon'))");
    console.log('  Added room_type column to rooms table');
  }
  
  console.log('Migration complete: add_polygon_rooms');
}
