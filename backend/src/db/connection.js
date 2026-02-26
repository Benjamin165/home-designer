import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../database.db');

let db = null;
let SQL = null;

export async function getDatabase() {
  if (!db) {
    // Initialize sql.js
    if (!SQL) {
      SQL = await initSqlJs();
    }

    // Load existing database or create new one
    if (existsSync(DB_PATH)) {
      const buffer = readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
      console.log('✓ Database loaded from disk');
    } else {
      db = new SQL.Database();
      console.log('✓ New database created');
    }

    // CRITICAL: Enable foreign keys IMMEDIATELY after database creation
    // In sql.js, PRAGMA foreign_keys is NOT persistent - must be set on every connection
    db.exec('PRAGMA foreign_keys = ON');

    // Verify it worked
    const verifyCheck = db.exec('PRAGMA foreign_keys');
    const fkEnabled = verifyCheck.length > 0 && verifyCheck[0].values[0][0] === 1;
    console.log(`✓ Foreign keys enabled: ${fkEnabled}`);

    console.log('✓ Database connection established');
  }

  return db;
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
    console.log('✓ Database saved to disk');
  }
}

export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('✓ Database connection closed');
  }
}

export function resetDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('✓ Database connection reset');
  }
}

// Auto-save every 30 seconds
setInterval(() => {
  if (db) {
    saveDatabase();
  }
}, 30000);

// Auto-close on process exit
process.on('exit', closeDatabase);
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

export default getDatabase;
