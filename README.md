# Home Designer

An open-source, self-hosted 3D interior design application that enables users to design and visualize their apartment or house interiors.

## Overview

Home Designer is a powerful, local-first interior design tool that combines modern web technologies with AI capabilities to help you design and visualize your living spaces. Create rooms through multiple methods (drawing walls, inputting dimensions, uploading floor plans, or AI-powered photo reconstruction), furnish them with items from a built-in library or AI-generated 3D models, and customize every surface with materials and lighting.

### Key Features

- **Multiple Room Creation Methods**: Draw walls, input exact dimensions, upload floor plans, or use AI photo reconstruction
- **3D Visualization**: Real-time 3D viewport powered by Three.js with isometric and first-person camera modes
- **Extensive Furniture Library**: Built-in library with furniture, decor, plants, lighting, windows, and doors
- **AI-Powered Features**: Generate 3D models from photos using Microsoft TRELLIS, import furniture from product URLs
- **Complete Customization**: Materials, colors, textures for walls, floors, and ceilings; adjustable lighting and day/night cycles
- **Multi-Floor Support**: Design multiple floors with seamless switching and translucent floor previews
- **Full Editing Controls**: Move, rotate, scale furniture; snap-to-grid and snap-to-wall placement; undo/redo history
- **Export Options**: High-quality screenshots, 3D scene exports (glTF/GLB), floor plans (PDF/PNG/SVG), project backups
- **Local-First**: No cloud required, all data stored locally in SQLite, fully self-hosted

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **3D Engine**: Three.js via React Three Fiber (@react-three/fiber) and Drei (@react-three/drei)
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand (editor state, camera, selections, undo/redo)
- **Animations**: Framer Motion
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js 20+ with Express
- **Database**: SQLite via better-sqlite3 (no external DB required)
- **File Storage**: Local filesystem for 3D models, textures, and project assets
- **AI Integration**: Microsoft TRELLIS (image-to-3D), configurable AI API keys

### 3D Pipeline
- **Model Formats**: glTF/GLB (primary), OBJ (import support)
- **Optimization**: Draco compression, LOD (Level of Detail)
- **Textures**: Compressed textures (KTX2/Basis Universal)

## Prerequisites

Before running Home Designer, ensure you have:

