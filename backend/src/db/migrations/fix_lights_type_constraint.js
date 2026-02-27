/**
 * Migration: Fix lights type constraint
 * 
 * The original CHECK constraint only allowed legacy types.
 * This migration recreates the table with updated types including point, spot, area.
 */

export async function migrate(db) {
  console.log('Running migration: fix_lights_type_constraint');
  
  // Check if we need to fix the constraint by trying to determine current state
  // SQLite doesn't let us modify constraints, so we need to recreate the table
  
  try {
    // Create a new table with the correct constraint
    db.run(`
      CREATE TABLE IF NOT EXISTS lights_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('floor_lamp', 'ceiling', 'wall_sconce', 'table_lamp', 'pendant', 'point', 'spot', 'area')),
        name TEXT,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        position_z REAL NOT NULL,
        intensity REAL DEFAULT 1.0,
        color TEXT DEFAULT '#ffffff',
        cone_angle REAL,
        distance REAL DEFAULT 10,
        decay REAL DEFAULT 2,
        cast_shadow BOOLEAN DEFAULT 0,
        color_temperature INTEGER DEFAULT 4000,
        target_x REAL,
        target_y REAL,
        target_z REAL,
        width REAL,
        height REAL,
        penumbra REAL DEFAULT 0,
        asset_id INTEGER,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
      )
    `);
    
    // Copy data from old table if it exists
    const tableExists = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='lights'");
    if (tableExists.length > 0 && tableExists[0].values.length > 0) {
      // Get columns from old table
      const oldCols = db.exec("PRAGMA table_info(lights)");
      const columnNames = oldCols[0]?.values.map(row => row[1]) || [];
      
      // Only copy columns that exist in both tables
      const newCols = ['id', 'room_id', 'type', 'name', 'position_x', 'position_y', 'position_z', 
                       'intensity', 'color', 'cone_angle', 'distance', 'decay', 'cast_shadow',
                       'color_temperature', 'target_x', 'target_y', 'target_z', 'width', 'height',
                       'penumbra', 'asset_id'];
      const commonCols = newCols.filter(col => columnNames.includes(col));
      
      if (commonCols.length > 0) {
        const colList = commonCols.join(', ');
        db.run(`INSERT INTO lights_new (${colList}) SELECT ${colList} FROM lights`);
      }
      
      // Drop old table and rename new one
      db.run('DROP TABLE lights');
    }
    
    db.run('ALTER TABLE lights_new RENAME TO lights');
    console.log('  Updated lights table with new type constraint');
  } catch (error) {
    // Table might already be correct or not exist
    console.log('  Note:', error.message);
  }
  
  console.log('Migration complete: fix_lights_type_constraint');
}
