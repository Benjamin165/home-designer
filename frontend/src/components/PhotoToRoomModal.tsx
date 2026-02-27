import { useState, useEffect } from 'react';
import { 
  X, Upload, Loader2, AlertCircle, CheckCircle2, 
  Camera, Wand2, Edit3, Home, Ruler, Layers
} from 'lucide-react';
import { aiApi } from '../lib/api';
import { toast } from 'sonner';

interface PhotoToRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (room: any) => void;
  currentFloorId: number;
}

type AnalysisState = 'idle' | 'uploading' | 'analyzing' | 'preview' | 'creating' | 'success' | 'error';

interface RoomAnalysis {
  roomType: string;
  confidence: number;
  estimatedDimensions: {
    width: number;
    depth: number;
    height: number;
  };
  walls: Array<{
    position: string;
    features: string[];
    material: string;
  }>;
  windows: Array<{
    wall: string;
    estimatedWidth: number;
    estimatedHeight: number;
    type: string;
  }>;
  doors: Array<{
    wall: string;
    type: string;
  }>;
  floorMaterial: string;
  lightingSources: string[];
  furnishings: Array<{
    type: string;
    estimatedSize: { width: number; depth: number; height: number };
  }>;
  notes: string;
}

interface ApiStatus {
  configured: boolean;
  message: string;
}

