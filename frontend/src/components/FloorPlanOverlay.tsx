import { useState, useRef, useEffect } from 'react';
import { X, Ruler, MousePointer2, Check, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useEditorStore } from '../store/editorStore';

interface FloorPlanOverlayProps {
  imagePath: string;
  onClose: () => void;
  onCreateRooms: (rooms: any[]) => void;
  currentFloorId: number;
}

type Tool = 'select' | 'scale' | 'trace';

interface Point {
  x: number;
  y: number;
}

interface WallSegment {
  start: Point;
  end: Point;
}

export default function FloorPlanOverlay({
  imagePath,
  onClose,
  onCreateRooms,
  currentFloorId,
}: FloorPlanOverlayProps) {
  const [tool, setTool] = useState<Tool>('scale');
  const [scale, setScale] = useState<number | null>(null);
  const [scaleLineStart, setScaleLineStart] = useState<Point | null>(null);
  const [scaleLineEnd, setScaleLineEnd] = useState<Point | null>(null);
  const [scaleLengthInput, setScaleLengthInput] = useState('');
  const [walls, setWalls] = useState<WallSegment[]>([]);
  const [currentWallStart, setCurrentWallStart] = useState<Point | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Load image and set up canvas
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      if (canvasRef.current) {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        drawCanvas();
      }
    };
    img.src = `http://localhost:5000${imagePath}`;
    imageRef.current = img;
  }, [imagePath]);
  
  // Redraw canvas when state changes
  useEffect(() => {
    drawCanvas();
  }, [walls, scaleLineStart, scaleLineEnd, currentWallStart, mousePos, scale]);
  
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img || !imageSize) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw floor plan image
    ctx.drawImage(img, 0, 0);
    
    // Draw scale line
    if (scaleLineStart && scaleLineEnd) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(scaleLineStart.x, scaleLineStart.y);
      ctx.lineTo(scaleLineEnd.x, scaleLineEnd.y);
      ctx.stroke();
      
      // Draw endpoints
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(scaleLineStart.x, scaleLineStart.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(scaleLineEnd.x, scaleLineEnd.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (scaleLineStart && mousePos && tool === 'scale') {
      // Drawing scale line
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(scaleLineStart.x, scaleLineStart.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
    }
    
    // Draw traced walls
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    for (const wall of walls) {
      ctx.beginPath();
      ctx.moveTo(wall.start.x, wall.start.y);
      ctx.lineTo(wall.end.x, wall.end.y);
      ctx.stroke();
    }
    
    // Draw current wall being drawn
    if (currentWallStart && mousePos && tool === 'trace') {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentWallStart.x, currentWallStart.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
      
      // Draw start point
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(currentWallStart.x, currentWallStart.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw wall endpoints
    ctx.fillStyle = '#1d4ed8';
    for (const wall of walls) {
      ctx.beginPath();
      ctx.arc(wall.start.x, wall.start.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(wall.end.x, wall.end.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasCoords(e);
    
    if (tool === 'scale') {
      if (!scaleLineStart) {
        setScaleLineStart(point);
      } else if (!scaleLineEnd) {
        setScaleLineEnd(point);
        toast.success('Scale line set! Now enter the real-world length.');
      }
    } else if (tool === 'trace') {
      if (!currentWallStart) {
        setCurrentWallStart(point);
        setIsDrawing(true);
      } else {
        // Complete wall segment
        setWalls([...walls, { start: currentWallStart, end: point }]);
        setCurrentWallStart(point); // Continue from this point
        toast.success('Wall segment added');
      }
    }
  };
  
  const handleCanvasDoubleClick = () => {
    if (tool === 'trace' && currentWallStart) {
      // End wall tracing
      setCurrentWallStart(null);
      setIsDrawing(false);
      toast.info('Wall tracing stopped. Click to start a new wall.');
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setMousePos(getCanvasCoords(e));
  };
  
  const handleSetScale = () => {
    if (!scaleLineStart || !scaleLineEnd || !scaleLengthInput) {
      toast.error('Please draw a scale line and enter the length');
      return;
    }
    
    const realLength = parseFloat(scaleLengthInput);
    if (isNaN(realLength) || realLength <= 0) {
      toast.error('Please enter a valid length in meters');
      return;
    }
    
    // Calculate scale
    const pixelLength = Math.sqrt(
      Math.pow(scaleLineEnd.x - scaleLineStart.x, 2) +
      Math.pow(scaleLineEnd.y - scaleLineStart.y, 2)
    );
    
    const newScale = realLength / pixelLength;
    setScale(newScale);
    setTool('trace');
    toast.success(`Scale set! 1 pixel = ${(newScale * 100).toFixed(3)} cm. Now trace the walls.`);
  };
  
  const handleCreateRooms = async () => {
    if (walls.length < 3) {
      toast.error('Please trace at least 3 wall segments to form a room');
      return;
    }
    
    if (!scale) {
      toast.error('Please set the scale first');
      return;
    }
    
    try {
      const response = await fetch(
        `http://localhost:5000/api/floors/${currentFloorId}/floorplan/trace`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walls,
            scale,
            imageOffset: { x: 0, z: 0 },
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Created ${data.count} room(s) from floor plan`);
        onCreateRooms(data.rooms);
        onClose();
      } else {
        toast.error(data.error || 'Failed to create rooms');
      }
    } catch (error) {
      console.error('Error creating rooms:', error);
      toast.error('Failed to create rooms from floor plan');
    }
  };
  
  const handleClear = () => {
    setWalls([]);
    setCurrentWallStart(null);
    setIsDrawing(false);
    toast.info('Traced walls cleared');
  };
  
  const handleResetScale = () => {
    setScaleLineStart(null);
    setScaleLineEnd(null);
    setScaleLengthInput('');
    setScale(null);
    setTool('scale');
    toast.info('Scale reset. Draw a new scale line.');
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-semibold">Floor Plan Tracing</h2>
          
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setTool('scale')}
              className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 ${
                tool === 'scale'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Ruler className="w-4 h-4" />
              Set Scale
            </button>
            <button
              onClick={() => setTool('trace')}
              disabled={!scale}
              className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 ${
                tool === 'trace'
                  ? 'bg-blue-600 text-white'
                  : scale
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <MousePointer2 className="w-4 h-4" />
              Trace Walls
            </button>
          </div>
          
          {scale && (
            <span className="text-green-400 text-sm">
              Scale: 1m = {Math.round(1 / scale)} px
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Walls
          </button>
          <button
            onClick={handleCreateRooms}
            disabled={walls.length < 3 || !scale}
            className="px-4 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Create Rooms ({walls.length} walls)
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="bg-gray-800 px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
        {tool === 'scale' && !scaleLineEnd && (
          <span>
            {!scaleLineStart
              ? '📏 Click two points on the floor plan to draw a scale line (e.g., along a known wall length)'
              : '📏 Click the second point to complete the scale line'}
          </span>
        )}
        {tool === 'scale' && scaleLineEnd && (
          <div className="flex items-center gap-3">
            <span>Enter the real-world length of the line:</span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={scaleLengthInput}
              onChange={(e) => setScaleLengthInput(e.target.value)}
              placeholder="e.g., 5.0"
              className="w-24 px-2 py-1 bg-gray-700 rounded text-white text-sm"
            />
            <span className="text-gray-400">meters</span>
            <button
              onClick={handleSetScale}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Set Scale
            </button>
            <button
              onClick={handleResetScale}
              className="px-2 py-1 text-gray-400 hover:text-white text-sm"
            >
              Reset
            </button>
          </div>
        )}
        {tool === 'trace' && (
          <span>
            🖱️ Click to start/continue a wall. Double-click to stop. Trace along wall edges to define rooms.
          </span>
        )}
      </div>
      
      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-gray-950 flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
          onMouseMove={handleMouseMove}
          className="max-w-full max-h-full border border-gray-700 cursor-crosshair"
          style={{
            maxHeight: 'calc(100vh - 140px)',
          }}
        />
      </div>
    </div>
  );
}
