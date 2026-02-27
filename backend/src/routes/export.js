import express from 'express';
import PDFDocument from 'pdfkit';
import { getDatabase } from '../db/connection.js';

const router = express.Router();

// Helper to execute SQL and return array of objects
function queryToObjects(db, sql, params = []) {
  const result = db.exec(sql, params);
  if (result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

// Helper to execute SQL and return single object
function queryToObject(db, sql, params = []) {
  const objects = queryToObjects(db, sql, params);
  return objects.length > 0 ? objects[0] : null;
}

// POST /api/export/floorplan - Export floor plan as PDF
router.post('/floorplan', async (req, res) => {
  try {
    const { projectId, floorId, format = 'pdf' } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const db = await getDatabase();

    // Get project details
    const project = queryToObject(db, `SELECT * FROM projects WHERE id = ${projectId}`);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get floors (if floorId specified, get only that floor, otherwise get all)
    let floors;
    if (floorId) {
      floors = queryToObjects(db, `SELECT * FROM floors WHERE id = ${floorId} AND project_id = ${projectId}`);
      if (floors.length === 0) {
        return res.status(404).json({ error: 'Floor not found' });
      }
    } else {
      floors = queryToObjects(db, `SELECT * FROM floors WHERE project_id = ${projectId} ORDER BY order_index`);
    }

    // Get rooms for each floor with their walls
    const floorsWithRooms = floors.map(floor => {
      const rooms = queryToObjects(db, `SELECT * FROM rooms WHERE floor_id = ${floor.id}`);

      const roomsWithWalls = rooms.map(room => {
        const walls = queryToObjects(db, `SELECT * FROM walls WHERE room_id = ${room.id}`);
        return {
          ...room,
          dimensions: room.dimensions_json ? JSON.parse(room.dimensions_json) : null,
          walls
        };
      });

      return {
        ...floor,
        rooms: roomsWithWalls
      };
    });

    if (format === 'pdf') {
      // Create PDF
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_floorplan.pdf"`);

      // Pipe PDF to response
      doc.pipe(res);

      // Add title
      doc.fontSize(20).text(project.name, { align: 'center' });
      doc.fontSize(12).text('Floor Plan', { align: 'center' });
      doc.moveDown();

      // Draw each floor
      for (const floor of floorsWithRooms) {
        if (floor !== floorsWithRooms[0]) {
          doc.addPage();
        }

        doc.fontSize(16).text(floor.name || `Floor ${floor.level}`, { underline: true });
        doc.moveDown();

        if (floor.rooms.length === 0) {
          doc.fontSize(12).text('No rooms on this floor', { align: 'center' });
          continue;
        }

        // Calculate bounds to fit all rooms
        const bounds = calculateBounds(floor.rooms);

        // Drawing parameters
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom - 100; // Reserve space for title
        const scale = Math.min(pageWidth / bounds.width, pageHeight / bounds.height, 50); // Max 50 pixels per meter

        const offsetX = doc.page.margins.left + (pageWidth - bounds.width * scale) / 2 - bounds.minX * scale;
        const offsetY = doc.page.margins.top + 80 + (pageHeight - bounds.height * scale) / 2 - bounds.minY * scale;

        // Draw rooms
        floor.rooms.forEach(room => {
          if (!room.walls || room.walls.length === 0) return;

          // Draw walls
          doc.strokeColor('#000000').lineWidth(2);

          room.walls.forEach(wall => {
            const x1 = offsetX + wall.start_x * scale;
            const y1 = offsetY + wall.start_y * scale;
            const x2 = offsetX + wall.end_x * scale;
            const y2 = offsetY + wall.end_y * scale;

            doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
          });

          // Draw room label and dimensions
          const roomCenterX = offsetX + room.position_x * scale;
          const roomCenterY = offsetY + room.position_z * scale;

          doc.fontSize(10).fillColor('#000000');

          // Room name
          const roomName = room.name || 'Room';
          doc.text(roomName, roomCenterX - 50, roomCenterY - 15, { width: 100, align: 'center' });

          // Room dimensions (calculate from walls if dimensions_json not available)
          let width = 0, depth = 0;
          if (room.dimensions && room.dimensions.width && room.dimensions.depth) {
            width = room.dimensions.width;
            depth = room.dimensions.depth;
          } else if (room.walls.length > 0) {
            // Calculate from walls
            const xCoords = room.walls.flatMap(w => [w.start_x, w.end_x]);
            const yCoords = room.walls.flatMap(w => [w.start_y, w.end_y]);
            width = Math.max(...xCoords) - Math.min(...xCoords);
            depth = Math.max(...yCoords) - Math.min(...yCoords);
          }

          const unitSystem = project.unit_system || 'metric';
          const dimensionText = formatDimensions(width, depth, unitSystem);
          doc.fontSize(8).fillColor('#666666');
          doc.text(dimensionText, roomCenterX - 50, roomCenterY + 5, { width: 100, align: 'center' });
        });

        // Add legend
        doc.fontSize(10).fillColor('#000000');
        const legendY = doc.page.height - doc.page.margins.bottom - 30;
        doc.text(`Scale: 1:${Math.round(100 / scale)}`, doc.page.margins.left, legendY);
        doc.text(`Unit: ${project.unit_system === 'imperial' ? 'Feet' : 'Meters'}`, doc.page.width - doc.page.margins.right - 100, legendY);
      }

      // Finalize PDF
      doc.end();
    } else {
      // For now, only PDF is supported
      return res.status(400).json({ error: 'Only PDF format is currently supported' });
    }
  } catch (error) {
    console.error('Error exporting floor plan:', error);
    res.status(500).json({ error: 'Failed to export floor plan' });
  }
});

// Helper function to calculate bounds of all rooms
function calculateBounds(rooms) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  rooms.forEach(room => {
    if (room.walls && room.walls.length > 0) {
      room.walls.forEach(wall => {
        minX = Math.min(minX, wall.start_x, wall.end_x);
        minY = Math.min(minY, wall.start_y, wall.end_y);
        maxX = Math.max(maxX, wall.start_x, wall.end_x);
        maxY = Math.max(maxY, wall.start_y, wall.end_y);
      });
    }
  });

  return {
    minX: minX === Infinity ? 0 : minX,
    minY: minY === Infinity ? 0 : minY,
    maxX: maxX === -Infinity ? 10 : maxX,
    maxY: maxY === -Infinity ? 10 : maxY,
    width: (maxX === -Infinity ? 10 : maxX) - (minX === Infinity ? 0 : minX),
    height: (maxY === -Infinity ? 10 : maxY) - (minY === Infinity ? 0 : minY)
  };
}

// Helper function to format dimensions
function formatDimensions(width, depth, unitSystem) {
  if (unitSystem === 'imperial') {
    const widthFt = (width * 3.28084).toFixed(1);
    const depthFt = (depth * 3.28084).toFixed(1);
    return `${widthFt} × ${depthFt} ft`;
  } else {
    return `${width.toFixed(1)} × ${depth.toFixed(1)} m`;
  }
}

// POST /api/export/materials - Export material list as CSV
router.post('/materials', async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const db = await getDatabase();

    // Get project
    const project = queryToObject(db, `SELECT * FROM projects WHERE id = ${projectId}`);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all floors, rooms, walls, and furniture
    const floors = queryToObjects(db, `SELECT * FROM floors WHERE project_id = ${projectId}`);
    
    const materials = [];
    
    for (const floor of floors) {
      const rooms = queryToObjects(db, `SELECT * FROM rooms WHERE floor_id = ${floor.id}`);
      
      for (const room of rooms) {
        const dimensions = room.dimensions_json ? JSON.parse(room.dimensions_json) : { width: 0, depth: 0 };
        const floorArea = (dimensions.width || 0) * (dimensions.depth || 0);
        const wallArea = 2 * (dimensions.width + dimensions.depth) * (room.ceiling_height || 2.8);
        
        // Floor material
        if (room.floor_material) {
          materials.push({
            floor: floor.name || `Floor ${floor.level}`,
            room: room.name || 'Unnamed Room',
            element: 'Floor',
            material: room.floor_material,
            color: room.floor_color || '',
            area_sqm: floorArea.toFixed(2),
            notes: ''
          });
        }
        
        // Ceiling material
        if (room.ceiling_material) {
          materials.push({
            floor: floor.name || `Floor ${floor.level}`,
            room: room.name || 'Unnamed Room',
            element: 'Ceiling',
            material: room.ceiling_material,
            color: room.ceiling_color || '',
            area_sqm: floorArea.toFixed(2),
            notes: ''
          });
        }
        
        // Wall materials
        const walls = queryToObjects(db, `SELECT * FROM walls WHERE room_id = ${room.id}`);
        for (const wall of walls) {
          const wallLength = Math.sqrt(
            Math.pow(wall.end_x - wall.start_x, 2) + 
            Math.pow(wall.end_y - wall.start_y, 2)
          );
          const singleWallArea = wallLength * wall.height;
          
          if (wall.material) {
            materials.push({
              floor: floor.name || `Floor ${floor.level}`,
              room: room.name || 'Unnamed Room',
              element: `Wall`,
              material: wall.material,
              color: wall.color || '',
              area_sqm: singleWallArea.toFixed(2),
              notes: ''
            });
          }
        }
        
        // Furniture
        const furniture = queryToObjects(db, `
          SELECT fp.*, a.name as asset_name, a.category
          FROM furniture_placements fp
          LEFT JOIN assets a ON fp.asset_id = a.id
          WHERE fp.room_id = ${room.id}
        `);
        
        for (const item of furniture) {
          materials.push({
            floor: floor.name || `Floor ${floor.level}`,
            room: room.name || 'Unnamed Room',
            element: 'Furniture',
            material: item.asset_name || 'Unknown',
            color: '',
            area_sqm: '',
            notes: item.category || ''
          });
        }
      }
    }

    // Generate CSV
    const headers = ['Floor', 'Room', 'Element', 'Material', 'Color', 'Area (sqm)', 'Notes'];
    const csvRows = [headers.join(',')];
    
    for (const m of materials) {
      const row = [
        `"${m.floor}"`,
        `"${m.room}"`,
        `"${m.element}"`,
        `"${m.material}"`,
        `"${m.color}"`,
        m.area_sqm,
        `"${m.notes}"`
      ];
      csvRows.push(row.join(','));
    }
    
    const csv = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_materials.csv"`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error exporting materials:', error);
    res.status(500).json({ error: 'Failed to export materials' });
  }
});

