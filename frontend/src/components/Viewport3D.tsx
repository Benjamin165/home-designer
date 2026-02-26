import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Box } from '@react-three/drei';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useEditorStore } from '../store/editorStore';
import { furnitureApi } from '../lib/api';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Sun, Moon } from 'lucide-react';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import { Armchair, Settings, Trash2, Copy, Eye } from 'lucide-react';

interface DragState {
  isDrawing: boolean;
  startPoint: { x: number; z: number } | null;
  currentPoint: { x: number; z: number } | null;
}

function Scene() {
  const currentTool = useEditorStore((state) => state.currentTool);
  const rooms = useEditorStore((state) => state.rooms);
  const furniturePlacements = useEditorStore((state) => state.furniturePlacements);
  const draggingAsset = useEditorStore((state) => state.draggingAsset);
  const currentFloorId = useEditorStore((state) => state.currentFloorId);
  const setCameraPosition = useEditorStore((state) => state.setCameraPosition);
  const cameraPositions = useEditorStore((state) => state.cameraPositions);
  const gridVisible = useEditorStore((state) => state.gridVisible);
  const lightingMode = useEditorStore((state) => state.lightingMode);

  console.log('[DEBUG Scene] Furniture placements:', furniturePlacements);

  const [dragState, setDragState] = useState<DragState>({
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
  });
  const [furniturePreview, setFurniturePreview] = useState<{
    asset: any;
    position: { x: number; z: number };
  } | null>(null);

  // Animated lighting intensities
  const [ambientIntensity, setAmbientIntensity] = useState(0.5);
  const [directionalIntensity, setDirectionalIntensity] = useState(0.8);

  const planeRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  // Handle dragging asset from library
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (!draggingAsset) return;

      try {
        const data = e.dataTransfer?.getData('application/json');
        if (data) {
          const asset = JSON.parse(data);
          setFurniturePreview({
            asset,
            position: { x: 0, z: 0 },
          });
        }
      } catch (error) {
        console.error('Error parsing drag data:', error);
      }
    };

    const handleDragLeave = () => {
      if (!draggingAsset) {
        setFurniturePreview(null);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
    };
  }, [draggingAsset]);

  // Clear preview when dragging stops
  useEffect(() => {
    if (!draggingAsset) {
      setFurniturePreview(null);
    }
  }, [draggingAsset]);

  // Animate lighting transitions when mode changes
  useEffect(() => {
    const targetAmbient = lightingMode === 'day' ? 0.5 : 0.15;
    const targetDirectional = lightingMode === 'day' ? 0.8 : 0.3;

    const startAmbient = ambientIntensity;
    const startDirectional = directionalIntensity;
    const duration = 800; // 800ms transition
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease in-out cubic for smooth animation
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      setAmbientIntensity(startAmbient + (targetAmbient - startAmbient) * eased);
      setDirectionalIntensity(startDirectional + (targetDirectional - startDirectional) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [lightingMode]);

  // Restore camera position when floor changes
  useEffect(() => {
    if (!currentFloorId || !controlsRef.current) return;

    const savedPosition = cameraPositions[currentFloorId];
    if (savedPosition) {
      // Restore camera position and target
      camera.position.set(...savedPosition.position);
      controlsRef.current.target.set(...savedPosition.target);
      controlsRef.current.update();
    }
  }, [currentFloorId, cameraPositions, camera]);

  // Save camera position periodically
  useEffect(() => {
    if (!currentFloorId || !controlsRef.current) return;

    const saveInterval = setInterval(() => {
      if (controlsRef.current) {
        const position: [number, number, number] = [
          camera.position.x,
          camera.position.y,
          camera.position.z,
        ];
        const target: [number, number, number] = [
          controlsRef.current.target.x,
          controlsRef.current.target.y,
          controlsRef.current.target.z,
        ];
        setCameraPosition(currentFloorId, { position, target });
      }
    }, 1000); // Save every second

    return () => clearInterval(saveInterval);
  }, [currentFloorId, camera, setCameraPosition]);

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
    if (currentTool === 'draw-wall' && dragState.isDrawing) {
      const point = event.point;
      setDragState((prev) => ({
        ...prev,
        currentPoint: { x: point.x, z: point.z },
      }));
    }

    // Handle furniture preview when dragging from library
    if (furniturePreview) {
      const point = event.point;
      setFurniturePreview((prev) =>
        prev ? { ...prev, position: { x: point.x, z: point.z } } : null
      );
    }
  };

  const handlePointerUp = (event: any) => {
    if (currentTool === 'draw-wall' && dragState.isDrawing) {
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
    }

    // Handle furniture drop
    if (furniturePreview) {
      const point = event.point;
      window.dispatchEvent(
        new CustomEvent('dropFurniture', {
          detail: {
            asset: furniturePreview.asset,
            position: { x: point.x, y: 0, z: point.z },
          },
        })
      );
      setFurniturePreview(null);
    }
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
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[10, 10, 5]} intensity={directionalIntensity} />

      {/* Grid */}
      {gridVisible && (
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
      )}

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

      {/* Render furniture */}
      {furniturePlacements.map((furniture) => (
        <FurnitureMesh key={furniture.id} furniture={furniture} />
      ))}

      {/* Furniture preview while dragging */}
      {furniturePreview && (
        <FurniturePreview
          asset={furniturePreview.asset}
          position={furniturePreview.position}
        />
      )}

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
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
  const setSelectedRoomId = useEditorStore((state) => state.setSelectedRoomId);
  const currentTool = useEditorStore((state) => state.currentTool);

  const handleClick = (e: any) => {
    // Only select room when using select tool
    if (currentTool === 'select') {
      e.stopPropagation();
      setSelectedRoomId(room.id);
    }
  };

  return (
    <group position={[posX, 0, posZ]} onClick={handleClick}>
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

// Furniture mesh component
function FurnitureMesh({ furniture }: { furniture: any }) {
  const width = furniture.width || 1;
  const height = furniture.height || 1;
  const depth = furniture.depth || 1;

  console.log('[DEBUG FurnitureMesh] Rendering furniture:', furniture);
  console.log('[DEBUG FurnitureMesh] Dimensions:', { width, height, depth });
  console.log('[DEBUG FurnitureMesh] Position:', [furniture.position_x, furniture.position_y, furniture.position_z]);

  return (
    <group
      position={[furniture.position_x, furniture.position_y, furniture.position_z]}
      rotation={[furniture.rotation_x || 0, furniture.rotation_y || 0, furniture.rotation_z || 0]}
      scale={[furniture.scale_x || 1, furniture.scale_y || 1, furniture.scale_z || 1]}
    >
      <Box args={[width, height, depth]} position={[0, height / 2, 0]}>
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </Box>
    </group>
  );
}

// Furniture preview component (while dragging)
function FurniturePreview({ asset, position }: { asset: any; position: { x: number; z: number } }) {
  const width = asset.width || 1;
  const height = asset.height || 1;
  const depth = asset.depth || 1;

  return (
    <group position={[position.x, 0, position.z]}>
      <Box args={[width, height, depth]} position={[0, height / 2, 0]}>
        <meshStandardMaterial color="#3b82f6" opacity={0.5} transparent />
      </Box>
    </group>
  );
}

export default function Viewport3D() {
  const draggingAsset = useEditorStore((state) => state.draggingAsset);
  const currentFloorId = useEditorStore((state) => state.currentFloorId);
  const rooms = useEditorStore((state) => state.rooms);
  const addFurniturePlacement = useEditorStore((state) => state.addFurniturePlacement);
  const lightingMode = useEditorStore((state) => state.lightingMode);
  const setLightingMode = useEditorStore((state) => state.setLightingMode);

  // Listen for furniture drop events from the 3D scene
  useEffect(() => {
    const handleDropFurniture = async (event: any) => {
      const { asset, position } = event.detail;

      // Find which room the furniture was dropped into
      const targetRoom = rooms.find((room) => {
        const roomX = room.position_x;
        const roomZ = room.position_z;
        const roomWidth = room.dimensions_json.width / 2;
        const roomDepth = room.dimensions_json.depth / 2;

        return (
          position.x >= roomX - roomWidth &&
          position.x <= roomX + roomWidth &&
          position.z >= roomZ - roomDepth &&
          position.z <= roomZ + roomDepth
        );
      });

      if (!targetRoom) {
        console.warn('Furniture dropped outside of any room');
        return;
      }

      try {
        // Create furniture placement via API
        const data = await furnitureApi.create(targetRoom.id, {
          asset_id: asset.id,
          position_x: position.x,
          position_y: position.y,
          position_z: position.z,
          rotation_x: 0,
          rotation_y: 0,
          rotation_z: 0,
          scale_x: 1,
          scale_y: 1,
          scale_z: 1,
        });

        // Add to store
        addFurniturePlacement(data.furniture);
        console.log('Furniture placed:', data.furniture);

        // Show success toast
        toast.success('Furniture placed', {
          description: `${asset.name} added to ${targetRoom.name || 'room'}`,
        });
      } catch (error) {
        console.error('Error placing furniture:', error);
        toast.error('Failed to place furniture', {
          description: 'Please try again',
        });
      }
    };

    window.addEventListener('dropFurniture', handleDropFurniture);
    return () => window.removeEventListener('dropFurniture', handleDropFurniture);
  }, [rooms, addFurniturePlacement]);

  const handleDragOver = (e: React.DragEvent) => {
    if (draggingAsset) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // The actual drop is handled by the 3D scene's raycasting
  };

  return (
    <div
      className="w-full h-full bg-gray-950"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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

      {/* Day/Night toggle button */}
      <button
        onClick={() => setLightingMode(lightingMode === 'day' ? 'night' : 'day')}
        className="absolute bottom-4 right-4 p-3 bg-gray-800/80 backdrop-blur-sm rounded-lg text-white hover:bg-gray-700/80 transition-all shadow-lg z-20"
        title={lightingMode === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
      >
        {lightingMode === 'day' ? (
          <Moon className="w-5 h-5" />
        ) : (
          <Sun className="w-5 h-5" />
        )}
      </button>
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
