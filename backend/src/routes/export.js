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

export default router;
