# Common Patterns & Anti-Patterns

**Last Updated:** 2026-02-27
**Purpose:** Catalog of recurring implementation patterns and known anti-patterns in Home Designer. Use this guide to recognize and reuse established patterns rather than inventing new approaches.

---

## Table of Contents

### Patterns
1. [CRUD Flow Pattern](#crud-flow-pattern)
2. [3D Object Lifecycle Pattern](#3d-object-lifecycle-pattern)
3. [State Synchronization Pattern](#state-synchronization-pattern)
4. [Optimistic Update Pattern](#optimistic-update-pattern)
5. [Modal/Dialog Pattern](#modaldialog-pattern)
6. [Event Handling Pattern](#event-handling-pattern)
7. [File Upload Pattern](#file-upload-pattern)
8. [API Error Handling Pattern](#api-error-handling-pattern)

### Anti-Patterns
9. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
10. [Performance Anti-Patterns](#performance-anti-patterns)

---

## CRUD Flow Pattern

**When to use:** Implementing a new resource endpoint (projects, rooms, furniture, etc.)

**Pattern:** Route definition → Validation → Service call → DB query → Response transformation → Error handling

### Traced Example: Creating a Project

```javascript
// backend/src/routes/projects.js

// 1. ROUTE DEFINITION
router.post('/', async (req, res) => {
  try {
    // 2. EXTRACT AND DESTRUCTURE REQUEST DATA
    const { name, description, unit_system } = req.body;

    // 3. VALIDATION - Check required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    if (name.length > 255) {
      return res.status(400).json({ error: 'Project name must be 255 characters or less' });
    }

    // 4. DATABASE ACCESS - Get database connection
    const db = await getDatabase();

    // 5. DATABASE MUTATION - Insert new record
    db.run(
      `INSERT INTO projects (name, description, unit_system, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name, description || null, unit_system || 'metric']
    );

    // 6. RETRIEVE CREATED RESOURCE - Fetch to return to client
    const result = db.exec('SELECT * FROM projects ORDER BY id DESC LIMIT 1');

    // 7. RESPONSE TRANSFORMATION - Convert SQL result to object
    const columns = result[0].columns;
    const row = result[0].values[0];
    const project = {};
    columns.forEach((col, idx) => {
      project[col] = row[idx];
    });

    // 8. PERSISTENCE - Save database to disk
    saveDatabase();

    // 9. SUCCESS RESPONSE - Return created resource with 201 status
    res.status(201).json({ project });
  } catch (error) {
    // 10. ERROR HANDLING - Log and return error
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});
```

### Frontend API Call Pattern

```typescript
// frontend/src/lib/api.ts

export const projectsApi = {
  async create(data: { name: string; description?: string }) {
    // 1. Call API with fetchWithErrorHandling wrapper
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // 2. Parse JSON response
    return response.json();
  }
};

// frontend/src/components/ProjectHub.tsx

const handleCreateProject = async () => {
  try {
    // 1. Validation
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    // 2. Call API
    const { project } = await projectsApi.create({
      name: newProjectName,
      description: newProjectDescription
    });

    // 3. Update local state (optimistic or after success)
    setProjects(prev => [...prev, project]);

    // 4. User feedback
    toast.success('Project created successfully');

    // 5. Navigate or update UI
    navigate(`/editor/${project.id}`);
  } catch (error) {
    console.error('Error creating project:', error);
    toast.error('Failed to create project');
  }
};
```

### Key Takeaways

✅ **DO:**
- Validate inputs before database operations
- Use parameterized queries (`?`) to prevent SQL injection
- Call `saveDatabase()` after mutations
- Return appropriate HTTP status codes (201 for creation, 200 for success, 400 for validation errors, 404 for not found, 500 for server errors)
- Transform database results to plain objects before sending to client
- Log errors with `console.error` before returning error response

❌ **DON'T:**
- Skip validation (leads to database errors)
- Forget `saveDatabase()` (changes won't persist)
- Return raw SQL result arrays (inconsistent response format)
- Expose internal error details to client

**Reference Files:**
- `backend/src/routes/projects.js`
- `backend/src/routes/furniture.js`
- `frontend/src/lib/api.ts`

---

## 3D Object Lifecycle Pattern

**When to use:** Adding new 3D objects to the scene (furniture, rooms, lighting, decorations)

**Pattern:** Asset library → Instantiation → Scene placement → User manipulation → State persistence → Cleanup/disposal

### Traced Example: Placing Furniture from Library to Scene

```typescript
// 1. ASSET LIBRARY - User selects and drags furniture
// frontend/src/components/AssetLibrary.tsx

const handleDragStart = (asset: Asset) => (e: React.DragEvent) => {
  setDraggingAsset(asset); // Store in Zustand for access from other components
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('application/json', JSON.stringify(asset));
};

// 2. VIEWPORT DROP HANDLING - Convert screen coordinates to 3D position
// frontend/src/components/Viewport3D.tsx (in <Canvas> component)

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();

  // Get canvas rect for coordinate conversion
  const canvasRect = gl.domElement.getBoundingClientRect();

  // Dispatch custom event to Scene component (which has access to Three.js camera)
  window.dispatchEvent(
    new CustomEvent('dropFurniture', {
      detail: {
        asset: draggingAsset,
        screenPosition: { x: e.clientX, y: e.clientY },
        canvasRect,
      },
    })
  );
};

// 3. SCENE COMPONENT - Convert to 3D coordinates via raycasting
// frontend/src/components/Viewport3D.tsx (Scene component)

useEffect(() => {
  const handleDropFurnitureEvent = (event: any) => {
    const { asset, screenPosition, canvasRect } = event.detail;

    // Convert screen position to normalized device coordinates (-1 to 1)
    const x = ((screenPosition.x - canvasRect.left) / canvasRect.width) * 2 - 1;
    const y = -((screenPosition.y - canvasRect.top) / canvasRect.height) * 2 + 1;

    // Perform raycasting to find 3D position
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(x, y);
    raycaster.setFromCamera(pointer, camera);

    // Raycast against ground plane
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMesh = new THREE.Mesh(planeGeometry);
    planeMesh.rotation.x = -Math.PI / 2;
    planeMesh.updateMatrixWorld();

    const intersects = raycaster.intersectObject(planeMesh);
    if (intersects.length > 0) {
      const point = intersects[0].point;

      // Dispatch placement event with 3D coordinates
      window.dispatchEvent(
        new CustomEvent('placeFurniture', {
          detail: {
            asset,
            position: { x: point.x, y: 0, z: point.z },
          },
        })
      );
    }
  };

  window.addEventListener('dropFurniture', handleDropFurnitureEvent);
  return () => window.removeEventListener('dropFurniture', handleDropFurnitureEvent);
}, [camera]);

// 4. EDITOR COMPONENT - Persist to database and update state
// frontend/src/components/Editor.tsx

useEffect(() => {
  const handlePlaceFurniture = async (event: any) => {
    const { asset, position } = event.detail;

    try {
      // Find which room the furniture should belong to (if any)
      const targetRoomId = findRoomAtPosition(position);

      // Persist to database
      const { furniture } = await furnitureApi.create(targetRoomId, {
        asset_id: asset.id,
        position_x: position.x,
        position_y: position.y,
        position_z: position.z,
        rotation_x: 0,
        rotation_y: 0,
        rotation_z: 0,
        scale_x: 1,
        scale_y: 1,
        scale_z: 1
      });

      // Update Zustand store (triggers re-render)
      addFurniturePlacement(furniture);

      // Add to undo history
      addAction({
        type: 'furniture_add',
        description: `Added ${asset.name}`,
        data: { furniture }
      });

      toast.success(`${asset.name} placed`);
    } catch (error) {
      console.error('Error placing furniture:', error);
      toast.error('Failed to place furniture');
    }
  };

  window.addEventListener('placeFurniture', handlePlaceFurniture);
  return () => window.removeEventListener('placeFurniture', handlePlaceFurniture);
}, [rooms]);

// 5. RENDER IN SCENE - Display furniture in 3D
// frontend/src/components/Viewport3D.tsx (FurnitureMesh component)

function FurnitureMesh({ placement }: { placement: FurniturePlacement }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Load 3D model (glTF/GLB)
  const { scene } = useGLTF(placement.model_path);

  // Apply transformations
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        placement.position_x,
        placement.position_y,
        placement.position_z
      );
      meshRef.current.rotation.set(
        placement.rotation_x,
        placement.rotation_y,
        placement.rotation_z
      );
      meshRef.current.scale.set(
        placement.scale_x,
        placement.scale_y,
        placement.scale_z
      );
    }
  }, [placement]);

  return <primitive ref={meshRef} object={scene.clone()} />;
}

// 6. USER MANIPULATION - Handle selection and transformations
const handleFurnitureClick = (e: ThreeEvent<MouseEvent>, furniture: FurniturePlacement) => {
  e.stopPropagation();
  setSelectedFurnitureId(furniture.id);
};

const handleFurnitureMove = async (furnitureId: number, newPosition: Vector3) => {
  // Update database
  await furnitureApi.update(furnitureId, {
    position_x: newPosition.x,
    position_y: newPosition.y,
    position_z: newPosition.z
  });

  // Update store
  updateFurniturePlacement(furnitureId, {
    position_x: newPosition.x,
    position_y: newPosition.y,
    position_z: newPosition.z
  });
};

// 7. CLEANUP/DISPOSAL - Remove from scene and dispose resources
const handleFurnitureDelete = async (furnitureId: number) => {
  try {
    // Delete from database
    await furnitureApi.delete(furnitureId);

    // Remove from store (triggers unmount)
    removeFurniturePlacement(furnitureId);

    // Three.js cleanup (handled by React Three Fiber automatically on unmount)
    // Meshes, materials, geometries are disposed when component unmounts

    toast.success('Furniture removed');
  } catch (error) {
    console.error('Error deleting furniture:', error);
    toast.error('Failed to delete furniture');
  }
};
```

### Key Takeaways

✅ **DO:**
- Use raycasting to convert screen coordinates to 3D positions
- Store 3D object state in both Zustand (for rendering) and database (for persistence)
- Use custom events to communicate between React DOM and React Three Fiber components
- Clone 3D models before adding to scene (allows multiple instances)
- Dispose of Three.js resources when removing objects (React Three Fiber handles this automatically)
- Update both database and Zustand store when manipulating objects

❌ **DON'T:**
- Create new geometry/materials every frame (memory leak)
- Forget to dispose of Three.js resources when deleting objects
- Store 3D object references in React state (causes unnecessary re-renders)
- Mutate Three.js object properties directly without triggering state updates

**Reference Files:**
- `frontend/src/components/AssetLibrary.tsx`
- `frontend/src/components/Viewport3D.tsx`
- `frontend/src/components/Editor.tsx`

---

## State Synchronization Pattern

**When to use:** Keeping UI state (Zustand), 3D scene state (Three.js), and backend data (SQLite) in sync

**Pattern:** User action → Update Zustand store → Trigger 3D scene re-render → Persist to database → Handle success/failure

### State Flow Diagram

```
User Interaction
      ↓
Zustand Store Update (optimistic)
      ↓
3D Scene Re-render (React Three Fiber watches Zustand)
      ↓
API Call to Backend (async)
      ↓
Database Persistence
      ↓
Success: Keep Zustand state
Failure: Revert Zustand state + show error
```

### Example: Rotating Furniture

```typescript
// 1. USER INTERACTION - Properties panel input
const handleFurnitureRotationSave = async () => {
  if (!selectedFurniture) return;

  const degrees = parseFloat(furnitureRotation);
  const radians = degrees * Math.PI / 180;

  try {
    // 2. ZUSTAND UPDATE (optimistic) - Update immediately for responsive UI
    updateFurniturePlacement(selectedFurniture.id, {
      rotation_y: radians,
    });

    // 3. API CALL - Persist to database (async)
    await furnitureApi.update(selectedFurniture.id, {
      rotation_y: radians,
    });

    // 4. SUCCESS FEEDBACK
    toast.success('Furniture rotated', {
      description: `Rotated to ${degrees}°`
    });
  } catch (error) {
    // 5. FAILURE HANDLING - Revert optimistic update
    console.error('Error updating furniture rotation:', error);

    // Fetch current state from database to revert
    const { furniture } = await furnitureApi.getById(selectedFurniture.id);
    updateFurniturePlacement(selectedFurniture.id, {
      rotation_y: furniture.rotation_y
    });

    toast.error('Failed to rotate furniture');
  }
};

// 6. 3D SCENE OBSERVES ZUSTAND - React Three Fiber re-renders automatically
function FurnitureMesh({ placement }: { placement: FurniturePlacement }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // This useEffect runs whenever placement.rotation_y changes (Zustand update triggers re-render)
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = placement.rotation_y;
    }
  }, [placement.rotation_y]);

  return <primitive ref={meshRef} object={model.scene.clone()} />;
}
```

### Debouncing Strategy (for frequent updates)

```typescript
// For operations that happen frequently (dragging, resizing), debounce database saves

