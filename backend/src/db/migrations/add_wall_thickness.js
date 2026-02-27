/**
 * Migration: Add wall thickness column
 */

export async function migrate(db) {
  console.log('Running migration: add_wall_thickness');
  
  const tableInfo = db.exec("PRAGMA table_info(walls)");
  const columns = tableInfo[0]?.values.map(row => row[1]) || [];
  
  if (!columns.includes('thickness')) {
    db.run("ALTER TABLE walls ADD COLUMN thickness REAL DEFAULT 0.15");
    console.log('  Added thickness column to walls table');
  }
  
  console.log('Migration complete: add_wall_thickness');
}
