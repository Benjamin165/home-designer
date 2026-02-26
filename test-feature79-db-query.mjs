#!/usr/bin/env node
import Database from './backend/node_modules/better-sqlite3/lib/index.js';

const db = new Database('./backend/database.db');

console.log('=== Querying rooms table for floor_material ===\n');

const rooms = db.prepare('SELECT id, name, floor_material, updated_at FROM rooms ORDER BY id').all();

if (rooms.length === 0) {
  console.log('No rooms found in database.');
} else {
  console.log('Rooms in database:');
  rooms.forEach(room => {
    console.log(`  Room #${room.id}: "${room.name || 'Unnamed'}"`);
    console.log(`    floor_material: ${room.floor_material || 'NULL'}`);
    console.log(`    updated_at: ${room.updated_at}`);
    console.log('');
  });
}

db.close();