const [debouncedPosition, setDebouncedPosition] = useState(initialPosition);

// Update Zustand immediately (smooth visual feedback)
const handleDrag = (newPosition: Vector3) => {
  updateFurniturePlacement(furnitureId, {
    position_x: newPosition.x,
    position_y: newPosition.y,
    position_z: newPosition.z
  });

  setDebouncedPosition(newPosition);
};

// Debounce database save (reduce API calls)
useEffect(() => {
  const timer = setTimeout(() => {
    furnitureApi.update(furnitureId, {
      position_x: debouncedPosition.x,
      position_y: debouncedPosition.y,
      position_z: debouncedPosition.z
    });
  }, 500); // Save 500ms after user stops dragging

  return () => clearTimeout(timer);
}, [debouncedPosition]);
```

### Key Takeaways

✅ **DO:**
- Update Zustand store first for immediate UI feedback (optimistic updates)
- Let React Three Fiber observe Zustand changes (don't manually manipulate Three.js objects)
- Always persist to database after Zustand updates
- Revert Zustand state if database save fails
- Debounce frequent updates (drag, resize) to reduce API calls
- Use `useEffect` to sync Three.js objects with Zustand state changes

❌ **DON'T:**
- Update Three.js objects directly without updating Zustand (state gets out of sync)
- Update database without updating Zustand (UI doesn't reflect changes)
- Update Zustand without persisting to database (data loss on reload)
- Make API calls on every frame during drag operations (performance issue)

**Reference Files:**
- `frontend/src/components/PropertiesPanel.tsx`
- `frontend/src/components/Viewport3D.tsx`
- `frontend/src/store/editorStore.ts`

---

## Optimistic Update Pattern

**When to use:** Operations that should feel instant (save, delete, move) but require async backend persistence

**Pattern:** Update UI immediately → Persist async → Handle failure by reverting

### Example: Saving Project Name

```typescript
const handleSaveProjectName = async () => {
  // Store original value for potential rollback
  const originalName = project.name;

  try {
    // 1. OPTIMISTIC UPDATE - Update local state immediately
    setProject({ ...project, name: newName });

    // 2. ASYNC PERSISTENCE - Save to backend
    await projectsApi.update(project.id, { name: newName });

    // 3. SUCCESS FEEDBACK
    toast.success('Project name saved');
  } catch (error) {
    // 4. ROLLBACK ON FAILURE - Revert to original value
    setProject({ ...project, name: originalName });

    console.error('Error saving project name:', error);
    toast.error('Failed to save project name');
  }
};
```

### Auto-Save Implementation

```typescript
// Auto-save with optimistic updates and debouncing

