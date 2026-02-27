/**
 * Room Vision AI Service
 * 
 * Uses Claude Vision API to analyze room photos and extract:
 * - Room dimensions (estimated)
 * - Wall positions
 * - Window/door locations
 * - Room type classification
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Analyze a room photo using Claude Vision
 * @param {string} imagePath - Path to the uploaded image
 * @param {string} apiKey - Anthropic API key
 * @returns {Object} Room analysis results
 */
export async function analyzeRoomPhoto(imagePath, apiKey) {
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const client = new Anthropic({ apiKey });

  // Read image and convert to base64
  const fullPath = join(__dirname, '../../..', imagePath);
  const imageBuffer = readFileSync(fullPath);
  const base64Image = imageBuffer.toString('base64');
  
  // Determine media type from extension
  const ext = imagePath.split('.').pop().toLowerCase();
  const mediaTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif'
  };
  const mediaType = mediaTypes[ext] || 'image/jpeg';

  console.log('[RoomVision] Analyzing room photo with Claude Vision...');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `Analyze this room photo and provide a JSON response with the following structure. Be as accurate as possible based on visual cues, furniture sizes, and architectural elements.

{
  "roomType": "living_room|bedroom|kitchen|bathroom|dining_room|office|hallway|other",
  "confidence": 0.0-1.0,
  "estimatedDimensions": {
    "width": <meters, estimated from visual cues>,
    "depth": <meters, estimated from visual cues>,
    "height": <ceiling height in meters, typically 2.4-3.0>
  },
  "walls": [
    {
      "position": "front|back|left|right",
      "features": ["window", "door", "fireplace", "built_in"],
      "material": "paint|brick|wood|tile|wallpaper|concrete"
    }
  ],
  "windows": [
    {
      "wall": "front|back|left|right",
      "estimatedWidth": <meters>,
      "estimatedHeight": <meters>,
      "type": "standard|floor_to_ceiling|bay|skylight"
    }
  ],
  "doors": [
    {
      "wall": "front|back|left|right",
      "type": "standard|double|sliding|french"
    }
  ],
  "floorMaterial": "hardwood|tile|carpet|laminate|concrete|marble",
  "lightingSources": ["natural", "ceiling", "floor_lamp", "table_lamp", "pendant"],
  "furnishings": [
    {
      "type": "sofa|bed|table|chair|desk|cabinet|etc",
      "estimatedSize": { "width": <m>, "depth": <m>, "height": <m> }
    }
  ],
  "notes": "Any additional observations about the room"
}

Important guidelines:
- Use standard furniture sizes as reference (sofa ~2m, door ~0.9m wide, ~2.1m tall)
- Consider perspective and camera angle when estimating depths
- If uncertain, provide reasonable estimates for a typical room
- Width is typically the wall you're facing, depth is the distance into the room
- Return ONLY the JSON, no additional text`
          }
        ]
      }
    ]
  });

  // Extract JSON from response
  const responseText = response.content[0].text;
  
  // Try to parse JSON, handling potential markdown code blocks
  let jsonStr = responseText;
  if (responseText.includes('```')) {
    const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1].trim();
    }
  }

  try {
    const analysis = JSON.parse(jsonStr);
    console.log('[RoomVision] Analysis complete:', analysis.roomType);
    return analysis;
  } catch (parseError) {
    console.error('[RoomVision] Failed to parse response:', responseText);
    throw new Error('Failed to parse room analysis response');
  }
}

/**
 * Convert room analysis to room structure for the app
 * @param {Object} analysis - Room analysis from Claude
 * @param {number} floorId - Floor ID to create the room on
 * @returns {Object} Room creation data
 */
export function analysisToRoomData(analysis, floorId) {
  const { estimatedDimensions, roomType, walls, windows, doors, floorMaterial } = analysis;

  // Map room types to display names
  const roomTypeNames = {
    'living_room': 'Living Room',
    'bedroom': 'Bedroom',
    'kitchen': 'Kitchen',
    'bathroom': 'Bathroom',
    'dining_room': 'Dining Room',
    'office': 'Office',
    'hallway': 'Hallway',
    'other': 'Room'
  };

  // Map floor materials
  const floorMaterialMap = {
    'hardwood': 'hardwood',
    'tile': 'tile',
    'carpet': 'carpet',
    'laminate': 'laminate',
    'concrete': 'concrete',
    'marble': 'marble'
  };

  return {
    name: roomTypeNames[roomType] || 'Room',
    floor_id: floorId,
    width: estimatedDimensions.width || 4,
    depth: estimatedDimensions.depth || 4,
    ceiling_height: estimatedDimensions.height || 2.8,
    floor_material: floorMaterialMap[floorMaterial] || 'hardwood',
    position_x: 0,
    position_y: 0,
    position_z: 0,
    // Store detailed analysis for reference
    analysis: {
      walls,
      windows,
      doors,
      confidence: analysis.confidence,
      furnishings: analysis.furnishings,
      notes: analysis.notes
    }
  };
}

/**
 * Generate wall entities from room analysis
 * @param {Object} analysis - Room analysis
 * @param {number} roomId - Room ID
 * @param {Object} roomDimensions - Actual room dimensions used
 * @returns {Array} Wall creation data
 */
export function analysisToWalls(analysis, roomId, roomDimensions) {
  const { width, depth, height } = roomDimensions;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  // Create 4 walls based on estimated dimensions
  const wallData = [
    // Front wall (facing camera typically)
    {
      room_id: roomId,
      start_x: -halfWidth,
      start_y: -halfDepth,
      end_x: halfWidth,
      end_y: -halfDepth,
      height: height,
      thickness: 0.15,
      material: getWallMaterial(analysis.walls, 'front')
    },
    // Back wall
    {
      room_id: roomId,
      start_x: halfWidth,
      start_y: halfDepth,
      end_x: -halfWidth,
      end_y: halfDepth,
      height: height,
      thickness: 0.15,
      material: getWallMaterial(analysis.walls, 'back')
    },
    // Left wall
    {
      room_id: roomId,
      start_x: -halfWidth,
      start_y: halfDepth,
      end_x: -halfWidth,
      end_y: -halfDepth,
      height: height,
      thickness: 0.15,
      material: getWallMaterial(analysis.walls, 'left')
    },
    // Right wall
    {
      room_id: roomId,
      start_x: halfWidth,
      start_y: -halfDepth,
      end_x: halfWidth,
      end_y: halfDepth,
      height: height,
      thickness: 0.15,
      material: getWallMaterial(analysis.walls, 'right')
    }
  ];

  return wallData;
}

/**
 * Get wall material from analysis
 */
function getWallMaterial(walls, position) {
  if (!walls) return 'paint';
  const wall = walls.find(w => w.position === position);
  return wall?.material || 'paint';
}

export default {
  analyzeRoomPhoto,
  analysisToRoomData,
  analysisToWalls
};
