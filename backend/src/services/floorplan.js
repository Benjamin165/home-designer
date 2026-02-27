/**
 * Floor Plan Processing Service
 * 
 * Handles floor plan image upload and processing:
 * 1. Image upload and storage
 * 2. Scale calibration (user marks known dimension)
 * 3. Wall detection (optional AI-assisted)
 * 4. Conversion to room structure
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, '../../../assets/floorplans');

/**
 * Ensure floorplans directory exists
 */
function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Save floor plan image
 */
export async function saveFloorPlanImage(buffer, filename) {
  ensureUploadsDir();
  
  const ext = filename.split('.').pop() || 'png';
  const id = crypto.randomBytes(8).toString('hex');
  const newFilename = `floorplan-${Date.now()}-${id}.${ext}`;
  const filepath = join(UPLOADS_DIR, newFilename);
  
  writeFileSync(filepath, buffer);
  
  return {
    path: `/assets/floorplans/${newFilename}`,
    filename: newFilename,
  };
}

/**
 * Calculate scale from a known dimension
 * User draws a line on the image and provides the real-world length
 * 
 * @param {Object} line - Start and end points in pixels { x1, y1, x2, y2 }
 * @param {number} realLength - Real-world length in meters
 * @returns {number} Scale factor (meters per pixel)
 */
export function calculateScale(line, realLength) {
  const pixelLength = Math.sqrt(
    Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2)
  );
  
  if (pixelLength === 0) {
    throw new Error('Invalid line - length is zero');
  }
  
  return realLength / pixelLength;
}

/**
 * Convert traced wall points to room structure
 * 
 * @param {Array} walls - Array of wall segments [{ start: {x, y}, end: {x, y} }]
 * @param {number} scale - Meters per pixel
 * @param {Object} imageOffset - Position of image in viewport { x, z }
 * @returns {Array} Room definitions
 */
export function wallsToRooms(walls, scale, imageOffset = { x: 0, z: 0 }) {
  // Group walls into closed polygons (rooms)
  const rooms = [];
  const usedWalls = new Set();
  
  // Simple algorithm: find closed loops of walls
  for (let i = 0; i < walls.length; i++) {
    if (usedWalls.has(i)) continue;
    
    const room = findClosedLoop(walls, i, usedWalls);
    if (room) {
      // Convert polygon to room dimensions
      const bounds = getPolygonBounds(room);
      rooms.push({
        name: `Room ${rooms.length + 1}`,
        dimensions: {
          width: (bounds.maxX - bounds.minX) * scale,
          depth: (bounds.maxY - bounds.minY) * scale,
        },
        position: {
          x: ((bounds.minX + bounds.maxX) / 2) * scale + imageOffset.x,
          z: ((bounds.minY + bounds.maxY) / 2) * scale + imageOffset.z,
        },
        vertices: room.map(point => ({
          x: point.x * scale + imageOffset.x,
          y: point.y * scale + imageOffset.z,
        })),
      });
    }
  }
  
  return rooms;
}

/**
 * Find a closed loop of walls starting from a given wall
 */
function findClosedLoop(walls, startIndex, usedWalls) {
  const visited = [walls[startIndex].start];
  let current = walls[startIndex].end;
  usedWalls.add(startIndex);
  
  const tolerance = 10; // Pixel tolerance for connecting walls
  
  for (let iteration = 0; iteration < walls.length; iteration++) {
    // Check if we've returned to start
    if (distance(current, walls[startIndex].start) < tolerance) {
      return visited;
    }
    
    // Find next connected wall
    let found = false;
    for (let i = 0; i < walls.length; i++) {
      if (usedWalls.has(i)) continue;
      
      if (distance(current, walls[i].start) < tolerance) {
        visited.push(walls[i].start);
        current = walls[i].end;
        usedWalls.add(i);
        found = true;
        break;
      } else if (distance(current, walls[i].end) < tolerance) {
        visited.push(walls[i].end);
        current = walls[i].start;
        usedWalls.add(i);
        found = true;
        break;
      }
    }
    
    if (!found) break;
  }
  
  return null; // No closed loop found
}

/**
 * Calculate distance between two points
 */
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Get bounding box of a polygon
 */
function getPolygonBounds(polygon) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const point of polygon) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  
  return { minX, maxX, minY, maxY };
}

/**
 * Simple AI-assisted wall detection using edge detection
 * This is a placeholder - real implementation would use a proper CV library
 */
export async function detectWalls(imageBuffer) {
  // In a real implementation, this would:
  // 1. Use OpenCV or similar for edge detection
  // 2. Apply Hough transform for line detection
  // 3. Filter and merge similar lines
  // 4. Return detected wall segments
  
  console.log('[FloorPlan] Wall detection not implemented - returning empty array');
  return [];
}

export default {
  saveFloorPlanImage,
  calculateScale,
  wallsToRooms,
  detectWalls,
};