// POST /api/export/backup - Export full project as JSON backup
router.post('/backup', async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const db = await getDatabase();

    // Get project
    const project = queryToObject(db, `SELECT * FROM projects WHERE id = ${projectId}`);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all related data
    const floors = queryToObjects(db, `SELECT * FROM floors WHERE project_id = ${projectId}`);
    
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      project: project,
      floors: []
    };
    
    for (const floor of floors) {
      const rooms = queryToObjects(db, `SELECT * FROM rooms WHERE floor_id = ${floor.id}`);
      
      const floorData = {
        ...floor,
        rooms: []
      };
      
      for (const room of rooms) {
        const walls = queryToObjects(db, `SELECT * FROM walls WHERE room_id = ${room.id}`);
        const furniture = queryToObjects(db, `SELECT * FROM furniture_placements WHERE room_id = ${room.id}`);
        const lights = queryToObjects(db, `SELECT * FROM lights WHERE room_id = ${room.id}`);
        
        floorData.rooms.push({
          ...room,
          dimensions_json: room.dimensions_json ? JSON.parse(room.dimensions_json) : null,
          walls,
          furniture,
          lights
        });
      }
      
      backup.floors.push(floorData);
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_backup.json"`);
    res.json(backup);
    
  } catch (error) {
    console.error('Error exporting backup:', error);
    res.status(500).json({ error: 'Failed to export backup' });
  }
});

