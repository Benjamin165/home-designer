# Backend API Complete Reference

This document provides a comprehensive reference for all REST endpoints in the Home Designer backend API.

**Base URL:** `http://localhost:5000/api`

## Table of Contents

- [Common Patterns](#common-patterns)
- [Error Codes Reference](#error-codes-reference)
- [Projects API](#projects-api)
- [Floors API](#floors-api)
- [Rooms API](#rooms-api)
- [Walls API](#walls-api)
- [Furniture API](#furniture-api)
- [Assets API](#assets-api)
- [AI Generation API](#ai-generation-api)
- [Export API](#export-api)
- [Settings API](#settings-api)
- [Health Check API](#health-check-api)

---

## Common Patterns

### Error Response Format

All endpoints return errors in the following format:

```typescript
{
  error: string | {
    message: string;
    details?: string;
    status?: number;
  }
}
```

**Example:**
```json
{
  "error": "Project not found"
}
```

### Pagination

Currently, pagination is not implemented. All list endpoints return all records. This may be added in future versions.

### File Upload Handling

File uploads use `multipart/form-data` encoding with multer middleware:

- **Maximum file size**: 10MB (AI generation images), 100MB (project import ZIP)
- **Allowed image types**: JPEG, PNG, WebP
- **Allowed archive types**: ZIP

**Example multipart request:**
```http
POST /api/ai/generate-from-photo HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="photo"; filename="chair.jpg"
Content-Type: image/jpeg

[binary image data]
------WebKitFormBoundary
Content-Disposition: form-data; name="name"

Modern Chair
------WebKitFormBoundary--
```

### Authentication

**None** — Home Designer is a local-first application with no user authentication. All endpoints are publicly accessible on `localhost`.

---

## Error Codes Reference

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| `200 OK` | Success | Request completed successfully |
| `201 Created` | Resource created | POST request created a new resource |
| `400 Bad Request` | Invalid input | Missing required fields, invalid data format |
| `404 Not Found` | Resource not found | ID doesn't exist in database |
| `500 Internal Server Error` | Server error | Database error, file system error, unexpected exception |

---

## Projects API

### GET /api/projects

List all projects, ordered by last updated.

**Request:**
```http
GET /api/projects HTTP/1.1
```

**Response:**
```typescript
{
  projects: Array<{
    id: number;
    name: string;
    description: string | null;
    thumbnail_path: string | null;
    unit_system: "metric" | "imperial";
    created_at: string; // ISO 8601 datetime
    updated_at: string; // ISO 8601 datetime
  }>
}
```

**Example Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "Modern Living Room",
      "description": "Minimalist design with natural lighting",
      "thumbnail_path": null,
      "unit_system": "metric",
      "created_at": "2026-02-20 10:30:00",
      "updated_at": "2026-02-27 14:25:30"
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Success
- `500 Internal Server Error`: Database error

---

### POST /api/projects

Create a new project.

**Request Body:**
```typescript
{
  name: string; // Required, max 255 chars
  description?: string;
  unit_system?: "metric" | "imperial"; // Default: "metric"
}
```

**Example Request:**
```json
{
  "name": "Bedroom Redesign",
  "description": "Modern bedroom with smart storage",
  "unit_system": "metric"
}
```

**Response:**
```typescript
{
  project: {
    id: number;
    name: string;
    description: string | null;
    thumbnail_path: string | null;
    unit_system: "metric" | "imperial";
    created_at: string;
    updated_at: string;
  }
}
```

**Status Codes:**
- `201 Created`: Project created successfully
- `400 Bad Request`: Missing or invalid name
- `500 Internal Server Error`: Database error

---

### GET /api/projects/:id

Get a specific project by ID.

**Path Parameters:**
- `id` (number): Project ID

**Response:**
```typescript
{
  project: {
    id: number;
    name: string;
    description: string | null;
    thumbnail_path: string | null;
    unit_system: "metric" | "imperial";
    created_at: string;
    updated_at: string;
  }
}
```

**Status Codes:**
- `200 OK`: Success
- `404 Not Found`: Project ID doesn't exist
- `500 Internal Server Error`: Database error

---

### PUT /api/projects/:id

Update an existing project.

**Path Parameters:**
- `id` (number): Project ID

**Request Body (all fields optional):**
```typescript
{
  name?: string;
  description?: string;
  unit_system?: "metric" | "imperial";
  thumbnail_path?: string;
}
```

**Response:**
```typescript
{
  project: {
    id: number;
    name: string;
    description: string | null;
    thumbnail_path: string | null;
    unit_system: "metric" | "imperial";
    created_at: string;
    updated_at: string;
  }
}
```

**Status Codes:**
- `200 OK`: Project updated successfully
- `404 Not Found`: Project ID doesn't exist
- `500 Internal Server Error`: Database error

---

### DELETE /api/projects/:id

Delete a project and all related data (floors, rooms, walls, furniture, etc.).

**Path Parameters:**
- `id` (number): Project ID

**Response:**
```typescript
{
  message: "Project deleted successfully"
}
```

**Status Codes:**
- `200 OK`: Project deleted successfully
- `404 Not Found`: Project ID doesn't exist
- `500 Internal Server Error`: Database error

**Notes:**
- Implements manual CASCADE deletion for reliability across all related tables
- Deletes: floors, rooms, walls, windows, doors, furniture placements, lights, edit history, AI generations

---

### POST /api/projects/:id/duplicate

Duplicate an entire project with all related data.

**Path Parameters:**
- `id` (number): Source project ID to duplicate

**Response:**
```typescript
{
  message: "Project duplicated successfully";
  project: {
    id: number; // New project ID
    name: string; // Original name + " (Copy)"
    description: string | null;
    thumbnail_path: string | null;
    unit_system: "metric" | "imperial";
    created_at: string;
    updated_at: string;
  }
}
```

**Status Codes:**
- `201 Created`: Project duplicated successfully
- `404 Not Found`: Source project doesn't exist
- `500 Internal Server Error`: Database error

**Notes:**
- Creates a complete deep copy including: floors, rooms, walls, windows, doors, furniture placements, lights
- Does not copy: edit history, AI generations
- Asset references are preserved (assets are not duplicated)

---

### POST /api/projects/:id/export

Export a project as a ZIP file containing all project data.

**Path Parameters:**
- `id` (number): Project ID to export

**Response:**
- **Content-Type**: `application/zip`
- **Content-Disposition**: `attachment; filename="{project_name}_YYYY-MM-DD.zip"`
- **Body**: Binary ZIP file

**ZIP Contents:**
```
project_data.json
```

**project_data.json Structure:**
```typescript
{
  version: "1.0";
  exported_at: string; // ISO 8601
  project: {...};
  floors: Array<{...}>;
  rooms: Array<{...}>;
  walls: Array<{...}>;
  windows: Array<{...}>;
  doors: Array<{...}>;
  furniture_placements: Array<{...}>;
  lights: Array<{...}>;
  assets: Array<{...}>; // Only assets used in this project
  asset_tags: Array<{...}>;
  edit_history: Array<{...}>;
  ai_generations: Array<{...}>;
}
```

**Status Codes:**
- `200 OK`: ZIP file streamed successfully
- `404 Not Found`: Project doesn't exist
- `500 Internal Server Error`: Archive creation error

---

### POST /api/projects/import

Import a project from a ZIP file created by the export endpoint.

**Request:**
- **Content-Type**: `multipart/form-data`
- **Field**: `zipFile` (file, required, max 100MB)

**Response:**
```typescript
{
  message: "Project imported successfully";
  project: {
    id: number; // New project ID
    name: string; // Original name + " (Imported)"
    description: string | null;
    thumbnail_path: string | null;
    unit_system: "metric" | "imperial";
    created_at: string;
    updated_at: string;
  }
}
```

**Status Codes:**
- `201 Created`: Project imported successfully
- `400 Bad Request`: No file uploaded, invalid ZIP format, missing project_data.json
- `500 Internal Server Error`: Import error

---

## Floors API

### GET /api/projects/:projectId/floors

List all floors for a project, ordered by `order_index`.

**Path Parameters:**
- `projectId` (number): Project ID

**Response:**
```typescript
{
  floors: Array<{
    id: number;
    project_id: number;
    level: number; // Floor level (0 = ground, 1 = first, -1 = basement, etc.)
    name: string;
    order_index: number; // Display order
    created_at: string;
  }>
}
```

**Status Codes:**
- `200 OK`: Success (empty array if no floors)
- `500 Internal Server Error`: Database error

---

### POST /api/projects/:projectId/floors

Create a new floor for a project.

**Path Parameters:**
- `projectId` (number): Project ID

**Request Body:**
```typescript
{
  level: number; // Required
  name: string; // Required
  order_index: number; // Required
}
```

**Example Request:**
```json
{
  "level": 1,
  "name": "First Floor",
  "order_index": 1
}
```

**Response:**
```typescript
{
  floor: {
    id: number;
    project_id: number;
    level: number;
    name: string;
    order_index: number;
    created_at: string;
  }
}
```

**Status Codes:**
- `201 Created`: Floor created successfully
- `400 Bad Request`: Missing required fields
- `404 Not Found`: Project doesn't exist
- `500 Internal Server Error`: Database error

---

### PUT /api/floors/reorder

Reorder multiple floors at once.

**Request Body:**
```typescript
{
  floors: Array<{
    id: number;
    order_index: number;
  }>
}
```

**Example Request:**
```json
{
  "floors": [
    { "id": 10, "order_index": 0 },
    { "id": 11, "order_index": 1 },
    { "id": 12, "order_index": 2 }
  ]
}
```

**Response:**
```typescript
{
  message: "Floors reordered successfully"
}
```

**Status Codes:**
- `200 OK`: Floors reordered successfully
- `400 Bad Request`: Invalid floors array
- `500 Internal Server Error`: Database error

---

### PUT /api/floors/:id

Update a floor.

**Path Parameters:**
- `id` (number): Floor ID

**Request Body (all fields optional):**
```typescript
{
  level?: number;
  name?: string;
  order_index?: number;
}
```

**Response:**
```typescript
{
  floor: {
    id: number;
    project_id: number;
    level: number;
    name: string;
    order_index: number;
    created_at: string;
  }
}
```

**Status Codes:**
- `200 OK`: Floor updated successfully
- `404 Not Found`: Floor doesn't exist
- `500 Internal Server Error`: Database error

---

### DELETE /api/floors/:id

Delete a floor and all related data (rooms, walls, furniture, etc.).

**Path Parameters:**
- `id` (number): Floor ID

**Response:**
```typescript
{
  message: "Floor deleted successfully"
}
```

**Status Codes:**
- `200 OK`: Floor deleted successfully
- `404 Not Found`: Floor doesn't exist
- `500 Internal Server Error`: Database error

**Notes:**
- Implements manual CASCADE deletion
- Deletes: rooms, walls, windows, doors, furniture placements, lights

---

## Rooms API

### GET /api/floors/:floorId/rooms

List all rooms on a floor.

**Path Parameters:**
- `floorId` (number): Floor ID

**Response:**
```typescript
{
  rooms: Array<{
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
    floor_texture_path: string | null;
    ceiling_height: number;
    ceiling_material: string | null;
    ceiling_color: string | null;
    created_at: string;
    updated_at: string;
  }>
}
```

**Status Codes:**
- `200 OK`: Success (empty array if no rooms)
- `500 Internal Server Error`: Database error

---

### POST /api/floors/:floorId/rooms

Create a new room on a floor.

**Path Parameters:**
- `floorId` (number): Floor ID

**Request Body:**
```typescript
{
  name?: string;
  dimensions_json: { // Required
    width: number;
    depth: number;
  } | string; // Can be JSON string or object
  floor_material?: string;
  floor_color?: string;
  floor_texture_path?: string;
  ceiling_height?: number; // Default: 2.8
  ceiling_material?: string;
  ceiling_color?: string;
  position_x?: number; // Default: 0
  position_y?: number; // Default: 0
  position_z?: number; // Default: 0
}
```

**Example Request:**
```json
{
  "name": "Living Room",
  "dimensions_json": {
    "width": 5.2,
    "depth": 4.8
  },
  "ceiling_height": 3.0,
  "floor_color": "#f5f5dc",
  "ceiling_color": "#ffffff"
}
```

**Response:**
```typescript
{
  room: {
    id: number;
    floor_id: number;
    name: string | null;
    dimensions_json: { width: number; depth: number };
    position_x: number;
    position_y: number;
    position_z: number;
    floor_material: string | null;
    floor_color: string | null;
    floor_texture_path: string | null;
    ceiling_height: number;
    ceiling_material: string | null;
    ceiling_color: string | null;
    created_at: string;
    updated_at: string;
  }
}
```

**Status Codes:**
- `201 Created`: Room created successfully (also creates 4 walls automatically)
- `400 Bad Request`: Missing dimensions_json
- `404 Not Found`: Floor doesn't exist
- `500 Internal Server Error`: Database error

**Notes:**
- Automatically creates 4 walls (front, back, left, right) based on room dimensions
- Default wall color: `#e5e7eb` (light gray)

---

### PUT /api/rooms/:id

Update a room.

**Path Parameters:**
- `id` (number): Room ID

**Request Body (all fields optional):**
```typescript
{
  name?: string;
  dimensions_json?: { width: number; depth: number } | string;
  floor_material?: string;
  floor_color?: string;
  floor_texture_path?: string;
  ceiling_height?: number;
  ceiling_material?: string;
  ceiling_color?: string;
  position_x?: number;
  position_y?: number;
  position_z?: number;
}
```

**Response:**
```typescript
{
  room: { /* same structure as POST response */ }
}
```

**Status Codes:**
- `200 OK`: Room updated successfully
- `404 Not Found`: Room doesn't exist
- `500 Internal Server Error`: Database error

---

### DELETE /api/rooms/:id

Delete a room and all related data (walls, furniture, lights).

**Path Parameters:**
- `id` (number): Room ID

**Response:**
```typescript
{
  message: "Room deleted successfully"
}
```

**Status Codes:**
- `200 OK`: Room deleted successfully
- `404 Not Found`: Room doesn't exist
- `500 Internal Server Error`: Database error

**Notes:**
- Explicitly deletes: furniture placements, lights, walls, windows, doors

---

### GET /api/rooms/:id/furniture

Get all furniture placed in a room with asset details.

**Path Parameters:**
- `id` (number): Room ID

**Response:**
```typescript
{
  furniture: Array<{
    // Furniture placement fields
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
    created_at: string;
    // Joined asset fields
    asset_name: string;
    category: string;
    model_path: string;
    thumbnail_path: string | null;
    width: number | null;
    height: number | null;
    depth: number | null;
  }>
}
```

**Status Codes:**
- `200 OK`: Success (empty array if no furniture)
- `500 Internal Server Error`: Database error

---

## Walls API

### GET /api/rooms/:roomId/walls

Get all walls for a room.

**Path Parameters:**
- `roomId` (number): Room ID

**Response:**
```typescript
{
  walls: Array<{
    id: number;
    room_id: number;
    start_x: number;
    start_y: number;
    end_x: number;
    end_y: number;
    height: number;
    material: string | null;
    color: string | null;
    texture_path: string | null;
    has_window: boolean;
    has_door: boolean;
  }>
}
```

**Status Codes:**
- `200 OK`: Success (empty array if no walls)
- `500 Internal Server Error`: Database error

---

### POST /api/rooms/:roomId/walls

Add a wall segment to a room.

**Path Parameters:**
- `roomId` (number): Room ID

**Request Body:**
```typescript
{
  start_x: number; // Required
  start_y: number; // Required
  end_x: number; // Required
  end_y: number; // Required
  height: number; // Required
  material?: string;
  color?: string;
  texture_path?: string;
  has_window?: boolean; // Default: false
  has_door?: boolean; // Default: false
}
```

**Example Request:**
```json
{
  "start_x": -2.5,
  "start_y": 3.0,
  "end_x": 2.5,
  "end_y": 3.0,
  "height": 2.8,
  "color": "#ffffff"
}
```

**Response:**
```typescript
{
  wall: {
    id: number;
    room_id: number;
    start_x: number;
    start_y: number;
    end_x: number;
    end_y: number;
    height: number;
    material: string | null;
    color: string | null;
    texture_path: string | null;
    has_window: boolean;
    has_door: boolean;
  }
}
```

**Status Codes:**
- `201 Created`: Wall created successfully
- `400 Bad Request`: Missing required fields
- `404 Not Found`: Room doesn't exist
- `500 Internal Server Error`: Database error

---

### PUT /api/walls/:id

Update a wall.

**Path Parameters:**
- `id` (number): Wall ID

**Request Body (all fields optional):**
```typescript
{
  start_x?: number;
  start_y?: number;
  end_x?: number;
  end_y?: number;
  height?: number;
  material?: string;
  color?: string;
  texture_path?: string;
  has_window?: boolean;
  has_door?: boolean;
}
```

**Response:**
```typescript
{
  wall: { /* same structure as POST response */ }
}
```

**Status Codes:**
- `200 OK`: Wall updated successfully
- `404 Not Found`: Wall doesn't exist
- `500 Internal Server Error`: Database error

---

### DELETE /api/walls/:id

Delete a wall (also deletes related windows and doors via CASCADE).

**Path Parameters:**
- `id` (number): Wall ID

**Response:**
```typescript
{
  message: "Wall deleted successfully"
}
```

**Status Codes:**
- `200 OK`: Wall deleted successfully
- `404 Not Found`: Wall doesn't exist
- `500 Internal Server Error`: Database error

---

## Furniture API

### POST /api/rooms/:roomId/furniture

Place furniture in a room.

**Path Parameters:**
- `roomId` (number): Room ID

**Request Body:**
```typescript
{
  asset_id: number; // Required
  position_x: number; // Required
  position_y: number; // Required
  position_z: number; // Required
  rotation_x?: number; // Default: 0
  rotation_y?: number; // Default: 0
  rotation_z?: number; // Default: 0
  scale_x?: number; // Default: 1.0
  scale_y?: number; // Default: 1.0
  scale_z?: number; // Default: 1.0
  locked?: boolean; // Default: false
}
```

**Example Request:**
```json
{
  "asset_id": 42,
  "position_x": 1.5,
  "position_y": 0.0,
  "position_z": 2.3,
  "rotation_y": 1.57,
  "scale_x": 1.2,
  "scale_y": 1.2,
  "scale_z": 1.2
}
```

**Response:**
```typescript
{
  furniture: {
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
    created_at: string;
    // Joined asset fields
    asset_name: string;
    category: string;
    width: number | null;
    height: number | null;
    depth: number | null;
    model_path: string;
  }
}
```

**Status Codes:**
- `201 Created`: Furniture placed successfully
- `400 Bad Request`: Missing required fields
- `404 Not Found`: Room or asset doesn't exist
- `500 Internal Server Error`: Database error

---

### PUT /api/furniture/:id

Update furniture placement (transform or lock status).

**Path Parameters:**
- `id` (number): Furniture placement ID

**Request Body (all fields optional):**
```typescript
{
  position_x?: number;
  position_y?: number;
  position_z?: number;
  rotation_x?: number;
  rotation_y?: number;
  rotation_z?: number;
  scale_x?: number;
  scale_y?: number;
  scale_z?: number;
  locked?: boolean;
}
```

**Response:**
```typescript
{
  furniture: { /* same structure as POST response */ }
}
```

**Status Codes:**
- `200 OK`: Furniture updated successfully
- `404 Not Found`: Furniture placement doesn't exist
- `500 Internal Server Error`: Database error

---

### DELETE /api/furniture/:id

Remove furniture from a room.

**Path Parameters:**
- `id` (number): Furniture placement ID

**Response:**
```typescript
{
  message: "Furniture removed successfully"
}
```

**Status Codes:**
- `200 OK`: Furniture removed successfully
- `404 Not Found`: Furniture placement doesn't exist
- `500 Internal Server Error`: Database error

---

## Assets API

### GET /api/assets

List all assets with optional filtering.

**Query Parameters:**
- `category` (string, optional): Filter by category (e.g., "furniture", "lighting")
- `search` (string, optional): Search by name (case-insensitive substring match)
- `favorite` (string, optional): If "true", return only favorited assets

**Example Requests:**
```http
GET /api/assets
GET /api/assets?category=furniture
GET /api/assets?search=chair
GET /api/assets?favorite=true
GET /api/assets?category=lighting&search=lamp
```

**Response:**
```typescript
{
  assets: Array<{
    id: number;
    name: string;
    category: string;
    subcategory: string | null;
    source: "builtin" | "generated" | "imported" | "url_import";
    model_path: string;
    thumbnail_path: string | null;
    width: number | null;
    height: number | null;
    depth: number | null;
    dimension_locked: boolean;
    source_url: string | null;
    source_product_name: string | null;
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
  }>
}
```

**Status Codes:**
- `200 OK`: Success (empty array if no matches)
- `500 Internal Server Error`: Database error

---

### GET /api/assets/:id

Get a specific asset by ID.

**Path Parameters:**
- `id` (number): Asset ID

**Response:**
```typescript
{
  asset: {
    id: number;
    name: string;
    category: string;
    subcategory: string | null;
    source: "builtin" | "generated" | "imported" | "url_import";
    model_path: string;
    thumbnail_path: string | null;
    width: number | null;
    height: number | null;
    depth: number | null;
    dimension_locked: boolean;
    source_url: string | null;
    source_product_name: string | null;
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
  }
}
```

**Status Codes:**
- `200 OK`: Success
- `404 Not Found`: Asset doesn't exist
- `500 Internal Server Error`: Database error

---

### POST /api/assets

Create a new asset.

**Request Body:**
```typescript
{
  name: string; // Required
  category: string; // Required
  subcategory?: string;
  source: "builtin" | "generated" | "imported" | "url_import"; // Required
  model_path: string; // Required, relative path (e.g., "models/furniture/chair.glb")
  thumbnail_path?: string;
  width?: number;
  height?: number;
  depth?: number;
  dimension_locked?: boolean; // Default: false
  source_url?: string;
  source_product_name?: string;
}
```

**Example Request:**
```json
{
  "name": "Modern Sofa",
  "category": "furniture",
  "subcategory": "seating",
  "source": "generated",
  "model_path": "models/generated-abc123.glb",
  "thumbnail_path": "thumbnails/generated-abc123.png",
  "width": 2.0,
  "height": 0.8,
  "depth": 0.9,
  "dimension_locked": true
}
```

**Response:**
```typescript
{
  asset: { /* same structure as GET response */ }
}
```

**Status Codes:**
- `201 Created`: Asset created successfully
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Database error

---

### PUT /api/assets/:id

Update an asset.

**Path Parameters:**
- `id` (number): Asset ID

**Request Body (all fields optional):**
```typescript
{
  name?: string;
  category?: string;
  subcategory?: string;
  width?: number;
  height?: number;
  depth?: number;
  dimension_locked?: boolean;
  thumbnail_path?: string;
}
```

**Response:**
```typescript
{
  asset: { /* same structure as GET response */ }
}
```

**Status Codes:**
- `200 OK`: Asset updated successfully
- `404 Not Found`: Asset doesn't exist
- `500 Internal Server Error`: Database error

**Notes:**
- `source` and `model_path` cannot be updated (immutable)

---

### DELETE /api/assets/:id

Delete an asset.

**Path Parameters:**
- `id` (number): Asset ID

**Response:**
```typescript
{
  message: "Asset deleted successfully"
}
```

**Status Codes:**
- `200 OK`: Asset deleted successfully
- `404 Not Found`: Asset doesn't exist
- `500 Internal Server Error`: Database error

**Notes:**
- Does NOT cascade delete furniture placements (preserves project history)
- Deleting an asset that's used in a project may cause missing models

---

### PUT /api/assets/:id/favorite

Toggle favorite status of an asset.

**Path Parameters:**
- `id` (number): Asset ID

**Response:**
```typescript
{
  asset: {
    /* full asset object with updated is_favorite field */
  }
}
```

**Status Codes:**
- `200 OK`: Favorite status toggled successfully
- `404 Not Found`: Asset doesn't exist
- `500 Internal Server Error`: Database error

---

## AI Generation API

### POST /api/ai/generate-from-photo

Generate a 3D furniture model from a photo using Microsoft TRELLIS API.

**Request:**
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `photo` (file, required): Image file (JPEG/PNG/WebP, max 10MB)
  - `name` (string, required): Name for the generated asset
  - `category` (string, optional): Asset category (default: "Furniture")
  - `subcategory` (string, optional): Asset subcategory

**Response:**
```typescript
{
  message: "AI generation completed successfully";
  asset: {
    id: number;
    name: string;
    category: string;
    subcategory: string | null;
    source: "generated";
    model_path: string; // e.g., "models/generated-abc123.glb"
    thumbnail_path: string; // Path to uploaded photo
    width: number;
    height: number;
    depth: number;
    dimension_locked: boolean;
    source_url: string | null;
    source_product_name: string | null;
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
  };
  generationId: number;
}
```

**Error Response (if generation fails):**
```typescript
{
  error: {
    message: "AI generation failed";
    details: string; // e.g., "TRELLIS API key not configured"
  };
  generationId: number;
}
```

**Status Codes:**
- `201 Created`: Model generated and asset created successfully
- `400 Bad Request`: No photo uploaded, missing name
- `500 Internal Server Error`: TRELLIS API error, generation failure

**Notes:**
- **Implementation Status**: Currently uses a placeholder simulation. Real TRELLIS API integration is a TODO.
- **Async Flow**: In production, this should be async (return generation ID, poll for completion)
- **API Key Required**: Must configure TRELLIS API key in settings first
- **Encrypted Storage**: API keys are stored encrypted in `user_settings` table

**TODO for Production:**
1. Implement actual TRELLIS API client
2. Upload image to TRELLIS
3. Poll for generation status (or use webhooks)
4. Download generated `.glb` model
5. Save to `assets/models/`
6. Create asset record with correct dimensions

---

## Export API

### POST /api/export/floorplan

Export a floor plan as PDF.

**Request Body:**
```typescript
{
  projectId: number; // Required
  floorId?: number; // Optional, if omitted exports all floors
  format?: "pdf"; // Currently only PDF is supported
}
```

**Example Request:**
```json
{
  "projectId": 5,
  "floorId": 12,
  "format": "pdf"
}
```

**Response:**
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="{project_name}_floorplan.pdf"`
- **Body**: Binary PDF file

**PDF Contains:**
- Project name and title
- One page per floor (or single floor if `floorId` specified)
- Top-down 2D view of rooms with walls
- Room labels and dimensions
- Scale indicator
- Unit system (metric/imperial)

**Status Codes:**
- `200 OK`: PDF generated and streamed successfully
- `400 Bad Request`: Missing projectId, unsupported format
- `404 Not Found`: Project or floor doesn't exist
- `500 Internal Server Error`: PDF generation error

**Notes:**
- Dimensions displayed in project's unit system (metric or imperial)
- Auto-scales floor plan to fit A4 landscape page
- Maximum scale: 1:50 (50 pixels per meter)

---

## Settings API

### GET /api/settings

Get all user settings.

**Response:**
```typescript
{
  settings: {
    [key: string]: string;
  }
}
```

**Example Response:**
```json
{
  "settings": {
    "unit_system": "metric",
    "render_quality": "high",
    "auto_save_interval": "60000",
    "performance_mode": "0",
    "trellis_api_key": "****abc123"
  }
}
```

**Status Codes:**
- `200 OK`: Success
- `500 Internal Server Error`: Database error

**Notes:**
- API keys are **masked** in response (show only last 4 characters)
- Encrypted values are automatically decrypted server-side

---

### PUT /api/settings

Update user settings.

**Request Body:**
```typescript
{
  settings: {
    [key: string]: string;
  }
}
```

**Example Request:**
```json
{
  "settings": {
    "unit_system": "imperial",
    "render_quality": "ultra",
    "trellis_api_key": "sk-proj-abc123def456"
  }
}
```

**Response:**
```typescript
{
  message: "Settings updated successfully";
  settings: {
    [key: string]: string; // Updated settings with masked API keys
  }
}
```

**Status Codes:**
- `200 OK`: Settings updated successfully
- `400 Bad Request`: Missing or invalid settings object
- `500 Internal Server Error`: Database error

**Notes:**
- **Encrypted Keys**: `trellis_api_key`, `openai_api_key`, `anthropic_api_key` are automatically encrypted
- **Masked Values**: If you send `****abc123` (masked value), it won't update the key
- **Encryption**: Uses AES-256-CBC with IV, key from `process.env.ENCRYPTION_KEY`

---

### GET /api/settings/api-key/:keyName

Get a decrypted API key (for internal backend use).

**Path Parameters:**
- `keyName` (string): Setting key name (e.g., "trellis_api_key")

**Response:**
```typescript
{
  key: string; // Decrypted API key
}
```

**Status Codes:**
- `200 OK`: API key retrieved and decrypted successfully
- `404 Not Found`: API key not found in settings
- `500 Internal Server Error`: Decryption error

**Notes:**
- **Internal Use Only**: This endpoint is used by backend services to get decrypted keys
- **Not for Frontend**: Frontend should never call this endpoint (use GET /api/settings instead)

---

## Health Check API

### GET /api/health

Health check endpoint to verify API and database are running.

**Response:**
```typescript
{
  status: "ok";
  message: "Home Designer API is running";
  database: {
    connected: boolean;
    healthy: boolean;
    type: "SQLite (sql.js)";
  }
}
```

**Error Response:**
```typescript
{
  status: "error";
  message: "Health check failed";
  database: {
    connected: boolean;
    error?: string;
  }
}
```

**Status Codes:**
- `200 OK`: API and database are healthy
- `500 Internal Server Error`: Database connection error

---

### GET /api/health/schema

Detailed database schema check (for debugging).

**Response:**
```typescript
{
  status: "ok" | "incomplete";
  tables: {
    found: string[]; // Tables found in database
    required: string[]; // Tables that should exist
    missing: string[]; // Tables that are missing
    count: number;
  };
  foreignKeysEnabled: boolean;
  tableDetails: {
    [tableName: string]: Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;
  };
  allTablesExist: boolean;
}
```

**Status Codes:**
- `200 OK`: Schema check completed
- `500 Internal Server Error`: Database error

**Notes:**
- **Required Tables**: projects, floors, rooms, walls, assets, asset_tags, furniture_placements, lights, windows, doors, edit_history, ai_generations, user_settings, material_presets
- **Foreign Keys**: Should be enabled (`PRAGMA foreign_keys = ON`)

---

### POST /api/debug/save-db

Manually trigger database save and verify persistence (for debugging).

**Response:**
```typescript
{
  status: "ok" | "mismatch" | "error";
  message: string;
  inMemory: {
    count: number; // Project count in memory
    maxId: number; // Max project ID in memory
  };
  onDisk: {
    count: number; // Project count on disk
    maxId: number; // Max project ID on disk
  };
  path: string; // Database file path
  persisted: boolean; // True if in-memory matches on-disk
}
```

**Status Codes:**
- `200 OK`: Save triggered and verified successfully
- `500 Internal Server Error`: Save or verification error

**Notes:**
- **Debugging Only**: Used to verify sql.js persistence is working correctly
- Manually calls `saveDatabase()` and checks disk file

---

## Appendix: Database Schema Summary

### Tables

- **projects**: Project metadata
- **floors**: Floor levels within projects
- **rooms**: Room geometry and materials
- **walls**: Wall segments in rooms
- **windows**: Windows on walls
- **doors**: Doors on walls
- **assets**: 3D model library
- **asset_tags**: Tags for asset search
- **furniture_placements**: Placed furniture in rooms
- **lights**: Lighting fixtures
- **edit_history**: Undo/redo history
- **ai_generations**: AI generation job tracking
- **user_settings**: Application settings
- **material_presets**: Reusable materials

### Relationships

```
projects → floors → rooms → walls → windows/doors
                           → furniture_placements → assets
                           → lights
```

**CASCADE DELETE:**
- Deleting a project deletes all floors, rooms, walls, furniture, lights
- Deleting a floor deletes all rooms and their contents
- Deleting a room deletes all walls, furniture, lights
- Deleting a wall deletes all windows and doors
- **Note**: Deleting an asset does NOT delete furniture placements (preserves history)

---

## Changelog

**Version 1.0** (2026-02-27)
- Initial API reference documentation
- All endpoints documented with request/response types
- Common patterns and error codes documented
- Database schema summary added
