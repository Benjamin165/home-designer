import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'database.db');

async function listTables() {
  const SQL = await initSqlJs();
  const buffer = readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  console.log('Listing all tables in database:\n');

  const result = db.exec("SELECT name FROM sqlite_master WHERE type='table'");

  if (result.length > 0) {
    result[0].values.forEach(row => {
      console.log(`- ${row[0]}`);
    });
  }

  db.close();
}

listTables();
