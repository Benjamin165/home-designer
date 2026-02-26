import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import * as THREE from 'three';

interface DragState {
  isDrawing: boolean;
  startPoint: { x: number; z: number } | null;
  currentPoint: { x: number; z: number } | null;
}

function Scene() {
  const currentTool = useEditorStore((state) => state.currentTool);
  const rooms = useEditorStore((state) => state.rooms);
  const [dragState, setDragState] = useState<DragState>({
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
  });

  const planeRef = useRef<THREE.Mesh>(null);

  // Handle mouse events for wall drawing
  const handlePointerDown = (event: any) => {
    if (currentTool !== 'draw-wall') return;

    const point = event.point;
    setDragState({
      isDrawing: true,
      startPoint: { x: point.x, z: point.z },
      currentPoint: { x: point.x, z: point.z },
    });
  };

  const handlePointerMove = (event: any) => {
    if (currentTool !== 'draw-wall' || !dragState.isDrawing) return;

    const point = event.point;
    setDragState((prev) => ({
      ...prev,
      currentPoint: { x: point.x, z: point.z },
    }));
  };

  const handlePointerUp = (event: any) => {
    if (currentTool !== 'draw-wall' || !dragState.isDrawing) return;

    const point = event.point;
    const startPoint = dragState.startPoint!;

    // Calculate dimensions
    const width = Math.abs(point.x - startPoint.x);
    const depth = Math.abs(point.z - startPoint.z);

    // Only create room if dimensions are reasonable (> 0.5m)
    if (width > 0.5 && depth > 0.5) {
      // Calculate center position
      const centerX = (startPoint.x + point.x) / 2;
      const centerZ = (startPoint.z + point.z) / 2;

      // Emit custom event with room data
      const roomData = {
        width,
        depth,
        position_x: centerX,
        position_z: centerZ,
      };

      window.dispatchEvent(
        new CustomEvent('createRoom', { detail: roomData })
      );
    }

    // Reset drag state
    setDragState({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
    });
  };

  // Calculate preview rectangle dimensions
  const getPreviewDimensions = () => {
    if (!dragState.startPoint || !dragState.currentPoint) {
      return null;
    }

    const width = Math.abs(dragState.currentPoint.x - dragState.startPoint.x);
    const depth = Math.abs(dragState.currentPoint.z - dragState.startPoint.z);
    const centerX = (dragState.startPoint.x + dragState.currentPoint.x) / 2;
    const centerZ = (dragState.startPoint.z + dragState.currentPoint.z) / 2;

    return { width, depth, centerX, centerZ };
  };

  const previewDims = dragState.isDrawing ? getPreviewDimensions() : null;

  // Emit dimension updates for HTML overlay
  useEffect(() => {
    if (previewDims) {
      window.dispatchEvent(
        new CustomEvent('updateDimensions', {
          detail: { width: previewDims.width, depth: previewDims.depth },
        })
      );
    } else {
      window.dispatchEvent(new CustomEvent('clearDimensions'));
    }
  }, [previewDims?.width, previewDims?.depth]);

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />

      {/* Grid */}
      <Grid
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9ca3af"
        fadeDistance={100}
        fadeStrength={1}
        position={[0, 0, 0]}
      />

      {/* Invisible plane for raycasting */}
      <mesh
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial />
      </mesh>

      {/* Preview rectangle while drawing */}
      {previewDims && (
        <group position={[previewDims.centerX, 0.01, previewDims.centerZ]}>
          {/* Floor preview */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[previewDims.width, previewDims.depth]} />
            <meshBasicMaterial color="#3b82f6" opacity={0.3} transparent />
          </mesh>

          {/* Wall previews */}
          <WallPreview
            width={previewDims.width}
            depth={previewDims.depth}
            height={2.8}
          />

          {/* Dimension labels */}
          <DimensionLabel
            width={previewDims.width}
            depth={previewDims.depth}
          />
        </group>
      )}

      {/* Render actual rooms */}
      {rooms.map((room) => (
        <RoomMesh key={room.id} room={room} />
      ))}

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        maxPolarAngle={Math.PI / 2.2}
        minDistance={2}
        maxDistance={50}
      />
    </>
  );
}

