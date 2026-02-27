# Home Designer - Feature Implementation Plan

**Created:** 2026-02-27
**Status:** Planning

This document tracks remaining features and improvements needed to fully implement the original design specification.

---

## Phase 1: Room View Settings & Transparency ⏳

**Priority:** High | **Effort:** Medium | **Dependencies:** None

### Features
- [ ] **1.1** Per-room transparency control (0-100% opacity slider)
- [ ] **1.2** View Settings context menu for rooms (not just global settings)
- [ ] **1.3** Show/hide individual room elements (floor, ceiling, walls)
- [ ] **1.4** X-ray mode toggle (see through walls to visualize furniture layout)
- [ ] **1.5** Wireframe view mode per room

### Implementation Notes
- Add `opacity`, `showFloor`, `showCeiling`, `showWalls` to room state in Zustand
- Update `Viewport3D.tsx` RoomMesh to use opacity from room data
- Create `RoomViewSettings` modal/panel accessible via right-click context menu
- Store view settings per room in database (add columns to `rooms` table)

### Files to Modify
- `frontend/src/components/Viewport3D.tsx` - Room rendering with opacity
- `frontend/src/store/editorStore.ts` - Room view state
- `frontend/src/components/PropertiesPanel.tsx` - Add view settings section
- `backend/src/db/init.js` - Add room view columns
- `backend/src/routes/rooms.js` - Handle view settings updates

---

## Phase 2: Lighting System Enhancements 🔦

**Priority:** High | **Effort:** Medium | **Dependencies:** None

### Features
- [ ] **2.1** Dedicated "Place Light" tool in toolbar
- [ ] **2.2** Light types: Point, Spot, Area, Ambient per room
- [ ] **2.3** Light cone angle for spotlights
- [ ] **2.4** Light color temperature presets (warm/neutral/cool)
- [ ] **2.5** Shadow casting toggle per light
- [ ] **2.6** Natural window light simulation (daylight through windows)
- [ ] **2.7** Real-time shadow preview
- [ ] **2.8** Light intensity presets (dim/normal/bright)

### Current State
- ✅ Day/night toggle exists
- ✅ Point lights on lighting furniture assets
- ✅ Light intensity/color in properties panel
- ❌ No dedicated light placement tool
- ❌ No spotlight/area lights
- ❌ No window light simulation

### Implementation Notes
- Use existing `lights` table in database
- Add `lights.js` route file for CRUD
- Extend toolbar with "Add Light" dropdown (point/spot/area)
- SpotLight component with cone visualization
- WindowLight component that casts directional light based on window position

### Files to Modify
- `frontend/src/components/Viewport3D.tsx` - Light rendering, gizmos
- `frontend/src/components/Editor.tsx` - Add light tool to toolbar
- `frontend/src/components/PropertiesPanel.tsx` - Light-specific properties
- `backend/src/routes/lights.js` - CREATE (new file)
- `frontend/src/lib/api.ts` - lightsApi

---

## Phase 3: TRELLIS API Integration 🤖

**Priority:** High | **Effort:** High | **Dependencies:** API Key

### Features
- [ ] **3.1** Real Microsoft TRELLIS API integration (replace placeholder)
- [ ] **3.2** Image upload to TRELLIS endpoint
- [ ] **3.3** Polling for generation status
- [ ] **3.4** Download and save generated .glb model
- [ ] **3.5** Auto-extract dimensions from generated model
- [ ] **3.6** Generation progress with percentage
- [ ] **3.7** Retry with different parameters on failure
- [ ] **3.8** Cancel generation in progress
- [ ] **3.9** AI dimension estimation from photo (fallback)

### Current State
- ✅ Upload UI exists
- ✅ API endpoint structure exists
- ❌ Actual TRELLIS API calls are simulated
- ❌ No real model download
- ❌ No dimension extraction

### API Flow (to implement)
```
1. POST /api/ai/generate-from-photo
   → Upload image to TRELLIS
   → Return job_id

2. GET /api/ai/generation/:id (polling)
   → Check TRELLIS job status
   → When complete: download .glb, save to assets/models/

3. POST /api/ai/generation/:id/retry
   → Re-submit with adjusted parameters
```

### Files to Modify
- `backend/src/routes/ai.js` - Implement real TRELLIS client
- `frontend/src/components/AIGenerationModal.tsx` - Progress UI, polling
- Add `backend/src/services/trellis.js` - TRELLIS API client class

### External Dependencies
- Microsoft TRELLIS API documentation
- API key from user settings

---

## Phase 4: Floor Plan Upload & Processing 📐

**Priority:** Medium | **Effort:** High | **Dependencies:** AI/CV Service