const [project, setProject] = useState<Project | null>(null);
const [isSaving, setIsSaving] = useState(false);
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const handleProjectChange = (updates: Partial<Project>) => {
  if (!project) return;

  // 1. OPTIMISTIC UPDATE - Immediate UI feedback
  setProject({ ...project, ...updates });

  // 2. DEBOUNCED SAVE - Clear previous timeout, set new one
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }

  saveTimeoutRef.current = setTimeout(async () => {
    try {
      setIsSaving(true);

      // 3. PERSIST TO BACKEND
      await projectsApi.update(project.id, updates);

      setIsSaving(false);
    } catch (error) {
      console.error('Auto-save failed:', error);

      // 4. ROLLBACK - Fetch latest from backend
      const { project: latestProject } = await projectsApi.getById(project.id);
      setProject(latestProject);

      setIsSaving(false);
      toast.error('Auto-save failed');
    }
  }, 1000); // Save 1 second after user stops typing
};

// Cleanup timeout on unmount
useEffect(() => {
  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
}, []);
```

### Key Takeaways

✅ **DO:**
- Update UI immediately for responsive feel
- Store original value before optimistic update (for rollback)
- Handle errors by reverting to original state
- Show subtle loading indicator during async save
- Debounce frequent saves (auto-save, drag operations)

❌ **DON'T:**
- Leave UI in inconsistent state if save fails
- Show loading spinner that blocks UI (ruins optimistic update UX)
- Forget to handle errors (silent failures confuse users)
- Save on every keystroke without debouncing (performance issue)

**Reference Files:**
- `frontend/src/components/PropertiesPanel.tsx`
- `frontend/src/components/Editor.tsx`

---

## Modal/Dialog Pattern

**When to use:** User confirmation dialogs, forms, settings panels, any overlay UI

**Pattern:** Standard modal structure with backdrop, header, body, footer, and close handling

### Standard Modal Template

```tsx
// Modal Component Structure
function ExampleModal({ isOpen, onClose, onConfirm }: ModalProps) {
  // Local form state
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Call API or perform action
      await onConfirm(formData);

      // Close modal on success
      onClose();

      toast.success('Action completed successfully');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Early return if not open
  if (!isOpen) return null;

  return (
    // 1. BACKDROP - Click-outside-to-close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose} // Close on backdrop click
    >
      {/* 2. MODAL CONTAINER - Prevent backdrop click from propagating */}
      <div
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking modal content
      >
        {/* 3. HEADER - Title and close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Modal Title</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4. BODY - Form or content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Form fields */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* 5. FOOTER - Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Usage in Parent Component

```tsx
function ParentComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConfirm = async (data: FormData) => {
    await projectsApi.create(data);
    // Refresh list or navigate
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Open Modal
      </button>

      <ExampleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
```

### Key Takeaways

✅ **DO:**
- Use fixed positioning with high z-index (`z-50`)
- Include backdrop blur (`backdrop-blur-sm`) for modern look
- Stop event propagation on modal content to prevent accidental closes
- Disable actions during submission
- Show loading state on submit button
- Return `null` early if not open (avoid rendering hidden modal)
- Use form `onSubmit` for keyboard support (Enter to submit)

❌ **DON'T:**
- Forget to prevent backdrop click propagation on modal content
- Allow closing modal while submitting (data loss risk)
- Forget to clear form state when opening modal
- Use body scroll-lock without cleanup (causes scroll issues)

**Reference Files:**
- `frontend/src/components/AIGenerationModal.tsx`
- `frontend/src/components/SettingsModal.tsx`
- `frontend/src/components/DeleteRoomDialog.tsx`

---

## Event Handling Pattern

**When to use:** Handling both 3D scene interactions (Three.js) and DOM interactions (React)

**Pattern:** Distinguish between Three.js pointer events and DOM events, use custom events for cross-boundary communication

### Three.js Pointer Events (on 3D meshes)

```tsx
// Handling clicks on 3D objects in the scene

function FurnitureMesh({ placement }: { placement: FurniturePlacement }) {
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); // Prevent event from bubbling to parent meshes

    // Select this furniture
    setSelectedFurnitureId(placement.id);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    // Change cursor or show highlight
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  return (
    <primitive
      object={model.scene.clone()}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}
```

### DOM Events (on React elements)

```tsx
// Handling clicks on UI elements

function AssetCard({ asset }: { asset: Asset }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Open asset details
    setSelectedAsset(asset);
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      {/* Card content */}
    </div>
  );
}
```

### Custom Events (cross-boundary communication)

```tsx
// Problem: React DOM component needs to communicate with React Three Fiber component
// Solution: Custom events via window.dispatchEvent / window.addEventListener

// SENDER (React DOM component)
const handleDrop = (e: React.DragEvent) => {
  const canvasRect = gl.domElement.getBoundingClientRect();

  window.dispatchEvent(
    new CustomEvent('dropFurniture', {
      detail: {
        asset: draggingAsset,
        screenPosition: { x: e.clientX, y: e.clientY },
        canvasRect,
      },
    })
  );
};

// RECEIVER (React Three Fiber component)
useEffect(() => {
  const handleDropFurniture = (event: any) => {
    const { asset, screenPosition, canvasRect } = event.detail;

    // Convert screen coordinates to 3D position
    const worldPosition = screenToWorld(screenPosition, canvasRect, camera);

    // Place furniture at 3D position
    placeFurniture(asset, worldPosition);
  };

  window.addEventListener('dropFurniture', handleDropFurniture);

  return () => {
    window.removeEventListener('dropFurniture', handleDropFurniture);
  };
}, [camera]); // Re-create listener if camera changes
```

### Event Handling Rules

✅ **DO:**
- Use `e.stopPropagation()` to prevent event bubbling when needed
- Use `ThreeEvent` types for Three.js pointer events
- Use `React.MouseEvent` / `React.DragEvent` for DOM events
- Use custom events for React DOM ↔ React Three Fiber communication
- Clean up event listeners in `useEffect` return function
- Include dependencies in `useEffect` dependency array

❌ **DON'T:**
- Forget `e.stopPropagation()` on nested meshes (parent will also receive event)
- Use DOM events on Three.js objects (they don't work)
- Use Three.js events on DOM elements (they don't work)
- Forget to remove event listeners on cleanup (memory leak)
- Add event listeners inside render functions (performance issue)

**Reference Files:**
- `frontend/src/components/Viewport3D.tsx`
- `frontend/src/components/AssetLibrary.tsx`

---

## File Upload Pattern

**When to use:** Uploading files (images, floor plans, 3D models, project backups)

**Pattern:** Frontend FormData → Multipart upload → Backend multer middleware → File storage → DB record → Response with path

### Frontend: File Upload with FormData

```tsx
// Uploading a project backup ZIP file

const handleImportProject = async (file: File) => {
  try {
    // 1. CREATE FORMDATA
    const formData = new FormData();
    formData.append('zipFile', file);

    // 2. CALL API (fetchWithErrorHandling handles Content-Type automatically for FormData)
    const { project } = await projectsApi.import(formData);

    // 3. SUCCESS FEEDBACK
    toast.success('Project imported successfully');

    // 4. UPDATE UI
    setProjects(prev => [...prev, project]);
  } catch (error) {
    console.error('Error importing project:', error);
    toast.error('Failed to import project');
  }
};

// File input element
<input
  type="file"
  accept=".zip"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportProject(file);
    }
  }}
  className="hidden"
  id="import-input"
/>
```

### Frontend API Method

```typescript
// frontend/src/lib/api.ts

export const projectsApi = {
  async import(zipFile: File) {
    const formData = new FormData();
    formData.append('zipFile', zipFile);

    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects/import`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type with boundary for multipart/form-data
      body: formData,
    });

    return response.json();
  },
};
```

### Backend: Multer Middleware for File Uploads

```javascript
// backend/src/routes/projects.js

import multer from 'multer';

// 1. CONFIGURE MULTER - Memory storage for processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  }
});

