# Folder Structure & File Map

**Annotated Directory Tree** — Find any file or understand any folder's purpose at a glance.

## Table of Contents
- [Project Root](#project-root)
- [Frontend (`frontend/`)](#frontend-frontend)
- [Backend (`backend/`)](#backend-backend)
- [Assets (`assets/`)](#assets-assets)
- [Documentation (`docs/`)](#documentation-docs)
- [Infrastructure](#infrastructure)
- [Where Does X Go? Quick Reference](#where-does-x-go-quick-reference)

---

## Project Root

```
home-designer/
├── README.md                          # User-facing documentation (setup, features, usage)
├── CONTRIBUTING.md                    # Contributor guidelines, coding standards, PR process
├── LICENSE                            # MIT license text
├── package.json                       # Root workspace dependencies (better-sqlite3, playwright)
├── package-lock.json                  # Dependency lock file
├── init.sh                            # Development setup script (macOS/Linux/Git Bash)
├── install-and-run.bat                # Windows setup script (non-technical users)
├── .gitignore                         # Git exclusions (node_modules, logs, screenshots, etc.)
├── .env.example                       # Environment variable template (not tracked)
│
├── frontend/                          # React + Three.js frontend application
├── backend/                           # Express + SQLite backend API
├── assets/                            # Static assets (3D models, textures, thumbnails)
├── docs/                              # Project documentation (AI context, vision, file map)
│
├── .github/                           # GitHub-specific configuration
├── .autoforge/                        # AI orchestration and feature management
├── .playwright/                       # Playwright browser automation cache
├── .playwright-cli/                   # Playwright CLI test artifacts (screenshots, logs)
├── .claude/                           # Claude AI session configuration
└── prompts/                           # AI agent prompt templates
```

### Root Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Root workspace metadata, shared dependencies (better-sqlite3, playwright) |
| `package-lock.json` | Dependency lock file for reproducible installs |
| `.gitignore` | Excludes: node_modules, dist, database.db, logs, screenshots, test artifacts |
| `.env.example` | Template for environment variables (DATABASE_PATH, TRELLIS_API_KEY, etc.) |

### Setup Scripts

| File | Purpose |
|------|---------|
| `init.sh` | Bash script: checks Node.js, installs deps, inits DB, starts servers |
| `install-and-run.bat` | Windows batch script: same as init.sh but for CMD/PowerShell |

---

## Frontend (`frontend/`)

```
frontend/
├── index.html                         # HTML entry point (mounts #root, imports main.tsx)
├── package.json                       # Frontend dependencies (React, Three.js, Vite, Tailwind)
├── package-lock.json                  # Frontend dependency lock file
│
├── vite.config.ts                     # Vite build configuration (React plugin, dev server)
├── tsconfig.json                      # TypeScript configuration (strict mode, paths)
├── tsconfig.node.json                 # TypeScript config for Node.js scripts (Vite config)
├── tailwind.config.js                 # Tailwind CSS configuration (theme, colors, plugins)
├── postcss.config.js                  # PostCSS configuration (Tailwind, autoprefixer)
│
├── src/                               # Source code
│   ├── main.tsx                       # Entry point (renders App into #root)
│   ├── App.tsx                        # Root component (React Router, Toaster, routes)
│   ├── index.css                      # Global styles (Tailwind imports, fonts, CSS vars)
│   │
│   ├── components/                    # React components
│   │   ├── ProjectHub.tsx             # Landing page: project list, create/delete projects
│   │   ├── Editor.tsx                 # Main editor: toolbar, viewport, panels orchestration
│   │   ├── Viewport3D.tsx             # 3D scene: React Three Fiber canvas, camera, lights
│   │   ├── AssetLibrary.tsx           # Left sidebar: furniture library, drag-and-drop
│   │   ├── PropertiesPanel.tsx        # Right sidebar: object properties, room details
│   │   ├── FloorSwitcher.tsx          # Floor navigation: tabs for switching floors
│   │   ├── SettingsModal.tsx          # App settings: units, performance, AI API keys
│   │   ├── ExportModal.tsx            # Export dialog: screenshots, 3D, floor plans, backups
│   │   ├── AIGenerationModal.tsx      # AI generation UI: image-to-3D with TRELLIS
│   │   ├── URLImportModal.tsx         # Import furniture from product URLs
│   │   ├── EditHistory.tsx            # Undo/redo history panel
│   │   ├── ContextMenu.tsx            # Right-click context menu
│   │   ├── WallMesh.tsx               # Custom Three.js component for rendering walls
│   │   ├── AssetDetailsModal.tsx      # Asset details dialog
│   │   ├── DeleteRoomDialog.tsx       # Confirm room deletion
│   │   ├── DeleteFloorDialog.tsx      # Confirm floor deletion
│   │   └── NotFound.tsx               # 404 page
│   │
│   ├── store/                         # Zustand state management
│   │   └── editorStore.ts             # Editor state: tools, selections, undo/redo, camera
│   │
│   └── lib/                           # Utilities and helpers
│       ├── api.ts                     # API client: fetch wrappers for backend endpoints
│       └── units.ts                   # Unit conversion: meters ↔ feet
│
├── dist/                              # Build output (gitignored, generated by `npm run build`)
└── node_modules/                      # Dependencies (gitignored)
```

### Frontend Component Breakdown

#### **Main Pages**
- `ProjectHub.tsx` — Landing page, project management
- `Editor.tsx` — Main editor workspace with all panels
- `NotFound.tsx` — 404 error page

#### **Editor Components**
- `Viewport3D.tsx` — 3D scene rendering (Three.js canvas)
- `AssetLibrary.tsx` — Furniture library sidebar (left)
- `PropertiesPanel.tsx` — Properties sidebar (right)
- `FloorSwitcher.tsx` — Floor navigation tabs (right edge)
- `EditHistory.tsx` — Undo/redo history panel

#### **Modal Dialogs**
- `SettingsModal.tsx` — App settings (units, performance, AI keys)
- `ExportModal.tsx` — Export options (screenshots, 3D, floor plans)
- `AIGenerationModal.tsx` — AI image-to-3D generation
- `URLImportModal.tsx` — Import furniture from URLs
- `AssetDetailsModal.tsx` — View asset details
- `DeleteRoomDialog.tsx` — Confirm room deletion
- `DeleteFloorDialog.tsx` — Confirm floor deletion

#### **3D Components**
- `WallMesh.tsx` — Custom Three.js wall rendering
- `ContextMenu.tsx` — Right-click menu for 3D objects

#### **State & Utils**
- `store/editorStore.ts` — Zustand state (tools, selections, undo/redo)
- `lib/api.ts` — API client with fetch wrappers
- `lib/units.ts` — Metric/imperial unit conversion

### Frontend Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Dev server (port 5173), React plugin, build settings |
| `tsconfig.json` | TypeScript strict mode, path aliases, React JSX |
| `tailwind.config.js` | Theme (colors, fonts), dark mode, animations |
| `postcss.config.js` | Tailwind + autoprefixer integration |

---

## Backend (`backend/`)

```
backend/
├── package.json                       # Backend dependencies (Express, sql.js, multer, etc.)
├── package-lock.json                  # Backend dependency lock file
│
├── src/                               # Source code
│   ├── server.js                      # Express app: entry point, middleware, routes
│   │
│   ├── db/                            # Database layer
│   │   ├── connection.js              # sql.js instance, auto-save logic, DB lifecycle
│   │   ├── init.js                    # Schema creation, initial data seeding
│   │   └── migrations/                # Schema migrations
│   │       └── add_light_properties.js # Example migration (light table columns)
│   │
│   └── routes/                        # API route handlers
│       ├── projects.js                # /api/projects — CRUD for projects
│       ├── floors.js                  # /api/projects/:id/floors, /api/floors/:id
│       ├── rooms.js                   # /api/floors/:id/rooms, /api/rooms/:id
│       ├── walls.js                   # /api/rooms/:id/walls, /api/walls/:id
│       ├── furniture.js               # /api/rooms/:id/furniture, /api/furniture/:id
│       ├── assets.js                  # /api/assets — furniture library management
│       ├── settings.js                # /api/settings — user settings CRUD
│       ├── ai.js                      # /api/ai/* — TRELLIS integration, AI generation
│       └── export.js                  # /api/export/* — screenshots, 3D exports, PDFs
│
├── database.db                        # SQLite database file (auto-created, gitignored)
└── node_modules/                      # Dependencies (gitignored)
```

### Backend Routes

| Route File | Endpoints | Purpose |
|------------|-----------|---------|
| `projects.js` | `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`, `PUT /api/projects/:id`, `DELETE /api/projects/:id` | Project CRUD |
| `floors.js` | `GET /api/projects/:id/floors`, `POST /api/projects/:id/floors`, `GET /api/floors/:id`, `PUT /api/floors/:id`, `DELETE /api/floors/:id` | Floor management |
| `rooms.js` | `GET /api/floors/:id/rooms`, `POST /api/floors/:id/rooms`, `GET /api/rooms/:id`, `PUT /api/rooms/:id`, `DELETE /api/rooms/:id` | Room CRUD |
| `walls.js` | `GET /api/rooms/:id/walls`, `POST /api/rooms/:id/walls`, `GET /api/walls/:id`, `PUT /api/walls/:id`, `DELETE /api/walls/:id` | Wall management |
| `furniture.js` | `GET /api/rooms/:id/furniture`, `POST /api/rooms/:id/furniture`, `GET /api/furniture/:id`, `PUT /api/furniture/:id`, `DELETE /api/furniture/:id` | Furniture placement |
| `assets.js` | `GET /api/assets`, `POST /api/assets`, `GET /api/assets/:id`, `PUT /api/assets/:id`, `DELETE /api/assets/:id` | Asset library |
| `settings.js` | `GET /api/settings`, `PUT /api/settings/:key` | User settings |
| `ai.js` | `POST /api/ai/generate-3d`, `POST /api/ai/photo-to-room`, `GET /api/ai/generations` | AI features |
| `export.js` | `POST /api/export/screenshot`, `POST /api/export/3d`, `POST /api/export/floor-plan`, `POST /api/export/backup` | Export features |

### Database Layer

| File | Purpose |
|------|---------|
| `db/connection.js` | sql.js initialization, in-memory DB with file persistence, auto-save every 5s |
| `db/init.js` | Creates all tables, seeds initial data, runs on first startup |
| `db/migrations/` | Schema migrations for database updates (forward compatibility) |

### Database Schema (14 Tables)

| Table | Purpose |
|-------|---------|
| `projects` | Top-level projects (name, description, settings, timestamps) |
| `floors` | Floors within projects (name, level, order) |
| `rooms` | Rooms on floors (dimensions, position, materials, ceiling height) |
| `walls` | Wall segments in rooms (start/end points, height, thickness) |
| `windows` | Window openings in walls (position, size, style) |
| `doors` | Door openings in walls (position, size, style, swing direction) |
| `furniture_placements` | Placed furniture in rooms (position, rotation, scale, locked) |
| `assets` | Furniture library (name, category, dimensions, model path) |
| `asset_tags` | Tags for asset categorization (many-to-many) |
| `lights` | Light fixtures (position, type, intensity, color, shadows) |
| `edit_history` | Undo/redo stack (action type, before/after state, timestamps) |
| `ai_generations` | AI generation history (prompt, result, status, timestamps) |
| `user_settings` | App preferences (units, performance, API keys) |
| `material_presets` | Material library (textures, colors, properties) |

---

## Assets (`assets/`)

```
assets/
├── models/                            # 3D models (glTF/GLB format)
│   └── .gitkeep                       # Placeholder (actual models gitignored or uploaded)
│
├── textures/                          # Material textures (wood, tile, carpet, etc.)
│   └── .gitkeep                       # Placeholder
│
└── thumbnails/                        # Asset preview images (for library UI)
    └── .gitkeep                       # Placeholder
```

### Asset Storage

- **3D Models:** `.glb` or `.gltf` files (primary format for Three.js)
- **Textures:** `.jpg`, `.png`, `.ktx2` (compressed textures for performance)
- **Thumbnails:** `.jpg` or `.png` (preview images for asset library)

**Note:** The `assets/` directory is served statically by Express (`/assets` endpoint) and referenced in the database (`assets.model_path`, `material_presets.texture_path`).

---

## Documentation (`docs/`)

```
docs/
├── AI_CONTEXT.md                      # AI agent master context (start here!)
├── VISION.md                          # Project vision, design philosophy, "why" decisions
├── FILE_MAP.md                        # This file: annotated directory tree
├── ARCHITECTURE.md                    # (Optional) Detailed architecture documentation
└── FRONTEND.md                        # (Optional) Frontend-specific deep dive
```

### Documentation Index

| Document | Audience | Purpose |
|----------|----------|---------|
| `AI_CONTEXT.md` | **AI coding agents** | Quick reference: tech stack, architecture, patterns, file paths |
| `VISION.md` | **AI agents & contributors** | Design philosophy, "why" behind decisions, future roadmap |
| `FILE_MAP.md` | **AI agents & contributors** | Find any file, understand project structure |
| `../README.md` | **End users** | Setup instructions, feature overview, usage guide |
| `../CONTRIBUTING.md` | **Contributors** | Contribution guidelines, coding standards, PR checklist |

---

## Infrastructure

### GitHub (`.github/`)

```
.github/
└── workflows/
    └── ci.yml                         # GitHub Actions CI: lint, build, test on push/PR
```

**CI Workflow:** Runs on push to `main` and all pull requests. Checks:
1. Install dependencies (frontend & backend)
2. Lint frontend code (`npm run lint`)
3. Build frontend (`npm run build`)

### AI Orchestration (`.autoforge/`)

```
.autoforge/
├── features.db                        # Feature management database (SQLite)
├── assistant.db                       # Assistant configuration database
├── allowed_commands.yaml              # Command whitelist for safety
├── prompts/                           # Custom prompt templates
└── .agent.lock                        # Agent session lock file
```

**Purpose:** Manages autonomous coding agents, tracks feature implementation progress, coordinates parallel agent work.

### Browser Testing (`.playwright/`, `.playwright-cli/`)

```
.playwright/                           # Playwright browser binaries cache
.playwright-cli/                       # Test artifacts (screenshots, console logs)
    ├── screenshot-*.png               # Visual snapshots
    ├── snapshot-*.yaml                # Page structure snapshots
    └── console-*.log                  # Browser console output
```

**Purpose:** End-to-end browser automation for feature verification.

### Claude AI (`.claude/`)

```
.claude/
└── (session configuration)            # Claude Code IDE settings
```

### Prompts (`prompts/`)

```
prompts/
├── coding_prompt.md                   # Coding agent instructions
├── initializer_prompt.md              # Project initialization agent instructions
└── testing_prompt.md                  # Testing agent instructions
```

---

## Where Does X Go? Quick Reference

### "I need to add..."

| What | Where | Notes |
|------|-------|-------|
| **New React component** | `frontend/src/components/` | Import into `Editor.tsx` or `ProjectHub.tsx` |
| **New API endpoint** | `backend/src/routes/` | Create new file or add to existing route file |
| **New database table** | `backend/src/db/init.js` | Add CREATE TABLE statement |
| **New Zustand state** | `frontend/src/store/editorStore.ts` | Add to state interface and actions |
| **New utility function** | `frontend/src/lib/` or `backend/src/utils/` | Create new file or add to existing util |
| **New 3D component** | `frontend/src/components/` | Follow `WallMesh.tsx` pattern |
| **New furniture asset** | `assets/models/` + DB entry | Upload .glb file, add to `assets` table |
| **New texture/material** | `assets/textures/` + DB entry | Upload image, add to `material_presets` table |
| **New documentation** | `docs/` | Markdown file, link from `docs/AI_CONTEXT.md` |
| **New test script** | Root directory (gitignored) | Name: `test-*.js`, use playwright-cli |

### "I need to find..."

| What | Where | Command |
|------|-------|---------|
| **API endpoint handler** | `backend/src/routes/*.js` | Grep for endpoint path |
| **React component** | `frontend/src/components/*.tsx` | Grep for component name |
| **State management** | `frontend/src/store/editorStore.ts` | Look for Zustand store |
| **Database schema** | `backend/src/db/init.js` | Search for `CREATE TABLE` |
| **API client calls** | `frontend/src/lib/api.ts` | All fetch wrappers here |
| **Tailwind config** | `frontend/tailwind.config.js` | Theme, colors, plugins |
| **TypeScript types** | `frontend/src/store/editorStore.ts` | Interfaces at top of file |
| **Environment variables** | `.env.example` | Template for `.env` file |

### "I need to modify..."

| What | Where | Notes |
|------|-------|-------|
| **Color scheme** | `frontend/src/index.css` | CSS custom properties (`:root`, `.dark`) |
| **Font** | `frontend/src/index.css` | Google Fonts import, font-family |
| **Database schema** | `backend/src/db/init.js` + migration | Add migration to `db/migrations/` |
| **API base URL** | `frontend/src/lib/api.ts` | Change `API_BASE_URL` constant |
| **Dev server port** | `frontend/vite.config.ts`, `backend/src/server.js` | Update port numbers |
| **Build output** | `frontend/vite.config.ts` | Change `build.outDir` |
| **Global styles** | `frontend/src/index.css` | Tailwind utilities, CSS rules |

### "I'm debugging..."

| Issue | Check | Files |
|-------|-------|-------|
| **API call fails** | Network tab, backend logs | `frontend/src/lib/api.ts`, `backend/src/routes/` |
| **3D scene broken** | Browser console, R3F errors | `frontend/src/components/Viewport3D.tsx` |
| **State not updating** | Zustand DevTools | `frontend/src/store/editorStore.ts` |
| **Database error** | Backend terminal logs | `backend/src/db/connection.js`, `backend/src/db/init.js` |
| **Styling issue** | Inspect element, Tailwind classes | `frontend/src/components/`, `frontend/tailwind.config.js` |
| **Build fails** | Terminal output | `frontend/vite.config.ts`, `frontend/tsconfig.json` |
| **Test fails** | `.playwright-cli/` artifacts | Screenshots, console logs, snapshots |

---

## File Naming Conventions

### Frontend
- **Components:** PascalCase `.tsx` (e.g., `ProjectHub.tsx`, `Viewport3D.tsx`)
- **Utilities:** camelCase `.ts` (e.g., `api.ts`, `units.ts`)
- **Styles:** kebab-case `.css` (e.g., `index.css`)
- **Config:** kebab-case `.js` or `.ts` (e.g., `vite.config.ts`, `tailwind.config.js`)

### Backend
- **Routes:** kebab-case `.js` (e.g., `projects.js`, `furniture.js`)
- **Database:** kebab-case `.js` (e.g., `connection.js`, `init.js`)
- **Migrations:** snake_case `.js` (e.g., `add_light_properties.js`)

### Assets
- **Models:** kebab-case `.glb` or `.gltf` (e.g., `modern-chair.glb`)
- **Textures:** kebab-case `.jpg` or `.png` (e.g., `oak-wood-texture.jpg`)
- **Thumbnails:** kebab-case `.jpg` or `.png` (e.g., `modern-chair-thumb.jpg`)

### Documentation
- **Docs:** UPPERCASE `.md` (e.g., `AI_CONTEXT.md`, `VISION.md`, `FILE_MAP.md`)
- **Root docs:** UPPERCASE `.md` (e.g., `README.md`, `CONTRIBUTING.md`)

---

## Excluded from Git

These files/folders are gitignored but important for development:

```
# Dependencies
node_modules/                          # npm packages (frontend, backend, root)

# Build output
frontend/dist/                         # Vite production build

# Database
backend/database.db                    # SQLite database file
backend/database.db-shm                # SQLite shared memory
backend/database.db-wal                # SQLite write-ahead log

# Environment
.env                                   # Environment variables (secrets)

# Logs
*.log                                  # Server logs, error logs

# Test artifacts
test-*.js                              # Test scripts
*.png (root)                           # Screenshots
*.jpg (root)                           # Screenshots
SESSION-*.md                           # Session documentation

# IDE
.vscode/                               # VS Code settings
.idea/                                 # JetBrains IDE settings

# OS
.DS_Store                              # macOS metadata
Thumbs.db                              # Windows thumbnails
```

---

## Summary Statistics

- **Total Components:** 18 React components
- **Total Routes:** 9 API route files (50+ endpoints)
- **Total Database Tables:** 14 tables
- **Total Documentation Files:** 5+ markdown files
- **Configuration Files:** 10+ config files
- **Lines of Code:** ~15,000+ (estimated)

---

**Last Updated:** 2026-02-27
**Project Version:** 0.1.0
**Maintained By:** AI agents and contributors

**Can't find what you need?** Check:
1. **File paths** in `docs/AI_CONTEXT.md`
2. **Design decisions** in `docs/VISION.md`
3. **Code patterns** in `CONTRIBUTING.md`
4. **Grep the codebase** for keywords

**Pro tip:** Use `grep -r "search term" frontend/src/` or `grep -r "API endpoint" backend/src/routes/` to find specific code.