### Features
- [ ] **4.1** Upload floor plan image (PNG/JPG)
- [ ] **4.2** AI detection of walls from floor plan
- [ ] **4.3** AI detection of rooms/spaces
- [ ] **4.4** Manual adjustment of detected walls
- [ ] **4.5** Scale calibration (user marks known dimension)
- [ ] **4.6** Door/window detection from floor plan
- [ ] **4.7** Export processed floor plan as room structure

### Implementation Options
1. **OpenCV-based** (local): Edge detection + contour finding
2. **AI-based** (API): Use vision model to extract room structure
3. **Manual tracing**: User traces over floor plan image

### Suggested Approach (Hybrid)
1. Upload image → display as background in viewport
2. User sets scale by drawing a line and entering length
3. User traces walls manually OR AI suggests wall positions
4. Confirm and create rooms from traced structure

### Files to Modify
- `frontend/src/components/Editor.tsx` - Floor plan overlay mode
- `frontend/src/components/Viewport3D.tsx` - Background image plane
- `backend/src/routes/floors.js` - POST /floors/:id/upload-floorplan
- `backend/src/services/floorplan.js` - CREATE (processing logic)

---

## Phase 5: Advanced Room Editing 🏠

**Priority:** Medium | **Effort:** Medium | **Dependencies:** Phase 1

### Features
- [ ] **5.1** L-shaped rooms (multiple connected rectangles)
- [ ] **5.2** Angled walls (non-90° corners)
- [ ] **5.3** Curved walls (arc segments)
- [ ] **5.4** Wall thickness control
- [ ] **5.5** Room merging (combine two rooms)
- [ ] **5.6** Room splitting (divide with new wall)
- [ ] **5.7** Staircase placement between floors
- [ ] **5.8** Floor openings (double-height spaces)

### Current State
- ✅ Rectangular rooms work well
- ✅ Room attachment (snap to existing rooms)
- ❌ No L-shapes or irregular rooms
- ❌ No curved/angled walls
- ❌ No staircases

---

## Phase 6: First-Person & Camera Modes 🎥

**Priority:** Low | **Effort:** Medium | **Dependencies:** None

### Features
- [ ] **6.1** First-person walkthrough (WASD + mouse look)
- [ ] **6.2** Collision detection (can't walk through walls)
- [ ] **6.3** Smooth camera transitions between modes
- [ ] **6.4** VR-ready camera (future WebXR support)
- [ ] **6.5** Camera animation paths (fly-through recording)
- [ ] **6.6** Minimap with camera position indicator

### Current State
- ✅ Orbit camera works
- ✅ Day/night toggle
- ❌ No first-person mode
- ❌ No collision

---

## Phase 7: Export Enhancements 📤

**Priority:** Low | **Effort:** Low | **Dependencies:** None

### Features
- [ ] **7.1** Before/after comparison export
- [ ] **7.2** Camera angle matching (upload "before" photo)
- [ ] **7.3** High-res render export (2x, 4x resolution)
- [ ] **7.4** Animation export (turntable, walkthrough)
- [ ] **7.5** Material list export (CSV with all materials used)

---

## Phase 8: Performance & Polish ✨

**Priority:** Medium | **Effort:** Medium | **Dependencies:** All above

### Features
- [ ] **8.1** Level of Detail (LOD) for furniture models
- [ ] **8.2** Texture compression (KTX2/Basis)
- [ ] **8.3** Model instancing (same furniture = shared geometry)
- [ ] **8.4** Lazy loading for large asset library
- [ ] **8.5** Performance mode (reduced shadows, lower quality)
- [ ] **8.6** Project complexity warning
- [ ] **8.7** Keyboard shortcuts panel (Cmd+K / Ctrl+K)

---

## Implementation Priority Order

| Phase | Name | Priority | Effort | Start After |
|-------|------|----------|--------|-------------|
| 1 | Room Transparency | High | Medium | Now |
| 2 | Lighting System | High | Medium | Phase 1 |
| 3 | TRELLIS API | High | High | Anytime |
| 4 | Floor Plan Upload | Medium | High | Phase 3 |
| 5 | Advanced Room Editing | Medium | Medium | Phase 1 |
| 6 | First-Person Camera | Low | Medium | Anytime |
| 7 | Export Enhancements | Low | Low | Anytime |
| 8 | Performance & Polish | Medium | Medium | All above |

---

## Quick Wins (Can Do Now)

1. **Room opacity slider** in properties panel (1-2 hours)
2. **View Settings context menu** opens room properties (30 min)
3. **Light placement tool** in toolbar (2-3 hours)
4. **Spotlight support** with cone angle (2 hours)
5. **TRELLIS API key validation** endpoint (1 hour)

---

## Getting Started

To begin implementation, run:

```bash
cd D:\repos\home-designer
.\install-and-run.bat
```

Then start with Phase 1 - Room Transparency. The first task is adding opacity controls to the Properties Panel when a room is selected.
