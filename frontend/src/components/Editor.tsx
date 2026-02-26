import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, floorsApi, roomsApi, ApiError } from '../lib/api';
import { useEditorStore } from '../store/editorStore';
import Viewport3D from './Viewport3D';
import {
  MousePointer2,
  Square,
  Ruler,
  ArrowLeft,
  Save,
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
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('Error loading rooms:', err);
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
            <div>
              <h1 className="text-lg font-semibold text-white">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-400">{project.description}</p>
              )}
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

      {/* Editor Content with 3D Viewport */}
      <main className="flex-1 relative overflow-hidden">
        <Viewport3D />

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
      </main>
    </div>
  );
}

export default Editor;
