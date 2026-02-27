/**
 * Migration: Enhance lights table with more light types and properties
 * 
 * Adds support for point, spot, and area lights with advanced properties
 * like cone angle, distance, decay, shadow casting, and color temperature.
 */

export async function migrate(db) {
  console.log('Running migration: enhance_lights_table');
  
  // Check if columns already exist
  const tableInfo = db.exec("PRAGMA table_info(lights)");
  const columns = tableInfo[0]?.values.map(row => row[1]) || [];
  
  // Note: SQLite doesn't support modifying CHECK constraints, so we work with what we have
  // The type column already exists but with limited values
  
  if (!columns.includes('distance')) {
    db.run("ALTER TABLE lights ADD COLUMN distance REAL DEFAULT 10.0");
    console.log('  Added distance column');
  }
  
  if (!columns.includes('decay')) {
    db.run("ALTER TABLE lights ADD COLUMN decay REAL DEFAULT 2.0");
    console.log('  Added decay column');
  }
  
  if (!columns.includes('cast_shadow')) {
    db.run("ALTER TABLE lights ADD COLUMN cast_shadow BOOLEAN DEFAULT 1");
    console.log('  Added cast_shadow column');
  }
  
  if (!columns.includes('color_temperature')) {
    db.run("ALTER TABLE lights ADD COLUMN color_temperature INTEGER DEFAULT 4000");
    console.log('  Added color_temperature column (Kelvin)');
  }
  
  if (!columns.includes('name')) {
    db.run("ALTER TABLE lights ADD COLUMN name TEXT");
    console.log('  Added name column');
  }
  
  if (!columns.includes('target_x')) {
    db.run("ALTER TABLE lights ADD COLUMN target_x REAL");
    console.log('  Added target_x column (for spotlights)');
  }
  
  if (!columns.includes('target_y')) {
    db.run("ALTER TABLE lights ADD COLUMN target_y REAL");
    console.log('  Added target_y column (for spotlights)');
  }
  
  if (!columns.includes('target_z')) {
    db.run("ALTER TABLE lights ADD COLUMN target_z REAL");
    console.log('  Added target_z column (for spotlights)');
  }
  
  if (!columns.includes('width')) {
    db.run("ALTER TABLE lights ADD COLUMN width REAL");
    console.log('  Added width column (for area lights)');
  }
  
  if (!columns.includes('height')) {
    db.run("ALTER TABLE lights ADD COLUMN height REAL");
    console.log('  Added height column (for area lights)');
  }
  
  if (!columns.includes('penumbra')) {
    db.run("ALTER TABLE lights ADD COLUMN penumbra REAL DEFAULT 0.0");
    console.log('  Added penumbra column (soft edges for spotlights, 0-1)');
  }
  
  console.log('Migration complete: enhance_lights_table');
}