- **Node.js 20+** and npm
- **Git**
- **Modern browser** with WebGL 2.0 support (Chrome, Firefox, Edge, Safari)
- **(Optional)** NVIDIA GPU for TRELLIS local inference, or TRELLIS API endpoint
- **(Optional)** User-provided API keys for AI services (configured in settings)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/home-designer.git
cd home-designer
```

### 2. Run the setup script

**On Windows:**
```bash
bash init.sh
```

**On macOS/Linux:**
```bash
chmod +x init.sh
./init.sh
```

The script will:
- Check Node.js version
- Install frontend and backend dependencies
- Initialize the SQLite database
- Start both development servers

### 3. Access the application

Once the servers are running:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## Manual Setup

If you prefer to set up manually:

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend server will start on http://localhost:5000

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:5173

## Project Structure

```
home-designer/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── stores/        # Zustand state stores
│   │   ├── lib/           # Utilities and helpers
│   │   └── App.tsx        # Main app component
│   ├── package.json
│   └── vite.config.ts
│
├── backend/               # Express backend API
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── db/            # Database schema and queries
│   │   ├── services/      # Business logic services
│   │   └── server.js      # Express server entry point
│   ├── package.json
│   └── database.db        # SQLite database (auto-created)
│
├── assets/                # 3D models, textures, thumbnails
│   ├── models/            # Built-in and user-generated 3D models
│   ├── textures/          # Material textures
│   └── thumbnails/        # Asset preview images
│
├── init.sh                # Development environment setup script
├── README.md              # This file
└── .gitignore
```

## Configuration

### Unit System

Choose between metric (meters) and imperial (feet) in the settings panel.

### AI API Keys

To use AI features (photo-to-3D, photo-to-room reconstruction):

1. Open the app and go to Settings
2. Navigate to "AI API Keys"
3. Add your API keys for:
   - TRELLIS API (for image-to-3D model generation)
   - (Optional) Other AI services for photo-to-room reconstruction

API keys are encrypted at rest in the local database.

### Performance Settings

- **Render Quality**: Low / Medium / High / Ultra
- **Performance Mode**: Reduces visual quality for smoother editing on lower-end hardware
- **Auto-save Interval**: Configure how often projects are automatically saved

## Usage

### Creating Your First Project

1. On the Project Hub landing page, click "Create New Project"
2. Enter a project name and optional description
3. Click "Create" to open the editor

### Creating Rooms

**Method 1: Draw Walls**
- Select the "Draw Wall" tool from the toolbar
- Click and drag in the 3D viewport to create a rectangular room
- Dimensions display in real-time as you drag

**Method 2: Input Dimensions**
- Click "Create Room by Dimensions"
- Enter width, length, and optional ceiling height
- Click "Create"

**Method 3: Upload Floor Plan**
- Click "Upload Floor Plan"
- Select an image of your floor plan
- The app will convert it to room structure

**Method 4: AI Photo Reconstruction**
- Click "Generate from Photo"
- Upload a photo of your room
- AI will estimate room layout and dimensions

### Placing Furniture

1. Open the asset library (left sidebar)
2. Browse categories or use search
3. Drag furniture items into the 3D scene
4. Use gizmos to move, rotate, and scale objects
5. Right-click objects for context menu options

### Customizing Materials

- Select a wall to change its color or apply textures
- Select a room to change floor material (hardwood, tile, carpet, etc.)
- Adjust ceiling height and materials
- Place lights to customize illumination

### Working with Multiple Floors

1. Click the "+" button in the floor switcher (right edge)
2. Add multiple floors to your project
3. Click on a floor to switch between levels
4. Current floor renders at full opacity, others show as translucent hints

### Exporting

- **Screenshot**: Capture the current view from any camera angle
- **3D Scene**: Export as glTF/GLB for use in other 3D software
- **Floor Plan**: Export 2D top-down view as PDF, PNG, or SVG
- **Project Backup**: Export complete project as ZIP for backup/sharing

## Development

### Feature Development

This project uses a feature-driven development approach with automated testing:

- Features are defined in the SQLite database (`features.db`)
- Each feature has verification steps that must pass
- Run `npm test` to execute feature verification tests
- Features are implemented by autonomous coding agents in priority order

### Database Schema

The SQLite database includes tables for:
- `projects`: Project metadata and settings
- `floors`: Floor/level definitions
- `rooms`: Room geometry and materials
- `walls`, `windows`, `doors`: Architectural elements
- `assets`: Furniture and object library
- `furniture_placements`: Placed objects in rooms
- `lights`: Lighting fixtures and properties
- `edit_history`: Undo/redo history
- `ai_generations`: AI generation history
- `user_settings`: Application settings
- `material_presets`: Material library

## Expanding the Asset Library

The built-in library includes essential furniture, but you can expand it:

### Adding Models Manually

1. Prepare 3D models in glTF/GLB format with proper dimensions
2. Place model files in `assets/models/`
3. Add entries to the `assets` table via API or database tool
4. Include: name, category, dimensions, model path, thumbnail

### Using LLMs for Batch Expansion

Provide an LLM with:
- The asset database schema
- The POST /api/assets endpoint documentation
- A list of furniture items to add with dimensions
- Links to open 3D model libraries (Sketchfab, TurboSquid free, etc.)

The LLM can batch-create asset entries using the API.

## Troubleshooting

### Servers won't start

- Ensure ports 5000 and 5173 are not in use by other applications
- On Windows, check Windows Defender or antivirus isn't blocking Node.js

### 3D viewport is black or not rendering

- Verify your browser supports WebGL 2.0 (check chrome://gpu or about:support)
- Try updating your graphics drivers
- Enable hardware acceleration in browser settings

### Performance issues

- Enable "Performance Mode" in settings
- Lower the render quality setting
- Reduce the number of objects in the scene
- Close other browser tabs and applications

### Database errors

- Delete `backend/database.db` and restart the backend to reinitialize
- Ensure the backend has write permissions to the project directory

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open-source and available under the MIT License.

## Acknowledgments

- **Three.js**: For the powerful 3D rendering engine
- **React Three Fiber**: For React bindings for Three.js
- **Microsoft TRELLIS**: For image-to-3D model generation
- **shadcn/ui**: For beautiful UI components
- **21st.dev**: For design inspiration

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Built with ❤️ by the open-source community
