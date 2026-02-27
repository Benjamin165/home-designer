# Dependencies & Environment Reference

**📦 Complete Dependency Guide** — Every dependency, why it's used, what breaks without it, and how to manage them.

This document provides a complete reference of all project dependencies, configuration files, environment variables, and the build/development pipeline.

## Table of Contents

1. [Frontend Dependencies](#frontend-dependencies)
2. [Backend Dependencies](#backend-dependencies)
3. [Dev Dependencies](#dev-dependencies)
4. [Environment Variables](#environment-variables)
5. [Configuration Files](#configuration-files)
6. [Build Pipeline](#build-pipeline)
7. [Dependency Update Guide](#dependency-update-guide)
8. [Troubleshooting Dependencies](#troubleshooting-dependencies)

---

## Frontend Dependencies

**Location:** `frontend/package.json`

### Core Framework

#### `react@^18.2.0`
- **Purpose:** Core UI framework for the entire application
- **What depends on it:** Everything in the frontend - components, state, rendering
- **Breaking without it:** Application won't run at all
- **Notes:** React 18 introduced concurrent rendering features used for smooth 3D viewport updates

#### `react-dom@^18.2.0`
- **Purpose:** DOM-specific methods for React (mounting, rendering to browser)
- **What depends on it:** `main.tsx` uses `ReactDOM.createRoot()` to mount the app
- **Breaking without it:** React cannot render to the browser
- **Notes:** Always matches React version exactly

#### `typescript@^5.2.2` (dev)
- **Purpose:** Static type checking and TypeScript compilation
- **What depends on it:** All `.ts` and `.tsx` files
- **Breaking without it:** Build fails, no type safety
- **Notes:** TypeScript is a dev dependency but essential for development

---

### Three.js Ecosystem

The 3D rendering stack is the heart of Home Designer's visualization capabilities.

#### `three@^0.160.0`
- **Purpose:** Core 3D graphics library (WebGL wrapper)
- **What depends on it:** All 3D rendering - rooms, furniture, materials, lighting, camera
- **Breaking without it:** No 3D visualization whatsoever
- **Notes:**
  - Three.js is unopinionated - we use React Three Fiber to integrate it with React
  - Version 0.160 is relatively stable; newer versions may have breaking API changes
  - File size: ~600KB minified

#### `@react-three/fiber@^8.15.0`
- **Purpose:** React renderer for Three.js (replaces imperative Three.js code with declarative React components)
- **What depends on it:** `Viewport3D.tsx`, all 3D scene components
- **Breaking without it:** Cannot use Three.js in React (would require manual imperative setup)
- **Key features:**
  - `<Canvas>` component wraps Three.js scene
  - React components for Three.js objects (`<mesh>`, `<boxGeometry>`, `<meshStandardMaterial>`)
  - Automatic disposal of Three.js objects on unmount (prevents memory leaks)
  - Hooks: `useThree()`, `useFrame()`, `useLoader()`
- **Notes:** Tightly coupled to Three.js version - always check compatibility

#### `@react-three/drei@^9.92.0`
- **Purpose:** Helper components and utilities for React Three Fiber
- **What depends on it:** Camera controls, gizmos, environment, effects
- **Key components used:**
  - `<OrbitControls>` - Camera orbiting, panning, zooming (used in `Viewport3D.tsx`)
  - `<PivotControls>` - Transform gizmo for moving/rotating/scaling furniture
  - `<Grid>` - 3D grid overlay (toggleable)
  - `<Environment>` - HDRI environment lighting (future feature)
  - `<Text>` - 3D text labels for dimensions
  - `<Html>` - Render HTML overlays in 3D space (used for dimension labels)
  - Loaders: `useGLTF()`, `useTexture()` for loading assets
- **Breaking without it:** Would need to implement all these helpers manually
- **Notes:**
  - Sehr large package (~1MB) - includes many optional features
  - Tree-shakeable - only imports what you use

---

### State Management

#### `zustand@^4.4.7`
- **Purpose:** Lightweight state management (alternative to Redux/Context)
- **What depends on it:** `editorStore.ts` - global editor state
- **State managed:**
  - Current tool (`select`, `draw-wall`, `measure`, etc.)
  - Selected objects (rooms, furniture, walls)
  - Camera positions per floor
  - Undo/redo history
  - Furniture placements
  - Grid visibility, lighting mode
- **Breaking without it:** Components can't share state (would need prop drilling or Context API)
- **Why Zustand over Redux:**
  - Much simpler API (no boilerplate)
  - Better TypeScript support
  - Smaller bundle size (~1KB vs ~20KB for Redux)
  - Works with React concurrent mode

---

### UI Component Library (shadcn/ui)

shadcn/ui is a **copyable component library** (not a package). Components are copied into `src/components/ui/` as source files.

#### Dependencies used by shadcn/ui:

#### `class-variance-authority@^0.7.0` (CVA)
- **Purpose:** Utility for creating variant-based component APIs
- **What depends on it:** UI components with variants (buttons, cards, etc.)
- **Example:**
  ```tsx
  const buttonVariants = cva("base-styles", {
    variants: {
      variant: { default: "...", destructive: "...", outline: "..." },
      size: { sm: "...", md: "...", lg: "..." }
    }
  });
  ```
- **Breaking without it:** UI component variants won't work

#### `clsx@^2.0.0`
- **Purpose:** Utility for constructing className strings conditionally
- **What depends on it:** All components that use conditional classes
- **Example:** `clsx("base", { "active": isActive, "disabled": !enabled })`
- **Breaking without it:** Conditional styling breaks

#### `tailwind-merge@^2.2.0`
- **Purpose:** Intelligently merges Tailwind CSS classes (resolves conflicts)
- **What depends on it:** `lib/utils.ts` `cn()` function used everywhere
- **Why needed:** Without it, `className="p-4 p-2"` would apply both paddings (conflict). With `tailwind-merge`, the last one wins correctly.
- **Breaking without it:** Conflicting Tailwind classes cause visual bugs

#### `tailwindcss-animate@^1.0.7`
- **Purpose:** Tailwind plugin for animation utilities
- **What depends on it:** Animated UI components (modals, dropdowns, tooltips)
- **Provides:** `animate-in`, `animate-out`, `fade-in`, `slide-in`, etc.
- **Breaking without it:** Animation classes won't work (no visual animations)

---

### Routing

#### `react-router-dom@^6.21.0`
- **Purpose:** Client-side routing (navigation between views without page reload)
- **What depends on it:** `App.tsx`, navigation between Project Hub and Editor
- **Routes:**
  - `/` - Project Hub (project list)
  - `/editor/:projectId` - Editor view for specific project
  - `/404` - Not found page
- **Key features:**
  - `<BrowserRouter>` - enables routing
  - `<Routes>` and `<Route>` - define routes
  - `useNavigate()` - programmatic navigation
  - `useParams()` - access URL parameters (e.g., `projectId`)
- **Breaking without it:** No navigation, single-page app becomes multi-page app (full reloads)

---

### Animation

#### `framer-motion@^10.16.16`
- **Purpose:** Animation library for React (smooth UI transitions)
- **What depends on it:** Panel open/close, modal animations, tool switch effects
- **Key features:**
  - `<motion.div>` - animated div with `animate`, `initial`, `exit` props
  - `AnimatePresence` - animate components on mount/unmount
  - `useSpring()` - spring-based animations
- **Breaking without it:** UI transitions become instant (no smooth animations)
- **Notes:**
  - Framer Motion is relatively large (~100KB)
  - Could be replaced with CSS transitions for bundle size optimization
  - Used for the "21st.dev aesthetic" - smooth, purposeful animations

---

### Icons

#### `lucide-react@^0.300.0`
- **Purpose:** Icon library (React components for SVG icons)
- **What depends on it:** All toolbar buttons, UI icons throughout the app
- **Icons used:**
  - `MousePointer2`, `Square`, `Ruler`, `Armchair`, `Hand`, `Eye` - toolbar tools
  - `Save`, `Undo2`, `Redo2`, `Settings`, `Download`, `Upload` - actions
  - `Plus`, `Trash2`, `Edit2`, `Check`, `X` - CRUD operations
  - `Grid3x3`, `Sun`, `Moon`, `Loader2` - UI states
- **Breaking without it:** No icons (blank buttons)
- **Why Lucide over other icon libs:**
  - Tree-shakeable (only imports used icons)
  - Consistent design language
  - Active development (regular new icons)
  - Smaller than Font Awesome or Material Icons

---

### Toast Notifications

#### `sonner@^2.0.7`
- **Purpose:** Toast notification system (success/error/info messages)
- **What depends on it:** All user feedback messages (save confirmation, errors, etc.)
- **Usage:** `toast.success('Room created')`, `toast.error('Failed to save')`
- **Breaking without it:** No user feedback for actions (silent failures)
- **Why Sonner:**
  - Beautiful default styling (matches 21st.dev aesthetic)
  - Supports promise-based toasts (loading → success/error)
  - Keyboard accessible
  - Small bundle size

---

## Backend Dependencies

**Location:** `backend/package.json`

### Core Framework

#### `express@^4.18.2`
- **Purpose:** Web framework for Node.js (HTTP server and routing)
- **What depends on it:** All API endpoints, server initialization
- **Key features:**
  - Routing: `app.get()`, `app.post()`, `app.put()`, `app.delete()`
  - Middleware: `express.json()`, `express.static()`
  - Request/Response objects
- **Breaking without it:** No API server (application won't work)
- **Notes:** Express 5 is in beta but has breaking changes - staying on v4 for stability

#### `cors@^2.8.5`
- **Purpose:** Cross-Origin Resource Sharing middleware (allows frontend to call backend API)
- **What depends on it:** All API calls from frontend to backend
- **Configuration:** `app.use(cors())` - allows all origins (development mode)
- **Breaking without it:** Frontend API calls fail with CORS errors
- **Notes:** In production deployment, configure specific allowed origins for security

#### `dotenv@^16.3.1`
- **Purpose:** Loads environment variables from `.env` file
- **What depends on it:** `PORT`, `ENCRYPTION_KEY` configuration
- **Usage:** `require('dotenv').config()` at server startup
- **Breaking without it:** Environment variables not loaded (falls back to defaults)

---

### Database

#### `sql.js@^1.10.3`
- **Purpose:** SQLite compiled to JavaScript (runs in Node.js without native bindings)
- **What depends on it:** All database operations (projects, rooms, furniture, etc.)
- **Why sql.js over better-sqlite3:**
  - Pure JavaScript - no native compilation required
  - Cross-platform - works on Windows, Mac, Linux without build tools
  - Single-file database (portable)
- **Breaking without it:** No database, no data persistence
- **Notes:**
  - Database stored at `backend/database.db`
  - Loaded into memory on server start
  - Saved to disk on write operations
  - See `backend/src/db/connection.js` and `backend/src/db/init.js`

**Also used:**

#### `better-sqlite3@^12.6.2` (root package.json)
- **Purpose:** Native SQLite bindings (faster than sql.js but requires compilation)
- **What depends on it:** Currently unused, may replace sql.js for better performance
- **Notes:** Requires node-gyp and C++ build tools to install

---

### File Handling

#### `multer@^1.4.5-lts.1`
- **Purpose:** Middleware for handling `multipart/form-data` (file uploads)
- **What depends on it:** File upload endpoints (floor plan images, 3D models, textures)
- **Usage:**
  ```javascript
  const upload = multer({ dest: 'uploads/' });
  app.post('/api/upload', upload.single('file'), (req, res) => { ... });
  ```
- **Breaking without it:** Cannot upload files (floor plans, images, 3D models)

#### `archiver@^7.0.1`
- **Purpose:** Create ZIP archives (for project export)
- **What depends on it:** Project export feature (`/api/projects/:id/export`)
- **Usage:** Bundles project data, 3D models, and textures into a single ZIP file
- **Breaking without it:** Project export fails

#### `unzipper@^0.12.3`
- **Purpose:** Extract ZIP archives (for project import)
- **What depends on it:** Project import feature (`/api/projects/import`)
- **Breaking without it:** Project import fails
- **Also in:** Root `package.json` for workspace use

---

### PDF Generation

#### `pdfkit@^0.17.2`
- **Purpose:** PDF generation library (server-side)
- **What depends on it:** Floor plan PDF export (`/api/export/floorplan`)
- **Usage:** Draws floor plan diagram as PDF document
- **Breaking without it:** PDF export format won't work (PNG/SVG would still work)
- **Notes:**
  - PDFKit is a full PDF generation library (~500KB)
  - Could be replaced with simpler solutions if only basic PDF support is needed

---

### Web Scraping (AI Features)

#### `cheerio@^1.0.0-rc.12`
- **Purpose:** jQuery-like HTML parser for Node.js (fast, server-side DOM manipulation)
- **What depends on it:** Product URL import feature (scraping furniture specs from e-commerce sites)
- **Usage:** Parse HTML to extract product images, dimensions, prices
- **Breaking without it:** URL import won't extract product data (would require manual entry)
- **Example:**
  ```javascript
  const $ = cheerio.load(html);
  const productName = $('h1.product-title').text();
  const price = $('.price').text();
  ```

#### `puppeteer@^21.7.0`
- **Purpose:** Headless Chrome browser automation (for JavaScript-rendered pages)
- **What depends on it:** Product URL import (for sites that render content with JavaScript)
- **Usage:**
  - Loads URL in headless browser
  - Waits for JavaScript to render
  - Extracts HTML and passes to Cheerio
- **Breaking without it:** URL import fails for JavaScript-heavy sites (would only work for static HTML)
- **Notes:**
  - **LARGE DEPENDENCY:** Downloads Chromium (~300MB) on install
  - Platform-specific: Windows, Mac, Linux versions
  - See Troubleshooting section for common Puppeteer issues

---

## Dev Dependencies

These dependencies are only used during development and build processes.

### Frontend Dev Dependencies

**Location:** `frontend/package.json` → `devDependencies`

#### Build Tool

##### `vite@^5.0.8`
- **Purpose:** Frontend build tool and dev server (replacement for Webpack)
- **What it does:**
  - Dev server with hot module replacement (HMR)
  - Production build with code splitting and optimization
  - TypeScript compilation
  - CSS processing (PostCSS, Tailwind)
- **Breaking without it:** Cannot run `npm run dev` or `npm run build`
- **Why Vite over Webpack:**
  - Much faster dev server startup (native ES modules)
  - Faster HMR (incremental updates)
  - Simpler configuration
  - Optimized for modern browsers

##### `@vitejs/plugin-react@^4.2.1`
- **Purpose:** Vite plugin for React support
- **What it does:**
  - Enables React Fast Refresh (HMR for React components)
  - JSX/TSX transformation
  - React-specific optimizations
- **Breaking without it:** Vite won't understand JSX/TSX syntax

---

#### TypeScript

##### `@types/react@^18.2.43`
##### `@types/react-dom@^18.2.17`
##### `@types/three@^0.160.0`
- **Purpose:** TypeScript type definitions for libraries
- **What they do:** Provide type information for JavaScript libraries
- **Breaking without them:** TypeScript errors for React, Three.js, etc.

---

#### Linting & Formatting

##### `eslint@^8.55.0`
- **Purpose:** JavaScript/TypeScript linter (finds bugs and enforces code style)
- **Configuration:** Uses TypeScript parser and React plugins
- **Usage:** `npm run lint` in frontend directory
- **Breaking without it:** No linting (can still build, but code quality suffers)

##### `@typescript-eslint/eslint-plugin@^6.14.0`
##### `@typescript-eslint/parser@^6.14.0`
- **Purpose:** ESLint support for TypeScript
- **What they do:**
  - Parser: Allows ESLint to understand TypeScript syntax
  - Plugin: TypeScript-specific linting rules
- **Breaking without them:** ESLint can't lint TypeScript files

##### `eslint-plugin-react-hooks@^4.6.0`
- **Purpose:** Enforces React Hooks rules (dependencies, call order)
- **What it catches:**
  - Missing dependencies in `useEffect`/`useCallback`/`useMemo`
  - Hooks called conditionally (breaks React rules)
- **Breaking without it:** Hook-related bugs go undetected

##### `eslint-plugin-react-refresh@^0.4.5`
- **Purpose:** Enforces React Fast Refresh compatibility
- **What it catches:** Components that break Fast Refresh (e.g., named exports)
- **Breaking without it:** HMR may fail for some components

---

#### CSS Processing

##### `tailwindcss@^3.4.0`
- **Purpose:** Utility-first CSS framework
- **Configuration:** `tailwind.config.js`
- **Usage:** Scans source files for class names, generates CSS
- **Breaking without it:** No styles at all (app would be unstyled HTML)

##### `postcss@^8.4.32`
- **Purpose:** CSS transformation tool (used by Tailwind)
- **Configuration:** `postcss.config.js`
- **What it does:** Processes CSS through plugins (Tailwind, Autoprefixer)
- **Breaking without it:** Tailwind won't process

##### `autoprefixer@^10.4.16`
- **Purpose:** Adds vendor prefixes to CSS (browser compatibility)
- **Example:** Converts `display: flex` to `-webkit-flex` for Safari
- **Breaking without it:** CSS may not work in older browsers

---

### Backend Dev Dependencies

**Location:** `backend/package.json` → `devDependencies`

##### `@types/cors@^2.8.17`
##### `@types/express@^4.17.21`
##### `@types/multer@^1.4.11`
- **Purpose:** TypeScript type definitions for backend libraries
- **Breaking without them:** TypeScript errors when using Express, CORS, Multer
- **Note:** Backend is JavaScript (not TypeScript), but types help with IDE autocomplete

---

### Root Dev Dependencies

**Location:** Root `package.json` → `devDependencies`

##### `playwright@^1.58.2`
- **Purpose:** Browser automation for testing
- **Usage:** Used by testing/verification scripts (not part of the main app)
- **Breaking without it:** Cannot run browser automation tests

---

## Environment Variables

**Configuration file:** `backend/.env` (not committed to git)
**Example file:** `backend/.env.example` (committed, shows required variables)

### Backend Environment Variables

#### `PORT` (optional)
- **Purpose:** Port number for backend API server
- **Default:** `5000`
- **Valid values:** Any available port (1024-65535 recommended)
- **Consumed by:** `backend/src/server.js`
- **Usage:**
  ```javascript
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  ```

#### `ENCRYPTION_KEY` (optional, but **STRONGLY RECOMMENDED** for production)
- **Purpose:** 32-character key for AES-256 encryption of API keys stored in database
- **Default:** `home-designer-default-key-32ch` (**INSECURE** - for development only)
- **Valid values:** Any 32-character string
- **Consumed by:** `backend/src/routes/settings.js` (encrypt/decrypt functions)
- **Security notes:**
  - Must be **exactly 32 characters** for AES-256
  - Generate with: `openssl rand -base64 32 | cut -c1-32`
  - Keep secret (never commit to git)
  - If changed, previously encrypted keys cannot be decrypted
- **What's encrypted:**
  - AI service API keys (TRELLIS, Stability AI, etc.)
  - Stored in `user_settings` table with `encrypted = 1`

### Frontend Environment Variables

**None.** The frontend (Vite/React) does not use environment variables. All configuration is done through:
- Backend API endpoints
- Settings UI (for user-configurable options)
- Hardcoded defaults in source code

**Why no frontend env vars:**
- Vite env vars would be baked into the build (not dynamic)
- Settings should be user-configurable through UI, not deployment configuration
- Keeps frontend purely client-side (no environment-specific builds)

---

## Configuration Files

### Frontend Configuration

#### `vite.config.ts`
**Purpose:** Vite build tool configuration

**Key settings:**
```typescript
{
  plugins: [react()],                    // React support
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }  // Import alias (@/components)
  },
  server: {
    port: 5173,                          // Dev server port
    proxy: {
      '/api': 'http://localhost:5000'    // Proxy API calls to backend
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react']            // Don't pre-bundle Lucide (better tree-shaking)
  }
}
```

**When to modify:**
- Changing dev server port
- Adding path aliases
- Configuring backend proxy (if backend port changes)
- Adding Vite plugins (e.g., PWA, image optimization)
- Configuring build output directory

---

#### `tsconfig.json`
**Purpose:** TypeScript compiler configuration

**Key settings:**
```json
{
  "compilerOptions": {
    "target": "ES2020",                  // JavaScript version to compile to
    "lib": ["ES2020", "DOM", "DOM.Iterable"],  // Available APIs
    "jsx": "react-jsx",                  // JSX transformation mode
    "module": "ESNext",                  // ES modules
    "moduleResolution": "bundler",       // Vite-specific module resolution
    "strict": false,                     // TypeScript strictness (relaxed for faster dev)
    "noEmit": true,                      // Vite handles compilation, TS only checks
    "paths": { "@/*": ["./src/*"] }      // Path aliases (matches vite.config.ts)
  }
}
```

**When to modify:**
- Enabling stricter TypeScript checks (`"strict": true`)
- Adding path aliases (must also update `vite.config.ts`)
- Changing target JavaScript version
- Adding type definitions

**Note:** `strict: false` is a deliberate choice for faster development. Enable `strict: true` for production-ready type safety.

---

#### `tailwind.config.js`
**Purpose:** Tailwind CSS configuration

**Key settings:**
```javascript
{
  darkMode: ["class"],                   // Dark mode via .dark class
  content: ['./src/**/*.{ts,tsx}'],      // Files to scan for class names
  theme: {
    extend: {
      colors: { /* shadcn/ui colors */ },
      animation: { /* custom animations */ }
    }
  },
  plugins: [require("tailwindcss-animate")]
}
```

**When to modify:**
- Adding custom colors/fonts/spacing
- Configuring dark mode behavior
- Adding Tailwind plugins
- Changing content scanning paths

---

#### `postcss.config.js`
**Purpose:** PostCSS configuration (CSS processing pipeline)

**Settings:**
```javascript
{
  plugins: {
    tailwindcss: {},                     // Process Tailwind directives
    autoprefixer: {},                    // Add vendor prefixes
  }
}
```

**When to modify:**
- Adding PostCSS plugins (e.g., CSS nesting, variables)
- Configuring Autoprefixer browser targets

---

#### `.eslintrc` (implicit)
**Purpose:** ESLint configuration

**Note:** Home Designer uses ESLint configuration in `package.json` under `eslintConfig` key (or inline in `eslint.config.js` if present).

**Common rules:**
- React Hooks rules (enforces dependency arrays)
- TypeScript rules (type safety)
- React Refresh rules (HMR compatibility)

**When to modify:**
- Changing linting strictness
- Disabling specific rules
- Adding custom rules

---

### Backend Configuration

#### `.env`
**Purpose:** Environment variables for backend
**See:** [Environment Variables](#environment-variables) section above

---

### Root Configuration Files

#### `package.json` (root)
**Purpose:** Workspace-level dependencies and scripts

**Dependencies:**
- `better-sqlite3` - May replace sql.js in future
- `unzipper` - Used by both frontend and backend (hoisted)

**Dev dependencies:**
- `playwright` - Browser automation for testing

---

## Build Pipeline

### Development Mode

#### Frontend Dev Server
```bash
cd frontend
npm run dev
```

**What happens:**
1. Vite starts dev server on port 5173
2. TypeScript files are compiled on-the-fly (no type checking during dev)
3. Hot Module Replacement (HMR) is enabled (instant updates on save)
4. CSS is processed through PostCSS → Tailwind → Autoprefixer
5. API calls to `/api/*` are proxied to `http://localhost:5000`

**Logs:** Console shows compilation errors, warnings, and HMR updates

**Verification:**
- Open `http://localhost:5173`
- Should see Home Designer project hub
- Check browser console for errors (should be zero)

---

#### Backend Dev Server
```bash
cd backend
npm run dev
```

**What happens:**
1. Node.js loads `src/server.js` with `--watch` flag (auto-restart on file changes)
2. `dotenv` loads `.env` file (if present)
3. Database is loaded from `database.db` (or created if missing via `db:init`)
4. Express server starts on port 5000
5. API routes are registered (`/api/projects`, `/api/rooms`, etc.)
6. CORS is enabled (allows frontend to connect)

**Logs:** Console shows:
```
========================================
  Database Initialization
========================================
  Database path: D:\repos\home-designer\backend\database.db

✓ Database connection established
...
========================================
  🚀 Server running
========================================
  API: http://localhost:5000/api
```

**Verification:**
- Open `http://localhost:5000/api/projects` in browser
- Should return JSON array of projects
- Check for database file at `backend/database.db`

---

#### Database Initialization (first time only)
```bash
cd backend
npm run db:init
```

**What happens:**
1. Checks if `database.db` exists
2. If not, creates new SQLite database
3. Runs schema creation (tables: projects, floors, rooms, walls, assets, etc.)
4. Inserts seed data (sample projects, built-in furniture assets)
5. Saves database to disk

**When to run:**
- First time setting up the project
- After deleting `database.db` (to reset data)
- Never in production (run once during deployment)

---

### Production Build

#### Frontend Build
```bash
cd frontend
npm run build
```

**What happens:**
1. **Type checking:** TypeScript compiler runs (`tsc`) - build fails if type errors
2. **Vite build:**
   - All TypeScript files compiled to JavaScript
   - JSX transformed to React.createElement calls
   - CSS processed (Tailwind classes purged, unused styles removed)
   - Code splitting (separate chunks for routes, components)
   - Minification (JavaScript, CSS)
   - Asset hashing (cache busting)
3. **Output:** `frontend/dist/` directory
   - `index.html` - Entry point
   - `assets/index-[hash].js` - JavaScript bundle(s)
   - `assets/index-[hash].css` - CSS bundle
   - Other assets (images, fonts, if any)

**Verification:**
```bash
cd frontend
npm run preview
```
Opens production build at `http://localhost:4173` for testing.

**Production size:**
- JavaScript: ~800KB (uncompressed), ~250KB (gzipped)
- CSS: ~50KB (uncompressed), ~10KB (gzipped)
- Total first load: ~260KB gzipped

---

#### Backend "Build" (none)
The backend is **JavaScript (not TypeScript)** and runs directly with Node.js. No build step required.

**To run in production:**
```bash
cd backend
npm start
```

This runs `node src/server.js` (without `--watch` flag).

---

### Full Project Build

**Recommended:** Use the provided `init.sh` script:

```bash
./init.sh
```

**What it does:**
1. Installs root dependencies
2. Installs frontend dependencies (`cd frontend && npm install`)
3. Installs backend dependencies (`cd backend && npm install`)
4. Initializes database (`cd backend && npm run db:init`)
5. Starts backend dev server in background (`cd backend && npm run dev &`)
6. Starts frontend dev server in foreground (`cd frontend && npm run dev`)

**When everything is working:**
- Backend running at `http://localhost:5000`
- Frontend running at `http://localhost:5173`
- Database initialized at `backend/database.db`
- Browser should auto-open to frontend

---

## Dependency Update Guide

### General Update Strategy

1. **Check for updates:**
   ```bash
   npm outdated
   ```

2. **Update patch/minor versions (low risk):**
   ```bash
   npm update
   ```

3. **Update major versions (high risk):**
   ```bash
   npm install package@latest
   ```

---

### High-Risk Dependencies (Breaking Change Potential)

These dependencies often have breaking changes between major versions. **Test thoroughly after updating:**

#### `three@^0.160.0` → `three@^0.161+`
- **Risk:** Three.js has frequent API changes
- **Breaking changes to watch for:**
  - Geometry API changes (BufferGeometry methods)
  - Material property changes
  - Loader API changes (GLTFLoader, TextureLoader)
  - Deprecated methods removed
- **Testing after update:**
  - 3D viewport renders correctly
  - Rooms, walls, floors, ceilings visible
  - Furniture loads and renders
  - Materials apply correctly
  - No console errors

---

#### `@react-three/fiber@^8.15.0` → `@react-three/fiber@^9.0.0+`
- **Risk:** Tightly coupled to Three.js version
- **Breaking changes to watch for:**
  - Compatibility with Three.js version (check R3F docs)
  - Hook API changes (`useThree`, `useFrame`, `useLoader`)
  - `<Canvas>` prop changes
- **Testing:** Same as Three.js (full 3D viewport testing)

---

#### `@react-three/drei@^9.92.0` → `@react-three/drei@^10.0.0+`
- **Risk:** Helper components may change APIs
- **Breaking changes to watch for:**
  - `<OrbitControls>` prop changes (camera controls)
  - `<PivotControls>` API changes (furniture transform gizmo)
  - `<Grid>` appearance/behavior changes
- **Testing:**
  - Camera controls work (orbit, pan, zoom)
  - Furniture transform gizmo (move, rotate, scale)
  - Grid visibility toggle

---

#### `react@^18.2.0` → `react@^19.0.0+`
- **Risk:** Major React versions have breaking changes
- **Breaking changes to watch for:**
  - Lifecycle changes
  - Hook behavior changes
  - Concurrent rendering changes
  - Server components (if introduced)
- **Note:** React 19 is not yet released (as of package.json date)
- **Testing:** Full application test (all components, state management, routing)

---

#### `vite@^5.0.8` → `vite@^6.0.0+`
- **Risk:** Build tool updates can break builds
- **Breaking changes to watch for:**
  - Plugin API changes (`@vitejs/plugin-react`)
  - Configuration format changes
  - CSS processing changes
- **Testing:**
  - `npm run dev` works
  - `npm run build` succeeds
  - Production build runs (`npm run preview`)

---

### Low-Risk Dependencies (Safe to Update)

- `lucide-react` - Icon library (additive changes only)
- `sonner` - Toast library (stable API)
- `clsx`, `tailwind-merge` - Utility functions (rare breaking changes)
- `framer-motion` - Animation library (backward compatible)
- `multer`, `pdfkit`, `archiver`, `unzipper` - File handling (stable APIs)

---

### Update Testing Checklist

After updating dependencies:

- [ ] Install completes without errors
- [ ] Dev servers start (frontend and backend)
- [ ] TypeScript compilation succeeds (no type errors)
- [ ] ESLint passes (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] 3D viewport renders correctly (if Three.js updated)
- [ ] All UI components render correctly
- [ ] Routing works (navigate between Project Hub and Editor)
- [ ] API calls work (create project, load rooms, place furniture)
- [ ] Database operations work (CRUD, no errors)
- [ ] No console errors or warnings (check browser and server logs)

---

## Troubleshooting Dependencies

### Common npm Install Issues

#### 1. `npm install` fails with "EACCES: permission denied"

**Cause:** npm trying to write to a protected directory

**Fix:**
```bash
# Option 1: Use npx (no global install)
npx create-vite@latest

# Option 2: Fix npm permissions (Linux/Mac)
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config

# Option 3: Use nvm (Node Version Manager)
# Avoids permission issues entirely
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

---

#### 2. `npm install` hangs or takes forever

**Cause:** Network issues, npm registry slow, or corrupted cache

**Fix:**
```bash
# Clear npm cache
npm cache clean --force

# Try with different registry
npm install --registry https://registry.npmjs.org/

# Use yarn instead
npm install -g yarn
yarn install
```

---

### Puppeteer-Specific Issues

Puppeteer is the most problematic dependency due to Chromium download.

#### 1. Puppeteer fails to install: "Failed to download Chromium"

**Cause:** Network issues, firewall, or slow connection

**Fix:**
```bash
# Skip Chromium download during install
PUPPETEER_SKIP_DOWNLOAD=true npm install

# Manually download Chromium later
npx puppeteer browsers install chrome
```

---

#### 2. Puppeteer installed but fails to launch: "Chromium not found"

**Cause:** Chromium was not downloaded or wrong path

**Fix:**
```bash
# Check if Chromium is downloaded
ls ~/.cache/puppeteer/

# Re-download Chromium
npx puppeteer browsers install chrome

# Or specify custom Chromium path in code:
const browser = await puppeteer.launch({
  executablePath: '/path/to/chrome'
});
```

---

#### 3. Puppeteer fails on Windows: "Could not find Chrome"

**Cause:** Windows-specific Chromium path issues

**Fix:**
```bash
# Option 1: Use installed Chrome instead of Chromium
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
});

# Option 2: Reinstall Puppeteer with Chromium
npm uninstall puppeteer
npm install puppeteer
```

---

#### 4. Puppeteer fails on Linux: "libX11.so.6: cannot open shared object file"

**Cause:** Missing system dependencies for Chromium

**Fix:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libasound2

# Or run Puppeteer in headless mode (no display)
const browser = await puppeteer.launch({ headless: 'new' });
```

---

### SQLite-Specific Issues

#### 1. `better-sqlite3` fails to install: "node-gyp errors"

**Cause:** Missing C++ build tools

**Fix:**
```bash
# Windows: Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
# Install "Desktop development with C++"

# Mac: Install Xcode Command Line Tools
xcode-select --install

# Linux: Install build-essential
sudo apt-get install -y build-essential

# After installing, retry:
npm install better-sqlite3
```

**Alternative:** Use `sql.js` instead (pure JavaScript, no compilation):
```bash
npm uninstall better-sqlite3
npm install sql.js
```

---

#### 2. `sql.js` database file corrupted

**Cause:** Improper database save/close

**Fix:**
```bash
# Delete corrupted database
rm backend/database.db

# Reinitialize
cd backend
npm run db:init
```

---

### Three.js Issues

#### 1. "THREE is not defined" error

**Cause:** Incorrect Three.js import

**Fix:**
```typescript
// ❌ Wrong:
import THREE from 'three';

// ✅ Correct:
import * as THREE from 'three';
```

---

#### 2. GLSL shader errors in console

**Cause:** GPU/WebGL compatibility issues

**Fix:**
```typescript
// Check WebGL support:
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
if (!gl) {
  console.error('WebGL not supported');
}

// Fallback to simpler materials:
// Use MeshBasicMaterial instead of MeshStandardMaterial
```

---

#### 3. Memory leaks in 3D viewport

**Cause:** Three.js objects not disposed properly

**Fix:** React Three Fiber handles disposal automatically, but for manual Three.js:
```typescript
// Always dispose geometries, materials, textures:
mesh.geometry.dispose();
mesh.material.dispose();
if (mesh.material.map) mesh.material.map.dispose();
```

---

### TypeScript Issues

#### 1. "Cannot find module '@/components/...' or its corresponding type declarations"

**Cause:** Path alias not configured

**Fix:** Ensure both `tsconfig.json` and `vite.config.ts` have matching path aliases:

**`tsconfig.json`:**
```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

**`vite.config.ts`:**
```typescript
{
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
}
```

---

#### 2. Type errors in production build (`npm run build` fails)

**Cause:** `strict: false` in `tsconfig.json` allows dev errors

**Fix:**
```bash
# Option 1: Fix type errors (recommended)
npm run build
# Read errors and fix them

# Option 2: Skip type checking in build (NOT RECOMMENDED)
# Edit package.json:
"build": "vite build"  # Remove "tsc &&"
```

---

### Tailwind CSS Issues

#### 1. Styles not applying / blank page

**Cause:** Tailwind not processing CSS

**Fix:**
```bash
# Check that PostCSS is configured
cat frontend/postcss.config.js

# Should contain:
# {
#   plugins: {
#     tailwindcss: {},
#     autoprefixer: {},
#   }
# }

# Restart dev server
npm run dev
```

---

#### 2. Custom colors not working

**Cause:** Colors not defined in `tailwind.config.js`

**Fix:**
```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      'custom-blue': '#3B82F6',
    }
  }
}

// Usage:
<div className="bg-custom-blue">...</div>
```

---

### React Router Issues

#### 1. 404 on page refresh (production)

**Cause:** Server not configured for client-side routing

**Fix:**
```javascript
// Express server (if serving frontend from backend):
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
```

---

## Quick Reference: Where Things Are

| Dependency Type | Location | Install Command |
|----------------|----------|----------------|
| **Frontend runtime** | `frontend/package.json` → `dependencies` | `cd frontend && npm install <pkg>` |
| **Frontend dev tools** | `frontend/package.json` → `devDependencies` | `cd frontend && npm install -D <pkg>` |
| **Backend runtime** | `backend/package.json` → `dependencies` | `cd backend && npm install <pkg>` |
| **Backend dev tools** | `backend/package.json` → `devDependencies` | `cd backend && npm install -D <pkg>` |
| **Workspace (monorepo)** | Root `package.json` → `dependencies` | `npm install <pkg>` (from root) |
| **Browser testing** | Root `package.json` → `devDependencies` | `npm install -D <pkg>` (from root) |

---

## Need Help?

If you encounter dependency issues not covered here:

1. **Check the official docs:** Most packages have excellent documentation
2. **Search GitHub issues:** Package repositories often have solutions for common problems
3. **Check the Node.js version:** Some packages require specific Node versions
   ```bash
   node --version   # Should be v20.x or higher
   ```
4. **Try a fresh install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
5. **Check the logs:** npm install errors usually point to the specific issue
6. **Use `npm ls <package>`:** Check which version is actually installed
7. **Check for peer dependency warnings:** Some packages require specific versions of other packages

---

**📦 Dependencies Management Summary:**

- **Frontend:** React, Three.js, Tailwind CSS, Vite
- **Backend:** Express, SQLite (sql.js), file handling, web scraping
- **Dev Tools:** TypeScript, ESLint, PostCSS, Puppeteer (testing)
- **Environment:** Minimal config (.env for backend only)
- **Build:** Vite (frontend), none (backend is JavaScript)
- **Updates:** Test thoroughly after Three.js/React major version bumps
- **Troubleshooting:** Puppeteer and better-sqlite3 are the most problematic (platform-specific)

For architecture-level understanding, see `docs/ARCHITECTURE.md`.
For API endpoint reference, see `docs/API_REFERENCE.md`.
For extension guide, see `docs/EXTENDING.md`.