// 2. ROUTE WITH MULTER MIDDLEWARE
router.post('/import', upload.single('zipFile'), async (req, res) => {
  try {
    // 3. VALIDATION - Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No ZIP file uploaded' });
    }

    // 4. PROCESS FILE - Access file via req.file.buffer
    const directory = await unzipper.Open.buffer(req.file.buffer);

    // Find and extract project_data.json
    const projectDataFile = directory.files.find(f => f.path === 'project_data.json');
    if (!projectDataFile) {
      return res.status(400).json({ error: 'Invalid backup file' });
    }

    // 5. PARSE AND PROCESS
    const content = await projectDataFile.buffer();
    const importData = JSON.parse(content.toString());

    // 6. STORE IN DATABASE (no file storage needed for this example)
    // ... database operations ...

    saveDatabase();

    // 7. RESPONSE
    res.status(201).json({
      message: 'Project imported successfully',
      project: newProject
    });
  } catch (error) {
    console.error('Error importing project:', error);
    res.status(500).json({ error: 'Failed to import project: ' + error.message });
  }
});
```

### File Storage Pattern (for images/models)

```javascript
// For persistent file storage (images, 3D models)

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = join(__dirname, '../../assets/uploads');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

router.post('/upload-model', upload.single('modelFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // File is saved to disk, path available in req.file.path
  const relativePath = `/assets/uploads/${req.file.filename}`;

  // Store path in database
  db.run(
    'INSERT INTO assets (name, model_path, category) VALUES (?, ?, ?)',
    [req.body.name, relativePath, req.body.category]
  );

  saveDatabase();

  res.status(201).json({
    message: 'Model uploaded successfully',
    path: relativePath
  });
});
```

### Key Takeaways

✅ **DO:**
- Use `FormData` for file uploads (supports multipart/form-data)
- Let browser set `Content-Type` header for FormData (includes boundary)
- Validate file type and size on backend (don't trust client)
- Use `multer.memoryStorage()` for temporary processing
- Use `multer.diskStorage()` for persistent file storage
- Generate unique filenames to prevent conflicts
- Store relative file paths in database (not absolute)
- Clean up temporary files after processing

❌ **DON'T:**
- Manually set `Content-Type` header for FormData (breaks multipart boundary)
- Trust client-side file validation (always validate on server)
- Store files in database as BLOBs (use file system + path in DB)
- Use original filenames (security risk + collisions)
- Forget to create upload directories (causes errors)
- Store absolute file paths in database (not portable)

**Reference Files:**
- `backend/src/routes/projects.js`
- `frontend/src/lib/api.ts`

---

## API Error Handling Pattern

**When to use:** All API calls to provide consistent, user-friendly error messages

**Pattern:** Custom `fetchWithErrorHandling` wrapper → HTTP status code detection → User-friendly error messages → Timeout handling

### Centralized Error Handling Utility

```typescript
// frontend/src/lib/api.ts

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit,
  timeoutMs = 30000
): Promise<Response> {
  // 1. TIMEOUT CONTROLLER
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 2. FETCH WITH STANDARD HEADERS
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 3. HTTP ERROR DETECTION
    if (!response.ok) {
      let userMessage = 'Something went wrong. Please try again.';

      // Map status codes to user-friendly messages
      if (response.status === 404) {
        userMessage = 'The requested resource was not found.';
      } else if (response.status === 500) {
        userMessage = 'Server error. Please try again later.';
      } else if (response.status === 503) {
        userMessage = 'Service temporarily unavailable.';
      }

      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        userMessage
      );
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // 4. ERROR TYPE DETECTION
    if (error instanceof ApiError) {
      throw error; // Already handled
    }

    // Timeout error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        'Request timeout',
        undefined,
        'The request took too long to complete. Please try again.'
      );
    }

    // Network error (backend down, no internet)
    if (error instanceof TypeError) {
      throw new ApiError(
        'Network error',
        undefined,
        'Unable to connect to the server. Please check your connection.'
      );
    }

    // Unknown error
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      'An unexpected error occurred. Please try again.'
    );
  }
}
```

### Using Error Handling in Components

```tsx
const handleApiCall = async () => {
  try {
    const { projects } = await projectsApi.getAll();
    setProjects(projects);
  } catch (error) {
    // Log technical error for debugging
    console.error('Error loading projects:', error);

    // Show user-friendly error
    if (error instanceof ApiError && error.userMessage) {
      toast.error(error.userMessage);
    } else {
      toast.error('Failed to load projects');
    }
  }
};
```

### Key Takeaways

✅ **DO:**
- Use centralized error handling wrapper for all API calls
- Map HTTP status codes to user-friendly messages
- Include timeout handling with AbortController
- Distinguish between network errors, timeout errors, and HTTP errors
- Log technical errors to console for debugging
- Show user-friendly errors via toast notifications
- Clear timeout on both success and error paths

❌ **DON'T:**
- Show technical error messages to users ("TypeError: fetch failed")
- Forget to handle network errors (backend down scenarios)
- Set infinite timeout (always have a timeout)
- Swallow errors silently (always log to console)
- Forget to clear timeout (memory leak)

**Reference Files:**
- `frontend/src/lib/api.ts`

---

## Anti-Patterns to Avoid

These patterns cause bugs, performance issues, or maintenance headaches. Recognize and avoid them.

### 1. Direct DOM Manipulation in React

**❌ ANTI-PATTERN:**

```tsx
function Component() {
  const handleClick = () => {
    // Directly manipulating DOM - breaks React's virtual DOM
    document.getElementById('my-element').style.color = 'red';
    document.querySelector('.button').classList.add('active');
  };

  return <div id="my-element">Content</div>;
}
```

**✅ SOLUTION:**

```tsx
function Component() {
  const [isActive, setIsActive] = useState(false);

  const handleClick = () => {
    setIsActive(true);
  };

  return (
    <div className={isActive ? 'text-red-400' : 'text-white'}>
      Content
    </div>
  );
}
```

**Why it's bad:** Direct DOM manipulation bypasses React's rendering system, causing state inconsistencies and making components unpredictable.

---

### 2. Mutating Zustand State Outside Actions

**❌ ANTI-PATTERN:**

```typescript
// Mutating state directly
const rooms = useEditorStore.getState().rooms;
rooms.push(newRoom); // MUTATION! Zustand won't detect change
```

**✅ SOLUTION:**

```typescript
// Use store actions that create new arrays
const { addRoom } = useEditorStore();
addRoom(newRoom); // Store action creates new array

