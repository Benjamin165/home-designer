# Code Conventions & Style Guide

**Last Updated:** 2026-02-27
**Purpose:** Definitive code style and conventions guide for Home Designer. Follow these patterns to ensure consistency and maintainability across the codebase.

---

## Table of Contents

1. [File Naming Conventions](#file-naming-conventions)
2. [Folder Organization](#folder-organization)
3. [Component File Structure](#component-file-structure)
4. [Zustand Store Conventions](#zustand-store-conventions)
5. [Backend Route Conventions](#backend-route-conventions)
6. [TypeScript Patterns](#typescript-patterns)
7. [Error Handling](#error-handling)
8. [Import Ordering](#import-ordering)
9. [Comment Style](#comment-style)
10. [Do/Don't Examples](#dodont-examples)

---

## File Naming Conventions

### Frontend (TypeScript/React)

| File Type | Convention | Example | Usage |
|-----------|------------|---------|-------|
| **Components** | PascalCase.tsx | `Editor.tsx`, `AssetLibrary.tsx` | React functional components |
| **Stores** | camelCase with "use" prefix + "Store" suffix | `useEditorStore.ts` | Zustand state stores |
| **Utilities** | camelCase.ts | `api.ts`, `units.ts` | Helper functions, utilities |
| **Types** | camelCase.types.ts | `editor.types.ts` (if separate) | Type definitions (usually co-located) |
| **Styles** | camelCase.css | `index.css` | CSS files |

### Backend (JavaScript/Node)

| File Type | Convention | Example | Usage |
|-----------|------------|---------|-------|
| **Routes** | lowercase.js | `projects.js`, `furniture.js` | Express route handlers |
| **Services** | lowercase.js | `database.js`, `ai.js` | Business logic services |
| **Database** | lowercase.js | `connection.js`, `init.js` | Database-related files |
| **Config** | lowercase.js | `server.js` | Server entry point and config |

### Naming Rules

✅ **DO:**
- Use descriptive, unabbreviated names (e.g., `PropertiesPanel`, not `PropPanel`)
- Match file name to primary export (e.g., `Editor.tsx` exports `Editor` component)
- Use singular for components (e.g., `AssetLibrary`, not `AssetLibraries`)
- Use plural for routes that handle collections (e.g., `projects.js` handles `/api/projects`)

❌ **DON'T:**
- Mix camelCase and PascalCase in same directory
- Use abbreviations unless widely recognized (e.g., `api.ts` is OK, `dlg.tsx` is not)
- Include "Component" or "Route" in file names (redundant)

---

## Folder Organization

### Frontend Structure

```
frontend/src/
├── components/          # React components (ALL components, no subfolders)
│   ├── Editor.tsx
│   ├── AssetLibrary.tsx
│   ├── PropertiesPanel.tsx
│   ├── Viewport3D.tsx
│   └── ...
├── store/               # Zustand stores
│   └── editorStore.ts
├── lib/                 # Utilities and helpers
│   ├── api.ts          # API client functions
│   └── units.ts        # Unit conversion utilities
├── App.tsx             # Main app component (router)
├── main.tsx            # React entry point
└── index.css           # Global styles
```

### Backend Structure

```
backend/src/
├── routes/              # Express route handlers
│   ├── projects.js
│   ├── furniture.js
│   ├── floors.js
│   └── ...
├── db/                  # Database layer
│   ├── connection.js    # Database connection/initialization
│   ├── init.js          # Schema creation
│   └── migrations/      # Database migrations (if any)
└── server.js            # Express server entry point
```

### Organization Rules

✅ **DO:**
- Keep all components in flat `components/` folder (no nested folders)
- Separate concerns: components for UI, stores for state, lib for utilities
- Co-locate tightly coupled files (if a component has a unique hook, keep them together)
- Use `lib/` for shared utilities used across multiple components

❌ **DON'T:**
- Create nested component folders unless absolutely necessary (avoid `components/Editor/index.tsx`)
- Mix backend and frontend code in same directory
- Store generated files (build output) in `src/` folders

---

## Component File Structure

All React components should follow this standard structure:

```tsx
// 1. IMPORTS - React and core libraries
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// 2. IMPORTS - Third-party packages
import { toast } from 'sonner';

// 3. IMPORTS - Local components
import AssetLibrary from './AssetLibrary';
import PropertiesPanel from './PropertiesPanel';
import Viewport3D from './Viewport3D';

// 4. IMPORTS - Local utilities and stores
import { projectsApi, floorsApi } from '../lib/api';
import { useEditorStore } from '../store/editorStore';
import { formatLength } from '../lib/units';

// 5. IMPORTS - Icons
import { MousePointer2, Save, Settings, Trash2 } from 'lucide-react';

// 6. TYPE DEFINITIONS (co-located with component)
interface Project {
  id: number;
  name: string;
  description?: string;
  unit_system: 'metric' | 'imperial';
  created_at: string;
  updated_at: string;
}

interface EditorProps {
  projectId: string;
}

// 7. COMPONENT FUNCTION
function Editor({ projectId }: EditorProps) {
  // 7a. HOOKS - useState, useRef, useParams, etc. (at top of component)
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { projectId: paramId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // 7b. STORE ACCESS - Zustand stores
  const { currentTool, setCurrentTool, selectedRoomId } = useEditorStore();

  // 7c. EFFECTS - useEffect hooks
  useEffect(() => {
    loadProject();
  }, [projectId]);

  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  // 7d. HANDLERS - Event handlers and callbacks
  const handleSave = async () => {
    try {
      await projectsApi.update(project.id, { name: project.name });
      toast.success('Project saved');
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    }
  };

  const handleDelete = async () => {
    // Handler logic
  };

  // 7e. HELPER FUNCTIONS (component-specific, not in handlers)
  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.getById(projectId);
      setProject(data.project);
    } catch (err) {
      console.error('Error loading project:', err);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  // 7f. EARLY RETURNS (loading, error states)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-400">
        {error}
      </div>
    );
  }

  // 7g. MAIN RENDER
  return (
    <div ref={containerRef} className="h-screen flex flex-col">
      {/* JSX content */}
    </div>
  );
}

// 8. EXPORT
export default Editor;
```

### Component Structure Rules

✅ **DO:**
- Group imports by category (React, third-party, local, icons)
- Define types/interfaces at file level (before component)
- Declare hooks at the top of the component function
- Use descriptive handler names (`handleSave`, not `onSave` - reserve "on" prefix for props)
- Separate loading/error states from main render with early returns
- Use `async/await` for async operations, wrap in try/catch

❌ **DON'T:**
- Define components inside components (extract to separate files)
- Use arrow functions for component definitions (use `function` for consistency)
- Mix handler logic with render JSX (extract complex logic to handlers)
- Nest ternaries more than 2 levels deep in JSX
- Define interfaces inside component functions (move to file level)

---

## Zustand Store Conventions

Zustand stores manage global application state. Follow this pattern:

```typescript
// store/editorStore.ts
import { create } from 'zustand';

// 1. TYPES - Export types for use in components
export type EditorTool = 'select' | 'draw-wall' | 'measure' | 'place-furniture';

// 2. INTERFACES - Data shape interfaces
interface Room {
  id: number;
  floor_id: number;
  name: string | null;
  dimensions_json: {
    width: number;
    depth: number;
  };
  position_x: number;
  position_z: number;
}

// 3. STATE INTERFACE - Complete store shape
export interface EditorState {
  // State properties
  currentTool: EditorTool;
  selectedRoomId: number | null;
  rooms: Room[];

  // Actions (methods that mutate state)
  setCurrentTool: (tool: EditorTool) => void;
  setSelectedRoomId: (id: number | null) => void;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
}

// 4. STORE CREATION
export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  currentTool: 'select',
  selectedRoomId: null,
  rooms: [],

  // Actions (use `set` to update state)
  setCurrentTool: (tool) => set({ currentTool: tool }),

  setSelectedRoomId: (id) => set({ selectedRoomId: id }),

  setRooms: (rooms) => set({ rooms }),

  addRoom: (room) => set((state) => ({
    rooms: [...state.rooms, room]
  })),

  // Complex action accessing current state
  clearSelection: () => {
    const state = get();
    set({
      selectedRoomId: null,
      selectedFurnitureId: null
    });
  },
}));
```

### Zustand Store Rules

✅ **DO:**
- Export types used by components (`EditorTool`, `EditorState`)
- Name store with "use" prefix and "Store" suffix (`useEditorStore`)
- Group related state together in one store (e.g., all editor state in `editorStore`)
- Use simple setters for direct updates (`setCurrentTool`)
- Use functional updates (`set((state) => ...)`) when new state depends on old state
- Use `get()` to access state within actions

❌ **DON'T:**
- Mutate state directly (`state.rooms.push(room)` - use spread operator instead)
- Create a new store for every component (combine related state)
- Use Zustand for purely local component state (use `useState` instead)
- Store derived data (compute it in components or via selectors)

### Accessing Store in Components

```tsx
// ✅ GOOD - Destructure only what you need
const { currentTool, setCurrentTool } = useEditorStore();

// ✅ GOOD - Selector for derived data
const roomCount = useEditorStore((state) => state.rooms.length);

// ❌ BAD - Taking entire store (causes unnecessary re-renders)
const store = useEditorStore();
```

---

## Backend Route Conventions

Backend routes handle HTTP requests and interact with the database. Follow this Express pattern:

```javascript
// routes/projects.js
import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';

const router = express.Router();

// 1. GET ROUTE - Fetch resources
// Pattern: router.get('/', async (req, res) => { ... })
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const result = db.exec('SELECT * FROM projects ORDER BY updated_at DESC');

    // Convert SQL result to objects
    let projects = [];
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      projects = result[0].values.map(row => {
        const project = {};
        columns.forEach((col, idx) => {
          project[col] = row[idx];
        });
        return project;
      });
    }

    // Always return data wrapped in an object
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// 2. POST ROUTE - Create resource
// Pattern: router.post('/', async (req, res) => { ... })
router.post('/', async (req, res) => {
  try {
    const { name, description, unit_system } = req.body;

    // Validation (always validate required fields)
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    if (name.length > 255) {
      return res.status(400).json({ error: 'Project name must be 255 characters or less' });
    }

    const db = await getDatabase();

    // Insert resource
    db.run(
      `INSERT INTO projects (name, description, unit_system, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name, description || null, unit_system || 'metric']
    );

    // Retrieve created resource
    const result = db.exec('SELECT * FROM projects ORDER BY id DESC LIMIT 1');
    const columns = result[0].columns;
    const row = result[0].values[0];
    const project = {};
    columns.forEach((col, idx) => {
      project[col] = row[idx];
    });

    // CRITICAL: Save database after mutation
    saveDatabase();

    // Return 201 Created with resource
    res.status(201).json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// 3. GET BY ID - Fetch single resource
// Pattern: router.get('/:id', async (req, res) => { ... })
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const result = db.exec('SELECT * FROM projects WHERE id = ?', [parseInt(id)]);

    // Check if resource exists (404 if not found)
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const columns = result[0].columns;
    const row = result[0].values[0];
    const project = {};
    columns.forEach((col, idx) => {
      project[col] = row[idx];
    });

    res.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// 4. PUT ROUTE - Update resource
// Pattern: router.put('/:id', async (req, res) => { ... })
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, unit_system } = req.body;

    const db = await getDatabase();

    // Check if resource exists
    const checkResult = db.exec('SELECT id FROM projects WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Update with COALESCE for partial updates
    db.run(
      `UPDATE projects
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           unit_system = COALESCE(?, unit_system),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name || null, description || null, unit_system || null, parseInt(id)]
    );

    saveDatabase();

    // Return updated resource
    const result = db.exec('SELECT * FROM projects WHERE id = ?', [parseInt(id)]);
    const columns = result[0].columns;
    const row = result[0].values[0];
    const project = {};
    columns.forEach((col, idx) => {
      project[col] = row[idx];
    });

    res.json({ project });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// 5. DELETE ROUTE - Delete resource
// Pattern: router.delete('/:id', async (req, res) => { ... })
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    // Check if resource exists
    const checkResult = db.exec('SELECT id FROM projects WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete resource
    db.run('DELETE FROM projects WHERE id = ?', [parseInt(id)]);

    saveDatabase();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
```

### Backend Route Rules

✅ **DO:**
- Wrap all route handlers in try/catch
- Use `async/await` for database operations
- Validate required fields at the start of POST/PUT routes
- Return appropriate status codes (200, 201, 400, 404, 500)
- Call `saveDatabase()` after any mutation (INSERT, UPDATE, DELETE)
- Convert SQL results to objects using column mapping pattern
- Use `parseInt()` when parsing route params
- Use `||` or `COALESCE` for optional fields with defaults
- Log errors with `console.error` before returning error response
- Return consistent response format: `{ resource }`, `{ error }`, `{ message }`

❌ **DON'T:**
- Forget to call `saveDatabase()` after mutations (data won't persist!)
- Return raw SQL result arrays (always convert to objects)
- Use string concatenation for SQL queries (use parameterized queries with `?`)
- Expose internal error details to client (use generic error messages)
- Forget validation on POST/PUT routes (leads to database errors)

---

## TypeScript Patterns

Home Designer uses **strict TypeScript** for type safety. Follow these patterns:

### Interface vs Type

```typescript
// ✅ GOOD - Use interface for object shapes
interface User {
  id: number;
  name: string;
  email: string;
}

// ✅ GOOD - Use type for unions, primitives, and utilities
type Status = 'pending' | 'active' | 'archived';
type ID = string | number;

// ✅ GOOD - Use type for computed types
type UserKeys = keyof User;
type PartialUser = Partial<User>;
```

### Generics

```typescript
// ✅ GOOD - Generic API response wrapper
interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Usage
const response: ApiResponse<Project> = await fetch('/api/projects/1');
```

### Discriminated Unions

```typescript
// ✅ GOOD - Discriminated union for different action types
type HistoryAction =
  | { type: 'furniture_add'; data: { furniture: FurniturePlacement } }
  | { type: 'furniture_remove'; data: { furnitureId: number } }
  | { type: 'room_add'; data: { room: Room } };

// Type-safe handling
function handleAction(action: HistoryAction) {
  switch (action.type) {
    case 'furniture_add':
      // TypeScript knows `action.data.furniture` exists
      console.log(action.data.furniture.id);
      break;
    case 'furniture_remove':
      // TypeScript knows `action.data.furnitureId` exists
      console.log(action.data.furnitureId);
      break;
  }
}
```

### Null Handling

```typescript
// ✅ GOOD - Explicit null checks
if (project !== null) {
  console.log(project.name);
}

// ✅ GOOD - Optional chaining
const projectName = project?.name ?? 'Untitled';

// ❌ BAD - Non-null assertion (avoid unless absolutely certain)
const projectName = project!.name; // Dangerous! Can crash if project is null
```

### Const vs Let

```typescript
// ✅ GOOD - Use const for values that won't be reassigned
const apiUrl = 'http://localhost:5000';
const user = { name: 'Alice' };

// ✅ GOOD - Use let only when reassignment is needed
let count = 0;
count++;

// ❌ BAD - Using let when const would work
let apiUrl = 'http://localhost:5000'; // Never reassigned
```

### Type Assertions

```typescript
// ✅ GOOD - Type assertion when you know better than TypeScript
const element = document.getElementById('canvas') as HTMLCanvasElement;

// ❌ BAD - Overusing assertions (sign of weak types)
const data = response as any; // Defeats the purpose of TypeScript
```

### TypeScript Rules

✅ **DO:**
- Define explicit return types for complex functions
- Use `interface` for object shapes, `type` for unions/utilities
- Prefer `const` over `let` whenever possible
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Enable strict mode in `tsconfig.json` (already enabled)

❌ **DON'T:**
- Use `any` type (defeats TypeScript's purpose - use `unknown` if needed)
- Use non-null assertions (`!`) unless absolutely certain
- Ignore TypeScript errors (fix the types, don't suppress)
- Define duplicate interfaces (import and reuse)

---

## Error Handling

Consistent error handling ensures good user experience and debuggability.

### Frontend Error Handling

```tsx
// Pattern 1: API Call with Toast Notification
const handleSave = async () => {
  try {
    await projectsApi.update(project.id, { name: project.name });
    toast.success('Project saved successfully');
  } catch (error) {
    console.error('Error saving project:', error);
    toast.error('Failed to save project');
  }
};

// Pattern 2: Component-Level Error State
const [error, setError] = useState<string | null>(null);

const loadProject = async () => {
  try {
    setError(null);
    const data = await projectsApi.getById(projectId);
    setProject(data.project);
  } catch (err) {
    console.error('Error loading project:', err);
    setError('Failed to load project. Please try again.');
  }
};

// Pattern 3: Error Boundary (for unhandled errors - not yet implemented)
// Future: Wrap app in ErrorBoundary component
```

### Backend Error Handling

```javascript
// Pattern: Try/Catch with Appropriate Status Codes
router.post('/', async (req, res) => {
  try {
    // Validation errors - 400 Bad Request
    if (!req.body.name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Resource not found - 404 Not Found
    const result = db.exec('SELECT * FROM projects WHERE id = ?', [id]);
    if (result.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Success - 200 OK or 201 Created
    res.status(201).json({ project });
  } catch (error) {
    // Unexpected errors - 500 Internal Server Error
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});
```

### Error Handling Rules

✅ **DO:**
- Use try/catch for all async operations
- Log errors to console with `console.error` (includes stack trace)
- Show user-friendly error messages via `toast.error()`
- Return appropriate HTTP status codes (400, 404, 500)
- Provide context in error messages ("Failed to save project", not just "Error")

❌ **DON'T:**
- Swallow errors silently (always log or handle)
- Expose internal error details to users (security risk)
- Use generic "Something went wrong" without context
- Forget to clear error state when retrying operations

---

## Import Ordering

Consistent import ordering improves readability and reduces merge conflicts.

### Standard Import Order

```tsx
// 1. React and core libraries
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// 2. Third-party packages (alphabetical)
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// 3. Local components (alphabetical)
import AssetLibrary from './AssetLibrary';
import FloorSwitcher from './FloorSwitcher';
import PropertiesPanel from './PropertiesPanel';
import Viewport3D from './Viewport3D';

// 4. Local utilities and stores
import { projectsApi, floorsApi, roomsApi } from '../lib/api';
import { useEditorStore } from '../store/editorStore';
import { formatLength, formatArea } from '../lib/units';

// 5. Icons (alphabetical)
import {
  ArrowLeft,
  MousePointer2,
  Save,
  Settings,
  Trash2
} from 'lucide-react';
```

### Import Ordering Rules

✅ **DO:**
- Group imports by category (React, third-party, local, icons)
- Separate groups with blank lines
- Sort alphabetically within each group
- Use named imports when possible (`import { useState }`)
- Import types with regular imports (TypeScript handles it)

❌ **DON'T:**
- Mix import groups (keep React separate from third-party)
- Use default AND named imports from same module on separate lines
- Import entire libraries when you only need one function

### Auto-Formatting (Future)

Currently, Home Designer doesn't have auto-import sorting configured. When adding a tool:

```json
// package.json (future addition)
{
  "scripts": {
    "lint": "eslint . --ext ts,tsx --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  }
}
```

---

## Comment Style

Use comments to explain **why**, not **what** (code should be self-explanatory).

### JSDoc-Style Comments (Functions/Classes)

```typescript
/**
 * Converts a 3D position from viewport coordinates to world coordinates
 * using raycasting. Returns null if no intersection found.
 *
 * @param screenX - Mouse X coordinate in pixels
 * @param screenY - Mouse Y coordinate in pixels
 * @param camera - Three.js camera instance
 * @returns World position {x, y, z} or null
 */
function screenToWorldPosition(
  screenX: number,
  screenY: number,
  camera: Camera
): { x: number; y: number; z: number } | null {
  // Implementation
}
```

### Inline Comments

```tsx
// ✅ GOOD - Explain WHY (non-obvious behavior)
// We need to multiply by 2 because sql.js returns values in half-precision
const actualValue = dbValue * 2;

// ✅ GOOD - Explain business logic
// Feature #38: Multi-select requires Ctrl/Cmd key
if (event.metaKey || event.ctrlKey) {
  toggleSelection(id);
}

// ❌ BAD - Explain WHAT (redundant)
// Set the current tool to 'select'
setCurrentTool('select');
```

### TODO Comments

```typescript
// TODO: Add validation for max scale (Feature #XYZ)
const handleScale = (value: number) => {
  // Current implementation
};

// FIXME: Raycaster occasionally misses furniture on edges
// Issue #42
const intersects = raycaster.intersectObjects(scene.children);
```

### Comment Rules

✅ **DO:**
- Use JSDoc for public functions and exported utilities
- Comment complex algorithms or non-obvious code
- Reference feature numbers in comments when implementing features
- Use TODO/FIXME/NOTE prefixes for action items
- Explain business rules and constraints

❌ **DON'T:**
- Comment every line (makes code harder to read)
- Leave commented-out code (use version control instead)
- Write misleading comments (update comments when code changes)

---

## Do/Don't Examples

### Example 1: State Updates in Zustand

```typescript
// ❌ BAD - Mutating state directly
addRoom: (room) => {
  get().rooms.push(room); // NEVER MUTATE!
  return { rooms: get().rooms };
}

// ✅ GOOD - Immutable update with spread
addRoom: (room) => set((state) => ({
  rooms: [...state.rooms, room]
}))
```

### Example 2: API Error Handling

```typescript
// ❌ BAD - No error handling
const loadProject = async () => {
  const data = await projectsApi.getById(projectId);
  setProject(data.project);
};

// ✅ GOOD - Proper error handling
const loadProject = async () => {
  try {
    setLoading(true);
    setError(null);
    const data = await projectsApi.getById(projectId);
    setProject(data.project);
  } catch (err) {
    console.error('Error loading project:', err);
    setError('Failed to load project');
    toast.error('Failed to load project');
  } finally {
    setLoading(false);
  }
};
```

### Example 3: Component Conditional Rendering

```tsx
// ❌ BAD - Deeply nested ternaries
return (
  <div>
    {loading ? (
      <Spinner />
    ) : error ? (
      <ErrorMessage />
    ) : project ? (
      <ProjectView />
    ) : (
      <EmptyState />
    )}
  </div>
);

// ✅ GOOD - Early returns
if (loading) {
  return <Spinner />;
}

if (error) {
  return <ErrorMessage message={error} />;
}

if (!project) {
  return <EmptyState />;
}

return <ProjectView project={project} />;
```

### Example 4: Database Mutations

```javascript
// ❌ BAD - Forgot to save database
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

// ✅ GOOD - Save database after mutation
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    db.run('INSERT INTO projects (name) VALUES (?)', [req.body.name]);
    saveDatabase(); // CRITICAL!
    res.status(201).json({ message: 'Created' });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});
```

### Example 5: TypeScript Null Checks

```typescript
// ❌ BAD - Non-null assertion
const projectName = selectedRoom!.name; // Crash if selectedRoom is null

// ✅ GOOD - Explicit null check
if (!selectedRoom) {
  return <EmptyState />;
}
const projectName = selectedRoom.name;

// ✅ GOOD - Optional chaining
const projectName = selectedRoom?.name ?? 'Untitled';
```

### Example 6: Import Organization

```typescript
// ❌ BAD - Unorganized imports
import { Save } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { useState } from 'react';
import AssetLibrary from './AssetLibrary';
import { toast } from 'sonner';

// ✅ GOOD - Organized by category
import { useState } from 'react';

import { toast } from 'sonner';

import AssetLibrary from './AssetLibrary';
import { useEditorStore } from '../store/editorStore';

import { Save } from 'lucide-react';
```

### Example 7: Form Validation

```typescript
// ❌ BAD - No validation, unclear error
const handleSubmit = async () => {
  await projectsApi.create(req.body);
};

// ✅ GOOD - Validation with clear feedback
const handleSubmit = async () => {
  if (!projectName.trim()) {
    toast.error('Project name is required');
    return;
  }

  if (projectName.length > 255) {
    toast.error('Project name must be 255 characters or less');
    return;
  }

  try {
    await projectsApi.create({ name: projectName, description });
    toast.success('Project created successfully');
    navigate(`/editor/${project.id}`);
  } catch (error) {
    console.error('Error creating project:', error);
    toast.error('Failed to create project');
  }
};
```

---

## Summary

Following these conventions ensures:

1. **Consistency:** Code looks the same regardless of who wrote it
2. **Maintainability:** Easy to find and modify code
3. **Type Safety:** TypeScript catches errors before runtime
4. **Debugging:** Clear error messages and logging
5. **Collaboration:** Reduced merge conflicts, easier code reviews

### Quick Reference Checklist

When writing code, ask yourself:

- [ ] Does my file name follow conventions? (PascalCase for components, camelCase for utilities)
- [ ] Are my imports organized in the correct order?
- [ ] Did I wrap async operations in try/catch?
- [ ] Did I call `saveDatabase()` after mutations?
- [ ] Am I using `const` instead of `let` where possible?
- [ ] Did I avoid non-null assertions (`!`)?
- [ ] Are my error messages user-friendly and specific?
- [ ] Did I add comments for complex/non-obvious logic?
- [ ] Does my TypeScript code have proper type annotations?
- [ ] Is my component structure following the standard pattern?

**When in doubt, reference existing code in the same category (components, routes, stores) and match its style.**
