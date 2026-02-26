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

    console.log('✓ Database connection established');
  }

  // Always ensure foreign keys are enabled (defensive approach)
  // This is a lightweight check that ensures FK enforcement even if connection was cached
  const fkCheck = db.exec('PRAGMA foreign_keys');
  const fkEnabled = fkCheck.length > 0 && fkCheck[0].values[0][0] === 1;

  if (!fkEnabled) {
    console.log('⚠️  Foreign keys were disabled, enabling now...');
    db.exec('PRAGMA foreign_keys = ON');
    const verifyCheck = db.exec('PRAGMA foreign_keys');
    const nowEnabled = verifyCheck.length > 0 && verifyCheck[0].values[0][0] === 1;
    console.log(`✓ Foreign keys enabled: ${nowEnabled}`);
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