// Or use set with immutable update
useEditorStore.setState((state) => ({
  rooms: [...state.rooms, newRoom]
}));
```

**Why it's bad:** Zustand relies on immutability to detect changes. Mutating state directly prevents re-renders and causes stale UI.

---

### 3. Creating Three.js Objects Without Disposal

**❌ ANTI-PATTERN:**

```tsx
function Component() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 'red' });
  const mesh = new THREE.Mesh(geometry, material);

  // No cleanup! Memory leak when component unmounts
  return <primitive object={mesh} />;
}
```

**✅ SOLUTION:**

```tsx
function Component() {
  const geometryRef = useRef<THREE.BoxGeometry>();
  const materialRef = useRef<THREE.MeshStandardMaterial>();

  useEffect(() => {
    // Create objects
    geometryRef.current = new THREE.BoxGeometry(1, 1, 1);
    materialRef.current = new THREE.MeshStandardMaterial({ color: 'red' });

    // Cleanup on unmount
    return () => {
      geometryRef.current?.dispose();
      materialRef.current?.dispose();
    };
  }, []);

  return <box args={[1, 1, 1]}><meshStandardMaterial color="red" /></box>;
}

// OR use React Three Fiber's declarative approach (automatic disposal)
function Component() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}
```

**Why it's bad:** Three.js objects consume GPU memory. Not disposing them causes memory leaks that degrade performance over time.

---

### 4. Synchronous Heavy Computation in Render Loop

**❌ ANTI-PATTERN:**

```tsx
function Scene() {
  useFrame(() => {
    // Heavy computation EVERY FRAME (60 times per second)
    const nearestRoom = rooms.map(room => ({
      ...room,
      distance: calculateDistance(camera.position, room.position)
    })).sort((a, b) => a.distance - b.distance)[0];

    setNearestRoom(nearestRoom);
  });

  return <>{/* ... */}</>;
}
```

**✅ SOLUTION:**

```tsx
function Scene() {
  const [nearestRoom, setNearestRoom] = useState(null);
  const lastCalculationTime = useRef(0);

  useFrame(({ clock }) => {
    // Throttle calculation to once per second instead of 60fps
    const now = clock.elapsedTime;
    if (now - lastCalculationTime.current > 1) {
      const nearest = findNearestRoom(camera.position, rooms);
      setNearestRoom(nearest);
      lastCalculationTime.current = now;
    }
  });

  return <>{/* ... */}</>;
}
```

**Why it's bad:** Heavy computation in `useFrame` runs 60 times per second, causing frame drops and choppy rendering.

---

### 5. Storing Derived Data in State

**❌ ANTI-PATTERN:**

```tsx
function Component() {
  const [rooms, setRooms] = useState([]);
  const [roomCount, setRoomCount] = useState(0); // Derived from rooms!
  const [totalArea, setTotalArea] = useState(0); // Derived from rooms!

  useEffect(() => {
    // Manually sync derived state - error-prone!
    setRoomCount(rooms.length);
    setTotalArea(rooms.reduce((sum, r) => sum + r.area, 0));
  }, [rooms]);

  return <div>Rooms: {roomCount}, Total: {totalArea}</div>;
}
```

**✅ SOLUTION:**

```tsx
function Component() {
  const [rooms, setRooms] = useState([]);

  // Compute derived values during render - always in sync
  const roomCount = rooms.length;
  const totalArea = rooms.reduce((sum, r) => sum + r.area, 0);

  return <div>Rooms: {roomCount}, Total: {totalArea}</div>;
}

