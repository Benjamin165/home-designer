# Troubleshooting & Known Gotchas

**🔍 Debugging Guide** — Common problems, diagnostic strategies, and known gotchas specific to Home Designer.

This guide helps AI coders and developers quickly diagnose and fix issues rather than guessing. Covers 3D rendering, state management, database, AI integration, and performance problems.

## Table of Contents

1. [Diagnostic Approach](#diagnostic-approach)
2. [3D Rendering Issues](#3d-rendering-issues)
3. [State Management Issues](#state-management-issues)
4. [API & Database Issues](#api--database-issues)
5. [AI Integration Issues](#ai-integration-issues)
6. [Performance Issues](#performance-issues)
7. [Development Environment Issues](#development-environment-issues)
8. [Known Gotchas](#known-gotchas)
9. [Getting Help](#getting-help)

---

## Diagnostic Approach

### Recommended Debugging Tools

#### 1. **React DevTools** (Essential)
**Install:** Browser extension for Chrome/Firefox/Edge
**Usage:**
- Inspect component tree
- View component props and state
- See Zustand store state
- Track re-renders and performance

**Access:** Browser DevTools → React tab

**Key features:**
- **Components tab:** See entire React tree
- **Profiler tab:** Record and analyze component render performance
- **Highlight updates:** Visually see which components re-render

---

#### 2. **Three.js Inspector** (For 3D debugging)
**Install:** Browser extension "Three.js Developer Tools"
**Usage:**
- Inspect Three.js scene graph
- See all objects, geometries, materials
- View transform matrices (position, rotation, scale)
- Check material properties and textures

**Alternative:** Use `leva` for live debugging:
```bash
cd frontend
npm install leva
```

```tsx
// In Viewport3D.tsx:
import { useControls } from 'leva';

function Viewport3D() {
  const { cameraDistance, gridVisible } = useControls({
    cameraDistance: { value: 10, min: 5, max: 50 },
    gridVisible: true,
  });
  // ...
}
```

---

#### 3. **Browser Performance Profiler** (For performance issues)
**Usage:**
- Browser DevTools → Performance tab
- Click "Record"
- Interact with the app (rotate camera, place furniture)
- Click "Stop"
- Analyze flame graph for slow operations

**What to look for:**
- Long tasks (>50ms) - JavaScript blocking main thread
- Layout thrashing - forced reflow/repaint
- Memory leaks - heap size growing over time

---

#### 4. **SQLite Viewer** (For database debugging)
**Tools:**
- **DB Browser for SQLite** (desktop app) - https://sqlitebrowser.org/
- **VS Code SQLite extension** - View database in editor
- **Command line:** `sqlite3 backend/database.db`

**Usage:**
```bash
# Open database in SQLite CLI:
cd backend
sqlite3 database.db

# Run queries:
sqlite> SELECT * FROM projects;
sqlite> SELECT * FROM rooms WHERE floor_id = 1;
sqlite> .schema rooms
sqlite> .exit
```

---

### Enabling Verbose Logging

#### Frontend Logging
Add debug logs to trace state changes and rendering:

```tsx
// In components:
useEffect(() => {
  console.log('[DEBUG Component] Prop changed:', { propName: propValue });
}, [propValue]);

// In Zustand store:
const useEditorStore = create<EditorState>((set) => ({
  setCurrentTool: (tool) => {
    console.log('[DEBUG Store] Tool changed:', tool);
    set({ currentTool: tool });
  },
}));

// In 3D components:
useFrame(() => {
  console.log('[DEBUG Frame] Camera position:', camera.position);
});
```

**Tip:** Prefix debug logs with `[DEBUG ComponentName]` for easy filtering.

---

#### Backend Logging
The backend already logs extensively. Increase verbosity:

```javascript
// In backend/src/server.js or routes/*.js:
console.log('[DEBUG API] Request:', req.method, req.path, req.body);
console.log('[DEBUG DB] Query result:', result);
```

**View backend logs:**
- Terminal where backend is running
- Or redirect to file: `npm run dev > backend.log 2>&1`

---

## 3D Rendering Issues

### Issue 1: Blank/Black Viewport

**Symptoms:**
- Viewport is solid black or white
- No room, no grid, no objects visible

**Possible Causes:**

#### A. WebGL Context Not Created
**Diagnostic:**
```javascript
// Open browser console and run:
const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
console.log('WebGL context:', gl);
```

**Fix:**
- If `gl` is `null`, WebGL is not supported or disabled
- Check browser compatibility (Chrome, Firefox, Edge recommended)
- Update GPU drivers
- Enable hardware acceleration in browser settings

---

#### B. Camera Looking at Nothing
**Diagnostic:**
```tsx
// In Viewport3D.tsx, add debug log:
useFrame(({ camera }) => {
  console.log('Camera position:', camera.position);
  console.log('Camera looking at:', camera.lookAt);
});
```

**Fix:**
```tsx
// Ensure camera position is reasonable:
<Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
  <OrbitControls target={[0, 0, 0]} />
  {/* ... */}
</Canvas>
```

**Common issue:** Camera inside an object or too far away.

---

#### C. No Light in Scene
**Diagnostic:** Add a bright ambient light temporarily:

```tsx
<Canvas>
  <ambientLight intensity={2.0} />  {/* Temporarily very bright */}
  {/* ... */}
</Canvas>
```

**Fix:** Ensure lighting is present:
```tsx
<Canvas>
  <ambientLight intensity={0.5} />
  <directionalLight position={[10, 10, 5]} intensity={1} />
  {/* ... */}
</Canvas>
```

---

### Issue 2: Models Not Appearing

**Symptoms:**
- Furniture placed but not visible in 3D scene
- Room created but floor/walls missing

**Possible Causes:**

#### A. Model Loading Error
**Diagnostic:**
```tsx
// In component that loads models:
useGLTF('/assets/models/sofa.glb', true, true, (loader) => {
  loader.manager.onError = (url) => {
    console.error('[DEBUG] Failed to load model:', url);
  };
});
```

**Fix:**
- Check model file path is correct
- Ensure model file exists in `assets/models/`
- Check for CORS issues (models served from backend)
- Verify GLB/GLTF format is valid (test in https://gltf-viewer.donmccurdy.com/)

---

#### B. Wrong Scale (Too Small or Too Large)
**Diagnostic:**
```tsx
// Log object size:
const mesh = useRef();
useEffect(() => {
  if (mesh.current) {
    const box = new THREE.Box3().setFromObject(mesh.current);
    const size = box.getSize(new THREE.Vector3());
    console.log('[DEBUG] Model size:', size);
  }
}, []);

<mesh ref={mesh}>
  {/* ... */}
</mesh>
```

**Fix:**
- If size is tiny (0.01), model is scaled too small - multiply scale
- If size is huge (1000), model is too large - divide scale
- Check asset dimensions in database:
  ```sql
  SELECT width, height, depth FROM assets WHERE id = 1;
  ```

---

#### C. Wrong Position (Outside Camera View)
**Diagnostic:**
```tsx
console.log('[DEBUG] Furniture position:', furniture.position_x, furniture.position_y, furniture.position_z);
```

**Fix:** Ensure position is within visible area:
- Rooms are typically at `y = 0` (ground level)
- Furniture should have `y > 0` (above floor)
- Check camera frustum includes the position

---

### Issue 3: Z-Fighting on Walls/Floors

**Symptoms:**
- Flickering patterns on surfaces
- Surfaces appear to "shimmer" when camera moves
- Overlapping geometry

**Cause:** Two surfaces at the exact same position (same Z-depth).

**Fix 1: Offset surfaces slightly**
```tsx
// Floor at y = 0, ceiling at y = room.ceiling_height
<mesh position={[0, 0, 0]}>
  <boxGeometry args={[width, 0.01, depth]} />  {/* Thin floor */}
  <meshStandardMaterial color={floorColor} />
</mesh>

<mesh position={[0, room.ceiling_height, 0]}>
  <boxGeometry args={[width, 0.01, depth]} />  {/* Ceiling above */}
  <meshStandardMaterial color={ceilingColor} />
</mesh>
```

**Fix 2: Adjust depth testing**
```tsx
<meshStandardMaterial
  color={color}
  depthTest={true}
  depthWrite={true}
  polygonOffset={true}
  polygonOffsetFactor={1}  // Push surface back slightly
  polygonOffsetUnits={1}
/>
```

---

### Issue 4: Flickering (Render Order Issues)

**Symptoms:**
- Transparent objects flicker
- Objects appear/disappear when camera moves

**Cause:** Incorrect render order for transparent objects.

**Fix:**
```tsx
// Transparent materials must render AFTER opaque materials
<mesh renderOrder={1}>  {/* Higher number = render later */}
  <meshStandardMaterial
    color={color}
    transparent={true}
    opacity={0.5}
    depthWrite={false}  // Don't write to depth buffer
  />
</mesh>
```

**Rule:** Opaque objects: `renderOrder={0}`, transparent objects: `renderOrder={1}` or higher.

---

### Issue 5: Transparency Issues

**Symptoms:**
- Transparent objects appear opaque
- See-through objects show wrong things behind them

**Fix:**
```tsx
<meshStandardMaterial
  color={color}
  transparent={true}
  opacity={0.7}
  alphaTest={0.1}       // Discard pixels below this alpha
  depthWrite={false}    // Don't write to depth buffer
  side={THREE.DoubleSide}  // Render both front and back faces
/>
```

**Common mistake:** Forgetting `transparent={true}` - opacity alone doesn't make it transparent.

---

### Issue 6: Shadow Artifacts

**Symptoms:**
- Shadows have strange patterns
- Shadows too dark or too light
- "Shadow acne" (surface shadows itself)

**Fix 1: Adjust shadow bias**
```tsx
<directionalLight
  position={[10, 10, 5]}
  intensity={1}
  castShadow
  shadow-bias={-0.0001}  // Reduce shadow acne
  shadow-mapSize={[2048, 2048]}  // Higher resolution shadows
/>
```

**Fix 2: Increase shadow camera far distance**
```tsx
<directionalLight
  castShadow
  shadow-camera-far={50}  // Ensure all objects are within shadow camera frustum
  shadow-camera-left={-20}
  shadow-camera-right={20}
  shadow-camera-top={20}
  shadow-camera-bottom={-20}
/>
```

---

## State Management Issues

### Issue 1: Stale Zustand State in R3F Components

**Symptoms:**
- 3D components don't update when Zustand store changes
- Component uses old state even though store updated

**Cause:** The common `useStore` vs `useStore.getState()` trap.

**Problem code:**
```tsx
function FurnitureMesh({ furnitureId }) {
  // ❌ WRONG: This doesn't subscribe to updates
  const furniture = useEditorStore.getState().furniturePlacements.find(f => f.id === furnitureId);

  return <mesh position={[furniture.position_x, furniture.position_y, furniture.position_z]} />;
}
```

**Fixed code:**
```tsx
function FurnitureMesh({ furnitureId }) {
  // ✅ CORRECT: Subscribe to specific slice of state
  const furniture = useEditorStore(state =>
    state.furniturePlacements.find(f => f.id === furnitureId)
  );

  return <mesh position={[furniture.position_x, furniture.position_y, furniture.position_z]} />;
}
```

**Rule:** Use `useEditorStore(selector)` to **subscribe** to state. Use `useEditorStore.getState()` only for **one-time reads** (like in event handlers).

---

### Issue 2: Undo/Redo Not Working Correctly

**Symptoms:**
- Undo doesn't restore previous state
- Redo does the wrong thing
- Undo history missing actions

**Possible Causes:**

#### A. Action Not Added to History
**Diagnostic:**
```tsx
// Check if action was added:
const history = useEditorStore(state => state.history);
console.log('[DEBUG] History length:', history.length);
console.log('[DEBUG] Last action:', history[history.length - 1]);
```

**Fix:** Ensure `addAction()` is called after state-changing operations:
```tsx
// After creating furniture:
const newFurniture = await furnitureApi.create(roomId, furnitureData);
addFurniturePlacement(newFurniture);

addAction({
  type: 'furniture_add',
  description: `Added ${assetName}`,
  data: { furniture: newFurniture },
});
```

---

#### B. Snapshot Data Corrupted
**Diagnostic:**
```tsx
// Check snapshot data structure:
const history = useEditorStore.getState().history;
history.forEach(action => {
  console.log('[DEBUG] Action:', action.type, 'Data:', action.data);
});
```

**Fix:** Ensure action data is complete:
```tsx
addAction({
  type: 'furniture_move',
  description: 'Moved furniture',
  data: {
    furnitureId: furniture.id,
    previousPosition: { x: oldX, y: oldY, z: oldZ },  // REQUIRED for undo
    newPosition: { x: newX, y: newY, z: newZ },       // REQUIRED for redo
  },
});
```

---

#### C. Race Condition with API Call
**Problem:** Undo called before API response completes.

**Fix:** Wait for API response before adding action:
```tsx
// ❌ WRONG: Action added before API completes
addAction({ type: 'furniture_add', data: { furniture: tempFurniture } });
const newFurniture = await furnitureApi.create(roomId, furnitureData);

// ✅ CORRECT: Wait for API, then add action
const newFurniture = await furnitureApi.create(roomId, furnitureData);
addAction({ type: 'furniture_add', data: { furniture: newFurniture } });
```

---

### Issue 3: Selection State Desyncing from 3D Scene

**Symptoms:**
- Object appears selected but isn't
- Properties panel shows wrong object
- Multiple objects selected unexpectedly

**Diagnostic:**
```tsx
// Log selection state:
const selectedFurnitureId = useEditorStore(state => state.selectedFurnitureId);
const selectedRoomId = useEditorStore(state => state.selectedRoomId);
console.log('[DEBUG] Selected furniture:', selectedFurnitureId);
console.log('[DEBUG] Selected room:', selectedRoomId);
```

**Fix:** Ensure selection is cleared when appropriate:
```tsx
// When deleting an object, clear selection:
const deleteFurniture = async (id) => {
  await furnitureApi.delete(id);
  removeFurniturePlacement(id);

  // Clear selection if deleted object was selected:
  if (selectedFurnitureId === id) {
    setSelectedFurnitureId(null);
  }
};
```

---

### Issue 4: Race Conditions Between Auto-Save and User Edits

**Symptoms:**
- User edit gets overwritten by auto-save
- Stale data appears after editing
- Save conflicts

**Diagnostic:**
```tsx
// Add logs to auto-save:
useEffect(() => {
  const interval = setInterval(() => {
    console.log('[DEBUG] Auto-save triggered');
    saveProject();
  }, autoSaveInterval);

  return () => clearInterval(interval);
}, [autoSaveInterval]);
```

**Fix 1: Debounce auto-save**
```tsx
// Wait for user to stop editing before auto-saving:
const debouncedSave = useCallback(
  debounce(() => {
    console.log('[DEBUG] Debounced save');
    saveProject();
  }, 2000),  // Wait 2 seconds after last edit
  []
);

// Call debouncedSave() on every edit
```

**Fix 2: Check for pending operations**
```tsx
const saveProject = async () => {
  if (isSaving) {
    console.log('[DEBUG] Save already in progress, skipping');
    return;
  }

  setIsSaving(true);
  try {
    await projectsApi.update(projectId, projectData);
  } finally {
    setIsSaving(false);
  }
};
```

---

## API & Database Issues

### Issue 1: CORS Problems in Development

**Symptoms:**
- API calls fail with CORS errors in console
- Network tab shows failed requests (red)
- Error: "Access to fetch at 'http://localhost:5000/api/projects' from origin 'http://localhost:5173' has been blocked by CORS policy"

**Fix 1: Enable CORS in Backend**
```javascript
// In backend/src/server.js:
import cors from 'cors';

app.use(cors());  // Allow all origins (development only)

// OR allow specific origin:
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
```

**Fix 2: Use Vite Proxy (Recommended)**
```typescript
// In frontend/vite.config.ts:
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

With proxy, frontend calls `/api/projects` and Vite forwards to `http://localhost:5000/api/projects` (no CORS issue).

---

### Issue 2: SQLite Database Locked

**Symptoms:**
- API calls hang
- Error: "database is locked"
- Operations timeout

**Cause:** Multiple processes trying to write to database simultaneously.

**Diagnostic:**
```bash
# Check if multiple backend processes are running:
ps aux | grep node
# Kill extra processes if found
```

**Fix 1: Ensure only one backend process**
```bash
# Stop all:
pkill node

# Start backend:
cd backend
npm run dev
```

**Fix 2: Increase busy timeout**
```javascript
// In backend/src/db/connection.js:
db.exec('PRAGMA busy_timeout = 5000');  // Wait up to 5 seconds
```

---

### Issue 3: Missing Migration Columns

**Symptoms:**
- Error: "no such column: room.ceiling_height"
- SQL query fails with column not found

**Cause:** Database schema out of sync (old database, new code).

**Fix:** Reinitialize database:
```bash
cd backend
rm database.db  # Delete old database
npm run db:init  # Create new database with latest schema
```

**Production fix:** Write a migration script:
```javascript
// In backend/src/db/migrations/add-ceiling-height.js:
db.exec(`
  ALTER TABLE rooms ADD COLUMN ceiling_height REAL DEFAULT 2.8;
`);
```

---

### Issue 4: JSON Parse Errors from Malformed Stored Data

**Symptoms:**
- Error: "Unexpected token in JSON at position X"
- Data loads but is corrupted

**Diagnostic:**
```sql
-- Check JSON columns:
SELECT id, dimensions_json FROM rooms;
```

**Fix:** Sanitize JSON before parsing:
```javascript
// In API route:
let dimensions;
try {
  dimensions = JSON.parse(room.dimensions_json || '{}');
} catch (error) {
  console.error('Failed to parse dimensions_json:', error);
  dimensions = { width: 5, depth: 4 };  // Fallback default
}
```

---

### Issue 5: File Path Issues Across Operating Systems

**Symptoms:**
- File uploads fail on Windows but work on Mac/Linux
- Model paths show backslashes on Windows

**Cause:** Windows uses `\` for paths, Unix uses `/`.

**Fix:** Always use forward slashes, normalize paths:
```javascript
import path from 'path';

// ❌ WRONG: Platform-specific path
const modelPath = 'assets\\models\\sofa.glb';

// ✅ CORRECT: Use path.join and normalize
const modelPath = path.join('assets', 'models', 'sofa.glb').replace(/\\/g, '/');
```

---

## AI Integration Issues

### Issue 1: TRELLIS Connection Failures

**Symptoms:**
- AI generation fails immediately
- Error: "Failed to connect to TRELLIS API"

**Diagnostic:**
```javascript
// Test TRELLIS endpoint:
const response = await fetch('https://api.trellis.com/status', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
console.log('TRELLIS status:', response.status, await response.text());
```

**Fix 1: Check API key**
```sql
-- Check if API key is stored:
SELECT key, value FROM user_settings WHERE key = 'trellis_api_key';
```

**Fix 2: Network/firewall**
- Ensure backend can reach external APIs
- Check firewall rules
- Try from command line:
  ```bash
  curl -H "Authorization: Bearer YOUR_KEY" https://api.trellis.com/status
  ```

---

### Issue 2: Timeout on Long Generation Jobs

**Symptoms:**
- AI generation starts but fails after 30-60 seconds
- Error: "Request timeout"

**Fix:** Increase timeout:
```javascript
// In backend/src/routes/ai.js:
const response = await fetch(aiEndpoint, {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify(payload),
  timeout: 300000,  // 5 minutes instead of default 30 seconds
});
```

**Better fix:** Use polling instead of waiting:
```javascript
// 1. Start generation (returns job ID immediately)
const { jobId } = await startGeneration(prompt);

// 2. Poll for status
const pollStatus = setInterval(async () => {
  const status = await checkGenerationStatus(jobId);
  if (status === 'completed') {
    clearInterval(pollStatus);
    // Handle result
  }
}, 5000);  // Check every 5 seconds
```

---

### Issue 3: Handling Malformed AI Responses

**Symptoms:**
- AI generation completes but result is unusable
- Invalid 3D model file
- Dimensions are NaN or negative

**Fix:** Validate AI responses:
```javascript
const result = await generateModel(prompt);

// Validate response structure:
if (!result || !result.model_path) {
  throw new Error('Invalid AI response: missing model_path');
}

// Validate dimensions:
const width = parseFloat(result.width);
const height = parseFloat(result.height);
const depth = parseFloat(result.depth);

if (isNaN(width) || isNaN(height) || isNaN(depth) || width <= 0 || height <= 0 || depth <= 0) {
  throw new Error('Invalid AI response: invalid dimensions');
}

// Validate model file exists:
if (!fs.existsSync(result.model_path)) {
  throw new Error('Invalid AI response: model file not found');
}
```

---

### Issue 4: API Key Validation Failing

**Symptoms:**
- API key entered in settings but still shows "not configured"
- Authentication errors despite valid key

**Diagnostic:**
```javascript
// Test API key validation endpoint:
const response = await fetch('/api/settings/api-keys/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: 'trellis', apiKey: 'sk-...' }),
});
console.log('Validation result:', await response.json());
```

**Fix:** Check encryption/decryption:
```javascript
// In backend/src/routes/settings.js:
const encryptedKey = encrypt(apiKey);
console.log('[DEBUG] Encrypted:', encryptedKey);

const decryptedKey = decrypt(encryptedKey);
console.log('[DEBUG] Decrypted:', decryptedKey);

// Should match original apiKey
```

---

### Issue 5: Product URL Scraping Blocked by Target Site

**Symptoms:**
- URL import fails with "403 Forbidden"
- Cheerio returns empty results
- Puppeteer fails to load page

**Cause:** Target site blocks scrapers (detects bot traffic).

**Fix 1: Add user agent**
```javascript
// In Puppeteer:
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
await page.goto(url);
```

**Fix 2: Add delays**
```javascript
// Wait for JavaScript to render:
await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForTimeout(2000);  // Wait 2 seconds
```

**Fix 3: Fallback to manual entry**
```javascript
// If scraping fails, prompt user for manual data entry:
if (!scrapedData) {
  return res.status(400).json({
    error: 'Failed to scrape URL',
    fallback: 'manual_entry',  // Signal frontend to show manual form
  });
}
```

---

## Performance Issues

### Issue 1: Memory Leaks (Undisposed Three.js Objects)

**Symptoms:**
- Memory usage grows over time
- Browser slows down after extended use
- Eventually crashes or becomes unresponsive

**Diagnostic:**
```javascript
// Browser DevTools → Performance → Memory tab
// Record heap snapshots over time
// Look for growing arrays or objects
```

**Common cause:** Three.js objects not disposed.

**Fix:** Always dispose in `useEffect` cleanup:
```tsx
useEffect(() => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 'red' });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Cleanup:
  return () => {
    scene.remove(mesh);
    geometry.dispose();
    material.dispose();
    if (material.map) material.map.dispose();  // Dispose textures too
  };
}, []);
```

**React Three Fiber handles this automatically** for declarative components:
```tsx
<mesh>
  <boxGeometry />  {/* Auto-disposed on unmount */}
  <meshStandardMaterial color="red" />
</mesh>
```

---

### Issue 2: Slow Initial Load (Too Many Models)

**Symptoms:**
- Page loads slowly (5-10+ seconds)
- White screen for extended period
- "Loading..." indicator stays visible

**Diagnostic:**
```javascript
// Check how many assets are being loaded:
console.log('[DEBUG] Loading assets:', assets.length);

// Check asset file sizes:
assets.forEach(asset => {
  fetch(asset.model_path, { method: 'HEAD' })
    .then(res => console.log(asset.name, 'size:', res.headers.get('content-length')));
});
```

**Fix 1: Lazy load assets**
```tsx
// Don't load all furniture models at once
// Load only visible furniture:
{furniturePlacements
  .filter(f => f.room_id === currentRoomId)  // Only current room
  .map(furniture => <FurnitureMesh key={furniture.id} furniture={furniture} />)
}
```

**Fix 2: Compress models**
```bash
# Use Draco compression for GLB files:
npx gltf-pipeline -i model.glb -o model-compressed.glb -d
```

**Fix 3: Use LOD (Level of Detail)**
```tsx
import { Detailed } from '@react-three/drei';

<Detailed distances={[0, 10, 20]}>
  <FurnitureHighPoly />   {/* Close to camera */}
  <FurnitureMediumPoly /> {/* Medium distance */}
  <FurnitureLowPoly />    {/* Far from camera */}
</Detailed>
```

---

### Issue 3: Frame Drops During Interaction

**Symptoms:**
- Camera movement is laggy
- Dragging furniture stutters
- FPS drops below 30

**Diagnostic:**
```tsx
// Measure FPS:
import { useFrame } from '@react-three/fiber';

const fpsCounter = { frames: 0, lastTime: performance.now() };

useFrame(() => {
  fpsCounter.frames++;
  const now = performance.now();
  if (now - fpsCounter.lastTime >= 1000) {
    console.log('[DEBUG] FPS:', fpsCounter.frames);
    fpsCounter.frames = 0;
    fpsCounter.lastTime = now;
  }
});
```

**Fix 1: Reduce draw calls**
```tsx
// Merge geometries (instead of 100 wall meshes, make 1 merged mesh):
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';

const geometries = walls.map(wall => createWallGeometry(wall));
const mergedGeometry = mergeBufferGeometries(geometries);

<mesh geometry={mergedGeometry}>
  <meshStandardMaterial />
</mesh>
```

**Fix 2: Use simpler materials**
```tsx
// ❌ Expensive:
<meshStandardMaterial
  map={texture}
  normalMap={normalMap}
  roughnessMap={roughnessMap}
  metalness={0.5}
/>

// ✅ Cheaper:
<meshBasicMaterial color={color} />  // No lighting calculations
```

**Fix 3: Disable shadows for non-critical objects**
```tsx
<mesh castShadow={false} receiveShadow={false}>
  {/* Small objects don't need shadows */}
</mesh>
```

---

### Issue 4: Large Project File Sizes

**Symptoms:**
- Project export is 100MB+
- Project load/save is slow
- Storage fills up quickly

**Diagnostic:**
```bash
# Check database size:
ls -lh backend/database.db

# Check assets directory:
du -sh assets/
```

**Fix 1: Compress 3D models**
```bash
# Use Draco or KTX2 compression
npx gltf-pipeline -i model.glb -o model.glb -d
```

**Fix 2: Compress textures**
```bash
# Convert to KTX2 (GPU-compressed format):
npx gltf-transform toktx input.glb output.glb --format etc1s
```

**Fix 3: Limit undo history**
```tsx
// In editorStore.ts:
addAction: (action) => {
  set(state => ({
    history: [...state.history.slice(-50), action],  // Keep only last 50 actions
    historyIndex: Math.min(state.historyIndex + 1, 50),
  }));
},
```

---

## Development Environment Issues

### Issue 1: Vite HMR Not Reflecting Changes to 3D Components

**Symptoms:**
- Edit `Viewport3D.tsx` but changes don't appear
- Need to refresh browser to see updates

**Cause:** React Three Fiber components sometimes don't trigger HMR.

**Fix 1: Force refresh**
```bash
# In browser console:
location.reload()
```

**Fix 2: Add key to force remount**
```tsx
// In Editor.tsx:
const [refreshKey, setRefreshKey] = useState(0);

// When you need to force refresh:
setRefreshKey(prev => prev + 1);

<Viewport3D key={refreshKey} />
```

**Fix 3: Check Vite config**
```typescript
// In vite.config.ts:
export default defineConfig({
  plugins: [react()],  // Ensure React plugin is present
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
```

---

### Issue 2: TypeScript Strict Mode Errors When Adding New Features

**Symptoms:**
- `npm run build` fails with type errors
- `npm run dev` works fine

**Cause:** `tsconfig.json` has `strict: false` for dev, but you're adding new code without types.

**Fix 1: Add types**
```tsx
// ❌ WRONG:
function createRoom(data) {  // Implicit 'any' type
  // ...
}

// ✅ CORRECT:
interface RoomData {
  floor_id: number;
  name: string;
  dimensions: { width: number; depth: number };
}

function createRoom(data: RoomData): Promise<Room> {
  // ...
}
```

**Fix 2: Use type inference**
```tsx
// TypeScript can often infer types:
const rooms = await roomsApi.listRooms(floorId);  // Type: Room[]
// No need to annotate if it's obvious
```

---

### Issue 3: Tailwind Classes Not Being Detected

**Symptoms:**
- CSS classes don't apply
- Styles missing in production build

**Cause:** Class names not in Tailwind's content scan paths.

**Fix:** Update `tailwind.config.js`:
```javascript
export default {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',  // Ensure this covers your files
  ],
  // ...
};
```

**Also check:** Dynamic class names don't work:
```tsx
// ❌ WRONG: Tailwind won't detect this
<div className={`text-${color}-500`}>

// ✅ CORRECT: Full class names only
<div className={color === 'red' ? 'text-red-500' : 'text-blue-500'}>
```

---

### Issue 4: Puppeteer Installation on Different Platforms

**See:** [DEPENDENCIES.md - Troubleshooting Dependencies - Puppeteer-Specific Issues](./DEPENDENCIES.md#puppeteer-specific-issues)

**Summary:**
- **Windows:** Use `executablePath` to point to installed Chrome
- **Linux:** Install system dependencies (`libnss3`, `libatk`, etc.)
- **Mac:** Usually works out of the box

---

## Known Gotchas

### 1. Always Dispose Three.js Geometries/Materials in useEffect Cleanup

**Problem:** Forgetting to dispose causes memory leaks.

**Rule:** For **every** manual Three.js object creation, dispose in cleanup:

```tsx
useEffect(() => {
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geometry, material);

  return () => {
    geometry.dispose();
    material.dispose();
    mesh.geometry = null;
    mesh.material = null;
  };
}, []);
```

**Exception:** React Three Fiber auto-disposes declarative components:
```tsx
<mesh>
  <boxGeometry />  {/* Auto-disposed */}
  <meshStandardMaterial />
</mesh>
```

---

### 2. Room `dimensions_json` Must Be Updated Atomically

**Problem:** Updating `dimensions_json` field piecemeal causes data corruption.

**Rule:** Always parse, modify, and stringify as a single operation:

```javascript
// ❌ WRONG: Partial update
db.exec(`UPDATE rooms SET dimensions_json = '{"width": 10}' WHERE id = 1`);
// This OVERWRITES the entire JSON, losing depth, vertices, etc.

// ✅ CORRECT: Atomic update
const room = await getRoomById(id);
const dimensions = JSON.parse(room.dimensions_json);
dimensions.width = 10;  // Modify
const updatedJson = JSON.stringify(dimensions);
db.exec(`UPDATE rooms SET dimensions_json = ? WHERE id = ?`, [updatedJson, id]);
```

---

### 3. Zustand State Updates Are Batched (React 18)

**Problem:** Multiple `set()` calls in the same function are batched.

**Example:**
```tsx
const updateRoomAndSelect = (room) => {
  addRoom(room);          // set() call 1
  setSelectedRoomId(room.id);  // set() call 2
  // Both are batched - components re-render ONCE with both changes
};
```

**Gotcha:** If you need intermediate state, split into separate functions or use callbacks:
```tsx
set(state => ({
  rooms: [...state.rooms, newRoom],
  selectedRoomId: newRoom.id,
}));
```

---

### 4. React Three Fiber `useFrame` Runs on Every Frame

**Problem:** Heavy operations in `useFrame` cause frame drops.

**Rule:** Keep `useFrame` callbacks **fast** (< 1ms):

```tsx
// ❌ WRONG: Heavy operation every frame
useFrame(() => {
  const furniture = furniturePlacements.find(f => f.id === selectedId);  // Slow
  // ...
});

// ✅ CORRECT: Precompute outside useFrame
const selectedFurniture = furniturePlacements.find(f => f.id === selectedId);

useFrame(() => {
  // Use precomputed value (fast)
  if (selectedFurniture) {
    // ...
  }
});
```

---

### 5. SQLite `sql.js` Database Must Be Saved Manually

**Problem:** Changes are in-memory until explicitly saved.

**Rule:** Call `saveDatabase(db)` after every write operation:

```javascript
// In backend/src/db/connection.js:
export function saveDatabase(db) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// In API routes:
db.exec('INSERT INTO projects (name) VALUES (?)', [name]);
saveDatabase(db);  // DON'T FORGET THIS
```

**Gotcha:** If server crashes before save, changes are lost.

---

### 6. Vite Proxy Only Works in Dev Mode

**Problem:** Production build doesn't have proxy (API calls fail).

**Rule:** In production, serve frontend and backend from the same origin OR enable CORS:

**Option 1: Same origin (recommended)**
```javascript
// Backend serves frontend static files:
app.use(express.static('../frontend/dist'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
```

**Option 2: CORS (for separate deployments)**
```javascript
// Backend enables CORS:
app.use(cors({ origin: 'https://your-frontend-domain.com' }));
```

---

### 7. Material Colors in Three.js Are Stored as Objects (Not Strings)

**Problem:** Can't compare colors directly.

```tsx
// ❌ WRONG:
if (material.color === '#FF0000') { /* ... */ }

// ✅ CORRECT:
if (material.color.getHexString() === 'FF0000') { /* ... */ }
// OR:
material.color.set('#FF0000');  // Set color
```

---

### 8. React State Updates Are Asynchronous

**Problem:** State doesn't update immediately.

```tsx
const [count, setCount] = useState(0);

const increment = () => {
  setCount(count + 1);
  console.log(count);  // Still 0! (old value)
};

// ✅ CORRECT: Use callback form
const increment = () => {
  setCount(prev => prev + 1);
  // OR use useEffect to react to changes
};
```

---

## Getting Help

### Searching the Codebase Effectively

1. **Find where a feature is implemented:**
   ```bash
   # Search for function/component name:
   grep -r "createRoom" frontend/src/

   # Search for API endpoint:
   grep -r "/api/projects" backend/src/
   ```

2. **Find all uses of a Zustand store field:**
   ```bash
   grep -r "selectedFurnitureId" frontend/src/
   ```

3. **Find database queries:**
   ```bash
   grep -r "SELECT.*FROM rooms" backend/src/
   ```

---

### Which Docs to Reference

| Problem Type | Document to Check |
|-------------|------------------|
| **Architecture/high-level design** | `docs/ARCHITECTURE.md` |
| **API endpoints** | `docs/API_REFERENCE.md` |
| **Database schema** | `docs/DATABASE.md` |
| **Adding new features** | `docs/EXTENDING.md` |
| **Dependency issues** | `docs/DEPENDENCIES.md` |
| **3D rendering** | `docs/3D_PIPELINE.md` |
| **AI integration** | `docs/AI_INTEGRATION.md` |

---

### How to Report/Document New Issues Discovered

When you discover a new bug or gotcha:

1. **Document it immediately:**
   - Add to this file (`docs/TROUBLESHOOTING.md`)
   - Include symptoms, cause, and fix
   - Add code examples

2. **Add debug logs:**
   ```tsx
   console.log('[DEBUG ComponentName] Issue reproduced:', { data });
   ```

3. **Write a test case (if applicable):**
   - Prevents regression
   - Helps future developers

4. **Update progress notes:**
   - Add to `claude-progress.txt`
   - Mention in commit message

---

## Quick Diagnostic Checklist

When something isn't working:

- [ ] Check browser console for errors
- [ ] Check backend terminal for errors
- [ ] Check network tab for failed API calls
- [ ] Check React DevTools for component state
- [ ] Check Zustand store state
- [ ] Check database for expected data (`sqlite3 database.db`)
- [ ] Check file paths are correct (model files, textures)
- [ ] Check Three.js scene graph (Three.js DevTools)
- [ ] Check for memory leaks (DevTools → Memory)
- [ ] Restart dev servers (sometimes fixes stale state)

**If stuck:**
1. Search this document for similar symptoms
2. Search codebase for related code
3. Check relevant documentation
4. Add debug logs and trace execution
5. Ask for help (provide logs, code, and steps to reproduce)

---

**🔍 Happy debugging!**

For more guidance, see:
- `docs/ARCHITECTURE.md` - System design
- `docs/EXTENDING.md` - Adding features
- `docs/DEPENDENCIES.md` - Dependency management
