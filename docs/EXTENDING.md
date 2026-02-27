# Extension & Modification Guide

**🔧 Practical Cookbook** — Step-by-step instructions for the most common extensions an AI coder would be asked to implement.

This document is designed as a **cookbook for modifications**, not architectural explanations. For each common extension type, we list every file that needs to change and exactly what to do.

## Table of Contents

1. [Adding New Furniture/Assets](#1-adding-new-furnitureassets)
2. [Adding a New Room Shape Type](#2-adding-a-new-room-shape-type)
3. [Adding a New Material Preset](#3-adding-a-new-material-preset)
4. [Adding a New Export Format](#4-adding-a-new-export-format)
5. [Adding a New AI Provider](#5-adding-a-new-ai-provider)
6. [Adding a New Editor Tool](#6-adding-a-new-editor-tool)
7. [Adding a New Settings Option](#7-adding-a-new-settings-option)

---

## 1. Adding New Furniture/Assets

**Goal:** Add a new piece of furniture (or batch-add a furniture catalog) to the asset library.

### Files to Modify

#### 1.1 Database Entry

**File:** Manual SQL query or use the API endpoint

**Action:** Insert the asset record into the database using the API:

```bash
# Example using curl or direct database insert
POST /api/assets
{
  "name": "Modern Sectional Sofa",
  "category": "seating",
  "subcategory": "sofas",
  "source": "builtin",  // or 'generated', 'imported', 'url_import'
  "model_path": "/assets/models/sofa-modern-sectional.glb",
  "thumbnail_path": "/assets/thumbnails/sofa-modern-sectional.png",
  "width": 2.4,
  "height": 0.85,
  "depth": 1.6,
  "dimension_locked": false,
  "source_url": null,
  "source_product_name": null
}
```

**Schema Reference:** See `backend/src/db/init.js` lines 100-122 for the `assets` table schema.

#### 1.2 Model File Placement

**Directory:** `assets/models/`

**Action:** Place the glTF/GLB 3D model file in the assets directory. Ensure:
- File is optimized (Draco compression recommended)
- Dimensions match real-world scale (meters)
- Proper texture baking if textures are used
- File naming convention: `{category}-{name-slug}.glb`

#### 1.3 Thumbnail Generation

**Directory:** `assets/thumbnails/`

**Action:** Create or render a square thumbnail image (256x256px recommended):
- PNG format with transparency
- Render from 3/4 isometric view (matching library preview style)
- White/light neutral background
- File naming convention: `{category}-{name-slug}.png`

#### 1.4 Category Mapping (if adding new category)

**File:** `frontend/src/components/AssetLibrary.tsx`

**Lines to modify:** 33-44 (category definitions)

**Action:** If adding a new top-level category (beyond seating, tables, storage, beds, lighting, decor, plants, windows, doors), add it to the `categories` array:

```tsx
const categories = [
  { id: 'all', label: 'All', icon: Grid3x3 },
  { id: 'seating', label: 'Seating', icon: Armchair },
  { id: 'tables', label: 'Tables', icon: Table },
  // ... existing categories
  { id: 'outdoor', label: 'Outdoor', icon: TreePine }, // NEW CATEGORY
];
```

Import the appropriate icon from `lucide-react` at the top of the file.

#### 1.5 Search/Filter Integration (automatic)

No file changes needed — the search and filter system (`AssetLibrary.tsx` lines 100-130) automatically queries the database with category and search filters. As long as your asset has a `name` and `category` field, it will be searchable.

### LLM-Assisted Batch Addition

For batch-adding many assets (e.g., an entire furniture catalog):

1. **Prepare a CSV/JSON list** with columns: name, category, subcategory, dimensions (W×H×D), model_path, thumbnail_path
2. **Use the POST /api/assets endpoint** in a loop (see `backend/src/routes/assets.js` lines 78-134)
3. **Script example:**

```javascript
const assetsToAdd = [
  { name: 'Dining Chair Oak', category: 'seating', subcategory: 'dining-chairs', width: 0.45, height: 0.9, depth: 0.5, ... },
  { name: 'Dining Chair Walnut', category: 'seating', subcategory: 'dining-chairs', width: 0.45, height: 0.9, depth: 0.5, ... },
  // ... more assets
];

for (const asset of assetsToAdd) {
  await fetch('http://localhost:5000/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset)
  });
}
```

### Verification Checklist

- [ ] Asset appears in the library panel (correct category)
- [ ] Thumbnail loads correctly
- [ ] 3D model renders when dragged into the scene
- [ ] Dimensions are accurate (use measurement tool in editor)
- [ ] Search finds the asset by name
- [ ] Category filter shows/hides the asset correctly
- [ ] Favorite toggle works (star icon)
- [ ] Asset persists after server restart (real database entry)

---

## 2. Adding a New Room Shape Type

**Goal:** Add support for a non-rectangular room shape (e.g., L-shape, circular, octagonal).

Currently, the app supports rectangular rooms via the "Draw Wall" tool. Adding new shapes requires:

### Files to Modify

#### 2.1 Room Geometry Definition

**File:** `frontend/src/components/Viewport3D.tsx`

**Lines to modify:** 573-700 (handleCreateRoomByDrag function)

**Action:** Extend the room creation logic to support shape types beyond rectangles. Add a shape parameter:

```tsx
// In dimensions_json, add a 'shape' field:
const dimensions = {
  width: Math.abs(dragEndX - dragStartX),
  depth: Math.abs(dragEndZ - dragStartZ),
  shape: 'rectangle', // NEW: 'rectangle', 'l-shape', 'circular', etc.
  vertices: [...], // For non-rectangular shapes
};
```

#### 2.2 Shape Drawing Tool

**File:** `frontend/src/store/editorStore.ts`

**Lines to modify:** 3 (EditorTool type definition)

**Action:** Add new tool types for each shape:

```tsx
export type EditorTool = 'select' | 'draw-wall' | 'draw-l-shape' | 'draw-circle' | 'measure' | 'place-furniture' | 'pan' | 'first-person';
```

**File:** `frontend/src/components/Editor.tsx`

**Lines to modify:** 850-900 (toolbar buttons)

**Action:** Add toolbar buttons for each new shape tool:

```tsx
<button
  onClick={() => setCurrentTool('draw-l-shape')}
  className={/* ... */}
  title="Draw L-Shaped Room"
>
  <SquareCornerUpRight className="w-5 h-5" />
</button>
```

#### 2.3 Geometry Generation

**File:** `frontend/src/components/Viewport3D.tsx`

**Lines to modify:** 250-350 (Room rendering logic in the JSX)

**Action:** Update the room rendering to handle different shapes. Currently, rooms are rendered as simple boxes. For L-shapes, you'll need to:

1. Parse the `vertices` array from `dimensions_json`
2. Use Three.js `Shape` and `ExtrudeGeometry` to create custom floor/ceiling meshes
3. Generate walls between each pair of vertices

Example for L-shape:

```tsx
// In the rooms.map() section (around line 300):
const dimensions = JSON.parse(room.dimensions_json);

if (dimensions.shape === 'l-shape' && dimensions.vertices) {
  // Create custom shape from vertices
  const shape = new THREE.Shape();
  shape.moveTo(dimensions.vertices[0].x, dimensions.vertices[0].y);
  dimensions.vertices.slice(1).forEach(v => shape.lineTo(v.x, v.y));
  shape.lineTo(dimensions.vertices[0].x, dimensions.vertices[0].y); // Close shape

  const extrudeSettings = { depth: room.ceiling_height, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Render with <mesh geometry={geometry} ... />
}
```

#### 2.4 Property Panel Updates

**File:** `frontend/src/components/PropertiesPanel.tsx`

**Lines to modify:** 200-350 (room properties section)

**Action:** Display shape-specific properties:

```tsx
{selectedRoom && (
  <div className="space-y-4">
    <div>
      <label className="text-sm text-muted-foreground">Shape</label>
      <p className="font-medium capitalize">{dimensions.shape || 'rectangle'}</p>
    </div>

    {dimensions.shape === 'rectangle' && (
      <>
        <div>
          <label>Width</label>
          <p>{dimensions.width}m</p>
        </div>
        <div>
          <label>Depth</label>
          <p>{dimensions.depth}m</p>
        </div>
      </>
    )}

    {dimensions.shape === 'l-shape' && (
      <div>
        <label>Vertices</label>
        <p>{dimensions.vertices.length} points</p>
      </div>
    )}
  </div>
)}
```

#### 2.5 Database Schema (no changes needed)

The `rooms` table already has a `dimensions_json` TEXT field that can store any JSON structure. Store vertices, shape type, and custom parameters there.

**File:** `backend/src/db/init.js` (lines 62-80) — no changes needed

### Implementation Strategy

1. **Start with the simplest non-rectangular shape:** L-shaped rooms (two rectangles joined)
2. **Store vertex data** in `dimensions_json` as `{shape: 'l-shape', vertices: [{x, y}, ...]}`
3. **Extend the draw tool** to capture clicks for L-shape vertices instead of drag-rectangle
4. **Update 3D rendering** to use `ExtrudeGeometry` instead of `BoxGeometry`
5. **Generate walls** programmatically between each pair of vertices

### Verification Checklist

- [ ] New shape tool appears in the toolbar
- [ ] Tool cursor changes when selected
- [ ] Drawing interaction works (click-to-place vertices or drag as appropriate)
- [ ] Live dimension preview shows during drawing
- [ ] Room creates successfully in database
- [ ] 3D room renders with correct shape
- [ ] Floor and ceiling materials apply correctly
- [ ] Walls generate correctly around the perimeter
- [ ] Room properties panel displays shape-specific info
- [ ] Room can be selected and deleted
- [ ] Furniture can be placed inside the shaped room
- [ ] Dimensions are accurate when measured with measurement tool

---

## 3. Adding a New Material Preset

**Goal:** Add a new wall/floor/ceiling material preset (e.g., "Marble Carrara", "Oak Hardwood", "Concrete Industrial").

### Files to Modify

#### 3.1 Database Entry

**File:** `backend/src/db/init.js`

**Lines to modify:** 183-199 (seed data for material_presets)

**Action:** Add INSERT statement for the new preset:

```sql
INSERT INTO material_presets (name, type, color, texture_path, properties_json, is_builtin)
VALUES (
  'Marble Carrara',
  'floor',
  '#F5F5F5',
  '/assets/textures/marble-carrara.jpg',
  '{"roughness": 0.2, "metalness": 0.1, "normalMap": "/assets/textures/marble-carrara-normal.jpg"}',
  1
);
```

**Note:** The `type` field must be one of: `'wall'`, `'floor'`, or `'ceiling'`.

Alternatively, use the API if you don't want to modify seed data:

```bash
# API endpoint (needs to be implemented if not present):
POST /api/materials/presets
{
  "name": "Marble Carrara",
  "type": "floor",
  "color": "#F5F5F5",
  "texture_path": "/assets/textures/marble-carrara.jpg",
  "properties_json": "{\"roughness\": 0.2, \"metalness\": 0.1}",
  "is_builtin": true
}
```

#### 3.2 Texture File

**Directory:** `assets/textures/`

**Action:** Place texture image files in the assets directory:
- Diffuse/color map: `marble-carrara.jpg` (1024x1024px or 2048x2048px, seamlessly tileable)
- Normal map (optional): `marble-carrara-normal.jpg`
- Roughness map (optional): `marble-carrara-roughness.jpg`

**Format:** Use compressed textures (JPEG for color maps, PNG for alpha/normal maps).

#### 3.3 Material Picker UI Integration

**File:** `frontend/src/components/PropertiesPanel.tsx`

**Lines to modify:** 450-600 (material selection UI)

**Action:** The material presets are loaded dynamically from the database. Ensure the query fetches all presets:

```tsx
// Around line 480:
useEffect(() => {
  const loadMaterialPresets = async () => {
    const response = await fetch('/api/materials/presets'); // If API exists
    const data = await response.json();
    setMaterialPresets(data.presets);
  };
  loadMaterialPresets();
}, []);
```

If the API doesn't exist yet, create it in `backend/src/routes/` (new file: `materials.js`).

#### 3.4 3D Material Application

**File:** `frontend/src/components/Viewport3D.tsx`

**Lines to modify:** 250-400 (room rendering, floor/wall/ceiling meshes)

**Action:** Ensure the material properties from `properties_json` are applied to Three.js materials:

```tsx
// When rendering floor (around line 320):
const floorMaterial = new THREE.MeshStandardMaterial({
  color: room.floor_color || '#E5E7EB',
  roughness: materialPreset?.roughness || 0.8,
  metalness: materialPreset?.metalness || 0.0,
});

if (room.floor_texture_path) {
  const texture = textureLoader.load(room.floor_texture_path);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); // Adjust tiling as needed
  floorMaterial.map = texture;

  // Apply normal map if specified
  if (materialPreset?.normalMap) {
    const normalMap = textureLoader.load(materialPreset.normalMap);
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(4, 4);
    floorMaterial.normalMap = normalMap;
  }
}
```

Repeat for walls and ceiling materials.

#### 3.5 Material Preset Selector Component

**File:** `frontend/src/components/PropertiesPanel.tsx`

**Lines to modify:** 500-600 (material preset grid)

**Action:** Ensure presets are displayed as clickable thumbnails:

```tsx
<div className="grid grid-cols-3 gap-2">
  {materialPresets
    .filter(preset => preset.type === 'floor') // or 'wall', 'ceiling'
    .map(preset => (
      <button
        key={preset.id}
        onClick={() => applyMaterialPreset(preset)}
        className="aspect-square rounded-lg overflow-hidden border-2 hover:border-primary"
        title={preset.name}
      >
        <div
          className="w-full h-full"
          style={{
            backgroundColor: preset.color,
            backgroundImage: preset.texture_path ? `url(${preset.texture_path})` : 'none',
            backgroundSize: 'cover'
          }}
        />
      </button>
    ))
  }
</div>
```

### Backend API Endpoint (if not present)

**File:** `backend/src/routes/materials.js` (create new file)

```javascript
import express from 'express';
import { getDatabase } from '../db/connection.js';

const router = express.Router();

// GET /api/materials/presets
router.get('/presets', async (req, res) => {
  try {
    const { type } = req.query; // 'wall', 'floor', 'ceiling'
    const db = await getDatabase();

    let query = 'SELECT * FROM material_presets WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY name ASC';

    const result = db.exec(query, params);
    // ... parse results as in assets.js

    res.json({ presets });
  } catch (error) {
    console.error('Error fetching material presets:', error);
    res.status(500).json({ error: 'Failed to fetch material presets' });
  }
});

export default router;
```

**File:** `backend/src/server.js`

**Lines to modify:** Add the new route:

```javascript
import materialsRoutes from './routes/materials.js';
app.use('/api/materials', materialsRoutes);
```

### Verification Checklist

- [ ] Material preset appears in the properties panel material picker
- [ ] Preset thumbnail shows the correct color/texture
- [ ] Clicking the preset applies it to the selected surface (floor/wall/ceiling)
- [ ] Texture tiles correctly in the 3D viewport (no stretching)
- [ ] Normal/roughness maps apply correctly (if used)
- [ ] Material persists after save and reload
- [ ] Material works on all applicable surface types (floor/wall/ceiling)
- [ ] Preset is stored in database (check with `SELECT * FROM material_presets`)

---

## 4. Adding a New Export Format

**Goal:** Add a new export format (e.g., OBJ, FBX, USDZ) beyond the existing PDF/PNG/glTF options.

### Files to Modify

#### 4.1 Backend Export Service

**File:** `backend/src/routes/export.js`

**Lines to modify:** Add a new endpoint or extend existing `/api/export/scene`

**Action:** Create export logic for the new format. Example for OBJ export:

```javascript
// Add to backend/src/routes/export.js (around line 220):

// POST /api/export/scene-obj - Export scene as OBJ
router.post('/scene-obj', async (req, res) => {
  try {
    const { projectId, floorId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const db = await getDatabase();

    // Fetch all rooms, furniture, and their geometry
    const rooms = queryToObjects(db, `
      SELECT r.* FROM rooms r
      JOIN floors f ON r.floor_id = f.id
      WHERE f.project_id = ${projectId}
      ${floorId ? `AND f.id = ${floorId}` : ''}
    `);

    const furniture = queryToObjects(db, `
      SELECT fp.*, a.model_path FROM furniture_placements fp
      JOIN assets a ON fp.asset_id = a.id
      WHERE fp.room_id IN (${rooms.map(r => r.id).join(',')})
    `);

    // Convert to OBJ format
    // (This is complex - you may need a library like 'obj-file-parser' or 'three-to-obj')
    let objContent = '# Home Designer Export\n';
    objContent += '# Generated: ' + new Date().toISOString() + '\n\n';

    // For each room, add vertices, faces, etc.
    // For each furniture, load GLB and convert to OBJ format
    // This is a simplified example - real implementation would use Three.js OBJExporter

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="project-${projectId}.obj"`);
    res.send(objContent);

  } catch (error) {
    console.error('Error exporting scene as OBJ:', error);
    res.status(500).json({ error: 'Failed to export scene' });
  }
});
```

**Note:** For complex formats like FBX or USDZ, consider using Three.js exporters on the frontend or third-party conversion libraries.

#### 4.2 Export Dialog UI

**File:** `frontend/src/components/ExportModal.tsx`

**Lines to modify:** 50-150 (format selection radio buttons)

**Action:** Add the new format option:

```tsx
<div className="space-y-3">
  <label className="flex items-center space-x-3 cursor-pointer">
    <input
      type="radio"
      name="exportFormat"
      value="glb"
      checked={exportFormat === 'glb'}
      onChange={(e) => setExportFormat(e.target.value)}
      className="w-4 h-4"
    />
    <div>
      <div className="font-medium">3D Scene (GLB)</div>
      <div className="text-sm text-muted-foreground">Full 3D scene with textures</div>
    </div>
  </label>

  {/* NEW FORMAT */}
  <label className="flex items-center space-x-3 cursor-pointer">
    <input
      type="radio"
      name="exportFormat"
      value="obj"
      checked={exportFormat === 'obj'}
      onChange={(e) => setExportFormat(e.target.value)}
      className="w-4 h-4"
    />
    <div>
      <div className="font-medium">3D Scene (OBJ)</div>
      <div className="text-sm text-muted-foreground">Wavefront OBJ format (geometry only)</div>
    </div>
  </label>
</div>
```

#### 4.3 Export API Call

**File:** `frontend/src/components/ExportModal.tsx`

**Lines to modify:** 200-250 (handleExport function)

**Action:** Add case for the new format:

```tsx
const handleExport = async () => {
  setExporting(true);
  setExportError(null);

  try {
    let endpoint = '/api/export/floorplan';

    if (exportFormat === 'glb') {
      endpoint = '/api/export/scene';
    } else if (exportFormat === 'obj') {
      endpoint = '/api/export/scene-obj'; // NEW ENDPOINT
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        floorId: exportScope === 'current' ? currentFloorId : null,
        quality: exportQuality,
      }),
    });

    if (!response.ok) throw new Error('Export failed');

    // Download the file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${projectId}.${exportFormat}`;
    a.click();
    window.URL.revokeObjectURL(url);

    setExportModalOpen(false);
  } catch (error) {
    setExportError(error.message);
  } finally {
    setExporting(false);
  }
};
```

### Using Three.js Exporters (Recommended for 3D formats)

For formats like OBJ, FBX, or USDZ, use Three.js built-in exporters on the **frontend**:

**File:** `frontend/src/components/Viewport3D.tsx`

**Action:** Add export logic that captures the current scene:

```tsx
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter';

