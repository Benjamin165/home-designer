# Contributing to Home Designer

Thank you for your interest in contributing to Home Designer! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Pull Requests](#submitting-pull-requests)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and considerate in all interactions.

## Getting Started

Before you begin contributing, please:

1. Read the [README.md](README.md) to understand the project
2. Check the [existing issues](https://github.com/yourusername/home-designer/issues) to see if your idea or bug has already been reported
3. Set up your development environment following the instructions below

## Development Environment Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js 20+** and npm (check with `node -v` and `npm -v`)
- **Git** for version control
- A modern browser with **WebGL 2.0 support** (Chrome, Firefox, Edge, Safari)
- A code editor (VS Code, WebStorm, etc.)

### Quick Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/home-designer.git
   cd home-designer
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/yourusername/home-designer.git
   ```

4. **Run the initialization script**:
   ```bash
   chmod +x init.sh
   ./init.sh
   ```

   The script will:
   - Install all dependencies for both frontend and backend
   - Initialize the SQLite database
   - Start the development servers

5. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

### Manual Setup

If you prefer manual setup or the script fails:

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend (in a new terminal):**
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

Understanding the project structure will help you navigate the codebase:

```
home-designer/
├── frontend/                  # React + TypeScript frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ui/            # shadcn/ui base components
│   │   │   ├── Editor.tsx     # Main 3D editor
│   │   │   ├── Viewport3D.tsx # Three.js viewport
│   │   │   └── ...
│   │   ├── stores/            # Zustand state management
│   │   │   ├── editorStore.ts # Editor state (rooms, furniture)
│   │   │   ├── cameraStore.ts # Camera controls
│   │   │   └── ...
│   │   ├── lib/               # Utilities and API client
│   │   │   ├── api.ts         # API client functions
│   │   │   └── utils.ts       # Helper functions
│   │   ├── App.tsx            # Main app component
│   │   └── main.tsx           # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                   # Node.js + Express backend
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   │   ├── projects.js    # Project CRUD
│   │   │   ├── rooms.js       # Room operations
│   │   │   ├── furniture.js   # Furniture placement
│   │   │   └── ...
│   │   ├── db/                # Database layer
│   │   │   ├── init.js        # Database initialization
│   │   │   └── schema.sql     # Database schema
│   │   ├── services/          # Business logic
│   │   └── server.js          # Express server
│   ├── package.json
│   └── database.db            # SQLite database (auto-generated)
│
├── assets/                    # Static assets
│   ├── models/                # 3D models (.glb, .gltf)
│   ├── textures/              # Material textures
│   └── thumbnails/            # Asset preview images
│
├── .github/                   # GitHub-specific files
│   └── workflows/             # CI/CD workflows
│
├── init.sh                    # Development setup script
├── README.md                  # Project overview
├── CONTRIBUTING.md            # This file
└── .gitignore
```

## Coding Standards

### TypeScript/JavaScript

- **Use TypeScript** for all frontend code
- **Enable strict mode** and fix all type errors
- **Use meaningful variable names** (avoid single letters except for loops)
- **Write pure functions** where possible
- **Avoid `any` type** - use specific types or `unknown`

### React Patterns

- **Functional components only** (no class components)
- **Use hooks** for state and effects
- **Prefer composition** over inheritance
- **Keep components focused** - single responsibility principle
- **Extract reusable logic** into custom hooks
- **Use Zustand stores** for global state, local state for component-specific data

Example:
```tsx
// Good
function RoomEditor({ roomId }: { roomId: number }) {
  const updateRoom = useEditorStore((state) => state.updateRoom);
  const [isEditing, setIsEditing] = useState(false);

  // ...
}

// Avoid
function RoomEditor(props: any) {
  const [globalState, setGlobalState] = useState({});
  // ...
}
```

### API Conventions

- **RESTful routes**: Use standard HTTP verbs (GET, POST, PUT, DELETE)
- **Consistent response format**:
  ```json
  {
    "success": true,
    "data": { /* ... */ },
    "error": null
  }
  ```
- **Error handling**: Return appropriate HTTP status codes (400, 404, 500)
- **Validation**: Validate all inputs before processing
- **SQL injection protection**: Use parameterized queries

Example:
```javascript
// Good
router.post('/rooms', (req, res) => {
  const { name, width, length, floor_id } = req.body;

  if (!name || !width || !length || !floor_id) {
    return res.status(400).json({
      success: false,
      error: { message: 'Missing required fields' }
    });
  }

  const stmt = db.prepare(
    'INSERT INTO rooms (name, width, length, floor_id) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(name, width, length, floor_id);

  res.json({ success: true, data: { id: result.lastInsertRowid } });
});
```

### Styling

- **Use Tailwind CSS utility classes** for styling
- **Follow shadcn/ui patterns** for component styling
- **Use Framer Motion** for animations
- **Maintain responsive design** (mobile, tablet, desktop)
- **Ensure accessibility** (ARIA labels, keyboard navigation)

### Three.js / 3D Code

- **Use React Three Fiber** for React integration
- **Use Drei helpers** for common 3D utilities
- **Optimize geometry** - use LOD, instancing for repeated objects
- **Dispose of resources** in cleanup functions
- **Use proper units** - 1 unit = 1 meter in world space

Example:
```tsx
// Good
<mesh ref={meshRef} position={[x, 0, z]}>
  <boxGeometry args={[width, height, depth]} />
  <meshStandardMaterial color={color} />
</mesh>

// Clean up
useEffect(() => {
  return () => {
    geometry.dispose();
    material.dispose();
  };
}, []);
```

### File Naming

- **React components**: PascalCase (e.g., `RoomEditor.tsx`)
- **Utilities/helpers**: camelCase (e.g., `formatDimensions.ts`)
- **Stores**: camelCase with "Store" suffix (e.g., `editorStore.ts`)
- **API routes**: camelCase (e.g., `projects.js`)

## Making Changes

### 1. Create a Branch

Always work on a feature branch, never on `main`:

```bash
git checkout -b feature/your-feature-name
```

Use branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

### 2. Make Your Changes

- Write clean, documented code
- Follow the coding standards above
- Keep commits focused and atomic
- Write descriptive commit messages

### 3. Test Your Changes

Before submitting:
- Test the feature in the browser manually
- Check the browser console for errors
- Test on different screen sizes (responsive design)
- Verify database operations persist across server restarts
- Run the linter: `cd frontend && npm run lint`
- Build the frontend: `cd frontend && npm run build`

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add room rotation controls to properties panel"
```

Use conventional commit prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation
- `style:` - Formatting, no code change
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 5. Keep Your Branch Updated

Regularly sync with the upstream repository:

```bash
git fetch upstream
git rebase upstream/main
```

## Testing

### Manual Testing

For UI features:
1. Open the application in the browser
2. Test the happy path (expected usage)
3. Test edge cases (empty states, invalid inputs)
4. Check console for errors
5. Verify responsive design on different screen sizes
6. Test browser back/forward navigation

For API features:
1. Test with `curl` or Postman
2. Verify correct response format
3. Test error cases (missing fields, invalid data)
4. Check database persistence

### Automated Testing

The project uses feature-driven development with automated verification:
- Features are stored in `features.db`
- Each feature has verification steps
- CI/CD runs checks on pull requests

## Submitting Pull Requests

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub from your fork to the main repository

3. **Fill out the PR template** with:
   - Clear description of the changes
   - Screenshots/videos for UI changes
   - Link to related issue (if applicable)
   - Testing steps performed

4. **Respond to feedback** from maintainers
   - Address all review comments
   - Make requested changes
   - Push updates to the same branch

5. **Wait for approval** - A maintainer will review and merge your PR

### PR Checklist

Before submitting, ensure:
- [ ] Code follows the coding standards
- [ ] Changes are tested manually
- [ ] No console errors or warnings
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Frontend linter passes (`npm run lint`)
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up to date with `main`

## Reporting Issues

Found a bug? Please report it!

### Before Submitting an Issue

1. **Search existing issues** to avoid duplicates
2. **Check if it's already fixed** in the latest version
3. **Reproduce the issue** consistently

### Issue Template

When reporting a bug, include:

- **Description**: Clear description of the issue
- **Steps to Reproduce**:
  1. Go to '...'
  2. Click on '...'
  3. See error
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Environment**:
  - OS: [e.g., Windows 11, macOS 13]
  - Browser: [e.g., Chrome 120, Firefox 121]
  - Node.js version: [e.g., 20.10.0]
- **Console Logs**: Any errors in browser console or terminal

## Feature Requests

Have an idea for a new feature? We'd love to hear it!

### Before Submitting

1. **Check existing feature requests** to avoid duplicates
2. **Consider the scope** - Does it fit the project's goals?
3. **Think about implementation** - How might it work?

### Feature Request Template

When requesting a feature, include:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternatives Considered**: Other ways to solve the problem
- **Use Cases**: Real-world scenarios where this is useful
- **Mockups/Examples** (optional): Visual examples if applicable

## Questions?

If you have questions about contributing:

- Open a [GitHub Discussion](https://github.com/yourusername/home-designer/discussions)
- Tag your question with "question" label

## License

By contributing to Home Designer, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Home Designer! 🎉

