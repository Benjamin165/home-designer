import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, floorsApi, roomsApi, furnitureApi, settingsApi, ApiError } from '../lib/api';
import { useEditorStore } from '../store/editorStore';
import Viewport3D from './Viewport3D';
import AssetLibrary from './AssetLibrary';
import FloorSwitcher from './FloorSwitcher';
import PropertiesPanel from './PropertiesPanel';
import SettingsModal from './SettingsModal';
import EditHistory from './EditHistory';
import { getUnitLabel } from '../lib/units';
import {
  MousePointer2,
  Square,
  Ruler,
  ArrowLeft,
  Save,
  Edit2,
  Armchair,
  Hand,
  Eye,
  Undo2,
  Redo2,
  Settings,
  Plus,
  Download,
  Upload,
  Check,
  Loader2,
  Grid3x3,
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
  const creatingDefaultFloorRef = useRef(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Create Room by Dimensions modal state
  const [showDimensionsModal, setShowDimensionsModal] = useState(false);
  const [roomWidth, setRoomWidth] = useState('5.0');
  const [roomLength, setRoomLength] = useState('4.0');
  const [roomHeight, setRoomHeight] = useState('2.8');
  const [dimensionsError, setDimensionsError] = useState<string | null>(null);
  const [dimensionsLoading, setDimensionsLoading] = useState(false);
  const [widthError, setWidthError] = useState<string | null>(null);
  const [lengthError, setLengthError] = useState<string | null>(null);
  const [heightError, setHeightError] = useState<string | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Floor plan upload state
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadError, setShowUploadError] = useState(false);

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState(60000); // Default 60 seconds

  // Save state tracking
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const furniturePlacements = useEditorStore((state) => state.furniturePlacements);

  // Unsaved changes warning
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Edit history panel visibility
  const [showEditHistory, setShowEditHistory] = useState(true);

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
    gridVisible,
    setGridVisible,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore();

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Reload settings when settings modal closes
  useEffect(() => {
    if (!showSettings) {
      loadSettings();
    }
  }, [showSettings]);

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

  // Listen for dimension updates during room drawing
  useEffect(() => {
    const handleUpdateDimensions = (event: any) => {
      const { width, depth } = event.detail;
      const unit = unitSystem === 'metric' ? 'm' : 'ft';
      const widthDisplay = unitSystem === 'metric' ? width.toFixed(1) : (width * 3.28084).toFixed(1);
      const depthDisplay = unitSystem === 'metric' ? depth.toFixed(1) : (depth * 3.28084).toFixed(1);
      setDimensionText(`${widthDisplay}${unit} × ${depthDisplay}${unit}`);
    };

    const handleClearDimensions = () => {
      setDimensionText('');
    };

    window.addEventListener('updateDimensions', handleUpdateDimensions);
    window.addEventListener('clearDimensions', handleClearDimensions);

    return () => {
      window.removeEventListener('updateDimensions', handleUpdateDimensions);
      window.removeEventListener('clearDimensions', handleClearDimensions);
    };
  }, [unitSystem]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Check if Ctrl (or Cmd on Mac) is pressed
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        // Ctrl+Z: Undo
        e.preventDefault();
        if (canUndo()) {
          try {
            await undo();
          } catch (error) {
            console.error('Undo failed:', error);
          }
        }
      } else if (isCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        // Ctrl+Y or Ctrl+Shift+Z: Redo
        e.preventDefault();
        if (canRedo()) {
          try {
            await redo();
          } catch (error) {
            console.error('Redo failed:', error);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // Auto-save when data changes
  useEffect(() => {
    // Skip if no project loaded yet
    if (!project || !projectId) return;

    // Skip if auto-save is disabled (interval = 0)
    if (autoSaveInterval === 0) return;

    // Create a snapshot of current data
    const currentData = JSON.stringify({
      rooms: rooms.length,
      furniture: furniturePlacements.length,
      floors: floors.length,
    });

    // Skip if data hasn't changed (prevents infinite loop on initial load)
    if (currentData === lastSaveDataRef.current) return;
    if (lastSaveDataRef.current === '') {
      // First load - just store the data without saving
      lastSaveDataRef.current = currentData;
      return;
    }

    // Data has changed - trigger save after delay
    setSaveState('saving');

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save using configured interval
    console.log('[Auto-save] Scheduling save in', autoSaveInterval, 'ms');
    saveTimeoutRef.current = setTimeout(() => {
      // Mark as saved (in a real app, you'd make an API call here)
      // The data is already saved via individual API calls (createRoom, placeFurniture, etc.)
      console.log('[Auto-save] Save triggered');
      lastSaveDataRef.current = currentData;
      setSaveState('saved');

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveState('idle');
      }, 2000);
    }, autoSaveInterval);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [rooms, furniturePlacements, floors, project, projectId, autoSaveInterval]);

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

      if (floorsList.length === 0 && !creatingDefaultFloorRef.current) {
        // Create default floor (prevent duplicate creation in React Strict Mode)
        creatingDefaultFloorRef.current = true;
        const newFloorData = await floorsApi.create(projId, {
          name: 'Ground Floor',
          level: 0,
          order_index: 0,
        });
        const newFloor = newFloorData.floor;
        setFloors([newFloor]);
        setCurrentFloorId(newFloor.id);
        creatingDefaultFloorRef.current = false;
      } else {
        setFloors(floorsList);
        if (floorsList.length > 0) {
          setCurrentFloorId(floorsList[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading floors:', err);
      creatingDefaultFloorRef.current = false;
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
      console.log('[DEBUG] Loading furniture for rooms:', roomsList);
      for (const room of roomsList) {
        try {
          const data = await furnitureApi.getByRoom(room.id);
          console.log(`[DEBUG] Furniture data for room ${room.id}:`, data);
          if (data.furniture) {
            allFurniture.push(...data.furniture);
          }
        } catch (err) {
          console.error(`Error loading furniture for room ${room.id}:`, err);
        }
      }
      console.log('[DEBUG] Setting furniture placements:', allFurniture);
      setFurniturePlacements(allFurniture);
    } catch (err) {
      console.error('Error loading furniture:', err);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await settingsApi.getAll();
      const interval = parseInt(data.settings.auto_save_interval || '60000');
      setAutoSaveInterval(interval);
      console.log('[Settings] Auto-save interval loaded:', interval, 'ms');
    } catch (err) {
      console.error('Error loading settings:', err);
      // Use default if load fails
      setAutoSaveInterval(60000);
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

  const hasUnsavedChanges = () => {
    // Check if there's a pending save or actively saving
    return saveState === 'saving' || saveTimeoutRef.current !== null;
  };

  const handleBackToProjects = () => {
    // Check for unsaved changes
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true);
    } else {
      navigate('/');
    }
  };

  const handleLeaveWithoutSaving = () => {
    setShowUnsavedWarning(false);
    navigate('/');
  };

  const handleSaveAndLeave = async () => {
    // If there's a pending save, trigger it immediately
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);

      // Create a snapshot of current data and save it
      const currentData = JSON.stringify({
        rooms: rooms.length,
        furniture: furniturePlacements.length,
        floors: floors.length,
      });
      lastSaveDataRef.current = currentData;
      setSaveState('saved');
    }

    // Navigate after a brief moment to ensure state is updated
    setTimeout(() => {
      navigate('/');
    }, 100);
  };

  const handleCancelLeave = () => {
    setShowUnsavedWarning(false);
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

  const handleExport = async () => {
    if (!project) return;

    try {
      setIsExporting(true);

      // Call export API
      const blob = await projectsApi.export(project.id);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Format filename: projectname_YYYY-MM-DD.zip
      const date = new Date().toISOString().split('T')[0];
      const safeProjectName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `${safeProjectName}_${date}.zip`;

      // Trigger download
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log(`✓ Project exported: ${a.download}`);
    } catch (err) {
      console.error('Error exporting project:', err);
      // TODO: Show error toast/notification
      alert('Failed to export project. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenDimensionsModal = () => {
    setShowDimensionsModal(true);
    setRoomWidth('5.0');
    setRoomLength('4.0');
    setRoomHeight('2.8');
    setDimensionsError(null);
  };

  const handleCloseDimensionsModal = () => {
    setShowDimensionsModal(false);
    setRoomWidth('5.0');
    setRoomLength('4.0');
    setRoomHeight('2.8');
    setDimensionsError(null);
    setWidthError(null);
    setLengthError(null);
    setHeightError(null);
  };

  const validateWidth = (value: string) => {
    if (!value || value.trim() === '') {
      setWidthError('Width is required');
      return false;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      setWidthError('Please enter a valid number');
      return false;
    }
    if (num <= 0) {
      setWidthError('Width must be a positive number');
      return false;
    }
    if (num < 0.5) {
      setWidthError('Minimum width is 0.5m');
      return false;
    }
    setWidthError(null);
    return true;
  };

  const validateLength = (value: string) => {
    if (!value || value.trim() === '') {
      setLengthError('Length is required');
      return false;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      setLengthError('Please enter a valid number');
      return false;
    }
    if (num <= 0) {
      setLengthError('Length must be a positive number');
      return false;
    }
    if (num < 0.5) {
      setLengthError('Minimum length is 0.5m');
      return false;
    }
    setLengthError(null);
    return true;
  };

  const validateHeight = (value: string) => {
    if (!value || value.trim() === '') {
      setHeightError('Height is required');
      return false;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      setHeightError('Please enter a valid number');
      return false;
    }
    if (num <= 0) {
      setHeightError('Height must be a positive number');
      return false;
    }
    if (num < 2.0) {
      setHeightError('Minimum ceiling height is 2.0m');
      return false;
    }
    setHeightError(null);
    return true;
  };

  const handleFloorPlanUpload = () => {
    // Create a hidden file input and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg';

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      const validExtensions = ['.png', '.jpg', '.jpeg'];

      const isValidType = validTypes.includes(file.type);
      const isValidExtension = validExtensions.some(ext =>
        file.name.toLowerCase().endsWith(ext)
      );

      if (!isValidType && !isValidExtension) {
        setUploadError('Please upload a valid image file (PNG, JPG, JPEG)');
        setShowUploadError(true);
        return;
      }

      // TODO: Implement floor plan processing
      // For now, just show a success message (not an error)
      console.log('Valid floor plan uploaded:', file.name);
      setUploadError(null);
      setShowUploadError(false);

      // In future: send to backend for processing
      // const formData = new FormData();
      // formData.append('floorplan', file);
      // await fetch(`/api/floors/${currentFloorId}/upload-floorplan`, { method: 'POST', body: formData });
    };

    input.click();
  };

  const handleCreateRoomByDimensions = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const widthValid = validateWidth(roomWidth);
    const lengthValid = validateLength(roomLength);
    const heightValid = validateHeight(roomHeight);

    if (!widthValid || !lengthValid || !heightValid) {
      return;
    }

    // Parse validated values
    const width = parseFloat(roomWidth);
    const length = parseFloat(roomLength);
    const height = parseFloat(roomHeight);

    if (!currentFloorId) {
      setDimensionsError('No floor selected');
      return;
    }

    try {
      setDimensionsLoading(true);
      setDimensionsError(null);

      // Create room at center position (0, 0)
      const roomData = {
        name: `Room ${rooms.length + 1}`,
        dimensions_json: {
          width,
          depth: length,
        },
        position_x: 0,
        position_y: 0,
        position_z: 0,
        ceiling_height: height,
        floor_color: '#d1d5db',
        ceiling_color: '#f3f4f6',
      };

      const data = await roomsApi.create(currentFloorId, roomData);
      addRoom(data.room);

      console.log('Room created by dimensions:', data.room);

      // Close modal
      setShowDimensionsModal(false);
    } catch (err) {
      if (err instanceof ApiError && err.userMessage) {
        setDimensionsError(err.userMessage);
      } else {
        setDimensionsError('Failed to create room. Please try again.');
      }
      console.error('Error creating room by dimensions:', err);
    } finally {
      setDimensionsLoading(false);
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
              className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
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
                className="text-gray-400 hover:text-white transition-colors p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
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
                className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  currentTool === 'select'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="Select / Pointer"
              >
                <MousePointer2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleToolSelect('draw-wall')}
                className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  currentTool === 'draw-wall'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="Draw Wall"
              >
                <Square className="w-5 h-5" />
              </button>
              <button
                onClick={handleOpenDimensionsModal}
                className="p-2 rounded text-gray-300 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Create Room by Dimensions"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={handleFloorPlanUpload}
                className="p-2 rounded text-gray-300 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Upload Floor Plan"
              >
                <Upload className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleToolSelect('place-furniture')}
                className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  currentTool === 'place-furniture'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="Place Furniture"
              >
                <Armchair className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleToolSelect('measure')}
                className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  currentTool === 'measure'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="Measure"
              >
                <Ruler className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleToolSelect('pan')}
                className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  currentTool === 'pan'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="Pan"
              >
                <Hand className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleToolSelect('first-person')}
                className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  currentTool === 'first-person'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="First-Person View"
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={() => setGridVisible(!gridVisible)}
                className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  gridVisible
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
                title="Toggle Grid"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center bg-gray-700 rounded-lg p-1 gap-1">
              <button
                onClick={async () => {
                  if (canUndo()) {
                    try {
                      await undo();
                    } catch (error) {
                      console.error('Undo failed:', error);
                    }
                  }
                }}
                disabled={!canUndo()}
                className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  canUndo()
                    ? 'text-gray-300 hover:bg-gray-600 cursor-pointer'
                    : 'text-gray-500 cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-5 h-5" />
              </button>
              <button
                onClick={async () => {
                  if (canRedo()) {
                    try {
                      await redo();
                    } catch (error) {
                      console.error('Redo failed:', error);
                    }
                  }
                }}
                disabled={!canRedo()}
                className={`p-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  canRedo()
                    ? 'text-gray-300 hover:bg-gray-600 cursor-pointer'
                    : 'text-gray-500 cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-5 h-5" />
              </button>
            </div>

            <button className="px-3 py-2 flex items-center gap-2 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
              {saveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
              {saveState === 'saved' && <Check className="w-4 h-4" />}
              {saveState === 'idle' && <Save className="w-4 h-4" />}
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'saved' && 'Saved'}
              {saveState === 'idle' && 'Save'}
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-3 py-2 flex items-center gap-2 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export Project as ZIP"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded text-gray-300 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Editor Content with Asset Library and 3D Viewport */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Asset Library */}
          <AssetLibrary />

          {/* 3D Viewport */}
          <div className="flex-1 relative">
            <Viewport3D />

            {/* Dimension Display Overlay (during drawing) */}
            {dimensionText && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-2xl text-2xl font-bold font-mono">
                  {dimensionText}
                </div>
              </div>
            )}

            {/* Floor Switcher */}
            {project && <FloorSwitcher projectId={project.id} />}

            {/* Properties Panel */}
            <PropertiesPanel projectName={project?.name || 'Untitled Project'} />

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
        </div>

        {/* Bottom Panel - Edit History */}
        {showEditHistory && (
          <div className="h-48 flex-shrink-0">
            <EditHistory />
          </div>
        )}
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

      {/* Create Room by Dimensions Modal */}
      {showDimensionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Create Room by Dimensions</h2>

            <form onSubmit={handleCreateRoomByDimensions}>
              <div className="mb-4">
                <label htmlFor="room-width" className="block text-sm font-medium text-gray-300 mb-2">
                  Width ({getUnitLabel(unitSystem)}) *
                </label>
                <input
                  id="room-width"
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={roomWidth}
                  onChange={(e) => setRoomWidth(e.target.value)}
                  onBlur={(e) => validateWidth(e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 focus:border-transparent ${
                    widthError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-600 focus:ring-blue-500'
                  }`}
                  placeholder="5.0"
                  autoFocus
                />
                {widthError && (
                  <p className="mt-1 text-sm text-red-400">{widthError}</p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="room-length" className="block text-sm font-medium text-gray-300 mb-2">
                  Length ({getUnitLabel(unitSystem)}) *
                </label>
                <input
                  id="room-length"
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={roomLength}
                  onChange={(e) => setRoomLength(e.target.value)}
                  onBlur={(e) => validateLength(e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 focus:border-transparent ${
                    lengthError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-600 focus:ring-blue-500'
                  }`}
                  placeholder="4.0"
                />
                {lengthError && (
                  <p className="mt-1 text-sm text-red-400">{lengthError}</p>
                )}
              </div>

              <div className="mb-6">
                <label htmlFor="room-height" className="block text-sm font-medium text-gray-300 mb-2">
                  Ceiling Height ({getUnitLabel(unitSystem)}) *
                </label>
                <input
                  id="room-height"
                  type="number"
                  step="0.1"
                  min="2.0"
                  value={roomHeight}
                  onChange={(e) => setRoomHeight(e.target.value)}
                  onBlur={(e) => validateHeight(e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 focus:border-transparent ${
                    heightError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-600 focus:ring-blue-500'
                  }`}
                  placeholder="2.8"
                />
                {heightError && (
                  <p className="mt-1 text-sm text-red-400">{heightError}</p>
                )}
              </div>

              {dimensionsError && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md" role="alert" aria-live="assertive">
                  <p className="text-sm text-red-300">{dimensionsError}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCloseDimensionsModal}
                  disabled={dimensionsLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dimensionsLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {dimensionsLoading ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Error Modal */}
      {showUploadError && uploadError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Invalid File Type</h2>

            <div className="mb-6">
              <p className="text-gray-300">{uploadError}</p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowUploadError(false);
                  setUploadError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#16161D] rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="p-6 border-b border-[#2A2A35]">
              <h2 className="text-xl font-semibold text-white">Unsaved Changes</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-300 mb-6">
                You have unsaved changes. What would you like to do?
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSaveAndLeave}
                  className="w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Save and Leave
                </button>
                <button
                  onClick={handleLeaveWithoutSaving}
                  className="w-full px-4 py-3 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Leave without Saving
                </button>
                <button
                  onClick={handleCancelLeave}
                  className="w-full px-4 py-3 text-sm font-medium text-gray-400 border border-gray-600 rounded-lg hover:text-white hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default Editor;
