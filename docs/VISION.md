# Project Vision & Design Philosophy

**The "Why" Document** — Understanding the intent behind every design decision in Home Designer.

## Table of Contents
- [Project Mission](#project-mission)
- [Target User](#target-user)
- [Design Philosophy](#design-philosophy)
- [Technology Choices](#technology-choices)
- [Local-First Philosophy](#local-first-philosophy)
- [Aesthetic Vision](#aesthetic-vision)
- [Future Vision](#future-vision)
- [Design Principles Checklist](#design-principles-checklist)

---

## Project Mission

**Core Goal:** Democratize interior design by providing an accessible, powerful 3D visualization tool that requires zero technical expertise and zero setup complexity.

### The Problem We're Solving

Most interior design tools fall into one of these categories:

1. **Professional Software** (AutoCAD, SketchUp, Blender)
   - **Problem:** Steep learning curve, expensive licenses, overwhelming for casual users
   - **Target:** Architects and professional designers only

2. **Online SaaS Tools** (Planner5D, RoomSketcher)
   - **Problem:** Subscription fees, data privacy concerns, feature limitations, internet dependency
   - **Target:** Limited by freemium models and cloud lock-in

3. **Mobile Apps** (Houzz, IKEA Place)
   - **Problem:** Limited features, small screens, vendor lock-in, AR-only focus
   - **Target:** Casual browsing, not serious design work

### Our Solution

**Home Designer** bridges the gap:

- **Accessible** like a mobile app — drag furniture, click to draw walls, instant visual feedback
- **Powerful** like professional software — real 3D rendering, precise measurements, full customization
- **Private & Free** like open-source tools — no cloud, no subscriptions, no data collection
- **AI-Enhanced** like modern tools — turn photos into 3D models, auto-detect room dimensions

**Vision Statement:**
> "Anyone should be able to design their living space as easily as they play The Sims, with the visual quality of professional renderings, and the privacy of local software."

---

## Target User

### Primary Persona: The Homeowner Designer

**Demographics:**
- Age: 25-55
- Tech comfort: Moderate (can install Node.js with guidance)
- Design experience: None to beginner
- Motivation: Planning a move, remodeling, furniture shopping, space visualization

**Not Necessarily Technical:**
- May not know what "Three.js" or "SQLite" means
- Needs clear UI labels and intuitive interactions
- Expects software to "just work" after following setup instructions
- Values privacy but doesn't need to understand the technical implementation

**Use Cases:**
1. **Pre-Move Planning:** Measure new apartment, see if existing furniture fits
2. **Remodeling Decisions:** Try different layouts before buying/moving furniture
3. **Furniture Shopping:** Visualize how that new couch looks in their living room
4. **Interior Design Hobbyist:** Design dream homes, experiment with aesthetics
5. **Product Owners/Managers:** Create mockups for design-related products

### Secondary Persona: The Developer/Contributor

**Demographics:**
- Experienced with React, TypeScript, or 3D programming
- Open-source contributor mindset
- Values clean code, good documentation, extensible architecture

**Motivations:**
- Learn React Three Fiber and 3D web development
- Contribute to an open-source project with real users
- Build portfolio projects
- Extend functionality for personal use cases

---

## Design Philosophy

### 1. The Sims Interaction Model

**Principle:** If a user has played The Sims, they should immediately understand how to use Home Designer.

**Inspiration from The Sims:**
- **Draw walls** by clicking and dragging (not inputting coordinates)
- **Drag furniture** from a library into the 3D space
- **Instant visual feedback** — see changes immediately, no "render" button
- **No technical jargon** — "Draw Wall" not "Create Rectangular Prism Mesh"
- **Forgiving UX** — Undo/redo, delete mistakes, no irreversible actions
- **Isometric camera** as default view (familiar 3D perspective)

**Differences from The Sims:**
- **Precision matters** — We show exact measurements (The Sims uses grid units)
- **Real-world units** — Meters or feet, not arbitrary game units
- **Export capabilities** — Users can take designs to real-world applications
- **Multi-floor complexity** — Real architecture, not simplified game floors

### 2. Dark Editor Aesthetic

**Rationale:** Professional creative tools (Blender, Figma, DaVinci Resolve, Unity) use dark themes because:

1. **3D Visualization Focus** — Dark backgrounds make 3D content "pop" without competition from bright UI
2. **Reduced Eye Strain** — Designers spend hours in the app; dark mode is easier on eyes
3. **Professional Feel** — Users associate dark UIs with powerful, serious software
4. **Color Accuracy** — Neutral background doesn't influence perception of room colors

**Implementation:**
- **Light theme for Project Hub** — Welcoming, friendly, approachable landing page
- **Dark theme for Editor** — Professional workspace for focused design work
- **Automatic switch** — No user preference needed, context-driven

### 3. 21st.dev-Inspired Polish

**Goal:** Achieve the visual quality and attention to detail seen in modern design tools like 21st.dev, Linear, or Vercel.

**Quality Indicators:**
- **Smooth animations** — 200-300ms transitions, purposeful not decorative
- **Glassmorphism** — Floating panels with backdrop blur for depth
- **Consistent spacing** — Tailwind's spacing scale (4px, 8px, 12px, 16px...)
- **Micro-interactions** — Hover states, active states, focus rings
- **Typography hierarchy** — Clear heading structure, readable body text
- **Icon consistency** — Lucide React icons throughout, no mixed icon sets

**Anti-Patterns to Avoid:**
- Generic Bootstrap/Material UI look
- Inconsistent animations (some 100ms, some 500ms)
- Rainbow color schemes (stick to brand colors)
- Cluttered UI with too many visible buttons
- Pixelated or low-resolution assets

### 4. Blender/Figma-Tier Usability

**Keyboard Shortcuts:**
- `G` for move/grab (Blender convention)
- `R` for rotate
- `S` for scale
- `Delete` or `X` to delete
- `Ctrl+Z` / `Ctrl+Y` for undo/redo
- `Spacebar` for tool search (future)

**Gizmos and Handles:**
- Visual transform gizmos (move, rotate, scale) like Blender
- Drag handles for direct manipulation
- Snap-to-grid and snap-to-wall for precision

**Panels and Layout:**
- Left sidebar: Asset library (always accessible)
- Right sidebar: Properties panel (context-sensitive)
- Top toolbar: Tools and actions
- Bottom status bar: Context info (future)

---

## Technology Choices

### Why React + TypeScript?

**React:**
- **Ecosystem:** Largest component library ecosystem, extensive documentation
- **Three.js Integration:** React Three Fiber provides idiomatic React bindings
- **Developer Experience:** Hot module reload, component devtools
- **Talent Pool:** Most contributors know React

**TypeScript:**
- **Type Safety:** Catch bugs at compile time, especially critical for 3D math
- **Better IDE Support:** Autocomplete, inline docs, refactoring tools
- **Self-Documenting:** Types serve as inline documentation
- **Professional Standard:** Expected in modern frontend projects

**Alternative Considered:** Vanilla Three.js
- **Rejected Because:** Imperative code is harder to maintain, no component model, steeper learning curve for contributors

### Why Three.js (via React Three Fiber)?

**Three.js:**
- **Industry Standard:** Most popular WebGL library, extensive ecosystem
- **Mature:** Battle-tested, comprehensive features, great documentation
- **Performance:** Optimized rendering, works on wide range of hardware
- **Model Support:** Excellent glTF/GLB support (industry standard 3D format)

**React Three Fiber (R3F):**
- **Declarative 3D:** Write 3D scenes like React components
- **React Integration:** Use hooks, state, effects with 3D objects
- **Ecosystem:** @react-three/drei provides high-level helpers
- **Maintainability:** Component structure is easier to reason about

**Alternative Considered:** Babylon.js
- **Rejected Because:** Smaller community, less idiomatic React integration, heavier runtime

### Why Zustand for State?

**Zustand:**
- **Simplicity:** No boilerplate, minimal API surface
- **Performance:** Selective re-renders via selectors
- **TypeScript Support:** Excellent type inference
- **No Context Hell:** Direct store access without Provider nesting

**Why Not Redux?**
- **Too Much Boilerplate:** Actions, reducers, middleware for simple state updates
- **Overkill:** Editor state doesn't need time-travel debugging beyond undo/redo
- **DevTools:** Zustand has browser extension, covers debugging needs

**Why Not Context API?**
- **Performance:** Every context update re-renders all consumers
- **Complex State:** Editor has many independent state slices
- **No Middleware:** Undo/redo stack needs middleware-like logic

### Why SQLite (sql.js)?

**SQLite:**
- **Zero Configuration:** No PostgreSQL installation, no connection strings
- **Local-First:** All data on user's machine, no cloud dependencies
- **Relational:** Foreign keys, transactions, complex queries
- **Portable:** Single file, easy to backup and share

**sql.js (WebAssembly SQLite):**
- **In-Memory Performance:** Fast queries, loaded into RAM
- **File Persistence:** Auto-save to disk, survives restarts
- **Cross-Platform:** Works identically on Windows, Mac, Linux

**Why Not PostgreSQL/MySQL?**
- **Setup Complexity:** Users would need to install and configure a database
- **Overkill:** No multi-user concurrency, no network access needed
- **Privacy:** Local SQLite = zero data leaves user's machine

**Why Not IndexedDB?**
- **No Relational Queries:** Awkward for joins, foreign keys
- **Browser Dependency:** Harder to backup, export, migrate
- **SQLite Compatibility:** Easier to add cloud sync later (SQLite is universal)

### Why Express?

**Express:**
- **Simplicity:** Minimal, unopinionated, easy to understand
- **Node.js Standard:** Most Node.js developers know Express
- **Middleware Ecosystem:** CORS, body parsing, file uploads all have plugins
- **Lightweight:** No unnecessary features for a local API

**Why Not Next.js API Routes?**
- **Separation of Concerns:** Frontend and backend can be deployed independently
- **Process Isolation:** Crash in backend doesn't take down frontend
- **Flexibility:** Easier to add long-running AI tasks in separate process

---

## Local-First Philosophy

### Why Self-Hosted?

**Privacy:**
- No data collection, no analytics tracking
- No account creation or email required
- No third-party services with access to designs
- User owns their data completely

**Reliability:**
- Works offline (except AI features)
- No server downtime or maintenance windows
- No subscription cancellations wiping data
- No "service discontinued" risk

**Performance:**
- No network latency for database queries
- Instant saves (local disk, not API calls)
- No bandwidth limits or upload quotas

**Cost:**
- Free to run forever (no SaaS fees)
- No per-user pricing or storage limits
- No credit card required

### Data Ownership

**Export Everything:**
- Project backups as ZIP files
- 3D scenes as glTF/GLB (universal format)
- Floor plans as PDF/PNG/SVG
- Database is standard SQLite (can query with any SQLite tool)

**No Vendor Lock-In:**
- Open-source codebase (MIT license)
- Standard file formats (not proprietary)
- Can self-host indefinitely

### Cloud Migration Path (Future)

While local-first is core, we're architected for future cloud features:

**Potential Cloud Features:**
- **Optional sync** between devices (user opt-in)
- **Sharing links** for collaboration (temporary, user-controlled)
- **Asset marketplace** for community-created furniture
- **Cloud rendering** for high-quality exports on low-end hardware

**Principles for Cloud Features:**
- Always optional (local-only remains fully functional)
- User controls data sharing (no automatic uploads)
- End-to-end encryption for synced data
- Self-hostable cloud components (no forced SaaS)

---

## Aesthetic Vision

### Color Palette

**Project Hub (Light Theme):**
- **Background:** `hsl(0, 0%, 97%)` — Soft white, warm and welcoming
- **Primary:** `hsl(217, 91%, 60%)` — Bright blue, trustworthy and energetic
- **Accent:** `hsl(262, 83%, 68%)` — Purple for highlights
- **Text:** `hsl(240, 10%, 4%)` — Near-black for readability

**Editor (Dark Theme):**
- **Background:** `hsl(240, 10%, 4%)` — Deep charcoal, professional
- **Primary:** `hsl(217, 91%, 60%)` — Same blue for consistency
- **Accent:** `hsl(262, 83%, 68%)` — Purple for interactive elements
- **Text:** `hsl(0, 0%, 98%)` — Off-white for contrast

**3D Viewport:**
- **Background:** `hsl(240, 6%, 10%)` — Slightly lighter than editor background
- **Grid:** `hsl(0, 0%, 20%)` — Subtle, doesn't distract from content
- **Selection:** `hsl(217, 91%, 60%)` — Primary blue for selected objects

### Typography

**UI Font:** **Inter** (Google Fonts)
- **Why:** Modern, readable, excellent hinting, supports OpenType features
- **Usage:** All UI labels, buttons, panels, menus
- **Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

**Monospace Font:** **JetBrains Mono** (Google Fonts)
- **Why:** Designed for code, excellent readability, ligature support
- **Usage:** Dimension labels (e.g., "2.4m × 3.1m"), code in settings, logs
- **Weights:** 400 (regular), 500 (medium)

### Glassmorphism & Depth

**Floating Panels:**
```css
background: rgba(0, 0, 0, 0.7);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
```

**Usage:**
- Asset library sidebar
- Properties panel
- Modal dialogs
- Toolbar

**Why:**
- Creates visual hierarchy (panels float above 3D viewport)
- Maintains visibility of 3D content behind panels
- Modern aesthetic aligned with macOS Big Sur, Windows 11

### Animation Principles

**Timing:**
- **Fast:** 100-150ms for hover states, tooltips
- **Standard:** 200-250ms for panel open/close, page transitions
- **Slow:** 300-400ms for major layout changes, modals

**Easing:**
- **Default:** `cubic-bezier(0.4, 0, 0.2, 1)` — Material Design standard easing
- **Bouncy:** `spring` (Framer Motion) for drag-and-drop feedback
- **Exit:** `ease-in` for elements leaving the screen

**Purposeful, Not Decorative:**
- Animations guide attention (e.g., new object fades in at creation point)
- Animations indicate state changes (e.g., tool activation)
- No animations for the sake of "looking cool" — every animation has a reason

---

## Future Vision

### Expandability & Roadmap

Home Designer is architected for growth while maintaining its local-first core. Here's the long-term vision:

### Phase 1: Core Functionality (Current — v0.1.0)
- ✅ Project management (create, open, delete)
- ✅ Multi-floor design with floor switching
- ✅ Room creation (draw walls, dimensions, floor plans)
- ✅ Furniture placement (drag from library, transform gizmos)
- ✅ Material customization (walls, floors, ceilings)
- ✅ Export (screenshots, 3D models, floor plans, backups)
- ✅ AI integration (image-to-3D via TRELLIS)
- ✅ Settings (units, performance, API keys)

### Phase 2: Enhanced UX (v0.2.0 - v0.3.0)
- 🔲 **Advanced Camera Controls:** First-person walkthrough mode, camera animations
- 🔲 **Wall Editing Tools:** Curved walls, angled walls, wall thickness controls
- 🔲 **Window & Door Library:** Draggable windows/doors with automatic wall cutouts
- 🔲 **Lighting System:** Point lights, spotlights, area lights, HDR environment maps
- 🔲 **Material Marketplace:** Browse community-uploaded materials and textures
- 🔲 **Measurement Tools:** Distance tool, area calculation, volume measurement
- 🔲 **Annotation Tools:** Text labels, dimensions, notes on the 3D scene
- 🔲 **Keyboard Shortcuts Panel:** Searchable command palette (Cmd+K / Ctrl+K)

### Phase 3: AI Enhancements (v0.4.0 - v0.5.0)
- 🔲 **Photo-to-Room Reconstruction:** Upload room photo → auto-detect dimensions and furniture
- 🔲 **AI Interior Designer:** "Make this room more modern" → AI suggests changes
- 🔲 **Style Transfer:** Apply style of one room to another
- 🔲 **Furniture from URLs:** Paste product link → AI extracts 3D model and dimensions
- 🔲 **Voice Commands:** "Move the couch to the left wall" (accessibility + convenience)

### Phase 4: Collaboration (v0.6.0+)
- 🔲 **Optional Cloud Sync:** Sync projects across devices (user opt-in, encrypted)
- 🔲 **Share Links:** Generate temporary links to share designs (read-only)
- 🔲 **Real-Time Collaboration:** Multiple users editing same project (WebRTC-based)
- 🔲 **Comments & Annotations:** Leave feedback on specific objects or areas
- 🔲 **Version History:** Revert to previous project states, branch designs

### Phase 5: Professional Features (v0.7.0+)
- 🔲 **BIM Integration:** Import/export to Revit, ArchiCAD (IFC format)
- 🔲 **Construction Documents:** Auto-generate dimension drawings, material lists
- 🔲 **Cost Estimation:** Calculate furniture costs, material costs from design
- 🔲 **VR Support:** View designs in VR headsets (WebXR)
- 🔲 **Advanced Rendering:** Ray tracing, global illumination (for high-end exports)
- 🔲 **Plugins System:** Allow third-party extensions (SDK for developers)

### Architecture for Expansion

**Modular Backend:**
- AI services are already isolated (`/api/ai/*` routes)
- Easy to add new routes without touching core logic
- Database schema uses migrations for forward compatibility

**Component-Based Frontend:**
- New tools can be added to toolbar without refactoring
- 3D components are isolated (easy to add new mesh types)
- Zustand stores are modular (easy to add new state slices)

**Standard Formats:**
- glTF/GLB for 3D models (industry standard, future-proof)
- SQLite for database (easily migrated to PostgreSQL if cloud needed)
- REST API (can be replaced with GraphQL or tRPC without frontend changes)

---

## Design Principles Checklist

When making design decisions, AI coders should reference this checklist:

### User Experience
- [ ] **Is this intuitive for a non-technical user?** (Would your parent understand it?)
- [ ] **Does this follow The Sims interaction model?** (Click and drag, not config files)
- [ ] **Is feedback immediate?** (No "Processing..." spinners for local operations)
- [ ] **Can the user undo this action?** (Destructive actions need confirmation)
- [ ] **Is this accessible?** (Keyboard navigation, screen reader friendly)

### Visual Design
- [ ] **Does this match the dark editor aesthetic?** (Professional, not playful)
- [ ] **Are animations purposeful?** (200-300ms, not decorative)
- [ ] **Is spacing consistent?** (Use Tailwind's spacing scale)
- [ ] **Are icons from Lucide React?** (No mixed icon sets)
- [ ] **Is typography hierarchy clear?** (Inter for UI, JetBrains Mono for dimensions)

### Technical Architecture
- [ ] **Is this local-first?** (Works offline, data on user's machine)
- [ ] **Does this use standard formats?** (glTF for 3D, not proprietary)
- [ ] **Is state in Zustand?** (Not React useState for shared state)
- [ ] **Are API calls via `api.ts`?** (Not raw fetch in components)
- [ ] **Is this TypeScript-safe?** (No `any`, proper types)

### Performance
- [ ] **Does this avoid unnecessary re-renders?** (Zustand selectors, React.memo)
- [ ] **Is the 3D scene optimized?** (LOD, instancing, texture compression)
- [ ] **Are large files lazy-loaded?** (Code splitting, dynamic imports)
- [ ] **Does this work on mid-range hardware?** (Not just high-end gaming PCs)

### Maintainability
- [ ] **Is this code self-documenting?** (Clear variable names, TSDoc comments)
- [ ] **Does this follow existing patterns?** (Check similar features for consistency)
- [ ] **Is this testable?** (Can be verified via browser automation)
- [ ] **Are error cases handled?** (User-friendly error messages, not console.log)

---

## Closing Philosophy

**"Make it easy, make it beautiful, make it yours."**

Home Designer exists because design tools should be accessible to everyone, not just professionals. We're building software that:

- **Empowers** users to visualize their spaces without technical barriers
- **Respects** user privacy by keeping data local and encrypted
- **Inspires** creativity through intuitive, delightful interactions
- **Evolves** with user needs while maintaining simplicity

Every line of code, every UI decision, every feature should serve this mission. If a change makes the tool harder to use, slower to run, or less private, it doesn't belong in Home Designer.

---

**Last Updated:** 2026-02-27
**Project Version:** 0.1.0
**Document Maintained By:** Project contributors and AI coding agents

**Questions about design decisions?** Refer to this document first. If the answer isn't here, open a discussion on GitHub to establish a precedent for future contributors.
