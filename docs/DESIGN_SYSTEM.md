# Design System & UI Patterns

**Last Updated:** 2026-02-27
**Purpose:** Comprehensive design system reference for maintaining visual consistency across Home Designer. Use this guide when creating new UI components, features, or modifying existing interface elements.

---

## Table of Contents

1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Spacing & Layout](#spacing--layout)
4. [Component Patterns](#component-patterns)
5. [Animation Conventions](#animation-conventions)
6. [Icons](#icons)
7. [Dark Theme](#dark-theme)
8. [Glassmorphism & Effects](#glassmorphism--effects)
9. [Creating New UI Checklist](#creating-new-ui-checklist)

---

## Color Palette

Home Designer uses two distinct color schemes: **Light theme** (Project Hub) and **Dark theme** (Editor workspace).

### Light Theme (Project Hub)

CSS variables are defined as HSL values for flexibility:

| Color Name | HSL Value | Hex Equivalent | Usage |
|------------|-----------|----------------|-------|
| `--background` | `0 0% 97%` | `#F7F7F7` | Main background, page canvas |
| `--foreground` | `240 10% 4%` | `#0A0A10` | Primary text color |
| `--primary` | `217 91% 60%` | `#3B82F6` | Primary accent, interactive elements, selections |
| `--primary-foreground` | `0 0% 98%` | `#FAFAFA` | Text on primary background |
| `--secondary` | `240 5% 96%` | `#F5F5F6` | Secondary buttons, subtle backgrounds |
| `--secondary-foreground` | `240 6% 10%` | `#181A1C` | Text on secondary background |
| `--muted` | `240 5% 96%` | `#F5F5F6` | Disabled states, subtle elements |
| `--muted-foreground` | `240 4% 46%` | `#717176` | Secondary text, descriptions |
| `--accent` | `240 5% 96%` | `#F5F5F6` | Accent highlights, hover states |
| `--accent-foreground` | `240 6% 10%` | `#181A1C` | Text on accent background |
| `--destructive` | `0 84% 60%` | `#E74C3C` | Delete buttons, error states |
| `--destructive-foreground` | `0 0% 98%` | `#FAFAFA` | Text on destructive background |
| `--border` | `240 6% 90%` | `#E3E4E6` | Border colors, dividers |
| `--input` | `240 6% 90%` | `#E3E4E6` | Input borders |
| `--ring` | `217 91% 60%` | `#3B82F6` | Focus rings |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card backgrounds |
| `--card-foreground` | `240 10% 4%` | `#0A0A10` | Text on cards |

### Dark Theme (Editor)

| Color Name | HSL Value | Hex Equivalent | Usage |
|------------|-----------|----------------|-------|
| `--background` | `240 10% 4%` | `#0A0A0F` | Editor canvas, viewport background |
| `--foreground` | `0 0% 98%` | `#FAFAFA` | Primary text color |
| `--primary` | `217 91% 60%` | `#3B82F6` | Primary accent (same as light theme) |
| `--primary-foreground` | `0 0% 98%` | `#FAFAFA` | Text on primary background |
| `--secondary` | `240 4% 16%` | `#27272A` | Secondary UI elements, panels |
| `--secondary-foreground` | `0 0% 98%` | `#FAFAFA` | Text on secondary background |
| `--muted` | `240 4% 16%` | `#27272A` | Disabled states, muted elements |
| `--muted-foreground` | `240 5% 65%` | `#A1A1AA` | Secondary text, labels |
| `--accent` | `262 83% 68%` | `#A855F7` | Purple accent for special features (AI, premium) |
| `--accent-foreground` | `0 0% 98%` | `#FAFAFA` | Text on accent background |
| `--destructive` | `0 63% 55%` | `#DC2626` | Delete buttons, error states |
| `--destructive-foreground` | `0 0% 98%` | `#FAFAFA` | Text on destructive background |
| `--border` | `240 4% 16%` | `#27272A` | Border colors, dividers |
| `--input` | `240 4% 16%` | `#27272A` | Input borders |
| `--ring` | `217 91% 60%` | `#3B82F6` | Focus rings |
| `--card` | `240 6% 10%` | `#16161D` | Card backgrounds, elevated panels |
| `--card-foreground` | `0 0% 98%` | `#FAFAFA` | Text on cards |

### Direct Color Values (Dark Theme Specific)

These colors are used directly in Tailwind classes for the dark editor theme:

| Color | Hex Value | Tailwind Class | Usage |
|-------|-----------|----------------|-------|
| Canvas Background | `#0A0A0F` | `bg-[#0A0A0F]` | 3D viewport, deepest background layer |
| Panel Background | `#16161D` | `bg-gray-800` | Sidebars, properties panel, modals |
| Elevated Panel | `#1E1E28` | `bg-gray-750` (custom) | Overlays, popovers, tooltips |
| Blue Primary | `#3B82F6` | `bg-blue-600` | Selected tool, active state, primary CTAs |
| Purple Accent | `#A855F7` | `bg-purple-600` | AI features, gradient accents |
| Red Destructive | `#DC2626` | `bg-red-600` | Delete buttons, warnings |
| Border/Divider | `#27272A` | `border-gray-700` | Panel borders, section dividers |

### Semantic Color Usage

- **Interactive Elements:** Use `--primary` (#3B82F6 blue) for buttons, links, selections
- **AI Features:** Use `--accent` (#A855F7 purple) or blue-to-purple gradients
- **Destructive Actions:** Use `--destructive` (red) with transparency for subtle warnings
- **Furniture Selection:** `#3B82F6` blue glow/outline
- **Room Selection:** Subtle blue tint on floor
- **Live Dimensions:** Blue text label with semi-transparent background
- **Grid Lines:** `#27272A` with 30% opacity

---

## Typography

### Font Families

**Primary Font: Inter**
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
```
- **Weights Used:** 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)
- **Font Features:** `'rlig' 1, 'calt' 1` (ligatures and contextual alternates enabled)
- **Source:** Google Fonts

**Monospace Font: JetBrains Mono**
```css
font-family: 'JetBrains Mono', 'Courier New', monospace;
```
- **Weights Used:** 400 (regular), 500 (medium)
- **Usage:** Dimension displays, coordinates, numeric values, code blocks
- **Applied via:** `.monospace` class, `<code>`, `<pre>` tags, or `font-mono` Tailwind class

### Type Scale

| Usage | Size | Weight | Tailwind Class | Example |
|-------|------|--------|----------------|---------|
| Page Heading | 24px | 700 | `text-2xl font-bold` | Project Hub title |
| Section Heading | 20px | 600 | `text-xl font-semibold` | "Asset Library", "Properties" |
| Panel Title | 18px | 600 | `text-lg font-semibold` | Modal headers |
| Body Text | 14px | 400 | `text-sm` | Descriptions, labels |
| Small Text | 12px | 400 | `text-xs` | Help text, metadata |
| Button Text | 14px | 500 | `text-sm font-medium` | All buttons |
| Dimension Display | 14px | 500 | `text-sm font-mono` | "2.4m × 0.7m" live dimension labels |
| Numeric Values | 14px | 400 | `text-sm font-mono` | Coordinates, measurements in properties panel |

### Letter Spacing & Line Height

- **Default Line Height:** 1.5 (most body text)
- **Tight Line Height:** 1.25 (headings, buttons)
- **Letter Spacing:** Default (not explicitly modified, relies on Inter's built-in metrics)

### Text Color Conventions

- **Primary Text (Dark Theme):** `text-white` or `text-foreground`
- **Secondary Text (Dark Theme):** `text-gray-400` or `text-muted-foreground`
- **Tertiary/Metadata (Dark Theme):** `text-gray-500`
- **Interactive Hover (Dark Theme):** `hover:text-blue-300` or `hover:text-white`

---

## Spacing & Layout

### Grid System

Home Designer uses an **8px base grid system**:

- **Base Unit:** 8px (Tailwind's default spacing scale)
- **Common Values:**
  - `p-2` = 8px padding
  - `p-3` = 12px padding
  - `p-4` = 16px padding
  - `gap-2` = 8px gap
  - `gap-3` = 12px gap
  - `gap-4` = 16px gap

### Standard Spacing Values

| Tailwind Class | Pixels | Usage |
|----------------|--------|-------|
| `p-1` | 4px | Icon padding, tight spacing |
| `p-2` | 8px | Button padding, compact elements |
| `p-3` | 12px | Panel section padding |
| `p-4` | 16px | Default panel/card padding |
| `py-3` | 12px top/bottom | Panel headers |
| `px-4` | 16px left/right | Panel content |
| `gap-2` | 8px | Button groups, icon + text |
| `gap-3` | 12px | Form field spacing |
| `gap-4` | 16px | Section spacing |
| `space-y-4` | 16px vertical | Stacked form elements |

### Panel & Sidebar Widths

| Element | Width | Tailwind Class | Notes |
|---------|-------|----------------|-------|
| Asset Library (Expanded) | 320px | `w-80` | Left sidebar |
| Asset Library (Collapsed) | 48px | `w-12` | Vertical tab strip |
| Properties Panel | 320px | `w-80` | Right floating panel |
| Floor Switcher | 64px | `w-16` | Right edge vertical strip |
| Toolbar Button | 40px | `w-10 h-10` | Square tool buttons |
| Modal Width (Mobile) | `calc(100vw - 1rem)` | Responsive, leaves 0.5rem margin each side |
| Modal Width (Desktop) | 600px - 800px | `max-w-2xl`, `max-w-3xl` | Depends on content |

### Border Radius

Defined in `tailwind.config.js` via CSS variables:

| Variable | Value | Tailwind Class | Usage |
|----------|-------|----------------|-------|
| `--radius` | 8px (0.5rem) | `rounded` | Default border radius |
| `lg` | `var(--radius)` | `rounded-lg` | Cards, panels, modals (8px) |
| `md` | `calc(var(--radius) - 2px)` | `rounded-md` | Buttons, inputs (6px) |
| `sm` | `calc(var(--radius) - 4px)` | `rounded-sm` | Chips, tags (4px) |
| Custom | 12px | `rounded-xl` | Large modals, feature cards |
| Full | 50% | `rounded-full` | Icon buttons, avatars |

### Layout Structure

```
Editor Layout (Full Screen):
┌──────────────────────────────────────────────────────────────┐
│ Toolbar (60px height, full width)                           │
├──────────┬───────────────────────────────────────┬───────────┤
│ Asset    │ Viewport3D (flex-1)                   │ Floor     │
│ Library  │                                       │ Switcher  │
│ (320px)  │                                       │ (64px)    │
│          │   ┌─────────────────────────┐         │           │
│          │   │ Properties Panel (320px)│         │           │
│          │   │ (Floating, top-right)   │         │           │
│          │   └─────────────────────────┘         │           │
└──────────┴───────────────────────────────────────┴───────────┘
```

---

## Component Patterns

### Buttons

#### Primary Button
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
  Create Project
</button>
```
- **Background:** `bg-blue-600`
- **Hover:** `hover:bg-blue-700`
- **Text:** `text-white text-sm font-medium`
- **Padding:** `px-4 py-2` (16px horizontal, 8px vertical)
- **Radius:** `rounded-md` (6px)
- **Transition:** `transition-colors` (200ms default)

#### Secondary Button
```tsx
<button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md text-sm font-medium hover:bg-gray-600 transition-colors">
  Cancel
</button>
```
- **Background:** `bg-gray-700`
- **Hover:** `hover:bg-gray-600`
- **Text:** `text-gray-300 text-sm font-medium`

#### Ghost Button (Icon Only)
```tsx
<button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
  <ChevronRight className="w-4 h-4" />
</button>
```
- **No background**, transparent by default
- **Hover:** `hover:bg-gray-700`
- **Icon Color:** `text-gray-400` → `hover:text-white`

#### Destructive Button
```tsx
<button className="px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 hover:border-red-600/50 text-red-400 hover:text-red-300 font-medium rounded-lg transition-all">
  <Trash2 className="w-4 h-4" />
  Delete Room
</button>
```
- **Background:** `bg-red-600/10` (10% opacity)
- **Border:** `border-red-600/30` (30% opacity)
- **Hover:** Lighten to 20% background, 50% border
- **Text:** `text-red-400 hover:text-red-300`

#### Gradient Button (AI Features)
```tsx
<button className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all">
  <Sparkles className="w-4 h-4" />
  Generate from Photo
</button>
```
- **Gradient:** `from-blue-600 to-purple-600`
- **Hover Gradient:** `hover:from-blue-700 hover:to-purple-700`

**Component Reference:** `frontend/src/components/AssetLibrary.tsx`, `Editor.tsx`, `PropertiesPanel.tsx`

---

### Form Inputs

#### Text Input
```tsx
<input
  type="text"
  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 transition-colors"
  placeholder="Enter room name"
/>
```
- **Background:** `bg-gray-700/50` (50% opacity for subtle depth)
- **Border:** `border-gray-600`
- **Focus:** `focus:border-blue-500` (no outline, border color change)
- **Text:** `text-white`
- **Placeholder:** `placeholder-gray-400`

#### Number Input
```tsx
<input
  type="number"
  step="0.1"
  className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
  placeholder="2.8"
/>
```
- Same as text input, but with `font-mono` for numeric values

#### Select Dropdown
```tsx
<select className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 transition-colors">
  <option value="hardwood">Hardwood</option>
  <option value="tile">Tile</option>
</select>
```

#### Color Picker
```tsx
<input
  type="color"
  className="h-10 w-20 rounded cursor-pointer bg-gray-700 border border-gray-600"
/>
```

#### Search Input (with Icon)
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
  <input
    type="text"
    className="w-full bg-gray-700 text-white pl-10 pr-8 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
    placeholder="Search assets..."
  />
</div>
```

**Component Reference:** `PropertiesPanel.tsx`, `AssetLibrary.tsx`

---

### Modals & Dialogs

#### Modal Container
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
  <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
    {/* Modal content */}
  </div>
</div>
```
- **Backdrop:** `bg-black/70` + `backdrop-blur-sm` (glassmorphism)
- **Modal Background:** `bg-gray-800`
- **Border:** `border-gray-700`
- **Radius:** `rounded-lg` (8px)
- **Shadow:** `shadow-2xl`
- **Max Height:** `max-h-[90vh]` (prevents viewport overflow)

#### Modal Header
```tsx
<div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
  <h2 className="text-xl font-semibold text-white">Modal Title</h2>
  <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
    <X className="w-5 h-5" />
  </button>
</div>
```

#### Modal Body
```tsx
<div className="p-6 space-y-4">
  {/* Form fields or content */}
</div>
```

#### Modal Footer
```tsx
<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
  <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md">Cancel</button>
  <button className="px-4 py-2 bg-blue-600 text-white rounded-md">Confirm</button>
</div>
```

**Component Reference:** `AIGenerationModal.tsx`, `DeleteRoomDialog.tsx`, `SettingsModal.tsx`, `ExportModal.tsx`

---

### Panels & Sidebars

#### Sidebar Panel
```tsx
<div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col w-80">
  {/* Panel header */}
  <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
    <h2 className="text-lg font-semibold text-white">Panel Title</h2>
  </div>

  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto p-4">
    {/* Content */}
  </div>

  {/* Optional footer */}
  <div className="px-4 py-3 border-t border-gray-700">
    {/* Footer content */}
  </div>
</div>
```

#### Floating Panel (Properties)
```tsx
<div className="absolute top-16 right-4 bg-gray-800/95 border border-gray-700 rounded-lg shadow-xl max-h-[calc(100vh-6rem)] overflow-y-auto w-80">
  {/* Panel content */}
</div>
```
- **Background:** `bg-gray-800/95` (95% opacity for slight transparency)
- **Position:** `absolute top-16 right-4` (below toolbar, right edge)

**Component Reference:** `AssetLibrary.tsx`, `PropertiesPanel.tsx`

---

### Cards

#### Asset Card (Grid Item)
```tsx
<div className="bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-600 transition-colors group">
  {/* Thumbnail */}
  <div className="aspect-square bg-gray-600 rounded mb-2 flex items-center justify-center">
    <Package className="w-8 h-8 text-gray-400" />
  </div>

  {/* Info */}
  <div className="text-xs">
    <p className="font-medium text-white truncate group-hover:text-blue-300 transition-colors">
      Asset Name
    </p>
    <p className="text-gray-400 mt-0.5">Category</p>
  </div>
</div>
```

**Component Reference:** `AssetLibrary.tsx`

---

### Tooltips & Context Menus

#### Tooltip (via `title` attribute)
```tsx
<button title="Rotate +90°" className="...">
  {/* Button content */}
</button>
```
- Use native `title` attribute for simple tooltips
- Browser handles positioning and display

#### Context Menu
```tsx
<div className="absolute bg-gray-800 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-[180px]">
  <button className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors">
    Menu Item
  </button>
</div>
```

**Component Reference:** `ContextMenu.tsx`

---

### Loading States

#### Spinner
```tsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
```

#### Loading Container
```tsx
<div className="text-center py-8">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
  <p className="text-gray-400 text-sm mt-2">Loading assets...</p>
</div>
```

#### Skeleton Loader (if needed)
```tsx
<div className="animate-pulse">
  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
</div>
```

---

### Empty States

```tsx
<div className="text-center py-8">
  <Package className="w-12 h-12 text-gray-600 mx-auto mb-2" />
  <p className="text-gray-400">No assets found</p>
</div>
```

**Component Reference:** `AssetLibrary.tsx`

---

## Animation Conventions

### Standard Durations

| Duration | Usage | Example |
|----------|-------|---------|
| **200ms** | Quick interactions | Button hover, text color change, border color |
| **300ms** | Standard transitions | Panel open/close, modal fade in/out |
| **400-500ms** | Slower animations | Accordion expand/collapse, page transitions |

### Easing Functions

**Primary Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (Tailwind's default "ease-out")

```css
/* Custom transition classes */
.transition-smooth {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-smooth-slow {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Tailwind Transition Classes

| Class | CSS Equivalent | Usage |
|-------|----------------|-------|
| `transition-colors` | `transition: color, background-color, border-color 200ms` | Button hovers, text color changes |
| `transition-all` | `transition: all 200ms` | Multiple property changes |
| `duration-300` | `transition-duration: 300ms` | Slower transitions |

### Animation Keyframes (Accordion)

```css
@keyframes accordion-down {
  from { height: 0 }
  to { height: var(--radix-accordion-content-height) }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height) }
  to { height: 0 }
}

.animate-accordion-down {
  animation: accordion-down 0.2s ease-out;
}

.animate-accordion-up {
  animation: accordion-up 0.2s ease-out;
}
```

### What Animates

✅ **Always Animate:**
- Button hover states (color, background)
- Panel collapse/expand
- Modal open/close (fade in/out)
- Tool selection (highlight, border)
- Selection glow/outline (furniture, rooms)
- Dropdown menus (height, opacity)

❌ **Never Animate:**
- 3D viewport camera movement (user-controlled)
- Drag-and-drop operations (follows cursor immediately)
- Text input typing (instant feedback)
- Grid lines (static)

### Framer Motion Patterns

Used for complex animations (modals, page transitions):

```tsx
import { motion } from 'framer-motion';

// Modal fade in
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
>
  {/* Modal content */}
</motion.div>
```

**Component Reference:** Check modal components for Framer Motion usage

---

## Icons

### Icon Library: Lucide React

**Package:** `lucide-react`

**Import Pattern:**
```tsx
import {
  MousePointer2,
  Square,
  Ruler,
  Armchair,
  Settings,
  Trash2
} from 'lucide-react';
```

### Standard Icon Sizes

| Size Class | Pixels | Usage |
|------------|--------|-------|
| `w-4 h-4` | 16px | Inline with text, small buttons |
| `w-5 h-5` | 20px | Panel headers, medium buttons |
| `w-6 h-6` | 24px | Large buttons, standalone icons |
| `w-8 h-8` | 32px | Asset placeholders, empty states |
| `w-12 h-12` | 48px | Large empty states, feature illustrations |

### Common Icons

| Icon | Component | Usage |
|------|-----------|-------|
| Select | `<MousePointer2>` | Select tool |
| Draw Wall | `<Square>` | Draw wall tool |
| Measure | `<Ruler>` | Measurement tool |
| Place Furniture | `<Armchair>` | Furniture placement tool |
| Pan | `<Hand>` | Pan/move viewport tool |
| First Person | `<Eye>` | First-person camera mode |
| Settings | `<Settings>` | Settings modal trigger |
| Delete | `<Trash2>` | Delete actions |
| Save | `<Save>` | Save operations |
| Undo/Redo | `<Undo2>`, `<Redo2>` | History controls |
| Add | `<Plus>` | Create new items |
| Export | `<Download>` | Export operations |
| Import | `<Upload>` | Import operations |
| Check | `<Check>` | Confirmation, success states |
| Loader | `<Loader2>` | Loading spinner (with `animate-spin`) |
| Grid | `<Grid3x3>` | Grid toggle |
| AI Features | `<Sparkles>` | AI generation |
| URL Import | `<Link>` | Import from URL |

### Icon Color Conventions

- **Default:** `text-gray-400` (inactive state)
- **Hover:** `text-white` or `text-blue-300`
- **Active/Selected:** `text-blue-500` or `text-white`
- **Destructive:** `text-red-400`

---

## Dark Theme

### Implementation

The dark theme is applied via the `.dark` class on a parent element (typically the editor container):

```tsx
<div className="dark">
  {/* Editor components inherit dark theme variables */}
</div>
```

### Surface Color Hierarchy

Home Designer uses a **3-layer depth system** in dark mode:

1. **Deepest Layer (Canvas):** `#0A0A0F` - 3D viewport background
2. **Mid Layer (Panels):** `#16161D` - Sidebars, properties panel, modals
3. **Elevated Layer (Overlays):** `#1E1E28` - Tooltips, popovers, dropdowns

### Hover State Pattern

**Lighten by 8-12% on hover:**

- `bg-gray-800` → `hover:bg-gray-700` (from `#16161D` to `#1F1F28`)
- `bg-gray-700` → `hover:bg-gray-600` (from `#27272A` to `#3F3F46`)
- `bg-blue-600` → `hover:bg-blue-700` (from `#3B82F6` to `#2563EB`)

### Border Colors

- **Primary Borders:** `border-gray-700` (#27272A)
- **Subtle Dividers:** `border-gray-800` (#1F1F28)
- **Focus Borders:** `border-blue-500` (#3B82F6)

### Text Contrast Ratios

Ensure WCAG AA compliance:

- **White on Dark Background:** 16:1 (excellent)
- **Gray-400 on Dark Background:** 4.5:1 (AA compliant)
- **Blue-600 on Dark Background:** 3.5:1 (AA for large text)

### Shadow Conventions

Dark theme uses more prominent shadows for depth:

- **Panel Shadows:** `shadow-xl` (large spread, dark)
- **Modal Shadows:** `shadow-2xl` (extra large)
- **Floating Elements:** `shadow-lg`

---

## Glassmorphism & Effects

### Backdrop Blur

Used for modals, overlays, and floating panels:

```tsx
{/* Modal backdrop */}
<div className="bg-black/70 backdrop-blur-sm">
  {/* ... */}
</div>

{/* Floating panel */}
<div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700">
  {/* ... */}
</div>
```

**Blur Values:**
- `backdrop-blur-sm` (4px) - Subtle blur for modals
- `backdrop-blur-md` (8px) - Medium blur for overlays
- `backdrop-blur-lg` (16px) - Strong blur (rarely used)

### Transparency Levels

| Opacity | Tailwind Class | Usage |
|---------|----------------|-------|
| 95% | `/95` | Floating panels (barely transparent) |
| 70% | `/70` | Modal backdrops |
| 50% | `/50` | Input backgrounds |
| 30% | `/30` | Destructive button borders |
| 10% | `/10` | Destructive button backgrounds, hover overlays |

### Glow Effects

**Selection Glow (Furniture):**
```tsx
{/* In Three.js materials */}
<meshStandardMaterial
  emissive="#3B82F6"
  emissiveIntensity={0.3}
/>
```

**Shadow Glow (Buttons):**
```css
.glow-button {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
}
```

---

## Creating New UI Checklist

When creating new UI components, follow this checklist to ensure design system compliance:

### 1. Colors ✅
- [ ] Use CSS variables (`--primary`, `--background`, etc.) or Tailwind semantic classes
- [ ] Avoid hardcoded hex colors except for specific 3D viewport needs
- [ ] Test in both light theme (if applicable) and dark theme
- [ ] Ensure text contrast meets WCAG AA standards (4.5:1 minimum)

### 2. Spacing ✅
- [ ] Use 8px grid system (Tailwind's default spacing scale)
- [ ] Apply consistent padding: `p-4` for panels, `p-3` for headers
- [ ] Use `gap-2`, `gap-3`, `gap-4` for flex/grid layouts
- [ ] Maintain panel widths: 320px for sidebars, responsive for modals

### 3. Typography ✅
- [ ] Use Inter for all UI text
- [ ] Use JetBrains Mono (`font-mono`) for numeric values, coordinates, dimensions
- [ ] Apply appropriate font weights: 400 (body), 500 (buttons), 600 (headings)
- [ ] Use `text-sm` for body text, `text-lg` or `text-xl` for headings

### 4. Component Patterns ✅
- [ ] Follow established button styles (primary, secondary, ghost, destructive)
- [ ] Use consistent input styles (`bg-gray-700/50`, `border-gray-600`)
- [ ] Match modal structure (backdrop blur, header/body/footer)
- [ ] Apply panel patterns (border-r/border-b dividers, sticky headers)

### 5. Animations ✅
- [ ] Add `transition-colors` to buttons and interactive elements
- [ ] Use 200ms for quick transitions, 300ms for panel animations
- [ ] Apply `hover:` states consistently (lighten by ~10%)
- [ ] Avoid animating properties that change frequently (drag operations)

### 6. Icons ✅
- [ ] Import from `lucide-react`
- [ ] Use appropriate size: `w-4 h-4` for inline, `w-5 h-5` for buttons
- [ ] Apply `text-gray-400` default color, `hover:text-white` on hover
- [ ] Position icons consistently (left of text in buttons, 2px gap)

### 7. Dark Theme ✅
- [ ] Test component in dark theme (editor context)
- [ ] Ensure proper surface hierarchy (`#0A0A0F` → `#16161D` → `#1E1E28`)
- [ ] Verify border visibility with `border-gray-700`
- [ ] Check shadow effectiveness (`shadow-xl` for floating elements)

### 8. Accessibility ✅
- [ ] Add `aria-label` to icon-only buttons
- [ ] Use semantic HTML (`<button>`, `<nav>`, `<header>`)
- [ ] Ensure keyboard navigation works (focus states, tab order)
- [ ] Test with screen readers if applicable

### 9. Responsive Behavior ✅
- [ ] Test on narrow screens (< 768px)
- [ ] Apply responsive classes (`md:w-80`, `sm:text-sm`)
- [ ] Auto-collapse sidebars on mobile if needed
- [ ] Ensure modals don't exceed viewport height (`max-h-[90vh]`)

### 10. Performance ✅
- [ ] Avoid creating new objects/styles on every render
- [ ] Use CSS classes instead of inline styles when possible
- [ ] Lazy-load modals if they're rarely used
- [ ] Optimize icon imports (import only what's needed)

---

## Component Reference Map

| Pattern | Example File(s) |
|---------|-----------------|
| Buttons | `AssetLibrary.tsx`, `Editor.tsx`, `PropertiesPanel.tsx` |
| Form Inputs | `PropertiesPanel.tsx`, `AssetLibrary.tsx` |
| Modals | `AIGenerationModal.tsx`, `SettingsModal.tsx`, `ExportModal.tsx` |
| Sidebars | `AssetLibrary.tsx` (collapsible), `PropertiesPanel.tsx` (floating) |
| Cards | `AssetLibrary.tsx` (asset grid items) |
| Loading States | `AssetLibrary.tsx`, `ProjectHub.tsx` |
| Empty States | `AssetLibrary.tsx` |
| Context Menus | `ContextMenu.tsx` |
| Zustand Store | `store/editorStore.ts` |

---

## Summary

This design system ensures visual consistency across Home Designer. Key principles:

1. **8px Grid System:** All spacing uses multiples of 8px
2. **Semantic Colors:** Use CSS variables for light/dark theme compatibility
3. **Inter + JetBrains Mono:** Primary UI font + monospace for numbers
4. **200-300ms Transitions:** Quick, smooth animations
5. **Lucide Icons:** Consistent icon library at 16-24px sizes
6. **Dark-First:** Editor optimized for dark theme, deep background hierarchy
7. **Glassmorphism:** Subtle backdrop blur for floating elements
8. **Accessible:** WCAG AA contrast, semantic HTML, keyboard navigation

When in doubt, reference existing components and apply the patterns documented here. Consistency creates a professional, cohesive user experience.
