import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, floorsApi, roomsApi, furnitureApi, ApiError } from '../lib/api';
import { useEditorStore } from '../store/editorStore';
import Viewport3D from './Viewport3D';
import AssetLibrary from './AssetLibrary';
import FloorSwitcher from './FloorSwitcher';
import {
  MousePointer2,
  Square,
  Ruler,
  ArrowLeft,
  Save,
  Edit2,
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description?: string;
  thumbnail_path?: string;
  unit_system: 'metric' | 'imperial';
  created_at: string;
  updated_at: string;
}

function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensionText, setDimensionText] = useState<string>('');
  const dragDataRef = useRef<{ startX: number; startZ: number; width: number; depth: number } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Zustand store
  const {
    setProjectId,
    currentTool,
    setCurrentTool,
    floors,
    setFloors,
    currentFloorId,
    setCurrentFloorId,
    rooms,
    setRooms,
    addRoom,
    unitSystem,
    setUnitSystem,
    setFurniturePlacements,
  } = useEditorStore();

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  useEffect(() => {
    if (currentFloorId) {
      loadRooms();
    }
  }, [currentFloorId]);

  // Listen for room creation events from 3D viewport
  useEffect(() => {
    const handleCreateRoom = async (event: any) => {
      const { width, depth, position_x, position_z } = event.detail;
      await createRoom(width, depth, position_x, position_z);
    };

    window.addEventListener('createRoom', handleCreateRoom);
    return () => window.removeEventListener('createRoom', handleCreateRoom);
  }, [currentFloorId]);

  const loadProject = async () => {
    if (!projectId) {
      setError('No project ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await projectsApi.getById(parseInt(projectId));
      const proj = data.project;
      setProject(proj);
      setProjectId(proj.id);
      setUnitSystem(proj.unit_system || 'metric');

      // Load floors
      await loadFloors(proj.id);
    } catch (err) {
      if (err instanceof ApiError && err.userMessage) {
        setError(err.userMessage);
      } else {
        setError('Failed to load project');
      }
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFloors = async (projId: number) => {
    try {
      const data = await floorsApi.getByProject(projId);
      const floorsList = data.floors || [];

      if (floorsList.length === 0) {
        // Create default floor
        const newFloorData = await floorsApi.create(projId, {
          name: 'Ground Floor',
          level: 0,
          order_index: 0,
        });
        const newFloor = newFloorData.floor;
        setFloors([newFloor]);
        setCurrentFloorId(newFloor.id);
      } else {
        setFloors(floorsList);
        setCurrentFloorId(floorsList[0].id);
      }
    } catch (err) {
      console.error('Error loading floors:', err);
    }
  };

  const loadRooms = async () => {
    if (!currentFloorId) return;

    try {
      const data = await roomsApi.getByFloor(currentFloorId);
      const roomsList = data.rooms || [];
      setRooms(roomsList);

      // Load furniture for all rooms
      await loadFurniture(roomsList);
    } catch (err) {
      console.error('Error loading rooms:', err);
    }
  };

  const loadFurniture = async (roomsList: any[]) => {
    try {
      // Fetch furniture for all rooms
      const allFurniture = [];
      for (const room of roomsList) {
        try {
          const data = await furnitureApi.getByRoom(room.id);
          if (data.furniture) {
            allFurniture.push(...data.furniture);
          }
        } catch (err) {
          console.error(`Error loading furniture for room ${room.id}:`, err);
        }
      }
      setFurniturePlacements(allFurniture);
    } catch (err) {
      console.error('Error loading furniture:', err);
    }
  };

  const createRoom = async (
    width: number,
    depth: number,
    position_x: number,
    position_z: number
  ) => {
    if (!currentFloorId) {
      console.error('No floor selected');
      return;
    }

    try {
      const roomData = {
        name: `Room ${rooms.length + 1}`,
        dimensions_json: {
          width,
          depth,
        },
        position_x,
        position_y: 0,
        position_z,
        ceiling_height: 2.8,
        floor_color: '#d1d5db',
        ceiling_color: '#f3f4f6',
      };

      const data = await roomsApi.create(currentFloorId, roomData);
      addRoom(data.room);

      console.log('Room created:', data.room);
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room');
    }
  };

  const handleBackToProjects = () => {
    navigate('/');
  };

  const handleToolSelect = (tool: 'select' | 'draw-wall' | 'measure') => {
    setCurrentTool(tool);
  };

  const handleEditClick = () => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || '');
      setShowEditModal(true);
      setEditError(null);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditName('');
    setEditDescription('');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editName.trim()) {
      setEditError('Project name is required');
      return;
    }

    if (!project) return;

    try {
      setEditLoading(true);
      setEditError(null);

      const data = await projectsApi.update(project.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });

      // Update local state
      setProject(data.project);
      setShowEditModal(false);
    } catch (err) {
      if (err instanceof ApiError && err.userMessage) {
        setEditError(err.userMessage);
      } else {
        setEditError('Failed to update project. Please try again.');
      }
      console.error('Error updating project:', err);
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-200 mb-2">Error Loading Project</h3>
            <p className="text-red-300">{error || 'Project not found'}</p>
            <button
              onClick={handleBackToProjects}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Editor Toolbar */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToProjects}
              className="text-gray-400 hover:text-white transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-lg font-semibold text-white">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-gray-400">{project.description}</p>
                )}
              </div>
              <button
                onClick={handleEditClick}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="Edit Project Details"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tools */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-700 rounded-lg p-1 gap-1">
              <button
                onClick={() => handleToolSelect('select')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'select'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="Select"
              >
                <MousePointer2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleToolSelect('draw-wall')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'draw-wall'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="Draw Wall"
              >
                <Square className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleToolSelect('measure')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'measure'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="Measure"
              >
                <Ruler className="w-5 h-5" />
              </button>
            </div>

            <button className="px-3 py-2 flex items-center gap-2 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors">
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </header>

      {/* Editor Content with Asset Library and 3D Viewport */}
      <main className="flex-1 relative overflow-hidden flex">
        {/* Left Sidebar - Asset Library */}
        <AssetLibrary />

        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <Viewport3D />

          {/* Floor Switcher */}
          {project && <FloorSwitcher projectId={project.id} />}

          {/* Info panel */}
          <div className="absolute bottom-4 left-4 bg-gray-800/90 text-white px-4 py-2 rounded-lg text-sm">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-400">Tool: </span>
                <span className="font-medium capitalize">
                  {currentTool === 'draw-wall' ? 'Draw Wall' : currentTool}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Rooms: </span>
                <span className="font-medium">{rooms.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Floor: </span>
                <span className="font-medium">
                  {floors.find((f) => f.id === currentFloorId)?.name || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Instructions overlay */}
          {currentTool === 'draw-wall' && rooms.length === 0 && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="bg-gray-800/95 text-white px-8 py-6 rounded-xl shadow-2xl max-w-md">
                <Square className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                <h3 className="text-xl font-semibold mb-2">Draw Your First Room</h3>
                <p className="text-gray-300 mb-4">
                  Click and drag in the viewport to create a rectangular room. Dimensions will be displayed in real-time.
                </p>
                <p className="text-sm text-gray-400">
                  Minimum size: 0.5m × 0.5m
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Edit Project</h2>

            <form onSubmit={handleSaveEdit}>
              <div className="mb-4">
                <label htmlFor="edit-project-name" className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  id="edit-project-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Living Room Redesign"
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label htmlFor="edit-project-description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="edit-project-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Describe your project..."
                />
              </div>

              {editError && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md" role="alert" aria-live="assertive">
                  <p className="text-sm text-red-300">{editError}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={editLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Editor;
