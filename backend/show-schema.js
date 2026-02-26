import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'database.db');

async function showSchema() {
  const SQL = await initSqlJs();
  const buffer = readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  console.log('Schema for furniture_placements table:\n');

  const result = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='furniture_placements'");

  if (result.length > 0) {
    console.log(result[0].values[0][0]);
  }

  console.log('\n\nSample data from furniture_placements:\n');

  const data = db.exec('SELECT * FROM furniture_placements LIMIT 5');

  if (data.length > 0) {
    console.log('Columns:', data[0].columns.join(', '));
    console.log('\nRows:');
    data[0].values.forEach((row, i) => {
      console.log(`${i + 1}.`, row.join(' | '));
    });
  }

  db.close();
}

showSchema();
