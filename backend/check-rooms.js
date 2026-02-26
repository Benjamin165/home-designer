import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
const buffer = fs.readFileSync('backend/database.db');
const db = new SQL.Database(buffer);

console.log('\n=== Projects with Rooms ===');
const projectsResult = db.exec(`
  SELECT p.id, p.name, COUNT(r.id) as room_count, MAX(r.created_at) as last_room_created
  FROM projects p
  LEFT JOIN floors f ON f.project_id = p.id
  LEFT JOIN rooms r ON r.floor_id = f.id
  GROUP BY p.id
  HAVING room_count > 0
  ORDER BY last_room_created DESC
`);

if (projectsResult.length > 0) {
  const projects = projectsResult[0];
  for (let i = 0; i < projects.values.length; i++) {
    const row = projects.values[i];
    console.log(`\nProject: ${row[1]} (ID: ${row[0]})`);
    console.log(`  Rooms: ${row[2]}`);
    console.log(`  Last room created: ${row[3]}`);
  }
}

console.log('\n=== Recent Rooms ===');
const roomsResult = db.exec(`
  SELECT r.id, r.name, r.width, r.depth, r.created_at, f.name as floor_name, p.name as project_name
  FROM rooms r
  JOIN floors f ON f.id = r.floor_id
  JOIN projects p ON p.id = f.project_id
  ORDER BY r.created_at DESC
  LIMIT 10
`);

if (roomsResult.length > 0) {
  const rooms = roomsResult[0];
  for (let i = 0; i < rooms.values.length; i++) {
    const row = rooms.values[i];
    console.log(`\n${row[6]} / ${row[5]} / ${row[1] || 'Unnamed'}`);
    console.log(`  Size: ${row[2]}m x ${row[3]}m`);
    console.log(`  Created: ${row[4]}`);
  }
}

db.close();
