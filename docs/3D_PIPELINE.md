# 3D Engine & Rendering Pipeline

## Table of Contents

1. [Scene Graph Overview](#scene-graph-overview)
2. [Geometry Generation](#geometry-generation)
3. [Model Loading Pipeline](#model-loading-pipeline)
4. [Material & Texture System](#material--texture-system)
5. [Camera System](#camera-system)
6. [Lighting System](#lighting-system)
7. [Object Manipulation](#object-manipulation)
8. [Performance Optimization](#performance-optimization)
9. [Common 3D Patterns](#common-3d-patterns)

---

## Scene Graph Overview

### Three.js Scene Hierarchy

The 3D scene follows a hierarchical structure managed by React Three Fiber (R3F):

```
WebGLRenderer (managed by R3F Canvas)
└── Scene (Three.js scene root)
    ├── Lights Group
    │   ├── AmbientLight (global illumination)
    │   └── DirectionalLight (sun/moon light)
    │
    ├── Grid (optional, toggleable)
    │
    ├── Ground Plane (invisible, for raycasting)
    │
    ├── Preview Group (during wall drawing)
    │   ├── Floor preview mesh
    │   ├── Wall preview meshes
    │   └── Dimension labels (HTML overlay)
    │
    ├── Rooms Group (all rooms on all floors)
    │   └── Room Group (per room, positioned at room center)
    │       ├── Floor Mesh (planeGeometry, rotated -90°)
    │       ├── Ceiling Mesh (planeGeometry at height Y)
    │       ├── Walls Group
    │       │   └── Wall Mesh (boxGeometry per wall)
    │       └── Furniture Group (positioned within room)
    │           └── Furniture Mesh (loaded glTF/GLB model)
    │
    └── Camera (PerspectiveCamera)
        └── OrbitControls (camera controller)
```

**Key Spatial Conventions:**
- **Coordinate System**: Right-handed (Y-up, X-right, Z-forward)
- **Units**: Meters (1 unit = 1 meter)
- **Room Positioning**: Rooms positioned by their center point (position_x, position_z)
- **Floor Height**: Y=0 (ground level)
- **Wall Height**: Typically 2.8m (configurable per room)

### Component File Structure

**Main 3D Components:**
- `Viewport3D.tsx` (1937 lines) - Canvas wrapper, Scene component, coordinate system
- `Scene` (functional component within Viewport3D) - Main 3D content orchestrator
- `RoomMesh` (functional component within Viewport3D) - Individual room rendering
- `FurnitureMesh` (functional component within Viewport3D) - Individual furniture rendering
- `WallMesh.tsx` (101 lines) - Individual wall segment rendering

**Canvas Configuration** (`Viewport3D.tsx:1797`):

```typescript
<Canvas
  camera={{
    position: [10, 10, 10],  // Isometric view (45° angle)
    fov: 50,                 // Field of view (degrees)
  }}
  style={{ width: '100%', height: '100%' }}
>
  <Scene />
</Canvas>
```

**OrbitControls** (inside Scene component):

```typescript
<OrbitControls
  ref={controlsRef}
  enableDamping={true}       // Smooth camera movement
  dampingFactor={0.05}       // Inertia strength
  minDistance={2}            // Closest zoom
  maxDistance={100}          // Farthest zoom
  maxPolarAngle={Math.PI / 2} // Prevent camera going below ground
/>
```

---

## Geometry Generation

All room geometry is **procedurally generated** from dimension data stored in the database. No pre-built models are used for architectural elements.

### Room Geometry

**Floor Mesh** (RoomMesh, lines 1029-1077):

```typescript
<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
  <planeGeometry args={[width, depth]} />
  <meshStandardMaterial
    color={getMaterialColor(room.floor_material)}
    roughness={getMaterialRoughness(room.floor_material)}
    transparent={!isCurrentFloor}
    opacity={isCurrentFloor ? 1.0 : 0.3}
  />
</mesh>
```

**Key Aspects:**
- **Geometry**: `PlaneGeometry` (flat 2D surface)
- **Rotation**: -90° around X axis (faces up)
- **Position**: Y=0.01 (slightly above ground to prevent z-fighting)
- **Size**: Dynamic `[width, depth]` from `room.dimensions_json`
- **Multi-Floor**: Opacity 0.3 for non-current floors

**Ceiling Mesh** (RoomMesh, lines 1080-1092):

```typescript
<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]}>
  <planeGeometry args={[width, depth]} />
  <meshStandardMaterial
    color={room.ceiling_color || '#f5f5f5'}
    roughness={0.9}
    side={THREE.DoubleSide}
  />
</mesh>
```

- **Position**: Y=height (e.g., 2.8m above floor)
- **DoubleSide**: Visible from above and below
- **Color**: Customizable per room

### Wall Geometry

**Wall Mesh** (WallMesh.tsx, lines 30-98):

Walls are generated from start/end points:

```typescript
// Calculate wall dimensions
const wallLength = Math.sqrt(
  Math.pow(endX - startX, 2) +
  Math.pow(endY - startY, 2)
);
const wallThickness = 0.15; // 15cm thick walls
const wallHeight = wall.height;

// Calculate center position and rotation
const centerX = (startX + endX) / 2;
const centerZ = (startY + endY) / 2;
const angle = Math.atan2(endY - startY, endX - startX);

<mesh
  position={[centerX, wallHeight / 2, centerZ]}
  rotation={[0, angle, 0]}
>
  <boxGeometry args={[wallLength, wallHeight, wallThickness]} />
  <meshStandardMaterial {...materialProps} />
</mesh>
```

**Wall Generation Process:**
1. **Input**: Start point (x1, y1), end point (x2, y2), height
2. **Length**: Calculated via distance formula
3. **Position**: Midpoint of start/end coordinates
4. **Rotation**: Angle calculated with `atan2` to align with points
5. **Geometry**: Box geometry (length × height × 0.15m)

### Irregular Room Shapes (L-Shapes, Polygons)

**Current Implementation**: Rectangular rooms only

**Planned Support**:
- `room.dimensions_json.vertices` array for custom polygons
- Wall generation from vertex pairs
- Floor generation via `ShapeGeometry` or triangulation

**Example Future Implementation**:

```typescript
if (room.dimensions_json.vertices) {
  // Custom shape
  const shape = new THREE.Shape();
  shape.moveTo(vertices[0].x, vertices[0].y);
  vertices.forEach(v => shape.lineTo(v.x, v.y));
  shape.closePath();

  <mesh rotation={[-Math.PI / 2, 0, 0]}>
    <shapeGeometry args={[shape]} />
    <meshStandardMaterial />
  </mesh>
} else {
  // Rectangular room (current implementation)
  <planeGeometry args={[width, depth]} />
}
```

---

## Model Loading Pipeline

### Current State: Placeholder Geometry

**Furniture is currently rendered as colored boxes** (FurnitureMesh, lines 1417-1434):

```typescript
<Box
  args={[width, height, depth]}
  position={[furniture.position_x, furniture.position_y + height / 2, furniture.position_z]}
>
  <meshStandardMaterial
    color={(() => {
      switch (furniture.category) {
        case 'seating': return '#8B4513'; // Brown
        case 'tables': return '#D2691E';  // Chocolate
        case 'storage': return '#A0522D'; // Sienna
        case 'beds': return '#F5DEB3';    // Wheat
        case 'lighting': return '#FFD700'; // Gold
        case 'decor': return '#9370DB';    // Purple
        case 'plants': return '#228B22';   // Forest Green
        default: return '#808080';         // Gray
      }
    })()}
  />
</Box>
```

**Why Placeholders?**
- Rapid prototyping and testing without model dependencies
- Performance testing with many objects
- Backend structure supports glTF/GLB paths (`assets.model_path`)

### Planned glTF/GLB Loading

**Implementation with R3F `useGLTF` Hook**:

```typescript
import { useGLTF } from '@react-three/drei';

function FurnitureMesh({ furniture }) {
  // Load model from path
  const { scene } = useGLTF(furniture.model_path);

  return (
    <primitive
      object={scene.clone()} // Clone for multiple instances
      position={[furniture.position_x, furniture.position_y, furniture.position_z]}
      rotation={[furniture.rotation_x, furniture.rotation_y, furniture.rotation_z]}
      scale={[furniture.scale_x, furniture.scale_y, furniture.scale_z]}
    />
  );
}

// Preload models for better performance
useGLTF.preload('/models/sofa.glb');
```

**Model Caching**:
- `useGLTF` automatically caches loaded models
- Multiple instances reference the same geometry/materials (memory efficient)
- Manual preloading with `useGLTF.preload()` for critical assets

### Draco Compression Support

**Draco** reduces glTF file size by 75-90% through mesh compression.

**Backend Implementation** (recommended):

```javascript
// backend/src/services/modelOptimizer.js
import draco3dgltf from 'draco3dgltf';

async function compressModel(inputPath, outputPath) {
  await draco3dgltf.encode({
    input: inputPath,
    output: outputPath,
    compressionLevel: 10, // 0-10, higher = smaller but slower
  });
}
```

**Frontend Loading**:

```typescript
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/'); // WASM decoder files

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// useGLTF will use this loader automatically if configured
```

---

## Material & Texture System

### PBR Material System

The app uses **Physically Based Rendering (PBR)** via `meshStandardMaterial`:

**PBR Properties**:
- **Color**: Base color (diffuse)
- **Roughness**: Surface microsurface detail (0=mirror, 1=matte)
- **Metalness**: Metallic vs dielectric (0=non-metal, 1=metal)
- **Emissive**: Self-illumination (selection highlights)
- **Opacity/Transparent**: For translucent floors on non-current levels

### Floor Materials

**Material Presets** (RoomMesh, lines 1037-1073):

```typescript
const getMaterialColor = (material: string) => {
  switch (material) {
    case 'hardwood': return '#8B4513'; // Brown wood
    case 'tile': return '#E8E8E8';     // Light gray
    case 'carpet': return '#A0522D';   // Sienna
    case 'marble': return '#F5F5F5';   // White marble
    case 'laminate': return '#D2691E'; // Chocolate
    case 'concrete': return '#808080'; // Gray
    default: return '#d1d5db';
  }
};

const getMaterialRoughness = (material: string) => {
  switch (material) {
    case 'marble':
    case 'tile': return 0.2;      // Smooth, shiny
    case 'concrete': return 0.8;  // Rough
    case 'carpet': return 0.9;    // Very rough
    case 'hardwood':
    case 'laminate': return 0.4;  // Semi-gloss
    default: return 0.5;
  }
};
```

**Application**:
- Stored in database: `rooms.floor_material` and `rooms.floor_color`
- Applied per-room (each room can have different floor)
- Custom colors override preset colors

### Wall Materials

**Wall Material Presets** (WallMesh.tsx, lines 58-78):

```typescript
const getMaterialProps = () => {
  switch (wallMaterial) {
    case 'brick':
      return { color: '#8B4513', roughness: 0.9, metalness: 0.1 };
    case 'wood_panel':
      return { color: '#A0522D', roughness: 0.7, metalness: 0.0 };
    case 'tile':
      return { color: '#F5F5DC', roughness: 0.3, metalness: 0.2 };
    case 'concrete':
      return { color: '#808080', roughness: 0.95, metalness: 0.0 };
    case 'marble':
      return { color: '#F8F8FF', roughness: 0.2, metalness: 0.3 };
    case 'paint':
    default:
      return { color: wallColor, roughness: 0.8, metalness: 0.0 };
  }
};
```

**Per-Wall Customization**:
- Each wall segment can have unique material/color
- Stored in `walls` table: `material`, `color`, `texture_path`

### Texture Loading (Planned)

**Custom Texture Upload Flow**:

1. **Upload**: User uploads image → Backend saves to `/assets/textures/`
2. **Database**: Path stored in `walls.texture_path` or `rooms.floor_texture_path`
3. **Frontend**: Load texture with `useTexture` hook:

```typescript
import { useTexture } from '@react-three/drei';

function FloorWithTexture({ texturePath }) {
  const texture = useTexture(texturePath);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); // Tile texture 4x4 times

  return (
    <mesh>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texture} roughness={0.8} />
    </mesh>
  );
}
```

**Texture Compression (KTX2/Basis Universal)**:
- Reduces texture memory by 75%
- GPU-compressed format (faster rendering)
- Requires backend preprocessing with `basisu` tool

---

## Camera System

### Isometric Orbit Camera (Default)

**OrbitControls Configuration** (Scene component):

```typescript
<OrbitControls
  ref={controlsRef}
  enableDamping={true}              // Smooth inertia
  dampingFactor={0.05}              // How quickly camera slows
  screenSpacePanning={false}        // Pan in world space (not screen)
  minDistance={2}                   // Closest zoom
  maxDistance={100}                 // Farthest zoom
  maxPolarAngle={Math.PI / 2}       // Prevent camera from going below floor
  target={[0, 0, 0]}                // Look-at point (updated dynamically)
/>
```

**Default Camera Position**: `[10, 10, 10]` (isometric-style view)

**User Interactions**:
- **Left Mouse Drag**: Orbit around target
- **Right Mouse Drag** / **Middle Mouse Drag**: Pan (translate camera)
- **Scroll Wheel**: Zoom in/out

### Camera Position Memory (Per Floor)

**Feature**: When switching floors, camera position is restored.

**Implementation** (Scene component, lines 273-307):

```typescript
// Save camera position every 1 second
useEffect(() => {
  if (!currentFloorId || !controlsRef.current) return;

  const saveInterval = setInterval(() => {
    const position: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    const target: [number, number, number] = [
      controlsRef.current.target.x,
      controlsRef.current.target.y,
      controlsRef.current.target.z,
    ];
    setCameraPosition(currentFloorId, { position, target });
  }, 1000);

  return () => clearInterval(saveInterval);
}, [currentFloorId]);

// Restore camera position on floor change
useEffect(() => {
  if (!currentFloorId || !controlsRef.current) return;

  const savedPosition = cameraPositions[currentFloorId];
  if (savedPosition) {
    camera.position.set(...savedPosition.position);
    controlsRef.current.target.set(...savedPosition.target);
    controlsRef.current.update();
  }
}, [currentFloorId]);
```

**Storage**: Zustand store (`editorStore.cameraPositions` - in-memory, not persisted)

### First-Person Camera (Planned)

**Implementation Strategy**:

1. **PointerLockControls**: Lock mouse cursor, WASD movement
2. **Camera Mode Toggle**: Switch between Orbit and FPS
3. **Collision Detection**: Prevent walking through walls

**Example Implementation**:

```typescript
import { PointerLockControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function FirstPersonCamera() {
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const keys = useRef({ w: false, a: false, s: false, d: false });

  useFrame((state, delta) => {
    const camera = state.camera;
    const speed = 5; // meters per second

    // Calculate movement direction
    direction.current.set(
      Number(keys.current.d) - Number(keys.current.a),
      0,
      Number(keys.current.s) - Number(keys.current.w)
    );
    direction.current.normalize();

    // Apply movement
    camera.position.addScaledVector(direction.current, speed * delta);
  });

  return <PointerLockControls />;
}
```

---

## Lighting System

### Ambient Lighting

**Purpose**: Global illumination - prevents completely dark shadows

```typescript
<ambientLight intensity={ambientIntensity} />
```

- **Day Mode**: `intensity = 0.5`
- **Night Mode**: `intensity = 0.15`

### Directional Lighting

**Purpose**: Simulates sun/moon light (parallel rays)

```typescript
<directionalLight
  position={[10, 10, 5]}
  intensity={directionalIntensity}
/>
```

- **Day Mode**: `intensity = 0.8`
- **Night Mode**: `intensity = 0.3`
- **Position**: 45° angle from above (simulates sunlight)

**Shadow Configuration** (planned):

```typescript
<directionalLight
  castShadow
  shadow-mapSize={[2048, 2048]}   // Shadow resolution
  shadow-camera-far={50}
  shadow-camera-left={-20}
  shadow-camera-right={20}
  shadow-camera-top={20}
  shadow-camera-bottom={-20}
/>
```

### Day/Night Cycle

**Smooth Animated Transition** (Scene component, lines 243-271):

```typescript
useEffect(() => {
  const targetAmbient = lightingMode === 'day' ? 0.5 : 0.15;
  const targetDirectional = lightingMode === 'day' ? 0.8 : 0.3;

  const startAmbient = ambientIntensity;
  const startDirectional = directionalIntensity;
  const duration = 800; // 800ms transition
  const startTime = performance.now();

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease in-out cubic easing
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    setAmbientIntensity(startAmbient + (targetAmbient - startAmbient) * eased);
    setDirectionalIntensity(startDirectional + (targetDirectional - startDirectional) * eased);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
}, [lightingMode]);
```

**Easing Function**: Cubic ease-in-out for smooth, natural lighting transitions

### Point/Spot Lights (Planned)

**Placed Light Objects**:

```typescript
// Backend: lights table
{
  type: 'floor_lamp' | 'ceiling' | 'wall_sconce' | 'table_lamp' | 'pendant',
  position_x, position_y, position_z,
  intensity, color, cone_angle
}

// Frontend rendering
<pointLight
  position={[light.position_x, light.position_y, light.position_z]}
  intensity={light.intensity}
  color={light.color}
  distance={10} // Light range
  decay={2}     // Physical falloff
/>
```

### Natural Window Light (Planned)

**Implementation**:
- `RectAreaLight` positioned at window locations
- Intensity affected by day/night mode
- Simulates outdoor light streaming through windows

---

## Object Manipulation

### Raycasting for Selection

**Raycasting** converts 2D mouse clicks to 3D object intersections.

**How It Works** (Viewport3D, lines 209-234):

```typescript
// Convert screen position to normalized device coordinates (NDC)
const x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
const y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

// Create raycaster from camera through mouse position
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

// Raycast against ground plane for drop position
const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMesh = new THREE.Mesh(planeGeometry);
planeMesh.rotation.x = -Math.PI / 2; // Face up
planeMesh.updateMatrixWorld();

const intersects = raycaster.intersectObject(planeMesh);
if (intersects.length > 0) {
  const point = intersects[0].point; // 3D position: { x, y, z }
  // Use position to place furniture
}
```

**Usage**:
- **Click Selection**: Detect which furniture/room was clicked
- **Drop Placement**: Calculate 3D position for drag-and-drop from 2D library
- **Wall Drawing**: Convert mouse drag to 3D rectangle dimensions

### Drag-and-Drop from Library to 3D Scene

**Flow** (AssetLibrary → Viewport3D → Scene):

1. **AssetLibrary**: User drags asset → `setDraggingAsset(asset)`
2. **Viewport3D**: `onDrop` event → Calculate screen coordinates
3. **Event Dispatch**: `window.dispatchEvent('dropFurniture', { asset, position })`
4. **Scene**: Listen to event → Raycast to find 3D position → Place furniture

**Raycasting for Drop** (Scene, lines 200-235):

```typescript
const handleDropFurnitureEvent = (event) => {
  const { asset, screenPosition, canvasRect } = event.detail;

  // Convert to NDC
  const x = ((screenPosition.x - canvasRect.left) / canvasRect.width) * 2 - 1;
  const y = -((screenPosition.y - canvasRect.top) / canvasRect.height) * 2 + 1;

  // Raycast to ground
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const intersects = raycaster.intersectObject(groundPlane);

  if (intersects.length > 0) {
    placeFurniture(asset, intersects[0].point);
  }
};
```

### Object Dragging in 3D

**FurnitureMesh Drag Handlers** (lines 1256-1339):

```typescript
const handlePointerMove = (e) => {
  if (!isDragging) return;

  // Get intersection with ground plane
  const groundIntersection = e.intersections.find(
    i => i.object.userData?.isGround
  );

  if (groundIntersection) {
    let newX = groundIntersection.point.x;
    let newZ = groundIntersection.point.z;

    // Apply snap-to-wall logic (Feature #36)
    const room = rooms.find(r => r.id === furniture.room_id);
    if (room) {
      const snapResult = checkWallSnap(newX, newZ, room);
      if (snapResult) {
        newX = snapResult.x;
        newZ = snapResult.z;
        newRotationY = snapResult.rotation;
      }
    }

    // Update position immediately (optimistic UI)
    groupRef.current.position.set(newX, furniture.position_y, newZ);
    updateFurniturePlacement(furniture.id, { position_x: newX, position_z: newZ });
  }
};

const handlePointerUp = async () => {
  // Save to backend
  await furnitureApi.update(furniture.id, {
    position_x: furniture.position_x,
    position_z: furniture.position_z,
  });

  // Add to undo history
  addAction({
    type: 'furniture_move',
    data: { furnitureId, previousPosition, newPosition }
  });
};
```

### Snap-to-Grid (Planned)

**Implementation**:

```typescript
function snapToGrid(value: number, gridSize: number = 0.5): number {
  return Math.round(value / gridSize) * gridSize;
}

// In drag handler:
const snappedX = snapToGrid(newX, 0.5); // Snap to 0.5m grid
const snappedZ = snapToGrid(newZ, 0.5);
```

### Snap-to-Wall

**Feature #36 Implementation** (FurnitureMesh, lines 1269-1321):

```typescript
// Calculate wall positions
const walls = {
  north: { z: roomZ + roomDepth / 2, rotation: Math.PI },
  south: { z: roomZ - roomDepth / 2, rotation: 0 },
  east: { x: roomX + roomWidth / 2, rotation: -Math.PI / 2 },
  west: { x: roomX - roomWidth / 2, rotation: Math.PI / 2 },
};

const snapDistance = 0.5; // Snap within 0.5m of wall
const wallOffset = depth / 2 + 0.05; // 5cm gap from wall

// Find closest wall
const distances = {
  north: Math.abs(newZ - walls.north.z),
  south: Math.abs(newZ - walls.south.z),
  east: Math.abs(newX - walls.east.x),
  west: Math.abs(newX - walls.west.x),
};

const closestWall = Object.keys(distances).reduce((a, b) =>
  distances[a] < distances[b] ? a : b
);

if (distances[closestWall] < snapDistance) {
  // Snap to wall and rotate to face room center
  newZ = walls[closestWall].z - wallOffset;
  newRotationY = walls[closestWall].rotation;
}
```

**Visual Feedback**: Snapped furniture highlighted with green indicator

---

## Performance Optimization

### Current Performance

**Benchmarks** (tested on mid-range hardware):
- **Empty scene**: 60fps
- **10 rooms + 50 furniture**: 55-60fps
- **100 furniture items**: 45-55fps

**Bottlenecks**:
- Each furniture piece = separate draw call
- No geometry instancing
- No LOD (Level of Detail)
- Continuous rendering (even when idle)

### Render Quality Levels (Planned)

**Quality Settings**:

```typescript
const renderQuality = {
  low: {
    antialias: false,
    shadowMapSize: 512,
    pixelRatio: 1,
    maxLights: 5,
  },
  medium: {
    antialias: true,
    shadowMapSize: 1024,
    pixelRatio: window.devicePixelRatio > 1 ? 1.5 : 1,
    maxLights: 10,
  },
  high: {
    antialias: true,
    shadowMapSize: 2048,
    pixelRatio: window.devicePixelRatio,
    maxLights: 20,
  },
  ultra: {
    antialias: true,
    shadowMapSize: 4096,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    maxLights: 50,
  },
};

<Canvas
  gl={{
    antialias: quality.antialias,
    powerPreference: "high-performance",
  }}
  dpr={quality.pixelRatio}
  shadows={quality.shadowMapSize > 0}
/>
```

### Level of Detail (LOD)

**Strategy**: Render lower-poly models when far from camera

```typescript
import { Lod } from '@react-three/drei';

function FurnitureMeshWithLOD({ furniture }) {
  return (
    <Lod distances={[0, 5, 15]}>
      {/* Distance 0-5m: High detail */}
      <HighPolyModel model={furniture.model_path} />

      {/* Distance 5-15m: Medium detail */}
      <MediumPolyModel model={furniture.model_path_lod1} />

      {/* Distance 15m+: Low detail (box proxy) */}
      <Box args={[furniture.width, furniture.height, furniture.depth]}>
        <meshBasicMaterial color="#808080" />
      </Box>
    </Lod>
  );
}
```

**Backend**: Generate LOD models during upload with tools like `gltfpack`

### Instanced Rendering

**For Repeated Objects** (e.g., 50 identical chairs):

```typescript
import { Instances, Instance } from '@react-three/drei';

<Instances geometry={chairGeometry} material={chairMaterial}>
  {chairs.map(chair => (
    <Instance
      key={chair.id}
      position={[chair.position_x, chair.position_y, chair.position_z]}
      rotation={[chair.rotation_x, chair.rotation_y, chair.rotation_z]}
    />
  ))}
</Instances>
```

**Benefits**:
- Single draw call for all instances
- 10-100x performance improvement for repeated objects

### Frustum Culling

**Automatic**: Three.js only renders objects visible to the camera.

**Manual Optimization** (skip render logic for off-screen objects):

```typescript
const isVisible = useRef(true);

useFrame(({ camera }) => {
  // Check if object is in camera frustum
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
  );

  isVisible.current = frustum.intersectsObject(groupRef.current);
});

if (!isVisible.current) return null; // Skip expensive logic
```

### On-Demand Rendering

**Problem**: Continuous rendering wastes GPU when scene is static

**Solution**: Render only when scene changes

```typescript
<Canvas frameloop="demand">
  <Scene />
</Canvas>

// In components, request render when state changes
const invalidate = useThree((state) => state.invalidate);

useEffect(() => {
  invalidate(); // Request single frame render
}, [furniture.position_x, furniture.position_z]);
```

**Trade-off**: OrbitControls need continuous rendering for smooth dragging. Solution: Enable continuous rendering only when controls are active.

---

## Common 3D Patterns

### Adding a New Type of 3D Object

**Example: Adding Windows**

1. **Database Schema** (already exists):

```sql
CREATE TABLE windows (
  id INTEGER PRIMARY KEY,
  wall_id INTEGER,
  position_along_wall REAL,
  height_from_floor REAL,
  width REAL,
  height REAL,
  style TEXT
);
```

2. **Backend API**: Fetch windows with rooms

```javascript
// backend/src/routes/rooms.js
router.get('/:roomId/windows', async (req, res) => {
  const windows = db.prepare(
    'SELECT * FROM windows WHERE wall_id IN (SELECT id FROM walls WHERE room_id = ?)'
  ).all(req.params.roomId);
  res.json({ windows });
});
```

3. **Frontend Zustand Store**: Add windows state

```typescript
// editorStore.ts
windows: Window[];
setWindows: (windows: Window[]) => void;
```

4. **3D Component**: `WindowMesh.tsx`

```typescript
function WindowMesh({ window, wall }) {
  // Calculate position along wall
  const wallLength = calculateWallLength(wall);
  const positionRatio = window.position_along_wall / wallLength;

  return (
    <group position={calculateWindowPosition(wall, positionRatio)}>
      {/* Window frame */}
      <Box args={[window.width, window.height, 0.05]}>
        <meshStandardMaterial color="#8B4513" /> {/* Wood frame */}
      </Box>

      {/* Glass pane */}
      <Box args={[window.width - 0.1, window.height - 0.1, 0.02]}>
        <meshPhysicalMaterial
          color="#87CEEB"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.1}
        />
      </Box>
    </group>
  );
}
```

5. **Render in Scene**:

```typescript
{windows.map(window => (
  <WindowMesh key={window.id} window={window} wall={getWall(window.wall_id)} />
))}
```

### Modifying Room Rendering

**Example: Add Baseboards (Trim at Floor-Wall Junction)**

```typescript
function RoomMesh({ room }) {
  const baseboardHeight = 0.1; // 10cm tall

  return (
    <group>
      {/* Existing floor, ceiling, walls */}

      {/* Baseboards (boxes along bottom of each wall) */}
      {walls.map(wall => (
        <mesh
          key={`baseboard-${wall.id}`}
          position={calculateBaseboardPosition(wall)}
          rotation={calculateBaseboardRotation(wall)}
        >
          <boxGeometry args={[wall.length, baseboardHeight, 0.05]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}
    </group>
  );
}
```

### Adding New Material Types

**Example: Add "Vinyl" Floor Material**

1. **Update Material Preset** (RoomMesh):

```typescript
case 'vinyl':
  return {
    color: '#F0E68C',   // Khaki
    roughness: 0.3,
    metalness: 0.1
  };
```

2. **Update Database Enum** (if enforced):

```sql
-- backend/src/db/schema.sql
-- floor_material: 'hardwood'|'tile'|'carpet'|'marble'|'laminate'|'concrete'|'vinyl'
```

3. **Update Frontend UI** (PropertiesPanel):

```typescript
<select value={room.floor_material} onChange={handleMaterialChange}>
  <option value="hardwood">Hardwood</option>
  <option value="tile">Tile</option>
  <option value="vinyl">Vinyl</option>
  {/* ... */}
</select>
```

### R3F-Specific Gotchas

#### 1. **Re-Render Triggers**

R3F components re-render when props change, just like React. **Be careful with object references**:

```typescript
// ❌ Bad: Creates new array every render (infinite loop)
const position = [furniture.x, furniture.y, furniture.z];
<mesh position={position} />

// ✅ Good: Use primitive values
<mesh position={[furniture.x, furniture.y, furniture.z]} />

// ✅ Or memoize
const position = useMemo(
  () => [furniture.x, furniture.y, furniture.z],
  [furniture.x, furniture.y, furniture.z]
);
```

#### 2. **Disposal (Memory Management)**

Three.js objects must be **manually disposed** to prevent memory leaks:

```typescript
useEffect(() => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial();

  return () => {
    geometry.dispose();
    material.dispose();
  };
}, []);

// ✅ R3F auto-disposes JSX-created objects:
<boxGeometry args={[1, 1, 1]} /> // Automatically disposed on unmount
```

**Rule**: If you use `new THREE.*()`, you must `dispose()`.

#### 3. **Accessing Three.js Objects**

Use `ref` to access underlying Three.js objects:

```typescript
const meshRef = useRef<THREE.Mesh>(null);

useEffect(() => {
  if (meshRef.current) {
    console.log(meshRef.current.geometry); // Three.js Mesh object
  }
}, []);

<mesh ref={meshRef}>
  <boxGeometry />
</mesh>
```

#### 4. **`useFrame` Performance**

Runs **every frame** (60fps). **Avoid expensive operations**:

```typescript
// ❌ Bad: API call every frame
useFrame(() => {
  fetchData(); // 60 calls per second!
});

// ✅ Good: Only update local state
useFrame((state, delta) => {
  meshRef.current.rotation.y += delta * 0.5;
});
```

#### 5. **Event Propagation**

R3F events bubble up the scene graph. **Use `stopPropagation()`**:

```typescript
<group onClick={(e) => {
  e.stopPropagation(); // Prevent parent from receiving click
  selectRoom();
}}>
  <mesh onClick={(e) => {
    e.stopPropagation();
    selectFurniture();
  }}>
  </mesh>
</group>
```

---

## Summary

### Architectural Highlights

1. **Procedural Geometry**: All architectural elements generated from dimension data
2. **PBR Materials**: Physically accurate lighting and material rendering
3. **Raycasting**: Accurate 2D→3D coordinate conversion for all interactions
4. **Modular Components**: RoomMesh, FurnitureMesh, WallMesh - composable and reusable
5. **Smooth Transitions**: Animated lighting, camera movements, multi-floor opacity

### Performance Characteristics

- **Current**: 60fps with moderate complexity (10 rooms, 50 objects)
- **Optimization Potential**: LOD, instancing, on-demand rendering not yet implemented
- **Scalability**: Should handle 20+ rooms and 200+ objects at 30fps with optimizations

### Future Enhancements

1. **glTF/GLB Model Loading**: Replace placeholder boxes with real 3D models
2. **Draco Compression**: Reduce model sizes by 75-90%
3. **LOD System**: Dynamic quality based on camera distance
4. **Instancing**: Efficiently render repeated furniture
5. **First-Person Mode**: PointerLockControls + WASD movement
6. **Shadows**: Directional light shadow mapping
7. **Texture System**: Custom wall/floor textures
8. **Natural Lighting**: Window-based light sources
9. **Performance Mode**: Quality presets for low-end hardware
10. **On-Demand Rendering**: Render only when scene changes
