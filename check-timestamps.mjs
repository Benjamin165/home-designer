#!/usr/bin/env node
import { getDatabase } from './backend/src/db/connection.js';

async function checkTimestamps() {
  try {
    const db = await getDatabase();
    const result = db.exec('SELECT id, name, created_at, updated_at FROM projects LIMIT 3');

    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const projects = result[0].values.map(row => {
        const project = {};
        columns.forEach((col, idx) => {
          project[col] = row[idx];
        });
        return project;
      });

      console.log('Database timestamp format:');
      console.log(JSON.stringify(projects, null, 2));

      console.log('\nJavaScript Date parsing:');
      projects.forEach(p => {
        console.log(`\nProject: ${p.name}`);
        console.log(`  created_at (raw): ${p.created_at}`);
        console.log(`  created_at (parsed): ${new Date(p.created_at)}`);
        console.log(`  created_at (locale): ${new Date(p.created_at).toLocaleString()}`);
        console.log(`  updated_at (raw): ${p.updated_at}`);
        console.log(`  updated_at (parsed): ${new Date(p.updated_at)}`);
        console.log(`  updated_at (locale): ${new Date(p.updated_at).toLocaleString()}`);
      });
    } else {
      console.log('No projects found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTimestamps();