// GET /api/export/summary/:projectId - Get project summary stats
router.get('/summary/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const db = await getDatabase();

    const project = queryToObject(db, `SELECT * FROM projects WHERE id = ${projectId}`);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Count all entities
    const floors = queryToObjects(db, `SELECT * FROM floors WHERE project_id = ${projectId}`);
    let totalRooms = 0;
    let totalWalls = 0;
    let totalFurniture = 0;
    let totalLights = 0;
    let totalFloorArea = 0;
    
    for (const floor of floors) {
      const rooms = queryToObjects(db, `SELECT * FROM rooms WHERE floor_id = ${floor.id}`);
      totalRooms += rooms.length;
      
      for (const room of rooms) {
        const walls = queryToObjects(db, `SELECT COUNT(*) as count FROM walls WHERE room_id = ${room.id}`);
        totalWalls += walls[0]?.count || 0;
        
        const furniture = queryToObjects(db, `SELECT COUNT(*) as count FROM furniture_placements WHERE room_id = ${room.id}`);
        totalFurniture += furniture[0]?.count || 0;
        
        const lights = queryToObjects(db, `SELECT COUNT(*) as count FROM lights WHERE room_id = ${room.id}`);
        totalLights += lights[0]?.count || 0;
        
        const dimensions = room.dimensions_json ? JSON.parse(room.dimensions_json) : { width: 0, depth: 0 };
        totalFloorArea += (dimensions.width || 0) * (dimensions.depth || 0);
      }
    }
    
    res.json({
      project: {
        id: project.id,
        name: project.name,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      },
      statistics: {
        floors: floors.length,
        rooms: totalRooms,
        walls: totalWalls,
        furniture: totalFurniture,
        lights: totalLights,
        totalFloorArea: {
          sqm: totalFloorArea.toFixed(2),
          sqft: (totalFloorArea * 10.764).toFixed(2)
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({ error: 'Failed to get project summary' });
  }
});

export default router;