// For expensive calculations, use useMemo
function Component() {
  const [rooms, setRooms] = useState([]);

  const stats = useMemo(() => ({
    count: rooms.length,
    totalArea: rooms.reduce((sum, r) => sum + r.area, 0),
    averageArea: rooms.length > 0
      ? rooms.reduce((sum, r) => sum + r.area, 0) / rooms.length
      : 0
  }), [rooms]);

  return <div>Rooms: {stats.count}, Average: {stats.averageArea}</div>;
}
```

**Why it's bad:** Derived state can get out of sync with source data, causing bugs. It's redundant and adds unnecessary complexity.

---

### 6. Missing saveDatabase() Calls

**❌ ANTI-PATTERN:**

```javascript
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    db.run('INSERT INTO projects (name) VALUES (?)', [req.body.name]);

    // Missing saveDatabase()!

    res.status(201).json({ message: 'Created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**✅ SOLUTION:**

```javascript
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    db.run('INSERT INTO projects (name) VALUES (?)', [req.body.name]);

    // CRITICAL: Save database to disk
    saveDatabase();

    res.status(201).json({ message: 'Created' });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});
```

**Why it's bad:** sql.js keeps database in memory. Without `saveDatabase()`, changes are lost when server restarts.

---

### 7. Unbounded Undo History

**❌ ANTI-PATTERN:**

```typescript
addAction: (action) => set((state) => ({
  history: [...state.history, newAction], // Grows indefinitely!
  historyIndex: state.history.length
}))
```

**✅ SOLUTION:**

```typescript
addAction: (action) => set((state) => {
  const newHistory = [...state.history, newAction];

  // Limit to last 100 actions to prevent memory bloat
  const limitedHistory = newHistory.slice(-100);

  return {
    history: limitedHistory,
    historyIndex: limitedHistory.length - 1
  };
})
```

**Why it's bad:** Unbounded arrays consume memory over time, eventually degrading performance or causing crashes.

---

## Performance Anti-Patterns

These patterns cause performance degradation.

### 1. Creating New Objects/Materials Every Frame

**❌ ANTI-PATTERN:**

```tsx
function Component() {
  useFrame(() => {
    // Creating new material EVERY FRAME - huge memory leak!
    const material = new THREE.MeshStandardMaterial({ color: 'red' });
    mesh.material = material;
  });

  return <>{/* ... */}</>;
}
```

**✅ SOLUTION:**

```tsx
function Component() {
  const materialRef = useRef(
    new THREE.MeshStandardMaterial({ color: 'red' })
  );

  useFrame(() => {
    // Reuse existing material
    mesh.material = materialRef.current;
  });

  useEffect(() => {
    return () => materialRef.current.dispose();
  }, []);

  return <>{/* ... */}</>;
}
```

---

### 2. Unnecessary React Three Fiber Re-renders

**❌ ANTI-PATTERN:**

```tsx
function Scene() {
  const rooms = useEditorStore((state) => state.rooms);
  const furniture = useEditorStore((state) => state.furniturePlacements);
  const floors = useEditorStore((state) => state.floors);
  const selectedId = useEditorStore((state) => state.selectedRoomId);

  // Component re-renders whenever ANY store property changes!

  return <>{/* ... */}</>;
}
```

**✅ SOLUTION:**

```tsx
function Scene() {
  // Only subscribe to what you need
  const rooms = useEditorStore((state) => state.rooms);

  // Or use selectors to prevent unnecessary re-renders
  const roomCount = useEditorStore((state) => state.rooms.length);

  return <>{/* ... */}</>;
}
```

---

### 3. Loading Full-Resolution Textures for Thumbnails

**❌ ANTI-PATTERN:**

```tsx
function AssetCard({ asset }) {
  // Loading 4K texture just for 100x100px thumbnail!
  return <img src={asset.texture_path} className="w-24 h-24" />;
}
```

**✅ SOLUTION:**

```tsx
function AssetCard({ asset }) {
  // Use dedicated thumbnail image
  return <img src={asset.thumbnail_path} className="w-24 h-24" />;
}

// On backend, generate thumbnails during upload
const thumbnail = await sharp(originalImage)
  .resize(200, 200, { fit: 'cover' })
  .jpeg({ quality: 80 })
  .toBuffer();
```

---

## Summary

**Patterns to Follow:**
1. **CRUD Flow**: Route → Validation → DB → Transform → saveDatabase() → Response
2. **3D Lifecycle**: Asset → Placement → Render → Persist → Dispose
3. **State Sync**: Zustand → 3D Scene → Database (all in sync)
4. **Optimistic Updates**: Update UI first → Persist async → Revert on failure
5. **Modals**: Backdrop → Header → Body → Footer → Close handling
6. **Events**: Three.js events on 3D, DOM events on UI, custom events for cross-boundary
7. **File Upload**: FormData → Multer → Storage → DB path → Response
8. **API Errors**: Centralized handling → User-friendly messages → Timeout support

**Anti-Patterns to Avoid:**
1. Direct DOM manipulation (use React state)
2. Mutating Zustand state (use immutable updates)
3. Creating Three.js objects without disposal (memory leak)
4. Heavy computation in render loop (throttle or debounce)
5. Storing derived data in state (compute during render)
6. Missing saveDatabase() (data loss)
7. Unbounded arrays (memory bloat)
8. Unnecessary re-renders (selective store subscriptions)

**When in doubt, search the codebase for similar patterns and follow the established approach.**