// In a function triggered by the export modal:
const exportSceneAsOBJ = () => {
  const exporter = new OBJExporter();
  const result = exporter.parse(scene); // 'scene' is your Three.js scene

  // Download the result
  const blob = new Blob([result], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scene.obj';
  a.click();
  URL.revokeObjectURL(url);
};
```

**Alternative:** Send the scene data to the backend and let it handle conversion (useful for server-side rendering or headless exports).

### Verification Checklist

- [ ] New export format appears in the export modal
- [ ] Format description is clear and accurate
- [ ] Selecting the format enables relevant options (quality, scope)
- [ ] Export process starts when "Export" button is clicked
- [ ] Loading indicator shows during export
- [ ] File downloads with correct filename and extension
- [ ] Exported file opens correctly in target software (e.g., Blender for OBJ/FBX)
- [ ] Geometry is correct (rooms, furniture in right positions)
- [ ] Textures/materials are included (if format supports them)
- [ ] Export works for single floor and entire project
- [ ] Error handling works (shows error message if export fails)

---

## 5. Adding a New AI Provider

**Goal:** Add support for a new AI service (e.g., Stability AI for image generation, Meshy for 3D generation, Anthropic for room descriptions) beyond the existing TRELLIS integration.

### Files to Modify

#### 5.1 Backend Service Adapter

**File:** `backend/src/routes/ai.js` (or create new file `backend/src/services/ai-providers.js`)

**Action:** Create a service adapter for the new provider:

```javascript
// Example: Adding Stability AI for texture generation

/**
 * Generate texture using Stability AI
 * @param {string} prompt - Text description of the texture
 * @param {string} apiKey - User's Stability AI API key
 * @returns {Promise<string>} - Path to generated texture file
 */
async function generateTextureWithStabilityAI(prompt, apiKey) {
  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      text_prompts: [{ text: prompt }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      samples: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Stability AI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const imageBase64 = data.artifacts[0].base64;

  // Save image to disk
  const fs = await import('fs');
  const path = await import('path');
  const filename = `texture-${Date.now()}.png`;
  const filepath = path.join('assets', 'textures', 'generated', filename);

  fs.writeFileSync(filepath, Buffer.from(imageBase64, 'base64'));

  return `/assets/textures/generated/${filename}`;
}

export { generateTextureWithStabilityAI };
```

**File:** `backend/src/routes/ai.js`

**Lines to modify:** Add new endpoint for the new AI feature:

```javascript
// POST /api/ai/generate-texture - Generate texture using Stability AI
router.post('/generate-texture', async (req, res) => {
  try {
    const { prompt, provider = 'stability-ai' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get API key from settings
    const db = await getDatabase();
    const result = db.exec('SELECT value, encrypted FROM user_settings WHERE key = ?', ['stability_ai_api_key']);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(400).json({ error: 'Stability AI API key not configured' });
    }

    const encryptedKey = result[0].values[0][0];
    const apiKey = decrypt(encryptedKey); // Decrypt function from settings.js

    // Generate texture
    const texturePath = await generateTextureWithStabilityAI(prompt, apiKey);

    // Store in ai_generations table for history
    db.exec(`
      INSERT INTO ai_generations (type, input_url, output_model_path, status, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, ['texture_generation', prompt, texturePath, 'completed']);

    saveDatabase(db);

    res.json({ success: true, texturePath });
  } catch (error) {
    console.error('Error generating texture:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### 5.2 API Key Configuration in Settings

**File:** `frontend/src/components/SettingsModal.tsx`

**Lines to modify:** 150-250 (API Keys section)

**Action:** Add input field for the new provider's API key:

```tsx
<div className="space-y-4">
  <h3 className="text-lg font-semibold">AI API Keys</h3>

  {/* Existing keys: TRELLIS, etc. */}

  {/* NEW PROVIDER */}
  <div>
    <label className="block text-sm font-medium mb-2">
      Stability AI API Key
      <a
        href="https://platform.stability.ai/account/keys"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-2 text-primary hover:underline text-xs"
      >
        Get API Key →
      </a>
    </label>
    <input
      type="password"
      value={stabilityApiKey}
      onChange={(e) => setStabilityApiKey(e.target.value)}
      placeholder="sk-..."
      className="w-full px-3 py-2 border rounded-lg"
    />
  </div>
</div>
```

**State management:**

```tsx
const [stabilityApiKey, setStabilityApiKey] = useState('');

// In loadSettings():
const response = await settingsApi.getSettings();
setStabilityApiKey(response.settings['stability_ai_api_key'] || '');

// In handleSave():
await settingsApi.updateSettings({
  ...existingSettings,
  'stability_ai_api_key': stabilityApiKey,
});
```

#### 5.3 Settings API Support

**File:** `backend/src/routes/settings.js`

**Lines to modify:** 100-150 (PUT /api/settings endpoint)

**Action:** Ensure the new API key is encrypted when stored:

```javascript
// The existing PUT /api/settings endpoint should handle any key name
// Just ensure that keys matching '*_api_key' are encrypted

router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    const db = await getDatabase();

    for (const [key, value] of Object.entries(settings)) {
      const shouldEncrypt = key.includes('api_key'); // Encrypt all API keys

      const finalValue = shouldEncrypt ? encrypt(value) : value;

      // Upsert setting
      db.exec(`
        INSERT INTO user_settings (key, value, encrypted)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, encrypted = ?
      `, [key, finalValue, shouldEncrypt ? 1 : 0, finalValue, shouldEncrypt ? 1 : 0]);
    }

    saveDatabase(db);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});
```

#### 5.4 Frontend UI for AI Generation

**File:** `frontend/src/components/AIGenerationModal.tsx` (or create new component)

**Action:** Add UI for triggering the new AI generation:

```tsx
// Example: Texture generation modal
const TextureGenerationModal = ({ onClose, onTextureGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate-texture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();
      onTextureGenerated(data.texturePath);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="modal">
      <h2>Generate Texture with AI</h2>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the texture (e.g., 'dark oak wood with natural grain')"
        className="w-full h-24 p-3 border rounded-lg"
      />
      {error && <p className="text-red-500">{error}</p>}
      <button onClick={handleGenerate} disabled={generating}>
        {generating ? 'Generating...' : 'Generate'}
      </button>
    </div>
  );
};
```

#### 5.5 Progress Tracking Integration

**File:** `backend/src/routes/ai.js`

**Action:** Update the `ai_generations` table entry with progress:

```javascript
// During generation (if API supports progress callbacks):
db.exec(`
  UPDATE ai_generations
  SET status = 'processing'
  WHERE id = ?
`, [generationId]);

// After completion:
db.exec(`
  UPDATE ai_generations
  SET status = 'completed', output_model_path = ?
  WHERE id = ?
`, [outputPath, generationId]);

// On error:
db.exec(`
  UPDATE ai_generations
  SET status = 'failed', error_message = ?
  WHERE id = ?
`, [error.message, generationId]);
```

**File:** `frontend/src/components/AIGenerationModal.tsx`

**Action:** Poll the generation status:

```tsx
useEffect(() => {
  if (!generationId) return;

  const pollStatus = setInterval(async () => {
    const response = await fetch(`/api/ai/generations/${generationId}`);
    const data = await response.json();

    setGenerationStatus(data.status);

    if (data.status === 'completed') {
      clearInterval(pollStatus);
      onComplete(data.output_model_path);
    } else if (data.status === 'failed') {
      clearInterval(pollStatus);
      setError(data.error_message);
    }
  }, 2000); // Poll every 2 seconds

  return () => clearInterval(pollStatus);
}, [generationId]);
```

### Verification Checklist

- [ ] API key input field appears in Settings modal
- [ ] API key is encrypted when saved (check database: `encrypted = 1`)
- [ ] API key decrypts correctly when retrieved
- [ ] New AI generation UI is accessible (button/modal/menu item)
- [ ] Generation request sends correctly to backend
- [ ] Backend validates API key and returns appropriate error if missing
- [ ] Generation progress indicator shows during processing
- [ ] Completed generation result displays in the UI
- [ ] Generated asset is stored in the correct directory
- [ ] Generation history is tracked in `ai_generations` table
- [ ] Error handling works (network errors, API errors, invalid keys)
- [ ] Retry functionality works for failed generations

---

## 6. Adding a New Editor Tool

**Goal:** Add a new tool to the editor toolbar (e.g., "Paint Bucket" for quickly applying materials, "Clone Tool" for duplicating objects, "Snap to Grid Toggle").

### Files to Modify

#### 6.1 Tool Type Definition

**File:** `frontend/src/store/editorStore.ts`

**Lines to modify:** 3 (EditorTool type)

**Action:** Add the new tool name to the type:

```tsx
export type EditorTool =
  | 'select'
  | 'draw-wall'
  | 'measure'
  | 'place-furniture'
  | 'pan'
  | 'first-person'
  | 'paint-bucket'  // NEW TOOL
  | 'clone';        // NEW TOOL
```

#### 6.2 Toolbar Button

**File:** `frontend/src/components/Editor.tsx`

**Lines to modify:** 850-950 (toolbar section)

**Action:** Add a button for the new tool:

```tsx
{/* Existing tool buttons */}

{/* NEW TOOL */}
<button
  onClick={() => setCurrentTool('paint-bucket')}
  className={`
    flex flex-col items-center justify-center p-3 rounded-lg transition-all
    ${currentTool === 'paint-bucket'
      ? 'bg-primary text-primary-foreground shadow-lg'
      : 'hover:bg-accent'
    }
  `}
  title="Paint Bucket (B) - Click surfaces to apply material"
>
  <PaintBucket className="w-5 h-5" />
  <span className="text-xs mt-1">Paint</span>
</button>
```

Import the icon from `lucide-react`:

```tsx
import { /* existing icons */, PaintBucket } from 'lucide-react';
```

#### 6.3 Tool State in Store

**File:** `frontend/src/store/editorStore.ts`

**Lines to modify:** No changes needed if you only need `currentTool` state

**Action (if tool needs additional state):** Add tool-specific state:

```tsx
export interface EditorState {
  // ... existing state

  // Paint bucket tool state
  paintBucketMaterial: {
    color: string;
    texture: string | null;
  } | null;
  setPaintBucketMaterial: (material: { color: string; texture: string | null }) => void;
}

// In the create() store implementation:
const useEditorStore = create<EditorState>((set) => ({
  // ... existing state

  paintBucketMaterial: null,
  setPaintBucketMaterial: (material) => set({ paintBucketMaterial: material }),
}));
```

#### 6.4 Cursor Change

**File:** `frontend/src/components/Viewport3D.tsx`

**Lines to modify:** 100-150 (canvas cursor styling)

**Action:** Change cursor based on current tool:

```tsx
<Canvas
  camera={{ position: [10, 10, 10], fov: 50 }}
  style={{
    width: '100%',
    height: '100%',
    cursor: currentTool === 'pan' ? 'move'
      : currentTool === 'draw-wall' ? 'crosshair'
      : currentTool === 'paint-bucket' ? 'pointer'  // NEW
      : currentTool === 'clone' ? 'copy'            // NEW
      : 'default'
  }}
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={handlePointerUp}
>
```

#### 6.5 3D Interaction Handler

**File:** `frontend/src/components/Viewport3D.tsx`

**Lines to modify:** 400-600 (handlePointerDown, handlePointerUp functions)

**Action:** Add tool-specific interaction logic:

```tsx
const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
  if (currentTool === 'select') {
    // ... existing select logic
  }

  if (currentTool === 'draw-wall') {
    // ... existing draw-wall logic
  }

  // NEW TOOL LOGIC
  if (currentTool === 'paint-bucket') {
    const intersectedObject = event.intersections[0]?.object;

    if (intersectedObject && paintBucketMaterial) {
      // Determine what was clicked (floor, wall, ceiling)
      const objectType = intersectedObject.userData.type; // 'floor', 'wall', 'ceiling'
      const roomId = intersectedObject.userData.roomId;

      if (objectType === 'floor') {
        // Apply material to floor
        updateRoomFloorMaterial(roomId, paintBucketMaterial);
      } else if (objectType === 'wall') {
        const wallId = intersectedObject.userData.wallId;
        updateWallMaterial(wallId, paintBucketMaterial);
      }
      // ... ceiling logic
    }
  }

  if (currentTool === 'clone') {
    // Clone tool: duplicate the clicked object
    const intersectedObject = event.intersections[0]?.object;

    if (intersectedObject && intersectedObject.userData.furnitureId) {
      const furnitureId = intersectedObject.userData.furnitureId;
      const furniture = furniturePlacements.find(f => f.id === furnitureId);

      if (furniture) {
        // Duplicate furniture at a slight offset
        cloneFurniture(furniture);
      }
    }
  }
};
```

#### 6.6 Keyboard Shortcut

**File:** `frontend/src/components/Editor.tsx`

**Lines to modify:** 1100-1200 (keyboard event listeners)

**Action:** Add keyboard shortcut for the tool:

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // ... existing shortcuts

    // NEW SHORTCUTS
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      setCurrentTool('paint-bucket');
    }

    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      setCurrentTool('clone');
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

#### 6.7 Tool-Specific UI Panel (Optional)

**File:** `frontend/src/components/PropertiesPanel.tsx` or create new component

**Action:** If the tool needs settings, add a panel:

```tsx
{currentTool === 'paint-bucket' && (
  <div className="p-4 bg-surface rounded-lg">
    <h3 className="font-semibold mb-3">Paint Bucket Settings</h3>

    <div className="space-y-3">
      <div>
        <label className="text-sm mb-2 block">Color</label>
        <input
          type="color"
          value={paintBucketMaterial?.color || '#FFFFFF'}
          onChange={(e) => setPaintBucketMaterial({
            ...paintBucketMaterial,
            color: e.target.value
          })}
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>

      <div>
        <label className="text-sm mb-2 block">Texture</label>
        {/* Texture picker UI */}
      </div>
    </div>
  </div>
)}
```

### Verification Checklist

- [ ] Tool button appears in the toolbar
- [ ] Tool icon is appropriate and recognizable
- [ ] Clicking the tool button activates it (button highlighted)
- [ ] Keyboard shortcut activates the tool
- [ ] Cursor changes when tool is active
- [ ] Tool interaction works (click, drag, etc.)
- [ ] Tool performs the expected action (paint, clone, measure, etc.)
- [ ] Tool-specific UI panel appears (if applicable)
- [ ] Tool integrates with undo/redo system
- [ ] Tool can be deactivated by selecting another tool
- [ ] Tool state persists during the session
- [ ] No console errors when using the tool

---

## 7. Adding a New Settings Option

**Goal:** Add a new user-configurable setting (e.g., "Default Room Height", "Grid Snap Size", "Auto-Save Interval", "Render Quality").

### Files to Modify

#### 7.1 Database: user_settings Table Key

**File:** `backend/src/db/init.js`

**Lines to modify:** 138-148 (user_settings table) — schema already supports any key/value

**Action:** No schema changes needed. The `user_settings` table uses a flexible key-value structure:

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  encrypted BOOLEAN DEFAULT 0
);
```

Simply insert the new setting via API or SQL:

```sql
INSERT INTO user_settings (key, value, encrypted)
VALUES ('default_room_height', '2.8', 0);
```

#### 7.2 Settings API (GET)

**File:** `backend/src/routes/settings.js`

**Lines to modify:** 44-80 (GET /api/settings endpoint)

**Action:** No changes needed — the endpoint already returns all settings. The new setting will appear automatically when stored in the database.

#### 7.3 Settings API (PUT)

**File:** `backend/src/routes/settings.js`

**Lines to modify:** 100-150 (PUT /api/settings endpoint)

**Action:** No changes needed — the endpoint already accepts any key-value pairs. Just ensure the frontend sends the new setting in the request body.

#### 7.4 Settings UI

**File:** `frontend/src/components/SettingsModal.tsx`

**Lines to modify:** Add a new section or input field

**Action:** Add UI for the new setting:

```tsx
<div className="space-y-6">
  {/* Existing settings sections */}

  {/* NEW SETTING */}
  <div>
    <h3 className="text-lg font-semibold mb-3">Editor Defaults</h3>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Default Room Height
        </label>
        <input
          type="number"
          step="0.1"
          min="2.0"
          max="5.0"
          value={defaultRoomHeight}
          onChange={(e) => setDefaultRoomHeight(parseFloat(e.target.value))}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Default ceiling height for new rooms (in meters)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Grid Snap Size
        </label>
        <select
          value={gridSnapSize}
          onChange={(e) => setGridSnapSize(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="0.1">0.1m (Fine)</option>
          <option value="0.5">0.5m (Medium)</option>
          <option value="1.0">1.0m (Coarse)</option>
        </select>
      </div>
    </div>
  </div>
</div>
```

**State management:**

```tsx
const [defaultRoomHeight, setDefaultRoomHeight] = useState(2.8);
const [gridSnapSize, setGridSnapSize] = useState('0.5');

// In loadSettings():
useEffect(() => {
  const fetchSettings = async () => {
    const response = await settingsApi.getSettings();
    const settings = response.settings;

    setDefaultRoomHeight(parseFloat(settings['default_room_height'] || '2.8'));
    setGridSnapSize(settings['grid_snap_size'] || '0.5');
  };
  fetchSettings();
}, []);

// In handleSave():
const handleSave = async () => {
  try {
    await settingsApi.updateSettings({
      'default_room_height': defaultRoomHeight.toString(),
      'grid_snap_size': gridSnapSize,
      // ... other settings
    });

    toast.success('Settings saved');
  } catch (error) {
    toast.error('Failed to save settings');
  }
};
```

#### 7.5 Consuming the Setting Throughout the App

**File:** Where the setting is used (e.g., `frontend/src/components/Editor.tsx` for default room height)

**Action:** Load the setting and use it in your logic:

```tsx
// In Editor.tsx (or wherever rooms are created):
const [defaultRoomHeight, setDefaultRoomHeight] = useState(2.8);

useEffect(() => {
  const loadSettings = async () => {
    const response = await settingsApi.getSettings();
    setDefaultRoomHeight(parseFloat(response.settings['default_room_height'] || '2.8'));
  };
  loadSettings();
}, []);

// When creating a new room:
const createRoom = async (width, depth) => {
  const newRoom = {
    floor_id: currentFloorId,
    name: 'New Room',
    dimensions_json: JSON.stringify({ width, depth }),
    ceiling_height: defaultRoomHeight, // USE THE SETTING HERE
    // ... other fields
  };

  await roomsApi.createRoom(currentFloorId, newRoom);
};
```

**Alternative: Store in Zustand for global access:**

**File:** `frontend/src/store/editorStore.ts`

```tsx
export interface EditorState {
  // ... existing state

  // Settings
  defaultRoomHeight: number;
  gridSnapSize: number;
  setDefaultRoomHeight: (height: number) => void;
  setGridSnapSize: (size: number) => void;
}

// In create():
const useEditorStore = create<EditorState>((set) => ({
  // ... existing state

  defaultRoomHeight: 2.8,
  gridSnapSize: 0.5,
  setDefaultRoomHeight: (height) => set({ defaultRoomHeight: height }),
  setGridSnapSize: (size) => set({ gridSnapSize: size }),
}));
```

Then load settings into Zustand on app startup:

**File:** `frontend/src/components/Editor.tsx`

```tsx
const { setDefaultRoomHeight, setGridSnapSize } = useEditorStore();

useEffect(() => {
  const loadSettings = async () => {
    const response = await settingsApi.getSettings();
    setDefaultRoomHeight(parseFloat(response.settings['default_room_height'] || '2.8'));
    setGridSnapSize(parseFloat(response.settings['grid_snap_size'] || '0.5'));
  };
  loadSettings();
}, []);
```

### Settings API Client

**File:** `frontend/src/lib/api.ts`

**Action:** Ensure there's a settings API client:

```tsx
export const settingsApi = {
  getSettings: async (): Promise<{ settings: Record<string, string> }> => {
    const response = await fetch(`${API_BASE_URL}/api/settings`);
    if (!response.ok) throw new ApiError('Failed to fetch settings', response.status);
    return response.json();
  },

  updateSettings: async (settings: Record<string, string>): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new ApiError('Failed to update settings', response.status);
    return response.json();
  },
};
```

### Verification Checklist

- [ ] Setting input field appears in Settings modal
- [ ] Setting loads the current value from database on mount
- [ ] Changing the setting updates the UI state
- [ ] Saving settings sends the new value to the backend
- [ ] Backend stores the setting in the `user_settings` table (check with `SELECT * FROM user_settings`)
- [ ] Setting persists across page reloads
- [ ] Setting is consumed correctly throughout the app (e.g., new rooms use default height)
- [ ] Setting works after server restart
- [ ] Edge cases are handled (invalid values, missing key)
- [ ] UI shows validation errors for invalid input (e.g., negative numbers)

---

## General Tips for Extensions

### 1. **Always Update Both Frontend and Backend**
Most features require changes in both layers. Don't forget API endpoints when adding new data types.

### 2. **Follow Existing Patterns**
Look at similar features already implemented. For example:
- Adding a furniture category? Look at how `seating` is implemented
- Adding an API endpoint? Copy the structure from `assets.js` or `rooms.js`

### 3. **Use the Database**
Never use in-memory arrays or hardcoded data. Always store in SQLite via the API.

### 4. **Test Across Server Restarts**
Data must persist. After implementing a feature, restart the backend and verify the data is still there.

### 5. **Update Documentation**
After adding a feature, update:
- `docs/API_REFERENCE.md` (if adding API endpoints)
- `docs/DATABASE.md` (if adding/modifying tables)
- `docs/ARCHITECTURE.md` (if changing significant architecture)

### 6. **Follow the Style Guide**
- **TypeScript:** Use proper types, avoid `any`
- **Tailwind CSS:** Use Tailwind classes, avoid inline styles
- **Components:** Keep components focused (single responsibility)
- **Naming:** Use descriptive names (`handleCreateRoom`, not `handle1`)

### 7. **Error Handling**
Always include try-catch blocks and user-friendly error messages:

```tsx
try {
  await api.createRoom(roomData);
  toast.success('Room created');
} catch (error) {
  console.error('Failed to create room:', error);
  toast.error('Failed to create room: ' + error.message);
}
```

### 8. **Undo/Redo Integration**
For actions that modify data, integrate with the undo/redo system:

```tsx
// After creating furniture:
addAction({
  type: 'furniture_add',
  description: 'Added furniture',
  data: { furniture: newFurniture },
});
```

### 9. **Loading and Empty States**
Always show loading indicators and handle empty states:

```tsx
{loading && <Loader2 className="animate-spin" />}
{!loading && items.length === 0 && <p>No items found</p>}
{!loading && items.length > 0 && items.map(...)}
```

### 10. **Browser DevTools Are Your Friend**
- Check Network tab for API calls
- Check Console for errors
- Use React DevTools to inspect component state
- Use Three.js Inspector for 3D debugging

---

## Quick Reference: Key Files

| Task | Files to Modify |
|------|----------------|
| **Database schema** | `backend/src/db/init.js` |
| **API endpoints** | `backend/src/routes/*.js` |
| **Frontend routing** | `frontend/src/App.tsx` |
| **Global state** | `frontend/src/store/editorStore.ts` |
| **Editor toolbar** | `frontend/src/components/Editor.tsx` (lines 850-950) |
| **Asset library** | `frontend/src/components/AssetLibrary.tsx` |
| **Properties panel** | `frontend/src/components/PropertiesPanel.tsx` |
| **3D rendering** | `frontend/src/components/Viewport3D.tsx` |
| **Settings modal** | `frontend/src/components/SettingsModal.tsx` |
| **Export logic** | `backend/src/routes/export.js` + `frontend/src/components/ExportModal.tsx` |
| **AI integration** | `backend/src/routes/ai.js` + `frontend/src/components/AIGenerationModal.tsx` |

---

## Need Help?

If you're stuck:

1. **Check existing implementations** — Search the codebase for similar features
2. **Read the API docs** — `docs/API_REFERENCE.md` lists all endpoints
3. **Check the database schema** — `docs/DATABASE.md` explains all tables
4. **Review the architecture** — `docs/ARCHITECTURE.md` explains the overall structure
5. **Look at the Git history** — See how previous features were implemented with `git log -p`

Happy coding! 🚀
