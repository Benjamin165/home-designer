import { getDatabase, saveDatabase } from '../connection.js';

/**
 * Migration: Add light properties to furniture_placements table
 *
 * This migration adds light_intensity and light_color columns to support
 * Feature #47: Edit light properties (intensity, color)
 */
async function up() {
  console.log('Running migration: add_light_properties...');

  const db = await getDatabase();

  try {
    // Add light_intensity column (default 2.0 matches current hardcoded value)
    db.run(`ALTER TABLE furniture_placements ADD COLUMN light_intensity REAL DEFAULT 2.0`);
    console.log('✓ Added light_intensity column');

    // Add light_color column (default warm white matches current hardcoded value)
    db.run(`ALTER TABLE furniture_placements ADD COLUMN light_color TEXT DEFAULT '#fff8e1'`);
    console.log('✓ Added light_color column');

    saveDatabase();
    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('Error running migration:', error);
    throw error;
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { up };