// Wall preview component
function WallPreview({ width, depth, height }: { width: number; depth: number; height: number }) {
  return (
    <group>
      {/* Front wall */}
      <mesh position={[0, height / 2, depth / 2]}>
        <boxGeometry args={[width, height, 0.1]} />
        <meshStandardMaterial color="#3b82f6" opacity={0.5} transparent />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, height / 2, -depth / 2]}>
        <boxGeometry args={[width, height, 0.1]} />
        <meshStandardMaterial color="#3b82f6" opacity={0.5} transparent />
      </mesh>

      {/* Left wall */}
      <mesh position={[-width / 2, height / 2, 0]}>
        <boxGeometry args={[0.1, height, depth]} />
        <meshStandardMaterial color="#3b82f6" opacity={0.5} transparent />
      </mesh>

      {/* Right wall */}
      <mesh position={[width / 2, height / 2, 0]}>
        <boxGeometry args={[0.1, height, depth]} />
        <meshStandardMaterial color="#3b82f6" opacity={0.5} transparent />
      </mesh>
    </group>
  );
}

// Dimension label component
function DimensionLabel({ width, depth }: { width: number; depth: number }) {
  const unitSystem = useEditorStore((state) => state.unitSystem);

  const formatDimension = (meters: number) => {
    if (unitSystem === 'metric') {
      return `${meters.toFixed(1)}m`;
    } else {
      const feet = meters * 3.28084;
      return `${feet.toFixed(1)}ft`;
    }
  };

  return (
    <group position={[0, 2.8 + 0.5, 0]}>
      <mesh>
        <boxGeometry args={[2, 0.5, 0.1]} />
        <meshBasicMaterial color="#1e1e28" opacity={0.9} transparent />
      </mesh>
      {/* In a real implementation, we'd use a text rendering library */}
      {/* For now, this is a placeholder - the actual text would be rendered as HTML overlay */}
    </group>
  );
}

// Room mesh component
function RoomMesh({ room }: { room: any }) {
  const width = room.dimensions_json.width || 4;
  const depth = room.dimensions_json.depth || 4;
  const height = room.ceiling_height || 2.8;
  const posX = room.position_x || 0;
  const posZ = room.position_z || 0;

  return (
    <group position={[posX, 0, posZ]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={room.floor_color || "#d1d5db"} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={room.ceiling_color || "#f3f4f6"} side={THREE.DoubleSide} />
      </mesh>

      {/* Walls */}
      {/* Front wall */}
      <mesh position={[0, height / 2, depth / 2]}>
        <boxGeometry args={[width, height, 0.15]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, height / 2, -depth / 2]}>
        <boxGeometry args={[width, height, 0.15]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      {/* Left wall */}
      <mesh position={[-width / 2, height / 2, 0]}>
        <boxGeometry args={[0.15, height, depth]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      {/* Right wall */}
      <mesh position={[width / 2, height / 2, 0]}>
        <boxGeometry args={[0.15, height, depth]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
    </group>
  );
}

export default function Viewport3D() {
  return (
    <div className="w-full h-full bg-gray-950">
      <Canvas
        camera={{
          position: [10, 10, 10],
          fov: 50,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene />
      </Canvas>

      {/* Dimension overlay (HTML-based text that floats over 3D) */}
      <DimensionOverlay />
    </div>
  );
}

// HTML overlay for dimension text
function DimensionOverlay() {
  const currentTool = useEditorStore((state) => state.currentTool);
  const unitSystem = useEditorStore((state) => state.unitSystem);
  const [dimensions, setDimensions] = useState<{ width: number; depth: number } | null>(null);

  useEffect(() => {
    const handleDimensionUpdate = (event: any) => {
      setDimensions(event.detail);
    };

    const handleDimensionClear = () => {
      setDimensions(null);
    };

    window.addEventListener('updateDimensions', handleDimensionUpdate);
    window.addEventListener('clearDimensions', handleDimensionClear);

    return () => {
      window.removeEventListener('updateDimensions', handleDimensionUpdate);
      window.removeEventListener('clearDimensions', handleDimensionClear);
    };
  }, []);

  const formatDimension = (meters: number) => {
    if (unitSystem === 'metric') {
      return `${meters.toFixed(1)}m`;
    } else {
      const feet = meters * 3.28084;
      return `${feet.toFixed(1)}ft`;
    }
  };

  if (currentTool !== 'draw-wall') return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
      {dimensions ? (
        <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-xl">
          <div className="text-center font-mono text-xl font-bold">
            {formatDimension(dimensions.width)} × {formatDimension(dimensions.depth)}
          </div>
          <div className="text-center text-xs mt-1 text-blue-100">
            {unitSystem === 'metric' ? 'meters' : 'feet'}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/90 text-white px-4 py-2 rounded-lg text-sm">
          Click and drag to draw a room
        </div>
      )}
    </div>
  );
}
