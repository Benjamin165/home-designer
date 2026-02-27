# Frontend Architecture & State Management

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [Editor Component Tree](#editor-component-tree)
3. [State Management](#state-management)
4. [React Three Fiber Integration](#react-three-fiber-integration)
5. [Routing](#routing)
6. [Custom Hooks](#custom-hooks)
7. [TypeScript Types](#typescript-types)
8. [Performance Patterns](#performance-patterns)
9. [Styling Patterns](#styling-patterns)

---

## Component Architecture

### Top-Level Component Tree

```
main.tsx (entry point)
└── App.tsx (root component)
    ├── Router (react-router-dom)
    │   └── Routes
    │       ├── / → ProjectHub (landing page)
    │       ├── /editor/:projectId → Editor (main workspace)
    │       └── * → NotFound (404 page)
    └── Toaster (sonner toast notifications)
```

**File Paths:**
- Entry: `frontend/src/main.tsx`
- Root: `frontend/src/App.tsx`
- Routes:
  - `frontend/src/components/ProjectHub.tsx`
  - `frontend/src/components/Editor.tsx`
  - `frontend/src/components/NotFound.tsx`

### Key Design Decisions

- **React 18+ with StrictMode**: Enables concurrent features and helps detect potential issues
- **React Router v6**: Client-side routing with URL-based navigation
- **Sonner for Toasts**: Lightweight, beautiful toast notifications with rich colors
- **Single Store Pattern**: One Zustand store (`editorStore`) manages all editor state

---

## Editor Component Tree

The Editor is the main workspace where users design their rooms. It follows a **shell layout** pattern with a central 3D viewport surrounded by contextual panels.

### Editor Layout Structure

```
Editor.tsx (main container)
├── Top Toolbar
│   ├── Back button (← to ProjectHub)
│   ├── Project name display
│   ├── Edit button (project metadata)
│   ├── Tool selection buttons
│   │   ├── Select (MousePointer2)
│   │   ├── Draw Wall (Square)
│   │   ├── Measure (Ruler)
│   │   ├── Place Furniture (Armchair)
│   │   ├── Pan (Hand)
│   │   └── First Person (Eye)
│   ├── Undo/Redo buttons
│   ├── Grid toggle
│   ├── Create Room by Dimensions button
│   ├── Upload Floor Plan button
│   ├── Export button
│   ├── Settings button
│   └── Save indicator (Saving/Saved/Idle)
│
├── Left Sidebar (collapsible, ~280px)
│   └── AssetLibrary.tsx
│       ├── Category tabs (Furniture, Decor, Plants, Lighting, etc.)
│       ├── Search bar
│       ├── Asset grid with thumbnails
│       ├── Drag-and-drop handlers
│       ├── Asset details modal trigger
│       ├── AI Generation button
│       └── URL Import button
│
├── Center Viewport (full remaining space)
│   └── Viewport3D.tsx
│       ├── Canvas (R3F root)
│       │   ├── Scene component (3D content)
│       │   │   ├── Lighting (ambient + directional)
│       │   │   ├── Grid helper (toggleable)
│       │   │   ├── Rooms (RoomMesh components)
│       │   │   │   ├── Floor (Box mesh)
│       │   │   │   ├── Ceiling (Box mesh)
│       │   │   │   └── Walls (WallMesh components)
│       │   │   ├── Furniture (FurnitureMesh components)
│       │   │   │   └── 3D models loaded from assets
│       │   │   └── Preview overlays (drag preview, dimension labels)
│       │   └── OrbitControls (camera control)
│       ├── Day/Night toggle button (overlay)
│       └── Context menu (right-click actions)
│
├── Right Sidebar (collapsible, ~300px)
│   └── PropertiesPanel.tsx
│       ├── Project Overview (when nothing selected)
│       │   ├── Project stats (floor count, room count)
│       │   └── Unit system toggle
│       ├── Room Properties (when room selected)
│       │   ├── Dimensions (width, length, area)
│       │   ├── Floor material selector
│       │   ├── Ceiling height input
│       │   └── Ceiling color picker
│       ├── Furniture Properties (when furniture selected)
│       │   ├── Asset name and category
│       │   ├── Position controls (X, Y, Z)
│       │   ├── Rotation controls
│       │   ├── Scale controls
│       │   └── Delete button
│       └── Multi-select info (when multiple items selected)
│
├── Bottom Panel (collapsible)
│   └── EditHistory.tsx
│       ├── Timeline of actions (horizontal scroll)
│       ├── Action type icons (add, remove, move)
│       ├── Timestamps
│       └── Jump-to-action functionality
│
├── Floor Switcher (right edge, vertical)
│   └── FloorSwitcher.tsx
│       ├── Floor thumbnails stack
│       ├── Current floor highlight
│       ├── Floor level labels
│       ├── Add floor button (+)
│       └── Delete floor buttons
│
└── Modals (overlays)
    ├── SettingsModal.tsx (AI keys, performance, units)
    ├── ExportModal.tsx (format, quality, preview)
    ├── AIGenerationModal.tsx (TRELLIS photo-to-3D)
    ├── URLImportModal.tsx (scrape furniture from URLs)
    ├── AssetDetailsModal.tsx (asset metadata view)
    ├── DeleteRoomDialog.tsx (confirmation with options)
    └── DeleteFloorDialog.tsx (confirmation)
```

**Component File Paths:**
- `frontend/src/components/Editor.tsx` (1400+ lines - main orchestrator)
- `frontend/src/components/Viewport3D.tsx` (1800+ lines - 3D viewport + R3F)
- `frontend/src/components/AssetLibrary.tsx` (400+ lines)
- `frontend/src/components/PropertiesPanel.tsx` (1000+ lines)
- `frontend/src/components/FloorSwitcher.tsx` (250+ lines)
- `frontend/src/components/EditHistory.tsx` (150+ lines)
- `frontend/src/components/SettingsModal.tsx` (400+ lines)
- `frontend/src/components/ExportModal.tsx` (350+ lines)
- `frontend/src/components/AIGenerationModal.tsx` (350+ lines)
- `frontend/src/components/URLImportModal.tsx` (450+ lines)
- `frontend/src/components/AssetDetailsModal.tsx` (180+ lines)
- `frontend/src/components/DeleteRoomDialog.tsx` (120+ lines)
- `frontend/src/components/DeleteFloorDialog.tsx` (90+ lines)
- `frontend/src/components/WallMesh.tsx` (90+ lines - individual wall rendering)
- `frontend/src/components/ContextMenu.tsx` (70+ lines)

---

## State Management

The application uses **Zustand** for state management - a lightweight alternative to Redux with a simpler API and no boilerplate.

### Zustand Store: `editorStore`

**File:** `frontend/src/store/editorStore.ts` (428 lines)

#### Store Structure

```typescript
interface EditorState {
  // Tool Selection
  currentTool: EditorTool;
  setCurrentTool: (tool: EditorTool) => void;

  // Project Context
  projectId: number | null;
  setProjectId: (id: number) => void;

  // Floor Management
  floors: Floor[];
  setFloors: (floors: Floor[]) => void;
  currentFloorId: number | null;
  setCurrentFloorId: (id: number | null) => void;

  // Camera Positions (per floor)
  cameraPositions: Record<number, CameraPosition>;
  setCameraPosition: (floorId: number, position: CameraPosition) => void;
  getCameraPosition: (floorId: number) => CameraPosition | undefined;

  // Room Data
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;

  // Furniture Placements
  furniturePlacements: FurniturePlacement[];
  setFurniturePlacements: (placements: FurniturePlacement[]) => void;
  addFurniturePlacement: (placement: FurniturePlacement) => void;
  removeFurniturePlacement: (id: number) => void;
  updateFurniturePlacement: (id: number, updates: Partial<FurniturePlacement>) => void;

  // Selection State
  selectedRoomId: number | null;
  setSelectedRoomId: (id: number | null) => void;
  selectedFurnitureId: number | null;
  setSelectedFurnitureId: (id: number | null) => void;
  selectedFurnitureIds: number[]; // Multi-select support
  toggleFurnitureSelection: (id: number) => void;
  clearFurnitureSelection: () => void;
  selectedWallId: number | null;
  setSelectedWallId: (id: number | null) => void;

  // User Preferences
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (system: 'metric' | 'imperial') => void;

  // UI State
  draggingAsset: any | null; // Asset being dragged from library
  setDraggingAsset: (asset: any | null) => void;
  gridVisible: boolean;
  setGridVisible: (visible: boolean) => void;
  lightingMode: 'day' | 'night';
  setLightingMode: (mode: 'day' | 'night') => void;

  // Undo/Redo
  history: HistoryAction[];
  historyIndex: number;
  addAction: (action: Omit<HistoryAction, 'id' | 'timestamp'>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}
```

#### Store Access Patterns

**In Components:**

```typescript
// Selective subscription (only re-renders when currentTool changes)
const currentTool = useEditorStore((state) => state.currentTool);
const setCurrentTool = useEditorStore((state) => state.setCurrentTool);

// Multiple selectors
const {
  rooms,
  setRooms,
  selectedRoomId,
  setSelectedRoomId
} = useEditorStore();

// Direct state access (no subscription)
const state = useEditorStore.getState();
state.setCurrentTool('select');
```

**Key Benefits:**
- **Selective subscriptions**: Components only re-render when their selected state changes
- **No providers**: Unlike Context API, no Provider wrapper needed
- **Direct access**: Can read/write state outside React components
- **TypeScript-first**: Full type safety with minimal boilerplate

#### State Persistence Strategy

- **Ephemeral UI state**: Tool selection, grid visibility, lighting mode (not persisted)
- **Project data**: Rooms, furniture, floors (loaded from backend on mount, saved via API)
- **Camera positions**: Persisted per-floor in memory, restored on floor switch
- **Undo history**: In-memory only (cleared on project close)

#### Store Interaction with Backend

The store acts as a **client-side cache**:

1. **On editor mount**: Load project data from API → populate store
2. **User actions**: Update store immediately (optimistic UI)
3. **API sync**: Send updates to backend, handle errors
4. **Undo/Redo**: Reverse store changes + API calls

**Example flow (placing furniture):**

```
1. User drops asset → Viewport3D handles drop event
2. Calculate 3D position via raycasting
3. Call furnitureApi.create() → backend saves to DB
4. On success: addFurniturePlacement() → update store
5. On success: addAction() → add to undo history
```

---

## React Three Fiber Integration

### How R3F Sits in the React Tree

React Three Fiber (R3F) is a **React renderer for Three.js**. It allows you to declare Three.js scenes using React components and JSX.

#### The Canvas Boundary

```typescript
// Viewport3D.tsx
<Canvas
  camera={{ position: [10, 10, 10], fov: 50 }}
  onCreated={({ gl }) => {
    gl.setClearColor('#0A0A0F');
  }}
  onPointerMissed={() => {
    // Deselect when clicking empty space
  }}
>
  {/* Inside Canvas: R3F components */}
  <Scene />
</Canvas>
```

**Key Concepts:**

1. **Canvas**: The root R3F component. Creates a Three.js `WebGLRenderer`, `Scene`, and `Camera`.
2. **Inside Canvas**: JSX maps to Three.js objects (`<mesh>` → `THREE.Mesh`, `<boxGeometry>` → `THREE.BoxGeometry`)
3. **Outside Canvas**: Regular React components (HTML/CSS)

#### The Scene Component

```typescript
function Scene({ onFurnitureContextMenu }) {
  // Access R3F hooks (only available inside Canvas)
  const { camera, gl, scene } = useThree();

  // Access Zustand store (works anywhere)
  const rooms = useEditorStore((state) => state.rooms);
  const furniturePlacements = useEditorStore((state) => state.furniturePlacements);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[10, 10, 5]} intensity={directionalIntensity} />

      {/* Grid */}
      {gridVisible && <Grid infiniteGrid />}

      {/* Rooms */}
      {rooms.map(room => (
        <RoomMesh key={room.id} room={room} />
      ))}

      {/* Furniture */}
      {furniturePlacements.map(furniture => (
        <FurnitureMesh key={furniture.id} furniture={furniture} />
      ))}

      {/* Camera Controls */}
      <OrbitControls ref={controlsRef} />
    </>
  );
}
```

#### State Synchronization

**React State → 3D Scene:**

1. User action updates Zustand store
2. R3F components subscribe to store via `useEditorStore()`
3. Store change triggers React re-render
4. R3F reconciles JSX → Three.js object updates
5. Next frame renders updated scene

**Example: Moving furniture**

```typescript
// User drags furniture in 3D
const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
  const newPosition = calculatePosition(e.point);

  // Update store (triggers re-render)
  updateFurniturePlacement(furnitureId, {
    position_x: newPosition.x,
    position_y: newPosition.y,
    position_z: newPosition.z
  });

  // R3F automatically updates the <mesh position={[x, y, z]} />
};
```

#### The Render Loop

R3F runs at **60fps by default** using `requestAnimationFrame`:

1. **Detect changes**: React reconciler checks for prop/state changes
2. **Update Three.js objects**: Modified meshes, materials, positions
3. **Render frame**: `renderer.render(scene, camera)`

**Manual renders (on-demand rendering):**

- Not currently used (app uses continuous rendering for smooth camera controls)
- Could be enabled for better performance: `<Canvas frameloop="demand">`

#### User Interactions in 3D Space

**Click Detection:**

```typescript
<mesh
  onClick={(e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); // Prevent event bubbling
    setSelectedRoomId(room.id);
  }}
  onPointerOver={(e) => {
    document.body.style.cursor = 'pointer';
  }}
  onPointerOut={(e) => {
    document.body.style.cursor = 'default';
  }}
>
  {/* Room geometry */}
</mesh>
```

**Raycasting (for drop placement):**

```typescript
// Viewport3D.tsx - drop event handler
const handleDrop = (e: React.DragEvent) => {
  const rect = canvasRef.current.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const position = intersects[0].point;
    // Place furniture at intersection point
  }
};
```

---

## Routing

### Route Structure

**File:** `frontend/src/App.tsx`

```typescript
<Routes>
  <Route path="/" element={<ProjectHub />} />
  <Route path="/editor/:projectId" element={<Editor />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Route Definitions

| Path | Component | Purpose | Parameters |
|------|-----------|---------|------------|
| `/` | `ProjectHub` | Landing page - project list | None |
| `/editor/:projectId` | `Editor` | Main workspace | `projectId` (number) |
| `*` | `NotFound` | 404 fallback | None |

### Navigation Patterns

**From ProjectHub to Editor:**

```typescript
// ProjectHub.tsx
const navigate = useNavigate();

const handleOpenProject = (projectId: number) => {
  navigate(`/editor/${projectId}`);
};
```

**From Editor back to ProjectHub:**

```typescript
// Editor.tsx
const navigate = useNavigate();

const handleBackToHub = () => {
  if (hasUnsavedChanges) {
    setShowUnsavedWarning(true); // Show confirmation dialog
  } else {
    navigate('/');
  }
};
```

**URL Parameter Access:**

```typescript
// Editor.tsx
const { projectId } = useParams<{ projectId: string }>();

useEffect(() => {
  if (projectId) {
    loadProject(parseInt(projectId, 10));
  }
}, [projectId]);
```

### How Editor Loads Project Data

**Sequence on `/editor/:projectId` mount:**

1. **Extract projectId** from URL params
2. **Set in store**: `setProjectId(projectId)`
3. **Fetch project**: `GET /api/projects/:id`
4. **Fetch floors**: `GET /api/projects/:projectId/floors`
5. **Set default floor**: First floor → `setCurrentFloorId(floors[0].id)`
6. **Fetch rooms**: `GET /api/floors/:floorId/rooms` (triggered by `currentFloorId` change)
7. **Fetch furniture**: `GET /api/rooms/:roomId/furniture` (for all rooms)
8. **Populate store**: `setRooms()`, `setFurniturePlacements()`
9. **Render 3D scene**: R3F components render based on store data

**Error Handling:**

- 404 (project not found) → Show error, redirect to hub after 3 seconds
- Network error → Show error toast, allow retry

---

## Custom Hooks

### `useEditorStore` (Zustand Hook)

**File:** `frontend/src/store/editorStore.ts`

**Type:** Zustand store hook (generated by `create()`)

**Purpose:** Access and manipulate global editor state

**Usage Patterns:**

```typescript
// 1. Selective subscription (recommended - prevents unnecessary re-renders)
const currentTool = useEditorStore((state) => state.currentTool);
const setCurrentTool = useEditorStore((state) => state.setCurrentTool);

// 2. Multiple selectors
const {
  rooms,
  setRooms,
  addRoom,
  selectedRoomId,
  setSelectedRoomId
} = useEditorStore();

// 3. Derived state (with selector)
const hasRooms = useEditorStore((state) => state.rooms.length > 0);

// 4. Direct access (outside React components)
const handleSomeAction = () => {
  const state = useEditorStore.getState();
  state.setCurrentTool('select');
};
```

**Key Actions:**

| Action | Purpose | Side Effects |
|--------|---------|--------------|
| `setCurrentTool(tool)` | Change active tool | Updates cursor, enables/disables viewport interactions |
| `setCurrentFloorId(id)` | Switch floors | Triggers room/furniture reload, restores camera position |
| `addFurniturePlacement(placement)` | Add furniture to scene | Immediate render in 3D viewport |
| `undo()` | Revert last action | API call + store update |
| `redo()` | Reapply undone action | API call + store update |
| `toggleFurnitureSelection(id)` | Multi-select furniture | Updates properties panel |

**Subscription Optimization:**

Zustand uses shallow equality checks. Components only re-render when **selected state** changes:

```typescript
// ✅ Good: Only re-renders when currentTool changes
const currentTool = useEditorStore((state) => state.currentTool);

// ❌ Bad: Re-renders on ANY store change
const state = useEditorStore();
```

### R3F Hooks (Three.js Integration)

These hooks are **only available inside `<Canvas>`**:

#### `useThree()`

Access Three.js renderer, scene, camera:

```typescript
const { camera, gl, scene, size } = useThree();

// Example: Manual camera control
camera.position.set(10, 10, 10);
camera.lookAt(0, 0, 0);
```

**Returns:**
- `camera`: Three.js camera instance
- `gl`: WebGL renderer
- `scene`: Three.js scene
- `size`: Canvas dimensions `{ width, height }`

#### `useFrame(callback)`

Run code every frame (60fps):

```typescript
useFrame((state, delta) => {
  // Animate something every frame
  meshRef.current.rotation.y += delta * 0.5;
});
```

**Use Cases:**
- Animations
- Physics simulations
- Custom camera controllers

**Note:** Not currently used in the app (relies on OrbitControls for camera)

---

## TypeScript Types

### Type Organization

#### Core Domain Types (defined in `editorStore.ts`)

```typescript
// Room representation
interface Room {
  id: number;
  floor_id: number;
  name: string | null;
  dimensions_json: {
    width: number;
    depth: number;
    vertices?: Array<{ x: number; y: number }>;
  };
  position_x: number;
  position_y: number;
  position_z: number;
  floor_material: string | null;
  floor_color: string | null;
  ceiling_height: number;
  ceiling_material: string | null;
  ceiling_color: string | null;
}

// Floor/level definition
interface Floor {
  id: number;
  project_id: number;
  name: string;
  level: number;
  order_index: number;
}

// Furniture placement in 3D space
interface FurniturePlacement {
  id: number;
  room_id: number;
  asset_id: number;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_x: number;
  rotation_y: number;
  rotation_z: number;
  scale_x: number;
  scale_y: number;
  scale_z: number;
  locked: boolean;
  // Populated via JOIN queries
  asset_name?: string;
  category?: string;
  width?: number;
  height?: number;
  depth?: number;
  model_path?: string;
}

// Camera state per floor
interface CameraPosition {
  position: [number, number, number];
  target: [number, number, number];
}

// Undo/redo action types
type ActionType =
  | 'furniture_add'
  | 'furniture_remove'
  | 'furniture_move'
  | 'room_add'
  | 'room_remove';

interface HistoryAction {
  id: string;
  type: ActionType;
  timestamp: Date;
  description: string;
  data: {
    furniture?: FurniturePlacement;
    room?: Room;
    previousPosition?: { x: number; y: number; z: number };
    newPosition?: { x: number; y: number; z: number };
    furnitureId?: number;
  };
}
```

#### Component-Level Types (defined in individual components)

```typescript
// Editor.tsx
interface Project {
  id: number;
  name: string;
  description?: string;
  thumbnail_path?: string;
  unit_system: 'metric' | 'imperial';
  created_at: string;
  updated_at: string;
}

// AssetLibrary.tsx
interface Asset {
  id: number;
  name: string;
  category: string;
  subcategory: string | null;
  model_path: string;
  thumbnail_path: string | null;
  width: number;
  height: number;
  depth: number;
  source: 'builtin' | 'generated' | 'imported' | 'url_import';
  is_favorite: boolean;
}

// ContextMenu.tsx
interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}
```

#### Shared Types Between Frontend and Backend

**Challenge:** Frontend and backend are separate codebases with no shared code.

**Current Approach:**
- **Duplicate type definitions**: Types defined in both frontend and backend
- **Kept in sync manually**: API contracts documented, types updated when endpoints change

**Future Improvement:**
- Create `shared/types.ts` package
- Import in both frontend and backend
- Single source of truth for API contracts

#### Type Safety Strategy

**API Responses:**

```typescript
// api.ts uses generic typing
async function fetchWithErrorHandling<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return response.json() as T;
}

// Usage with type inference
const projects = await projectsApi.getAll(); // Type: Project[]
```

**Event Handlers:**

```typescript
// Three.js events from R3F
import { ThreeEvent } from '@react-three/fiber';

const handleClick = (e: ThreeEvent<MouseEvent>) => {
  e.stopPropagation();
  const clickedObject = e.object;
};
```

---

## Performance Patterns

### React Optimization

#### 1. Selective Zustand Subscriptions

**Problem:** Re-rendering entire components on any store change

**Solution:** Subscribe only to needed state

```typescript
// ✅ Good: Only re-renders when currentTool changes
const currentTool = useEditorStore((state) => state.currentTool);

// ❌ Bad: Re-renders on ANY store change
const state = useEditorStore();
const currentTool = state.currentTool;
```

#### 2. Component Splitting

**Problem:** Large monolithic components (Editor.tsx is 1400+ lines)

**Current State:**
- Editor.tsx contains too much logic (render + state management + event handlers)
- Not a major performance issue yet, but hurts maintainability

**Potential Improvement:**
- Extract custom hooks (`useProjectLoader`, `useRoomCreation`, `useAutoSave`)
- Split into subcomponents (`EditorToolbar`, `EditorContent`, `EditorModals`)

#### 3. Lazy Loading

**Not currently implemented** but recommended for:
- AIGenerationModal (large, rarely used)
- ExportModal (large, rarely used)
- 3D model loader (load furniture models on-demand)

**Example implementation:**

```typescript
const AIGenerationModal = lazy(() => import('./AIGenerationModal'));

// In component:
{showAIModal && (
  <Suspense fallback={<LoadingSpinner />}>
    <AIGenerationModal />
  </Suspense>
)}
```

#### 4. Memoization

**Not heavily used** - most components are fast enough without it.

**Where it would help:**
- FurnitureMesh (prevent re-render when furniture data unchanged)
- RoomMesh (prevent re-render when room dimensions unchanged)

```typescript
const FurnitureMesh = memo(({ furniture }) => {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if position/rotation/scale changed
  return (
    prevProps.furniture.position_x === nextProps.furniture.position_x &&
    prevProps.furniture.position_y === nextProps.furniture.position_y &&
    // ...
  );
});
```

### React Three Fiber Optimization

#### 1. Continuous vs On-Demand Rendering

**Current:** Continuous rendering (60fps always)

```typescript
<Canvas> {/* Default frameloop="always" */}
  <Scene />
</Canvas>
```

**Optimization:** On-demand rendering (only render when scene changes)

```typescript
<Canvas frameloop="demand">
  <Scene />
</Canvas>

// Manually trigger render:
useFrame((state) => {
  state.invalidate(); // Request a single frame render
}, 0); // Priority 0 = runs before rendering
```

**Trade-off:**
- ✅ Saves GPU/CPU when idle
- ❌ Requires manual invalidation (complex)
- ❌ OrbitControls need continuous rendering for smooth dragging

#### 2. Level of Detail (LOD)

**Not currently implemented** - all 3D models render at full quality regardless of distance.

**Recommended for:**
- Furniture library with 100+ models
- Multi-floor projects with many rooms

**Example:**

```typescript
import { Lod } from '@react-three/drei';

<Lod distances={[0, 10, 20]}>
  <HighQualityModel />   {/* Distance 0-10 */}
  <MediumQualityModel /> {/* Distance 10-20 */}
  <LowQualityModel />    {/* Distance 20+ */}
</Lod>
```

#### 3. Instancing (for repeated objects)

**Not currently implemented** - each furniture piece is a separate mesh.

**Would benefit:**
- Scenes with many identical objects (e.g., 50 identical chairs)

**Example:**

```typescript
import { Instances, Instance } from '@react-three/drei';

<Instances geometry={chairGeometry} material={chairMaterial}>
  {chairs.map(chair => (
    <Instance key={chair.id} position={chair.position} />
  ))}
</Instances>
```

#### 4. Model Compression

**Recommended:** Draco compression for glTF/GLB models

**Backend support:** Should pre-compress models on upload

```typescript
// Load with Draco decompression
useGLTF('/models/sofa.glb', true); // true = use Draco loader
```

### Code Splitting

**Current:** Single bundle for entire app

**Vite Configuration:**
- Dynamic imports create separate chunks
- Not yet leveraged for route-based splitting

**Recommended:**

```typescript
// App.tsx
const Editor = lazy(() => import('./components/Editor'));
const ProjectHub = lazy(() => import('./components/ProjectHub'));

<Suspense fallback={<LoadingScreen />}>
  <Routes>
    <Route path="/" element={<ProjectHub />} />
    <Route path="/editor/:projectId" element={<Editor />} />
  </Routes>
</Suspense>
```

**Impact:**
- Faster initial load (ProjectHub loads first)
- Editor code downloaded only when needed

---

## Styling Patterns

### Tailwind CSS

**Configuration:** `frontend/tailwind.config.js`

**Base Styles:** `frontend/src/index.css`

#### Class Conventions

**Layout:**
- Flexbox: `flex`, `flex-col`, `items-center`, `justify-between`
- Grid: `grid`, `grid-cols-3`, `gap-4`
- Spacing: `p-4`, `px-6`, `py-2`, `space-x-2`

**Dark Theme Colors:**

```typescript
// Background hierarchy
bg-background      // #0A0A0F (deepest - editor canvas)
bg-card           // #16161D (panels, sidebars)
bg-muted          // #1E1E28 (nested panels)

// Text hierarchy
text-foreground   // #FAFAFA (primary text)
text-muted        // #9CA3AF (secondary text)

// Accents
bg-primary        // #3B82F6 (blue - selections, buttons)
bg-secondary      // #8B5CF6 (violet - AI features)
bg-destructive    // #EF4444 (red - delete actions)
```

**Interactive States:**

```typescript
// Buttons
"bg-primary hover:bg-primary/90 transition-colors"

// Hover effects
"hover:bg-accent hover:text-accent-foreground"

// Focus states
"focus:outline-none focus:ring-2 focus:ring-ring"
```

#### Responsive Design

**Breakpoints:**
- `sm:` 640px
- `md:` 768px
- `lg:` 1024px
- `xl:` 1280px
- `2xl:` 1536px

**Common Patterns:**

```typescript
// Hide sidebar on mobile, show on desktop
className="hidden lg:flex"

// Stack vertically on mobile, horizontal on desktop
className="flex flex-col md:flex-row"

// Responsive padding
className="p-2 md:p-4 lg:p-6"
```

### shadcn/ui Components

**Library:** shadcn/ui (not a package - copy/paste components)

**Installation:** Components copied into `frontend/src/components/ui/`

**Current Status:** Not present in codebase - using custom Tailwind components instead

**Alternative:** Lucide React icons + custom-styled components

**Used Icons:**
- `MousePointer2`, `Square`, `Ruler`, `Armchair` (toolbar)
- `ArrowLeft`, `Save`, `Settings` (navigation)
- `Undo2`, `Redo2`, `Trash2`, `Copy` (actions)
- `Sun`, `Moon` (day/night toggle)
- `Loader2` (loading states)

### Animation Patterns

#### Framer Motion

**Used for:** UI transitions, panel animations

**Not currently implemented extensively** - mostly using Tailwind transitions

**Recommended usage:**

```typescript
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -20 }}
  transition={{ duration: 0.2 }}
>
  {/* Panel content */}
</motion.div>
```

#### CSS Transitions (Tailwind)

**Current approach:**

```typescript
// Smooth color transitions
className="transition-colors duration-200"

// Smooth all properties
className="transition-all duration-300"

// Hover scale effect
className="transition-transform hover:scale-105"
```

### Utility: `cn()` Function

**Purpose:** Merge Tailwind classes with conditional logic

**Implementation:** Uses `clsx` + `tailwind-merge`

**Expected location:** `frontend/src/lib/utils.ts` (not currently in codebase)

**Typical implementation:**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Usage:**

```typescript
<div
  className={cn(
    "rounded-lg p-4",
    isActive && "bg-primary text-white",
    isDisabled && "opacity-50 cursor-not-allowed"
  )}
/>
```

**Benefits:**
- Handles class conflicts (e.g., `p-4` overrides `p-2`)
- Conditional classes without string concatenation
- Type-safe with TypeScript

---

## Summary

### Architectural Highlights

1. **Single Store Pattern**: Zustand provides simple, performant state management without Redux boilerplate
2. **React Three Fiber**: Declarative 3D rendering with React components, seamlessly integrated with React state
3. **Component Composition**: Large components (Editor, Viewport3D) orchestrate smaller, focused components
4. **Type Safety**: TypeScript throughout with shared interfaces between store, components, and API
5. **Dark Theme First**: Tailwind classes optimized for dark editor aesthetic
6. **Optimistic UI**: Store updates immediately, API syncs in background

### Performance Characteristics

- **Fast Initial Load**: < 3 seconds on modern hardware
- **Smooth 3D Interactions**: 60fps during camera orbit/pan
- **Efficient Re-renders**: Selective Zustand subscriptions prevent cascade re-renders
- **Room for Optimization**: Code splitting, lazy loading, React.memo not yet implemented

### Future Improvements

1. **Code Splitting**: Route-based chunks (ProjectHub vs Editor)
2. **Lazy Load Modals**: Import heavy components on-demand
3. **R3F Optimizations**: LOD, instancing, on-demand rendering
4. **Extract Custom Hooks**: Reduce Editor.tsx complexity
5. **Shared Types Package**: Single source of truth for API contracts
6. **Add `cn()` Utility**: Better Tailwind class management