export default function PhotoToRoomModal({
  isOpen,
  onClose,
  onSuccess,
  currentFloorId,
}: PhotoToRoomModalProps) {
  const [state, setState] = useState<AnalysisState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);

  // Editable adjustments
  const [roomName, setRoomName] = useState('');
  const [roomWidth, setRoomWidth] = useState('');
  const [roomDepth, setRoomDepth] = useState('');
  const [ceilingHeight, setCeilingHeight] = useState('');
  const [floorMaterial, setFloorMaterial] = useState('hardwood');

  // Check API status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/ai/room-vision/status');
        const data = await response.json();
        setApiStatus(data);
      } catch (error) {
        setApiStatus({
          configured: false,
          message: 'Unable to check AI status',
        });
      }
    };

    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setState('idle');
        setSelectedFile(null);
        setPreviewUrl(null);
        setAnalysis(null);
        setImagePath(null);
        setErrorMessage(null);
        setRoomName('');
        setRoomWidth('');
        setRoomDepth('');
        setCeilingHeight('');
        setFloorMaterial('hardwood');
      }, 300);
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select a photo first');
      return;
    }

    setState('uploading');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      formData.append('floorId', currentFloorId.toString());

      setState('analyzing');
      const result = await aiApi.analyzeRoom(formData);

      setAnalysis(result.analysis);
      setImagePath(result.imagePath);

      // Pre-fill adjustments
      const roomTypeNames: Record<string, string> = {
        'living_room': 'Living Room',
        'bedroom': 'Bedroom',
        'kitchen': 'Kitchen',
        'bathroom': 'Bathroom',
        'dining_room': 'Dining Room',
        'office': 'Office',
        'hallway': 'Hallway',
        'other': 'Room'
      };
      setRoomName(roomTypeNames[result.analysis.roomType] || 'Room');
      setRoomWidth(result.analysis.estimatedDimensions.width.toFixed(1));
      setRoomDepth(result.analysis.estimatedDimensions.depth.toFixed(1));
      setCeilingHeight(result.analysis.estimatedDimensions.height.toFixed(1));
      setFloorMaterial(result.analysis.floorMaterial || 'hardwood');

      setState('preview');
      toast.success(result.message);

    } catch (error: any) {
      setState('error');
      setErrorMessage(error.message || 'Failed to analyze photo');
    }
  };

  const handleCreateRoom = async () => {
    if (!analysis) return;

    setState('creating');
    setErrorMessage(null);

    try {
      const adjustments = {
        name: roomName,
        width: parseFloat(roomWidth),
        depth: parseFloat(roomDepth),
        ceiling_height: parseFloat(ceilingHeight),
        floor_material: floorMaterial,
      };

      const result = await aiApi.createRoomFromAnalysis(
        currentFloorId,
        analysis,
        adjustments
      );

      setState('success');
      toast.success(result.message);

      setTimeout(() => {
        onSuccess(result.room);
        onClose();
      }, 1500);

    } catch (error: any) {
      setState('error');
      setErrorMessage(error.message || 'Failed to create room');
    }
  };

  const handleRetry = () => {
    setState('idle');
    setErrorMessage(null);
    setAnalysis(null);
  };

  if (!isOpen) return null;

  const roomTypeIcons: Record<string, string> = {
    'living_room': '🛋️',
    'bedroom': '🛏️',
    'kitchen': '🍳',
    'bathroom': '🚿',
    'dining_room': '🍽️',
    'office': '💼',
    'hallway': '🚪',
    'other': '🏠'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800 z-10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-400" />
            Photo to Room
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            disabled={state === 'analyzing' || state === 'creating'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* API Status Warning */}
          {apiStatus && !apiStatus.configured && state === 'idle' && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-300 font-medium">AI Not Configured</p>
                <p className="text-yellow-400 text-sm mt-1">
                  Add your Anthropic API key in Settings to enable photo-to-room AI.
                </p>
              </div>
            </div>
          )}

          {apiStatus?.configured && state === 'idle' && (
            <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-3 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-400" />
              <p className="text-purple-300 text-sm">
                AI ready — Upload a room photo to auto-detect dimensions and layout
              </p>
            </div>
          )}

          {/* Analyzing State */}
          {state === 'analyzing' && (
            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-6 text-center">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-purple-300 font-medium">Analyzing room photo...</p>
              <p className="text-gray-400 text-sm mt-2">
                AI is detecting room type, dimensions, walls, and features
              </p>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-green-300 font-medium">Room created successfully!</p>
              <p className="text-gray-400 text-sm mt-2">
                Your new room has been added to the floor plan
              </p>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 font-medium">Analysis failed</p>
                <p className="text-red-400 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Upload Area */}
          {(state === 'idle' || state === 'error') && !selectedFile && (
            <div>
              <label
                htmlFor="room-photo-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors"
              >
                <Camera className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-sm text-gray-300 font-medium mb-1">
                  Click to upload a room photo
                </p>
                <p className="text-xs text-gray-400">
                  PNG, JPG, or WebP (max 20MB)
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  For best results, capture the full room with good lighting
                </p>
              </label>
              <input
                id="room-photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Preview Image */}
          {selectedFile && previewUrl && state !== 'preview' && state !== 'success' && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Room preview"
                className="w-full h-64 object-cover rounded-lg"
              />
              {state === 'idle' && (
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Analysis Results / Preview */}
          {state === 'preview' && analysis && (
            <div className="space-y-4">
              {/* Photo + Detection Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <img
                    src={previewUrl || ''}
                    alt="Room"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{roomTypeIcons[analysis.roomType] || '🏠'}</span>
                    <div>
                      <p className="text-white font-medium">{roomName}</p>
                      <p className="text-gray-400 text-xs">
                        {Math.round(analysis.confidence * 100)}% confidence
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-500">Floor:</span> {analysis.floorMaterial}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Windows:</span> {analysis.windows?.length || 0}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Doors:</span> {analysis.doors?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Editable Dimensions */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  Adjust Dimensions
                </h3>
                <p className="text-gray-400 text-xs mb-3">
                  Review and adjust the AI-detected values if needed
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Room Name */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Room Name
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Width */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Width (m)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="20"
                        value={roomWidth}
                        onChange={(e) => setRoomWidth(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Ruler className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" />
                    </div>
                  </div>

                  {/* Depth */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Depth (m)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="20"
                        value={roomDepth}
                        onChange={(e) => setRoomDepth(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Ruler className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" />
                    </div>
                  </div>

                  {/* Ceiling Height */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Ceiling Height (m)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="2"
                        max="5"
                        value={ceilingHeight}
                        onChange={(e) => setCeilingHeight(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Layers className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" />
                    </div>
                  </div>

                  {/* Floor Material */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Floor Material
                    </label>
                    <select
                      value={floorMaterial}
                      onChange={(e) => setFloorMaterial(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hardwood">Hardwood</option>
                      <option value="tile">Tile</option>
                      <option value="carpet">Carpet</option>
                      <option value="laminate">Laminate</option>
                      <option value="concrete">Concrete</option>
                      <option value="marble">Marble</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Detected Features */}
              {analysis.notes && (
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Home className="w-4 h-4 text-green-400" />
                    AI Notes
                  </h3>
                  <p className="text-gray-400 text-sm">{analysis.notes}</p>
                </div>
              )}

              {/* Detected Furnishings */}
              {analysis.furnishings && analysis.furnishings.length > 0 && (
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-2">Detected Furniture</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.furnishings.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300"
                      >
                        {item.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-gray-800">
          {(state === 'idle' || state === 'error') && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!selectedFile || !apiStatus?.configured}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Analyze Photo
              </button>
            </>
          )}

          {state === 'analyzing' && (
            <button
              disabled
              className="px-4 py-2 bg-purple-600 text-white rounded opacity-50 cursor-not-allowed flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </button>
          )}

          {state === 'preview' && (
            <>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
              >
                Try Another Photo
              </button>
              <button
                onClick={handleCreateRoom}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Create Room
              </button>
            </>
          )}

          {state === 'creating' && (
            <button
              disabled
              className="px-4 py-2 bg-green-600 text-white rounded opacity-50 cursor-not-allowed flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
