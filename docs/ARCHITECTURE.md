# System Architecture & Data Flow

This document describes the architecture of Home Designer, a self-hosted 3D interior design application. It explains how the major components interact, how data flows through the system, and the design decisions behind the architecture.

## Table of Contents

- [System Overview](#system-overview)
- [Request Lifecycle](#request-lifecycle)
- [3D Rendering Pipeline](#3d-rendering-pipeline)
- [AI Generation Pipeline](#ai-generation-pipeline)
- [State Management Architecture](#state-management-architecture)
- [Data Persistence](#data-persistence)
- [File Storage Architecture](#file-storage-architecture)
- [Key User Journeys](#key-user-journeys)
  - [Room Creation Flow](#room-creation-flow)
  - [Furniture Placement Flow](#furniture-placement-flow)
  - [AI Model Generation Flow](#ai-model-generation-flow)
  - [Project Save/Load Flow](#project-saveload-flow)
- [Design Decisions](#design-decisions)

---

## System Overview

Home Designer follows a client-server architecture with a clear separation of concerns between the frontend (presentation & 3D rendering), backend (API & business logic), database (persistence), and file storage.

```mermaid
graph TB
    subgraph "Client Browser"
        FE[React Frontend<br/>Port 5173]
        R3F[React Three Fiber<br/>3D Rendering Engine]
        Store[Zustand Store<br/>State Management]
    end

    subgraph "Backend Server"
        API[Express API<br/>Port 5000]
        Routes[API Routes<br/>projects, assets, rooms, etc.]
        Services[Business Logic<br/>Validation, Processing]
    end

    subgraph "Data Layer"
        DB[(SQLite Database<br/>database.db)]
        FS[File Storage<br/>assets/models, textures, thumbnails]
    end

    subgraph "External Services"
        TRELLIS[Microsoft TRELLIS API<br/>Image-to-3D Generation]
    end

    FE -->|HTTP Requests| API
    API -->|JSON Responses| FE
    FE <-->|State Updates| Store
    FE <-->|Scene Graph| R3F

    API -->|SQL Queries| DB
    DB -->|Query Results| API

    API -->|Read/Write Files| FS
    FS -->|File Paths| API

    API -->|Upload Image| TRELLIS
    TRELLIS -->|3D Model| API

    R3F -->|Load Models| FS

    style FE fill:#4f46e5,color:#fff
    style API fill:#059669,color:#fff
    style DB fill:#dc2626,color:#fff
    style FS fill:#ca8a04,color:#fff
    style TRELLIS fill:#7c3aed,color:#fff
```

### Component Responsibilities

- **React Frontend**: User interface, 3D visualization, user interactions, client-side state
- **React Three Fiber**: 3D scene graph management, camera controls, lighting, model rendering
- **Zustand Store**: Global state for editor (tools, selections, floors, rooms, furniture, undo/redo)
- **Express API**: RESTful endpoints, request validation, database access, file management
- **SQLite Database**: Persistent storage for projects, rooms, furniture placements, settings
- **File Storage**: Physical storage for 3D models (glTF/GLB), textures, thumbnails, uploads
- **TRELLIS API**: AI-powered image-to-3D model generation

---

## Request Lifecycle

This diagram shows the complete lifecycle of a typical user action, from clicking a button in the UI through state updates, API calls, database queries, and back to the UI.

```mermaid
sequenceDiagram
    participant User
    participant Component as React Component
    participant Store as Zustand Store
    participant API as API Client (lib/api.ts)
    participant Express as Express Server
    participant Route as Route Handler
    participant DB as SQLite Database

    User->>Component: Click "Add Furniture"
    Component->>API: furnitureApi.create(roomId, data)

    API->>API: fetchWithErrorHandling()
    API->>Express: POST /api/rooms/:roomId/furniture

    Express->>Route: furniture.js router
    Route->>DB: INSERT INTO furniture_placements
    DB-->>Route: {id: 123, ...placementData}

    Route->>DB: saveDatabase() - persist to disk
    Route-->>Express: {furniture: {...}}
    Express-->>API: HTTP 201 Created

    API-->>Component: {furniture: {...}}
    Component->>Store: addFurniturePlacement(furniture)
    Store->>Store: Update furniturePlacements array

    Store-->>Component: State change notification
    Component->>Component: Re-render with new furniture
    Component->>User: Furniture appears in 3D scene

    Note over Store,Component: Zustand subscriptions trigger automatic re-renders
```

### Error Handling

The API client (`frontend/src/lib/api.ts`) includes comprehensive error handling:

- **Network Errors**: Detects when backend is unreachable (connection refused, DNS failures)
- **Timeout Errors**: 30-second timeout for all requests with automatic AbortController cleanup
- **HTTP Errors**: User-friendly messages for 404, 500, 503 status codes
- **Validation Errors**: Server-side validation with detailed error messages

Example error flow:
```
User Action → API Call → Network Failure → ApiError thrown →
Toast notification with user-friendly message
```

---

## 3D Rendering Pipeline

Home Designer uses **React Three Fiber** (R3F), a React renderer for Three.js. This provides declarative, component-based 3D scene management with automatic updates when state changes.

```mermaid
graph TD
    subgraph "React Component Tree"
        Editor[Editor.tsx<br/>Root Container]
        Viewport[Viewport3D.tsx<br/>3D Canvas]
        Canvas[Canvas Component<br/>R3F Root]
    end

    subgraph "Scene Graph"
        Scene[Scene<br/>Container]
        Camera[Camera<br/>OrbitControls/FirstPerson]
        Lights[Lighting<br/>Ambient, Directional, Point]
        Grid[Grid Helper<br/>Floor Grid]

        Scene --> Rooms
        Scene --> Furniture
        Scene --> Walls
    end

    subgraph "Room Rendering"
        Rooms[Room Components]
        Floor[Floor Mesh<br/>PlaneGeometry]
        Ceiling[Ceiling Mesh<br/>PlaneGeometry]
        WallMeshes[Wall Meshes<br/>BoxGeometry]
    end

    subgraph "Furniture Rendering"
        Furniture[Furniture Placements]
        FLoader[GLTFLoader<br/>Load .glb models]
        FMesh[Furniture Mesh<br/>Loaded Geometry]
        Gizmo[TransformControls<br/>Move/Rotate/Scale]
    end

    subgraph "Material System"
        Materials[Material Library]
        Colors[Color Materials<br/>MeshStandardMaterial]
        Textures[Texture Materials<br/>TextureLoader + Material]
    end

    Editor --> Viewport
    Viewport --> Canvas
    Canvas --> Scene
    Canvas --> Camera
    Canvas --> Lights
    Canvas --> Grid

    Rooms --> Floor
    Rooms --> Ceiling
    Rooms --> WallMeshes

    Furniture --> FLoader
    FLoader --> FMesh
    FMesh --> Gizmo

    Floor --> Materials
    Ceiling --> Materials
    WallMeshes --> Materials
    FMesh --> Materials

    Materials --> Colors
    Materials --> Textures

    style Canvas fill:#4f46e5,color:#fff
    style Scene fill:#059669,color:#fff
    style FLoader fill:#dc2626,color:#fff
    style Materials fill:#ca8a04,color:#fff
```

### Rendering Process

1. **Component Mount**: `Viewport3D.tsx` renders R3F `<Canvas>` component
2. **Scene Setup**: Camera, lights, and grid are added to scene
3. **Data Loading**: Rooms and furniture placements loaded from Zustand store
4. **Mesh Creation**:
   - Rooms create floor, ceiling, and wall meshes with `BoxGeometry` and `PlaneGeometry`
   - Furniture components use `GLTFLoader` to load `.glb` model files asynchronously
5. **Material Application**: Materials (colors or textures) applied via `MeshStandardMaterial`
6. **Transform Controls**: When furniture is selected, `TransformControls` gizmo appears for manipulation
7. **Reactive Updates**: When store state changes (e.g., furniture moves), components automatically re-render

### Performance Optimizations

- **Level of Detail (LOD)**: Planned feature for complex models (not yet implemented)
- **Draco Compression**: Model compression for faster loading (referenced in README)
- **Lazy Loading**: Furniture models loaded on-demand, not all at once
- **Instance Reuse**: Multiple instances of same furniture share the same loaded geometry

### Camera Modes

- **Isometric/Orbit**: Default mode using R3F `OrbitControls` for rotating around scene
- **First-Person**: Planned feature for walking through rooms (referenced in README)
- **Per-Floor Memory**: Camera position stored per floor in Zustand store (`cameraPositions` map)

---

## AI Generation Pipeline

Home Designer integrates with **Microsoft TRELLIS** for AI-powered image-to-3D model generation. Users can upload a photo of furniture or a room, and the system generates a 3D model.

```mermaid
sequenceDiagram
    participant User
    participant Modal as AIGenerationModal
    participant API as AI API Client
    participant Express as Express Server
    participant Multer as Multer Upload
    participant FS as File System
    participant Settings as Settings Table
    participant TRELLIS as TRELLIS API
    participant DB as ai_generations Table

    User->>Modal: Upload furniture photo
    Modal->>API: POST /api/ai/generate-furniture

    API->>Express: FormData with image file
    Express->>Multer: Process upload
    Multer->>FS: Save to assets/uploads/photo-*.jpg
    FS-->>Multer: File path

    Express->>Settings: Get TRELLIS API key (encrypted)
    Settings-->>Express: Decrypted API key

    Express->>DB: INSERT ai_generation (status: pending)
    DB-->>Express: {id: 42, status: pending}

    Express->>TRELLIS: POST /generate (image + API key)
    TRELLIS-->>Express: {job_id: "xyz123"}

    Express->>DB: UPDATE status = processing
    Express-->>API: {generationId: 42, status: processing}

    Note over Modal,API: Frontend polls for completion

    loop Poll every 5 seconds
        Modal->>API: GET /api/ai/generation/42
        API->>Express: GET /api/ai/generation/:id
        Express->>DB: SELECT * FROM ai_generations WHERE id = 42
        DB-->>Express: {status: processing}
        Express-->>API: {status: processing}
        API-->>Modal: Still processing...
    end

    TRELLIS->>TRELLIS: Generate 3D model
    TRELLIS-->>Express: Webhook or poll result

    Express->>TRELLIS: GET /result/xyz123
    TRELLIS-->>Express: 3D model file (.glb)

    Express->>FS: Save to assets/models/generated-*.glb
    Express->>DB: UPDATE status = completed, output_model_path

    Modal->>API: GET /api/ai/generation/42
    Express->>DB: SELECT * FROM ai_generations WHERE id = 42
    DB-->>Express: {status: completed, output_model_path}
    Express-->>API: {status: completed, modelPath: "..."}
    API-->>Modal: Generation complete!

    Modal->>User: Show success, add to scene button
    User->>Modal: Add to scene
    Modal->>API: POST /api/assets (create asset from generated model)
    Modal->>API: POST /api/rooms/:id/furniture (place in room)
```

### AI Generation States

The `ai_generations` table tracks generation status:

- **`pending`**: Job created, waiting to send to TRELLIS
- **`processing`**: Sent to TRELLIS API, awaiting completion
- **`completed`**: Model generated successfully, saved to file system
- **`failed`**: Generation failed (timeout, API error, invalid image, etc.)

### API Key Security

- API keys stored in `user_settings` table with `encrypted = 1` flag
- Encrypted using AES-256-CBC with IV (Initialization Vector)
- Encryption key from `process.env.ENCRYPTION_KEY` or default fallback
- Decryption happens server-side only, never sent to frontend
- Keys configurable via Settings modal in UI

### File Management

- **Input Images**: Stored in `assets/uploads/photo-{timestamp}-{random}.{ext}`
- **Output Models**: Stored in `assets/models/generated-{timestamp}.glb`
- **Thumbnails**: Auto-generated via screenshot or placeholder (planned feature)
- **Cleanup**: Old failed generations can be cleaned up periodically

---

## State Management Architecture

Home Designer uses **Zustand** for state management. Zustand is a lightweight alternative to Redux, providing a simple hook-based API with minimal boilerplate.

```mermaid
graph TB
    subgraph "Zustand Store (editorStore.ts)"
        Store[Editor Store]

        subgraph "Editor State"
            Tool[currentTool: EditorTool]
            Grid[gridVisible: boolean]
            Light[lightingMode: day/night]
        end

        subgraph "Project & Floors"
            Project[projectId: number]
            Floors[floors: Floor array]
            CurrentFloor[currentFloorId: number]
            CameraPos[cameraPositions: Record]
        end

        subgraph "Scene Objects"
            Rooms[rooms: Room array]
            Furniture[furniturePlacements: array]
            Drag[draggingAsset: Asset]
        end

        subgraph "Selections"
            SelRoom[selectedRoomId: number]
            SelFurniture[selectedFurnitureId: number]
            SelWall[selectedWallId: number]
            SelMulti[selectedFurnitureIds: array]
        end

        subgraph "History (Undo/Redo)"
            History[history: HistoryAction array]
            Index[historyIndex: number]
            Actions[Action types:<br/>furniture_add, furniture_remove,<br/>furniture_move, room_add]
        end

        Store --> Tool
        Store --> Grid
        Store --> Light
        Store --> Project
        Store --> Floors
        Store --> CurrentFloor
        Store --> CameraPos
        Store --> Rooms
        Store --> Furniture
        Store --> Drag
        Store --> SelRoom
        Store --> SelFurniture
        Store --> SelWall
        Store --> SelMulti
        Store --> History
        Store --> Index
        Store --> Actions
    end

    subgraph "React Components"
        Editor[Editor.tsx]
        Viewport[Viewport3D.tsx]
        Props[PropertiesPanel.tsx]
        Library[AssetLibrary.tsx]
        FloorSwitch[FloorSwitcher.tsx]
        HistoryUI[EditHistory.tsx]
    end

    Editor -->|useEditorStore| Store
    Viewport -->|useEditorStore| Store
    Props -->|useEditorStore| Store
    Library -->|useEditorStore| Store
    FloorSwitch -->|useEditorStore| Store
    HistoryUI -->|useEditorStore| Store

    Store -.->|Subscription| Editor
    Store -.->|Subscription| Viewport
    Store -.->|Subscription| Props

    style Store fill:#4f46e5,color:#fff
    style History fill:#dc2626,color:#fff
```

### Store Organization

The single Zustand store (`editorStore.ts`) is organized into logical sections:

1. **Editor State**: Current tool, grid visibility, lighting mode, unit system
2. **Project & Floors**: Project ID, list of floors, current floor, per-floor camera positions
3. **Scene Objects**: Rooms, furniture placements, currently dragging asset
4. **Selections**: Selected room/furniture/wall, multi-select furniture IDs
5. **History**: Undo/redo stack with action history and current index

### Subscription Pattern

Components subscribe to store changes using the `useEditorStore` hook:

```typescript
// Component automatically re-renders when currentTool changes
const currentTool = useEditorStore((state) => state.currentTool);
```

Zustand uses **selector-based subscriptions**: components only re-render when the specific slice of state they access changes, preventing unnecessary updates.

### Undo/Redo Implementation

The undo/redo system is implemented directly in the store:

- **Action Recording**: When user performs an action (add furniture, move object), an action is added to history
- **Stack Management**: Actions stored in array, `historyIndex` points to current position
- **Undo**: Reverses action at current index, moves index back, makes API call to revert database
- **Redo**: Re-applies action at next index, moves index forward, makes API call to reapply
- **New Actions**: When a new action is performed, all "future" actions (redo stack) are discarded
- **History Limit**: Limited to last 100 actions to prevent memory issues

Action types include:
- `furniture_add`: Records added furniture for undo (removal)
- `furniture_remove`: Records removed furniture for redo (re-addition)
- `furniture_move`: Records previous and new positions for both undo and redo
- `room_add`, `room_remove`: (Planned for future features)

### Why Zustand?

- **Simplicity**: No providers, no reducers, just `create()` and `useStore()`
- **Performance**: Selector-based subscriptions prevent unnecessary re-renders
- **Minimal Boilerplate**: Less code than Redux or Context API
- **TypeScript Support**: Full type safety with interfaces
- **DevTools**: Compatible with Redux DevTools for debugging
- **No Context Wrapping**: Works anywhere in component tree without provider setup

---

## Data Persistence

Home Designer uses **SQLite** via `sql.js` for data persistence. This provides a full SQL database that runs in-memory with periodic saves to disk.

```mermaid
graph TB
    subgraph "In-Memory Database"
        MemDB[(sql.js Database<br/>In-Memory)]
        CRUD[CRUD Operations<br/>Fast In-Memory Queries]
    end

    subgraph "Persistence Layer"
        SaveTrigger[Save Triggers]
        AutoSave[Auto-save on mutations]
        ManualSave[Manual save endpoint]
        Export[db.export to buffer]
    end

    subgraph "Disk Storage"
        DiskDB[(database.db<br/>SQLite File)]
    end

    subgraph "API Routes"
        Projects[/api/projects]
        Floors[/api/floors]
        Rooms[/api/rooms]
        Furniture[/api/furniture]
        Settings[/api/settings]
    end

    Projects --> CRUD
    Floors --> CRUD
    Rooms --> CRUD
    Furniture --> CRUD
    Settings --> CRUD

    CRUD --> MemDB

    CRUD --> SaveTrigger
    SaveTrigger --> AutoSave
    AutoSave --> Export
    ManualSave --> Export

    Export --> DiskDB

    DiskDB -.->|On server start| MemDB

    style MemDB fill:#4f46e5,color:#fff
    style DiskDB fill:#dc2626,color:#fff
    style AutoSave fill:#059669,color:#fff
```

### Database Tables

The database schema includes 14 tables (see `backend/src/db/init.js`):

**Core Tables:**
- `projects`: Project metadata, unit system, timestamps
- `floors`: Floor levels within projects
- `rooms`: Room geometry (dimensions_json), materials, positions
- `walls`: Wall geometry, materials, windows/doors flags

**Asset Tables:**
- `assets`: 3D model library (builtin, generated, imported, url_import)
- `asset_tags`: Tags for search/filtering
- `furniture_placements`: Placed furniture instances in rooms with transforms

**Additional Tables:**
- `lights`: Lighting fixtures in rooms
- `windows`, `doors`: Window and door placements on walls
- `edit_history`: Undo/redo action history (persisted)
- `ai_generations`: AI generation job tracking
- `user_settings`: App settings, encrypted API keys
- `material_presets`: Reusable material configurations

### Save Strategy

**Auto-Save on Mutations:**
- After every `INSERT`, `UPDATE`, `DELETE` operation, `saveDatabase()` is called
- `saveDatabase()` exports in-memory database to Buffer and writes to `backend/database.db`
- This ensures data is persisted immediately, preventing data loss on crashes

**Trade-offs:**
- **Pros**: Immediate persistence, no data loss, simple implementation
- **Cons**: Frequent disk writes (mitigated by OS-level caching)

**Why sql.js instead of better-sqlite3?**
- `sql.js` is a WebAssembly port of SQLite that runs in Node.js
- Originally chosen for browser compatibility (not used in current architecture)
- Current implementation could migrate to `better-sqlite3` for better performance

### Foreign Key Constraints

Foreign keys are **enabled** (`PRAGMA foreign_keys = ON`) to ensure referential integrity:
- Deleting a project cascades to floors, rooms, walls, furniture
- Deleting a floor cascades to rooms
- Deleting a room cascades to furniture placements, walls, lights
- Deleting an asset does NOT cascade to furniture placements (preserve history)

---

## File Storage Architecture

3D models, textures, thumbnails, and user uploads are stored on the file system, not in the database. This keeps the database small and enables direct serving of static files.

```mermaid
graph TB
    subgraph "File Storage Structure"
        Root[assets/]

        Models[models/<br/>3D model files]
        Textures[textures/<br/>Material textures]
        Thumbs[thumbnails/<br/>Asset previews]
        Uploads[uploads/<br/>User uploads for AI]

        Root --> Models
        Root --> Textures
        Root --> Thumbs
        Root --> Uploads
    end

    subgraph "Model Types"
        Builtin[builtin/<br/>Pre-installed furniture]
        Generated[generated-*.glb<br/>AI-generated models]
        Imported[imported-*.glb<br/>User-imported models]
        URL[url-import-*.glb<br/>Downloaded from URLs]
    end

    Models --> Builtin
    Models --> Generated
    Models --> Imported
    Models --> URL

    subgraph "Database References"
        AssetsTable[(assets table)]
        ModelPath[model_path: relative path]
        ThumbPath[thumbnail_path: relative path]
        TexturePath[texture_path: relative path]
    end

    AssetsTable --> ModelPath
    AssetsTable --> ThumbPath
    ModelPath -.->|References| Models
    ThumbPath -.->|References| Thumbs

    subgraph "Static File Serving"
        Express[Express Server]
        Static[app.use /assets static]
    end

    Express --> Static
    Static -.->|Serves files from| Root

    subgraph "Frontend Loading"
        GLTFLoader[GLTFLoader]
        TextureLoader[TextureLoader]
    end

    GLTFLoader -.->|GET /assets/models/*.glb| Static
    TextureLoader -.->|GET /assets/textures/*| Static

    style Root fill:#4f46e5,color:#fff
    style AssetsTable fill:#dc2626,color:#fff
    style Static fill:#059669,color:#fff
```

### File Naming Conventions

**Models:**
- **Built-in**: `models/furniture/chair-modern.glb`, `models/decor/plant-monstera.glb`
- **AI-Generated**: `models/generated-{timestamp}.glb`
- **User-Imported**: `models/imported-{timestamp}-{random}.glb`
- **URL-Imported**: `models/url-import-{timestamp}-{productName}.glb`

**Textures:**
- `textures/wood-oak.jpg`, `textures/tile-marble.jpg`

**Thumbnails:**
- `thumbnails/furniture/chair-modern.png`
- Auto-generated or placeholder images

**Uploads:**
- `uploads/photo-{timestamp}-{random}.{ext}`

### Storage Paths in Database

The `assets` table stores **relative paths**:
```json
{
  "model_path": "models/furniture/chair-modern.glb",
  "thumbnail_path": "thumbnails/furniture/chair-modern.png"
}
```

Frontend loads models using absolute URLs:
```
http://localhost:5000/assets/models/furniture/chair-modern.glb
```

### Cleanup Strategies

**Current Approach:**
- No automatic cleanup (all files retained)
- Manual cleanup of `uploads/` folder for old AI generation images

**Planned Improvements:**
- Delete failed AI generation files after 7 days
- Delete orphaned models (no database reference) via cleanup script
- Compress old texture files with KTX2/Basis Universal

---

## Key User Journeys

### Room Creation Flow

This diagram shows the complete flow when a user creates a room by dragging in the 3D viewport.

```mermaid
sequenceDiagram
    participant User
    participant Toolbar
    participant Store as Zustand Store
    participant Viewport as Viewport3D
    participant API as Rooms API
    participant DB as SQLite Database

    User->>Toolbar: Click "Draw Wall" tool
    Toolbar->>Store: setCurrentTool('draw-wall')
    Store-->>Viewport: Tool changed to draw-wall

    User->>Viewport: Click and drag on grid
    Viewport->>Viewport: Calculate rectangle dimensions
    Viewport->>Viewport: Show live dimension label (e.g., "5.2m × 3.8m")

    User->>Viewport: Release mouse (finish drag)
    Viewport->>Viewport: Calculate position and dimensions

    Viewport->>API: POST /api/floors/:floorId/rooms
    Note over Viewport,API: {dimensions_json: {width, depth},<br/>position_x, position_y, position_z,<br/>ceiling_height: 2.8}

    API->>DB: INSERT INTO rooms
    DB-->>API: {id: 7, ...roomData}
    API->>DB: saveDatabase()

    API-->>Viewport: {room: {...}}
    Viewport->>Store: addRoom(room)
    Viewport->>Store: addAction({type: 'room_add', data: {room}})

    Store-->>Viewport: State updated
    Viewport->>Viewport: Render room in 3D scene
    Note over Viewport: Floor mesh, ceiling mesh,<br/>4 wall meshes created

    Viewport-->>User: Room visible in scene with walls/floor/ceiling
```

**Key Points:**
- Live dimension feedback shown during drag (e.g., "5.2m × 3.8m")
- Room geometry stored as JSON: `{width: 5.2, depth: 3.8}`
- Default ceiling height: 2.8m (configurable)
- Room automatically gets default materials (white walls, light hardwood floor)
- Action added to undo history for reversibility

---

### Furniture Placement Flow

This diagram shows the drag-and-drop flow for placing furniture from the library into the 3D scene.

```mermaid
sequenceDiagram
    participant User
    participant Library as AssetLibrary
    participant Store as Zustand Store
    participant Viewport as Viewport3D
    participant Raycaster as Three.js Raycaster
    participant API as Furniture API
    participant DB as SQLite Database

    User->>Library: Drag furniture item (e.g., "Modern Chair")
    Library->>Store: setDraggingAsset(asset)
    Note over Store: draggingAsset = {id, name, category,<br/>model_path, width, height, depth}

    User->>Viewport: Drag over 3D viewport
    Viewport->>Viewport: onDragOver event
    Viewport->>Viewport: preventDefault() to allow drop

    User->>Viewport: Drop furniture in scene
    Viewport->>Viewport: onDrop event
    Viewport->>Raycaster: Calculate 3D position from mouse coords
    Note over Raycaster: Raycast to floor mesh<br/>to get intersection point

    Raycaster-->>Viewport: Intersection point {x, y, z}

    Viewport->>Store: Get draggingAsset
    Store-->>Viewport: Asset data

    Viewport->>API: POST /api/rooms/:roomId/furniture
    Note over Viewport,API: {asset_id, position_x, position_y, position_z,<br/>rotation_x: 0, rotation_y: 0, rotation_z: 0,<br/>scale_x: 1, scale_y: 1, scale_z: 1}

    API->>DB: INSERT INTO furniture_placements
    DB-->>API: {id: 15, ...placementData}
    API->>DB: saveDatabase()

    API-->>Viewport: {furniture: {...}}
    Viewport->>Store: addFurniturePlacement(furniture)
    Viewport->>Store: addAction({type: 'furniture_add', data: {furniture}})
    Viewport->>Store: setDraggingAsset(null)

    Store-->>Viewport: State updated
    Viewport->>Viewport: Load .glb model with GLTFLoader
    Viewport->>Viewport: Apply transforms (position, rotation, scale)
    Viewport->>Viewport: Render furniture mesh in scene

    Viewport-->>User: Furniture visible in 3D scene at drop position
```

**Key Points:**
- Drag-and-drop uses HTML5 Drag and Drop API + custom React event handling
- Raycasting determines exact 3D position on floor where user dropped item
- Furniture placement includes full transform (position, rotation, scale)
- GLTFLoader asynchronously loads the `.glb` model file
- Action added to history for undo support

---

### AI Model Generation Flow

This diagram shows the end-to-end flow for generating a 3D model from a photo using the TRELLIS API.

```mermaid
sequenceDiagram
    participant User
    participant Modal as AIGenerationModal
    participant API as AI API
    participant Express as Express Server
    participant DB as ai_generations
    participant TRELLIS as TRELLIS API
    participant FS as File System
    participant Assets as assets table

    User->>Modal: Upload furniture photo
    Modal->>Modal: Validate image (JPEG/PNG/WEBP, <10MB)

    Modal->>API: POST /api/ai/generate-furniture
    API->>Express: FormData {image, projectId}

    Express->>FS: Save to assets/uploads/photo-*.jpg
    Express->>DB: INSERT ai_generation (status: pending)
    DB-->>Express: {id: 42, status: pending}

    Express->>DB: Get TRELLIS API key (encrypted)
    DB-->>Express: Decrypted API key

    Express->>TRELLIS: POST /v1/generate {image, apiKey}
    TRELLIS-->>Express: {job_id: "xyz123", status: queued}

    Express->>DB: UPDATE status = processing, job_id
    Express-->>API: {generationId: 42, status: processing}
    API-->>Modal: Generation started

    Modal->>Modal: Show progress UI "Generating model..."

    loop Poll every 5 seconds (max 60 attempts)
        Modal->>API: GET /api/ai/generation/42
        API->>Express: GET /api/ai/generation/:id
        Express->>DB: SELECT * WHERE id = 42
        DB-->>Express: {status: processing}
        Express-->>API: {status: processing}
        API-->>Modal: Still processing...
        Modal->>Modal: Update progress indicator
    end

    Note over TRELLIS: AI model generation (30-120 seconds)

    TRELLIS->>TRELLIS: Complete 3D model generation

    Express->>TRELLIS: GET /v1/result/xyz123
    TRELLIS-->>Express: .glb model file (binary)

    Express->>FS: Save to assets/models/generated-{timestamp}.glb
    Express->>DB: UPDATE status = completed, output_model_path

    Modal->>API: GET /api/ai/generation/42 (next poll)
    Express->>DB: SELECT * WHERE id = 42
    DB-->>Express: {status: completed, output_model_path: "..."}
    Express-->>API: {status: completed, modelPath: "models/generated-*.glb"}
    API-->>Modal: Generation complete!

    Modal->>Modal: Show success message + "Add to Library" button

    User->>Modal: Click "Add to Library"
    Modal->>API: POST /api/assets
    Note over Modal,API: {name: "Generated Chair",<br/>category: "furniture",<br/>source: "generated",<br/>model_path: "models/generated-*.glb"}

    API->>Assets: INSERT INTO assets
    Assets-->>API: {id: 99, ...assetData}
    API-->>Modal: Asset created

    Modal->>Modal: Close modal
    Modal-->>User: Asset now available in library
```

**Key Points:**
- **Polling-based**: Frontend polls every 5 seconds for up to 5 minutes (configurable)
- **Alternative**: Could implement webhook callback from TRELLIS (requires public URL)
- **Error Handling**: Timeout after 5 minutes sets status to `failed` with error message
- **Two-Step Process**: Generation creates `ai_generation` record, then user manually adds to `assets` table
- **API Key Security**: Key decrypted server-side only, never exposed to frontend

---

### Project Save/Load Flow

Home Designer uses **auto-save on mutations** and **load on demand**. There's no explicit "Save" button—all changes persist immediately.

```mermaid
sequenceDiagram
    participant User
    participant Editor as Editor Component
    participant Store as Zustand Store
    participant API as API Client
    participant Express as Express Server
    participant DB as SQLite Database

    Note over User,DB: LOAD PROJECT

    User->>Editor: Open project (click from ProjectHub)
    Editor->>API: GET /api/projects/:id
    API->>Express: Request project data
    Express->>DB: SELECT * FROM projects WHERE id = :id
    DB-->>Express: {id, name, description, ...}
    Express-->>API: Project data
    API-->>Editor: Project data
    Editor->>Store: setProjectId(id)

    Editor->>API: GET /api/projects/:id/floors
    Express->>DB: SELECT * FROM floors WHERE project_id = :id
    DB-->>Express: [floor1, floor2, ...]
    Express-->>API: Floors data
    API-->>Editor: Floors data
    Editor->>Store: setFloors(floors), setCurrentFloorId(firstFloor.id)

    Editor->>API: GET /api/floors/:floorId/rooms
    Express->>DB: SELECT * FROM rooms WHERE floor_id = :floorId
    DB-->>Express: [room1, room2, ...]
    Express-->>API: Rooms data
    API-->>Editor: Rooms data
    Editor->>Store: setRooms(rooms)

    Editor->>API: GET /api/rooms/:roomId/furniture (for each room)
    Express->>DB: SELECT * FROM furniture_placements WHERE room_id = :roomId
    Express->>DB: JOIN assets table for model paths
    DB-->>Express: [furniture1, furniture2, ...]
    Express-->>API: Furniture data
    API-->>Editor: Furniture data
    Editor->>Store: setFurniturePlacements(allFurniture)

    Store-->>Editor: State fully loaded
    Editor->>Editor: Render 3D scene with all data
    Editor-->>User: Project loaded and visible

    Note over User,DB: AUTO-SAVE (on any change)

    User->>Editor: Move furniture
    Editor->>API: PUT /api/furniture/:id {position_x, position_y, position_z}
    API->>Express: Update request
    Express->>DB: UPDATE furniture_placements SET position_x = ?, ...
    Express->>DB: saveDatabase() - write to disk
    DB-->>Express: Success
    Express-->>API: {furniture: {...}}
    API-->>Editor: Success
    Editor->>Store: updateFurniturePlacement(id, newPosition)
    Store-->>Editor: State updated
    Editor->>Editor: Re-render furniture at new position
    Editor-->>User: Furniture moved (auto-saved)
```

**Key Points:**
- **No Explicit Save**: Every mutation (INSERT/UPDATE/DELETE) triggers immediate disk save
- **Load on Demand**: Project data loaded hierarchically (project → floors → rooms → furniture)
- **Lazy Loading**: Only current floor's data loaded initially; other floors load when switched
- **Optimistic Updates**: Store updated immediately, then API call made (feels instant)
- **Error Recovery**: If API call fails, store reverts to previous state (planned feature)

---

## Design Decisions

### Why This Architecture?

**1. Client-Server Separation**
- **Reason**: Clear separation of concerns, allows independent scaling/deployment
- **Benefit**: Backend can be replaced with cloud service; frontend can run as static site
- **Trade-off**: More complex than monolithic app, requires CORS handling

**2. SQLite Instead of PostgreSQL/MySQL**
- **Reason**: Self-hosted, no external database setup required
- **Benefit**: Single-file database, easy backups, no configuration, works out-of-the-box
- **Trade-off**: Not ideal for multi-user concurrent writes (but this is single-user app)

**3. sql.js (In-Memory) Instead of better-sqlite3**
- **Reason**: Originally planned for browser-based usage (abandoned)
- **Benefit**: Extremely fast queries (in-memory), automatic synchronization
- **Trade-off**: Requires periodic disk saves, uses more memory
- **Future**: Could migrate to better-sqlite3 for native SQLite performance

**4. Zustand Instead of Redux/Context**
- **Reason**: Simpler API, less boilerplate, better performance
- **Benefit**: Faster development, easier to understand, selector-based subscriptions
- **Trade-off**: Less ecosystem tooling than Redux (but sufficient for this app)

**5. React Three Fiber Instead of Plain Three.js**
- **Reason**: Declarative 3D rendering integrated with React component lifecycle
- **Benefit**: 3D objects update automatically when state changes, cleaner code
- **Trade-off**: Slight learning curve for Three.js developers, abstraction overhead

**6. File Storage Instead of Blob Storage in DB**
- **Reason**: Models/textures can be large (1-50MB), inefficient to store in SQLite
- **Benefit**: Fast static file serving, easy CDN integration, smaller database
- **Trade-off**: File paths can break if files moved/deleted

**7. Auto-Save Instead of Manual Save**
- **Reason**: Modern app UX (like Google Docs), prevents data loss
- **Benefit**: User never loses work, no "Save" button complexity
- **Trade-off**: More frequent disk writes (mitigated by OS caching)

**8. Polling Instead of WebSockets for AI Generation**
- **Reason**: Simpler implementation, no persistent connection management
- **Benefit**: Works with any HTTP server, no WebSocket infrastructure needed
- **Trade-off**: Higher latency (5-second poll interval), more HTTP requests

### Scalability Considerations

**Current State**: Optimized for single-user, local-first usage

**If Scaling to Multi-User:**
1. Replace sql.js with PostgreSQL/MySQL for concurrent writes
2. Add authentication/authorization middleware
3. Implement row-level security on database
4. Add real-time collaboration via WebSockets (Yjs/Socket.io)
5. Move file storage to S3/Cloud Storage
6. Add CDN for static assets
7. Replace polling with WebSocket events for AI generation

**If Scaling to Cloud:**
1. Deploy backend to cloud (Heroku, AWS, Vercel)
2. Deploy frontend to static hosting (Netlify, Vercel, Cloudflare Pages)
3. Use managed database (RDS, PlanetScale, Neon)
4. Use managed file storage (S3, Cloudflare R2)
5. Add caching layer (Redis) for frequently accessed data

### Security Considerations

**Current Implementation:**
- API keys encrypted at rest (AES-256-CBC)
- No user authentication (single-user app)
- CORS enabled for localhost development

**Production Hardening:**
- Add authentication (JWT, OAuth, Passport.js)
- Validate file uploads (type, size, content)
- Sanitize SQL inputs (already using parameterized queries)
- Rate limiting on API endpoints
- HTTPS for all traffic
- Environment-based CORS whitelist
- Content Security Policy headers

---

## Conclusion

Home Designer's architecture follows modern web development best practices with a clear separation between frontend (React/Three.js), backend (Express/SQLite), and data storage (file system for assets). The system is designed for simplicity, self-hosting, and local-first usage while remaining extensible for future cloud deployment or multi-user collaboration.

The choice of SQLite, Zustand, and React Three Fiber provides a lightweight, fast, and developer-friendly foundation that allows rapid iteration while maintaining code quality and performance.

For questions or contributions related to the architecture, see [CONTRIBUTING.md](../CONTRIBUTING.md).
