#!/usr/bin/env node
/**
 * Verify Feature #113: Check for ID uniqueness
 */

const response = await fetch('http://localhost:5000/api/rooms/1/furniture');
const data = await response.json();
const furniture = data.furniture || [];

const ids = furniture.map(f => f.id);
const uniqueIds = new Set(ids);

console.log('Feature #113 Verification:\n');
console.log(`Total furniture items: ${ids.length}`);
console.log(`Unique IDs: ${uniqueIds.size}`);
console.log(`Duplicates: ${ids.length - uniqueIds.size}`);

if (ids.length === uniqueIds.size) {
  console.log('\n✅ Feature #113 PASSING: No ID conflicts detected');
  process.exit(0);
} else {
  console.log('\n❌ Feature #113 FAILING: Duplicate IDs found!');
  process.exit(1);
}
