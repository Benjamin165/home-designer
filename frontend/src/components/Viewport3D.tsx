import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Box } from '@react-three/drei';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useEditorStore } from '../store/editorStore';
import { furnitureApi, roomsApi, wallsApi, lightsApi } from '../lib/api';
import { WallMesh } from './WallMesh';
import { LightMesh } from './LightMesh';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Sun, Moon } from 'lucide-react';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import { Armchair, Settings, Trash2, Copy, Eye } from 'lucide-react';
import { formatLength, formatArea } from '../lib/units';

interface Viewport3DProps {
  onOpenSettings?: () => void;
}

interface DragState {
  isDrawing: boolean;
  startPoint: { x: number; z: number } | null;
  currentPoint: { x: number; z: number } | null;
  snappedEdge: { roomId: number; edge: 'front' | 'back' | 'left' | 'right' } | null;
}

interface RoomEdge {
  roomId: number;
  edge: 'front' | 'back' | 'left' | 'right';
  x: number;
  z: number;
  isHorizontal: boolean; // true for edges parallel to X axis (front/back)
  length: number;
}

// Helper function to get all room edges for snapping
function getRoomEdges(rooms: any[]): RoomEdge[] {
  const edges: RoomEdge[] = [];

  rooms.forEach((room) => {
    const width = room.dimensions_json.width || 4;
    const depth = room.dimensions_json.depth || 4;
    const posX = room.position_x || 0;
    const posZ = room.position_z || 0;

    // Front edge (+Z direction)
    edges.push({
      roomId: room.id,
      edge: 'front',
      x: posX,
      z: posZ + depth / 2,
      isHorizontal: true,
      length: width,
    });

    // Back edge (-Z direction)
    edges.push({
      roomId: room.id,
      edge: 'back',
      x: posX,
      z: posZ - depth / 2,
      isHorizontal: true,
      length: width,
    });

    // Right edge (+X direction)
    edges.push({
      roomId: room.id,
      edge: 'right',
      x: posX + width / 2,
      z: posZ,
      isHorizontal: false,
      length: depth,
    });

    // Left edge (-X direction)
    edges.push({
      roomId: room.id,
      edge: 'left',
      x: posX - width / 2,
      z: posZ,
      isHorizontal: false,
      length: depth,
    });
  });

  return edges;
}

// Helper function to find the nearest edge to snap to
function findSnapEdge(
  point: { x: number; z: number },
  rooms: any[],
  snapDistance: number = 0.5
): RoomEdge | null {
  const edges = getRoomEdges(rooms);
  let nearestEdge: RoomEdge | null = null;
  let minDistance = snapDistance;

  edges.forEach((edge) => {
    let distance: number;

    if (edge.isHorizontal) {
      // For horizontal edges (front/back), check distance in Z and proximity in X
      distance = Math.abs(point.z - edge.z);
      // Check if point is within the edge's X range (with some tolerance)
      const xDiff = Math.abs(point.x - edge.x);
      if (xDiff > edge.length / 2 + snapDistance) {
        return; // Point is too far along the edge
      }
    } else {
      // For vertical edges (left/right), check distance in X and proximity in Z
      distance = Math.abs(point.x - edge.x);
      // Check if point is within the edge's Z range (with some tolerance)
      const zDiff = Math.abs(point.z - edge.z);
      if (zDiff > edge.length / 2 + snapDistance) {
        return; // Point is too far along the edge
      }
    }

    if (distance < minDistance) {
      minDistance = distance;
      nearestEdge = edge;
    }
  });

  return nearestEdge;
}

function Scene({ onFurnitureContextMenu }: { onFurnitureContextMenu?: (e: any, furniture: any) => void }) {
  const currentTool = useEditorStore((state) => state.currentTool);
  const rooms = useEditorStore((state) => state.rooms);
  const furniturePlacements = useEditorStore((state) => state.furniturePlacements);
  const lights = useEditorStore((state) => state.lights);
  const setLights = useEditorStore((state) => state.setLights);
  const addLight = useEditorStore((state) => state.addLight);
  const placingLightType = useEditorStore((state) => state.placingLightType);
  const setPlacingLightType = useEditorStore((state) => state.setPlacingLightType);
  const draggingAsset = useEditorStore((state) => state.draggingAsset);
  const currentFloorId = useEditorStore((state) => state.currentFloorId);
  const setCameraPosition = useEditorStore((state) => state.setCameraPosition);
  const cameraPositions = useEditorStore((state) => state.cameraPositions);
  const gridVisible = useEditorStore((state) => state.gridVisible);
  const lightingMode = useEditorStore((state) => state.lightingMode);

  console.log('[DEBUG Scene] Furniture placements:', furniturePlacements);

  // Fetch lights when floor changes
  useEffect(() => {
    const fetchLights = async () => {
      if (!currentFloorId) return;
      try {
        const response = await lightsApi.getByFloor(currentFloorId);
        setLights(response.lights || []);
      } catch (error) {
        console.error('Error fetching lights:', error);
      }
    };
    fetchLights();
  }, [currentFloorId, setLights]);

  const [dragState, setDragState] = useState<DragState>({
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
    snappedEdge: null,
  });
  const dragStateRef = useRef(dragState);
  const [furniturePreview, setFurniturePreview] = useState<{
    asset: any;
    position: { x: number; z: number };
  } | null>(null);

  // Animated lighting intensities
  const [ambientIntensity, setAmbientIntensity] = useState(0.5);
  const [directionalIntensity, setDirectionalIntensity] = useState(0.8);

  const planeRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, gl, scene } = useThree();

  // Keep ref in sync with state
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  // Handle dragging asset from library
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (!draggingAsset) return;

      // Use the draggingAsset from the store instead of reading from dataTransfer
      // (dataTransfer.getData only works in drop event, not dragenter)
      setFurniturePreview({
        asset: draggingAsset,
        position: { x: 0, z: 0 },
      });
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

  // Handle dropFurniture event from HTML5 drag-and-drop
  useEffect(() => {
    const handleDropFurnitureEvent = (event: any) => {
      const { asset, screenPosition, canvasRect } = event.detail;
      console.log('[DEBUG Scene] dropFurniture event received!', { asset, screenPosition });

      // Convert screen position to normalized device coordinates
      const x = ((screenPosition.x - canvasRect.left) / canvasRect.width) * 2 - 1;
      const y = -((screenPosition.y - canvasRect.top) / canvasRect.height) * 2 + 1;

      // Perform raycasting to find 3D position
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2(x, y);
      raycaster.setFromCamera(pointer, camera);

      // Raycast against ground plane
      const planeGeometry = new THREE.PlaneGeometry(100, 100);
      const planeMesh = new THREE.Mesh(planeGeometry);
      planeMesh.rotation.x = -Math.PI / 2;
      planeMesh.position.set(0, 0, 0);
      planeMesh.updateMatrixWorld();

      const intersects = raycaster.intersectObject(planeMesh);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        console.log('[DEBUG Scene] Drop position:', point);

        // Dispatch placement event with 3D coordinates
        window.dispatchEvent(
          new CustomEvent('placeFurniture', {
            detail: {
              asset,
              position: { x: point.x, y: 0, z: point.z },
            },
          })
        );
      }
    };

    window.addEventListener('dropFurniture', handleDropFurnitureEvent);
    return () => {
      window.removeEventListener('dropFurniture', handleDropFurnitureEvent);
    };
  }, [camera]);

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
      camera.position.set(savedPosition.position[0], savedPosition.position[1], savedPosition.position[2]);
      controlsRef.current.target.set(savedPosition.target[0], savedPosition.target[1], savedPosition.target[2]);
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

  // Handle scene export request
  useEffect(() => {
    const handleExportRequest = () => {
      try {
        // Dispatch the scene object back to the requester
        window.dispatchEvent(new CustomEvent('sceneExportReady', {
          detail: { scene }
        }));
      } catch (error) {
        window.dispatchEvent(new CustomEvent('sceneExportReady', {
          detail: { error: error instanceof Error ? error.message : 'Export failed' }
        }));
      }
    };

    window.addEventListener('requestSceneExport', handleExportRequest);
    return () => window.removeEventListener('requestSceneExport', handleExportRequest);
  }, [scene]);

  // Handle mouse events for wall drawing and context menu
  const handlePointerDown = (event: any) => {
    console.log('[DEBUG handlePointerDown] Button:', event.button);

    // Check for right-click (button 2)
    if (event.button === 2) {
      console.log('[DEBUG] Right-click detected on plane, dispatching context menu event');
      // Trigger context menu for empty space
      window.dispatchEvent(new CustomEvent('canvasContextMenu', {
        detail: {
          clientX: event.nativeEvent.clientX,
          clientY: event.nativeEvent.clientY,
          type: 'empty'
        }
      }));
      return;
    }

    if (currentTool !== 'draw-wall') {
      console.log('[DEBUG] Tool is not draw-wall, currentTool:', currentTool);
      return;
    }

    console.log('[DEBUG] Starting draw operation, currentTool:', currentTool);
    const point = event.point;
    console.log('[DEBUG] Point:', point);

    // Check if starting near an existing room edge
    const snapEdge = findSnapEdge(point, rooms);
    let snappedStartPoint = { x: point.x, z: point.z };

    if (snapEdge) {
      // Snap the start point to the edge
      if (snapEdge.isHorizontal) {
        snappedStartPoint.z = snapEdge.z;
      } else {
        snappedStartPoint.x = snapEdge.x;
      }

      console.log('[DEBUG] Snapping to edge:', snapEdge.edge, 'of room', snapEdge.roomId);
    }

    console.log('[DEBUG] Setting dragState with startPoint:', snappedStartPoint);
    setDragState({
      isDrawing: true,
      startPoint: snappedStartPoint,
      currentPoint: snappedStartPoint,
      snappedEdge: snapEdge,
    });
    console.log('[DEBUG] dragState set successfully');
  };

  const handlePointerMove = (event: any) => {
    if (currentTool === 'draw-wall' && dragState.isDrawing) {
      const point = event.point;

      // Check if current point is near an edge (for opposite side snapping)
      const snapEdge = findSnapEdge(point, rooms);
      let snappedCurrentPoint = { x: point.x, z: point.z };

      if (snapEdge) {
        // Snap the current point to the edge
        if (snapEdge.isHorizontal) {
          snappedCurrentPoint.z = snapEdge.z;
        } else {
          snappedCurrentPoint.x = snapEdge.x;
        }
      }

      setDragState((prev) => ({
        ...prev,
        currentPoint: snappedCurrentPoint,
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
    console.log('[DEBUG handlePointerUp] Called! currentTool:', currentTool, 'isDrawing:', dragState.isDrawing);
    console.log('[DEBUG handlePointerUp] event:', event);
    console.log('[DEBUG handlePointerUp] event.point:', event.point);

    if (currentTool === 'draw-wall' && dragState.isDrawing) {
      const point = event.point;
      const startPoint = dragState.startPoint!;

      console.log('[DEBUG handlePointerUp] point:', point);
      console.log('[DEBUG handlePointerUp] startPoint:', startPoint);

      // Calculate dimensions
      const width = Math.abs(point.x - startPoint.x);
      const depth = Math.abs(point.z - startPoint.z);

      console.log('[DEBUG handlePointerUp] width:', width, 'depth:', depth);

      // Only create room if dimensions are reasonable (> 0.5m)
      if (width > 0.5 && depth > 0.5) {
        console.log('[DEBUG handlePointerUp] Size check PASSED! Creating room...');
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

        console.log('[DEBUG handlePointerUp] Dispatching createRoom event with data:', roomData);
        window.dispatchEvent(
          new CustomEvent('createRoom', { detail: roomData })
        );
        console.log('[DEBUG handlePointerUp] createRoom event dispatched!');
      } else {
        console.log('[DEBUG handlePointerUp] Size check FAILED! width:', width, 'depth:', depth);
      }

      // Reset drag state
      setDragState({
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        snappedEdge: null,
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
    console.log('[DEBUG Dimensions] useEffect triggered, previewDims:', previewDims);
    if (previewDims) {
      console.log('[DEBUG Dimensions] Dispatching updateDimensions:', previewDims.width, 'x', previewDims.depth);
      window.dispatchEvent(
        new CustomEvent('updateDimensions', {
          detail: { width: previewDims.width, depth: previewDims.depth },
        })
      );
    } else {
      console.log('[DEBUG Dimensions] Dispatching clearDimensions');
      window.dispatchEvent(new CustomEvent('clearDimensions'));
    }
  }, [previewDims?.width, previewDims?.depth]);

  // Listen to canvas pointer events globally when drawing
  useEffect(() => {
    if (currentTool !== 'draw-wall') {
      return;
    }

    const canvas = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleCanvasPointerDown = (e: PointerEvent) => {
      console.log('[DEBUG handleCanvasPointerDown] Called! Button:', e.button, 'Tool:', currentTool);

      // Only handle when draw-wall tool is active
      if (currentTool !== 'draw-wall') return;

      // Only handle left-click
      if (e.button !== 0) return;

      // Convert mouse position to normalized device coordinates
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast to find intersection with ground plane
      raycaster.setFromCamera(pointer, camera);
      const planeGeometry = new THREE.PlaneGeometry(100, 100);
      const planeMesh = new THREE.Mesh(planeGeometry);
      planeMesh.rotation.x = -Math.PI / 2;
      planeMesh.position.set(0, 0, 0);
      planeMesh.updateMatrixWorld();

      const intersects = raycaster.intersectObject(planeMesh);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        console.log('[DEBUG handleCanvasPointerDown] Intersection point:', point);

        // Check if starting near an existing room edge
        const snapEdge = findSnapEdge(point, rooms);
        let snappedStartPoint = { x: point.x, z: point.z };

        if (snapEdge) {
          // Snap the start point to the edge
          if (snapEdge.isHorizontal) {
            snappedStartPoint.z = snapEdge.z;
          } else {
            snappedStartPoint.x = snapEdge.x;
          }
          console.log('[DEBUG handleCanvasPointerDown] Snapping to edge:', snapEdge.edge);
        }

        console.log('[DEBUG handleCanvasPointerDown] Setting dragState with startPoint:', snappedStartPoint);
        setDragState({
          isDrawing: true,
          startPoint: snappedStartPoint,
          currentPoint: snappedStartPoint,
          snappedEdge: snapEdge,
        });
      }
    };

    const handleCanvasPointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.isDrawing) return;

      // Convert mouse position to normalized device coordinates
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast to find intersection with ground plane
      raycaster.setFromCamera(pointer, camera);
      const planeGeometry = new THREE.PlaneGeometry(100, 100);
      const planeMesh = new THREE.Mesh(planeGeometry);
      planeMesh.rotation.x = -Math.PI / 2;
      planeMesh.position.set(0, 0, 0);
      planeMesh.updateMatrixWorld();

      const intersects = raycaster.intersectObject(planeMesh);
      if (intersects.length > 0) {
        const point = intersects[0].point;

        // Check if current point is near an edge (for opposite side snapping)
        const snapEdge = findSnapEdge(point, rooms);
        let snappedCurrentPoint = { x: point.x, z: point.z };

        if (snapEdge) {
          // Snap the current point to the edge
          if (snapEdge.isHorizontal) {
            snappedCurrentPoint.z = snapEdge.z;
          } else {
            snappedCurrentPoint.x = snapEdge.x;
          }
        }

        setDragState((prev) => ({
          ...prev,
          currentPoint: snappedCurrentPoint,
        }));
      }
    };

    const handleCanvasPointerUp = (e: PointerEvent) => {
      const currentDragState = dragStateRef.current;
      console.log('[DEBUG handleCanvasPointerUp] Called! currentTool:', currentTool, 'isDrawing:', currentDragState.isDrawing);

      if (!currentDragState.isDrawing || !currentDragState.startPoint) {
        return;
      }

      // Convert mouse position to normalized device coordinates
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast to find intersection with ground plane
      raycaster.setFromCamera(pointer, camera);
      const planeGeometry = new THREE.PlaneGeometry(100, 100);
      const planeMesh = new THREE.Mesh(planeGeometry);
      planeMesh.rotation.x = -Math.PI / 2;
      planeMesh.position.set(0, 0, 0);
      planeMesh.updateMatrixWorld();

      const intersects = raycaster.intersectObject(planeMesh);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const startPoint = currentDragState.startPoint;

        console.log('[DEBUG handleCanvasPointerUp] point:', point);
        console.log('[DEBUG handleCanvasPointerUp] startPoint:', startPoint);

        // Calculate dimensions
        const width = Math.abs(point.x - startPoint.x);
        const depth = Math.abs(point.z - startPoint.z);
        console.log('[DEBUG handleCanvasPointerUp] width:', width, 'depth:', depth);

        // Only create room if dimensions are reasonable (> 0.5m)
        if (width > 0.5 && depth > 0.5) {
          const centerX = (startPoint.x + point.x) / 2;
          const centerZ = (startPoint.z + point.z) / 2;

          console.log('[DEBUG handleCanvasPointerUp] Creating room at center:', centerX, centerZ);

          // Emit custom event with room data
          const roomData = {
            width,
            depth,
            position_x: centerX,
            position_z: centerZ,
          };

          console.log('[DEBUG handleCanvasPointerUp] Dispatching createRoom event with data:', roomData);
          window.dispatchEvent(
            new CustomEvent('createRoom', { detail: roomData })
          );
        } else {
          console.log('[DEBUG handleCanvasPointerUp] Room too small, not creating');
        }
      }

      // Reset drag state
      setDragState({
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        snappedEdge: null,
      });
    };

    canvas.addEventListener('pointerdown', handleCanvasPointerDown);
    canvas.addEventListener('pointermove', handleCanvasPointerMove);
    canvas.addEventListener('pointerup', handleCanvasPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handleCanvasPointerDown);
      canvas.removeEventListener('pointermove', handleCanvasPointerMove);
      canvas.removeEventListener('pointerup', handleCanvasPointerUp);
    };
  }, [currentTool, camera, gl, rooms]);

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
        userData={{ isGround: true }}
        onPointerDown={currentTool === 'draw-wall' ? handlePointerDown : undefined}
        onPointerMove={currentTool === 'draw-wall' ? handlePointerMove : undefined}
        onPointerUp={currentTool === 'draw-wall' ? handlePointerUp : undefined}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>

      {/* Preview rectangle while drawing */}
      {previewDims && (
        <group position={[previewDims.centerX, 0.01, previewDims.centerZ]} raycast={() => null}>
          {/* Floor preview */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
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

      {/* Snap indicator - highlight the edge being snapped to */}
      {dragState.snappedEdge && dragState.isDrawing && (() => {
        const snapped = dragState.snappedEdge;
        const room = rooms.find(r => r.id === snapped.roomId);
        if (!room) return null;

        const width = room.dimensions_json.width || 4;
        const depth = room.dimensions_json.depth || 4;
        const posX = room.position_x || 0;
        const posZ = room.position_z || 0;

        // Calculate edge position and dimensions for the highlight
        let edgePos: [number, number, number] = [0, 0.05, 0];
        let edgeSize: [number, number] = [0, 0];

        switch (snapped.edge) {
          case 'front':
            edgePos = [posX, 0.05, posZ + depth / 2];
            edgeSize = [width, 0.1];
            break;
          case 'back':
            edgePos = [posX, 0.05, posZ - depth / 2];
            edgeSize = [width, 0.1];
            break;
          case 'right':
            edgePos = [posX + width / 2, 0.05, posZ];
            edgeSize = [0.1, depth];
            break;
          case 'left':
            edgePos = [posX - width / 2, 0.05, posZ];
            edgeSize = [0.1, depth];
            break;
        }

        return (
          <mesh position={edgePos} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={edgeSize} />
            <meshBasicMaterial color="#10b981" opacity={0.8} transparent />
          </mesh>
        );
      })()}

      {/* Render actual rooms */}
      {rooms.map((room) => (
        <RoomMesh
          key={room.id}
          room={room}
          isCurrentFloor={room.floor_id === currentFloorId}
        />
      ))}

      {/* Render furniture */}
      {furniturePlacements.map((furniture) => (
        <FurnitureMesh key={furniture.id} furniture={furniture} onContextMenu={onFurnitureContextMenu} />
      ))}

      {/* Render lights */}
      {lights.map((light) => {
        // Find the room this light belongs to for position offset
        const room = rooms.find(r => r.id === light.room_id);
        if (!room) return null;
        return (
          <LightMesh
            key={light.id}
            light={light}
            roomPosition={{ x: room.position_x || 0, z: room.position_z || 0 }}
          />
        );
      })}

      {/* Light placement preview */}
      {currentTool === 'place-light' && (
        <LightPlacementHelper 
          rooms={rooms} 
          currentFloorId={currentFloorId}
          onPlaceLight={async (roomId, position) => {
            try {
              const response = await lightsApi.create(roomId, {
                type: 'point',
                position_x: position.x,
                position_y: position.y,
                position_z: position.z,
                intensity: 1.0,
                color: '#ffffff',
                color_temperature: 4000,
              });
              addLight(response.light);
              toast.success('Light placed');
            } catch (error) {
              console.error('Error placing light:', error);
              toast.error('Failed to place light');
            }
          }}
        />
      )}

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
        enabled={currentTool !== 'draw-wall'}
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
    <group raycast={() => null}>
      {/* Front wall */}
      <mesh position={[0, height / 2, depth / 2]} raycast={() => null}>
        <boxGeometry args={[width, height, 0.1]} />
        <meshStandardMaterial color="#3b82f6" opacity={0.5} transparent />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, height / 2, -depth / 2]} raycast={() => null}>
        <boxGeometry args={[width, height, 0.1]} />
        <meshStandardMaterial color="#3b82f6" opacity={0.5} transparent />
      </mesh>

      {/* Left wall */}
      <mesh position={[-width / 2, height / 2, 0]} raycast={() => null}>
        <boxGeometry args={[0.1, height, depth]} />
        <meshStandardMaterial color="#3b82f6" opacity={0.5} transparent />
      </mesh>

      {/* Right wall */}
      <mesh position={[width / 2, height / 2, 0]} raycast={() => null}>
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
    <group position={[0, 2.8 + 0.5, 0]} raycast={() => null}>
      <mesh raycast={() => null}>
        <boxGeometry args={[2, 0.5, 0.1]} />
        <meshBasicMaterial color="#1e1e28" opacity={0.9} transparent />
      </mesh>
      {/* In a real implementation, we'd use a text rendering library */}
      {/* For now, this is a placeholder - the actual text would be rendered as HTML overlay */}
    </group>
  );
}

// Light placement helper - shows preview and handles click to place
function LightPlacementHelper({ 
  rooms, 
  currentFloorId, 
  onPlaceLight 
}: { 
  rooms: any[]; 
  currentFloorId: number | null;
  onPlaceLight: (roomId: number, position: { x: number; y: number; z: number }) => void;
}) {
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number; z: number } | null>(null);
  const [targetRoom, setTargetRoom] = useState<any>(null);
  
  const handlePointerMove = (e: any) => {
    // Find which room the pointer is over
    const point = e.point;
    const currentRooms = rooms.filter(r => r.floor_id === currentFloorId);
    
    for (const room of currentRooms) {
      const roomX = room.position_x || 0;
      const roomZ = room.position_z || 0;
      const width = room.dimensions_json?.width || 4;
      const depth = room.dimensions_json?.depth || 4;
      
      // Check if point is within room bounds
      const relX = point.x - roomX;
      const relZ = point.z - roomZ;
      
      if (relX >= -width/2 && relX <= width/2 && relZ >= -depth/2 && relZ <= depth/2) {
        setTargetRoom(room);
        setPreviewPosition({
          x: relX,
          y: room.ceiling_height ? room.ceiling_height - 0.3 : 2.5, // Place near ceiling
          z: relZ,
        });
        return;
      }
    }
    
    // Not over any room
    setTargetRoom(null);
    setPreviewPosition(null);
  };
  
  const handleClick = (e: any) => {
    if (targetRoom && previewPosition) {
      e.stopPropagation();
      onPlaceLight(targetRoom.id, previewPosition);
    }
  };
  
  return (
    <>
      {/* Invisible plane to capture pointer events */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Preview light bulb */}
      {previewPosition && targetRoom && (
        <group position={[
          (targetRoom.position_x || 0) + previewPosition.x,
          previewPosition.y,
          (targetRoom.position_z || 0) + previewPosition.z,
        ]}>
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
              color="#ffd700"
              emissive="#ffd700"
              emissiveIntensity={0.5}
              transparent
              opacity={0.7}
            />
          </mesh>
          {/* Light cone preview */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
            <coneGeometry args={[0.5, 2, 16, 1, true]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.2} wireframe side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </>
  );
}

// Room mesh component with draggable walls
function RoomMesh({ room, isCurrentFloor = true }: { room: any; isCurrentFloor?: boolean }) {
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    edge: 'front' | 'back' | 'left' | 'right' | null;
    startWidth: number;
    startDepth: number;
    startPointer: { x: number; z: number } | null;
  } | null>(null);

  const [tempDimensions, setTempDimensions] = useState<{ width: number; depth: number } | null>(null);
  const [walls, setWalls] = useState<any[]>([]);

  // Fetch walls for this room
  useEffect(() => {
    const fetchWalls = async () => {
      try {
        const response = await wallsApi.getByRoomId(room.id);
        setWalls(response.walls || []);
      } catch (error) {
        console.error('Error fetching walls:', error);
        // If walls don't exist, we'll fall back to rendering default walls
        setWalls([]);
      }
    };
    fetchWalls();
  }, [room.id]);

  const width = tempDimensions?.width || room.dimensions_json.width || 4;
  const depth = tempDimensions?.depth || room.dimensions_json.depth || 4;
  const height = room.ceiling_height || 2.8;
  const posX = room.position_x || 0;
  const posZ = room.position_z || 0;

  const setSelectedRoomId = useEditorStore((state) => state.setSelectedRoomId);
  const setRooms = useEditorStore((state) => state.setRooms);
  const rooms = useEditorStore((state) => state.rooms);
  const currentTool = useEditorStore((state) => state.currentTool);
  const selectedRoomId = useEditorStore((state) => state.selectedRoomId);

  const isSelected = selectedRoomId === room.id;

  const handleClick = (e: any) => {
    // Only select room when using select tool
    if (currentTool === 'select') {
      e.stopPropagation();
      setSelectedRoomId(room.id);
    }
  };

  const handleEdgeDragStart = (edge: 'front' | 'back' | 'left' | 'right', e: any) => {
    if (currentTool !== 'select') return;

    e.stopPropagation();
    setDragState({
      isDragging: true,
      edge,
      startWidth: room.dimensions_json.width,
      startDepth: room.dimensions_json.depth,
      startPointer: { x: e.point.x, z: e.point.z },
    });
  };

  const handleEdgeDrag = (e: any) => {
    if (!dragState?.isDragging || !dragState.startPointer) return;

    const deltaX = e.point.x - dragState.startPointer.x;
    const deltaZ = e.point.z - dragState.startPointer.z;

    let newWidth = dragState.startWidth;
    let newDepth = dragState.startDepth;

    // Adjust dimensions based on which edge is being dragged
    switch (dragState.edge) {
      case 'front': // +Z direction
        newDepth = Math.max(1, dragState.startDepth + deltaZ);
        break;
      case 'back': // -Z direction
        newDepth = Math.max(1, dragState.startDepth - deltaZ);
        break;
      case 'right': // +X direction
        newWidth = Math.max(1, dragState.startWidth + deltaX);
        break;
      case 'left': // -X direction
        newWidth = Math.max(1, dragState.startWidth - deltaX);
        break;
    }

    setTempDimensions({ width: newWidth, depth: newDepth });
  };

  const handleEdgeDragEnd = async () => {
    if (!dragState?.isDragging || !tempDimensions) {
      setDragState(null);
      return;
    }

    try {
      // Update room via API
      const updatedRoom = await roomsApi.update(room.id, {
        dimensions_json: {
          width: tempDimensions.width,
          depth: tempDimensions.depth,
        },
      });

      // Update Zustand store
      const updatedRooms = rooms.map((r) =>
        r.id === room.id ? { ...r, dimensions_json: updatedRoom.room.dimensions_json } : r
      );
      setRooms(updatedRooms);

      toast.success('Room resized', {
        description: `${tempDimensions.width.toFixed(1)}m × ${tempDimensions.depth.toFixed(1)}m`,
      });
    } catch (error) {
      console.error('Error updating room:', error);
      toast.error('Failed to resize room');
    }

    setDragState(null);
    setTempDimensions(null);
  };

  const handlePointerEnter = (e: any) => {
    if (currentTool !== 'select') return;

    // Dispatch custom event for hover tooltip
    const event = new CustomEvent('roomHover', {
      detail: {
        clientX: e.nativeEvent.clientX,
        clientY: e.nativeEvent.clientY,
        room: room,
      },
    });
    window.dispatchEvent(event);
  };

  const handlePointerLeave = () => {
    // Dispatch custom event to hide tooltip
    const event = new CustomEvent('roomHoverEnd');
    window.dispatchEvent(event);
  };

  // View settings with defaults
  const roomOpacity = room.opacity ?? 1.0;
  const showFloor = room.show_floor ?? true;
  const showCeiling = room.show_ceiling ?? true;
  const showWalls = room.show_walls ?? true;
  const viewMode = room.view_mode || 'solid';
  const isWireframe = viewMode === 'wireframe';
  const isXray = viewMode === 'xray';
  const effectiveOpacity = isXray ? Math.min(roomOpacity, 0.3) : (isCurrentFloor ? roomOpacity : Math.min(roomOpacity, 0.3));

  // Handle right-click on room
  const handleRoomContextMenu = (e: any) => {
    e.stopPropagation();
    const domEvent = e.nativeEvent as MouseEvent;
    // Dispatch event to parent to show context menu
    window.dispatchEvent(new CustomEvent('roomContextMenu', {
      detail: {
        x: domEvent.clientX,
        y: domEvent.clientY,
        room: room,
      }
    }));
  };

  return (
    <group position={[posX, 0, posZ]} onClick={handleClick} onContextMenu={handleRoomContextMenu}>
      {/* Floor */}
      {showFloor && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial
            color={(() => {
              // Use floor_material to determine appearance
              const material = room.floor_material || 'hardwood';
              switch (material) {
                case 'hardwood':
                  return '#8B4513'; // Brown wood color
                case 'tile':
                  return '#E8E8E8'; // Light gray tile
                case 'carpet':
                  return '#A0522D'; // Sienna carpet
                case 'marble':
                  return '#F5F5F5'; // White marble
                case 'laminate':
                  return '#D2691E'; // Chocolate laminate
                case 'concrete':
                  return '#808080'; // Gray concrete
                default:
                  return room.floor_color || '#d1d5db';
              }
            })()}
            roughness={(() => {
              const material = room.floor_material || 'hardwood';
              switch (material) {
                case 'marble':
                case 'tile':
                  return 0.2; // Smooth, shiny
                case 'concrete':
                  return 0.8; // Rough
                case 'carpet':
                  return 0.9; // Very rough
                case 'hardwood':
                case 'laminate':
                  return 0.4; // Semi-gloss
                default:
                  return 0.5;
              }
            })()}
            wireframe={isWireframe}
            transparent={effectiveOpacity < 1}
            opacity={effectiveOpacity}
          />
        </mesh>
      )}

      {/* Ceiling */}
      {showCeiling && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]}>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial
            color={room.ceiling_color || "#f3f4f6"}
            side={THREE.DoubleSide}
            wireframe={isWireframe}
            transparent={effectiveOpacity < 1}
            opacity={effectiveOpacity}
          />
        </mesh>
      )}

      {/* Walls */}
      {showWalls && walls.length > 0 ? (
        // Render walls from database
        walls.map((wall) => (
          <WallMesh
            key={wall.id}
            wall={wall}
            roomPosX={posX}
            roomPosZ={posZ}
            isCurrentFloor={isCurrentFloor}
            opacity={effectiveOpacity}
            wireframe={isWireframe}
          />
        ))
      ) : showWalls ? (
        // Fallback: render default walls if no database walls exist
        <>
          {/* Front wall */}
          <mesh position={[0, height / 2, depth / 2]}>
            <boxGeometry args={[width, height, 0.15]} />
            <meshStandardMaterial color="#e5e7eb" wireframe={isWireframe} transparent={effectiveOpacity < 1} opacity={effectiveOpacity} />
          </mesh>

          {/* Back wall */}
          <mesh position={[0, height / 2, -depth / 2]}>
            <boxGeometry args={[width, height, 0.15]} />
            <meshStandardMaterial color="#e5e7eb" wireframe={isWireframe} transparent={effectiveOpacity < 1} opacity={effectiveOpacity} />
          </mesh>

          {/* Left wall */}
          <mesh position={[-width / 2, height / 2, 0]}>
            <boxGeometry args={[0.15, height, depth]} />
            <meshStandardMaterial color="#e5e7eb" wireframe={isWireframe} transparent={effectiveOpacity < 1} opacity={effectiveOpacity} />
          </mesh>

          {/* Right wall */}
          <mesh position={[width / 2, height / 2, 0]}>
            <boxGeometry args={[0.15, height, depth]} />
            <meshStandardMaterial color="#e5e7eb" wireframe={isWireframe} transparent={effectiveOpacity < 1} opacity={effectiveOpacity} />
          </mesh>
        </>
      ) : null}

      {/* Draggable edge handles - only show when room is selected */}
      {isSelected && currentTool === 'select' && (
        <>
          {/* Front edge handle (+Z) */}
          <mesh
            position={[0, 0.5, depth / 2]}
            onPointerDown={(e) => handleEdgeDragStart('front', e)}
            onPointerMove={handleEdgeDrag}
            onPointerUp={handleEdgeDragEnd}
            onPointerLeave={handleEdgeDragEnd}
          >
            <boxGeometry args={[width, 0.3, 0.3]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} />
          </mesh>

          {/* Back edge handle (-Z) */}
          <mesh
            position={[0, 0.5, -depth / 2]}
            onPointerDown={(e) => handleEdgeDragStart('back', e)}
            onPointerMove={handleEdgeDrag}
            onPointerUp={handleEdgeDragEnd}
            onPointerLeave={handleEdgeDragEnd}
          >
            <boxGeometry args={[width, 0.3, 0.3]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} />
          </mesh>

          {/* Right edge handle (+X) */}
          <mesh
            position={[width / 2, 0.5, 0]}
            onPointerDown={(e) => handleEdgeDragStart('right', e)}
            onPointerMove={handleEdgeDrag}
            onPointerUp={handleEdgeDragEnd}
            onPointerLeave={handleEdgeDragEnd}
          >
            <boxGeometry args={[0.3, 0.3, depth]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} />
          </mesh>

          {/* Left edge handle (-X) */}
          <mesh
            position={[-width / 2, 0.5, 0]}
            onPointerDown={(e) => handleEdgeDragStart('left', e)}
            onPointerMove={handleEdgeDrag}
            onPointerUp={handleEdgeDragEnd}
            onPointerLeave={handleEdgeDragEnd}
          >
            <boxGeometry args={[0.3, 0.3, depth]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} />
          </mesh>
        </>
      )}

      {/* Show dimension labels while dragging */}
      {dragState?.isDragging && tempDimensions && (
        <DimensionLabel width={tempDimensions.width} depth={tempDimensions.depth} />
      )}
    </group>
  );
}

// Furniture mesh component
function FurnitureMesh({ furniture, onContextMenu }: { furniture: any; onContextMenu?: (e: any, furniture: any) => void }) {
  const width = furniture.width || 1;
  const height = furniture.height || 1;
  const depth = furniture.depth || 1;

  const selectedFurnitureId = useEditorStore((state) => state.selectedFurnitureId);
  const setSelectedFurnitureId = useEditorStore((state) => state.setSelectedFurnitureId);
  const selectedFurnitureIds = useEditorStore((state) => state.selectedFurnitureIds); // Feature #38
  const toggleFurnitureSelection = useEditorStore((state) => state.toggleFurnitureSelection); // Feature #38
  const clearFurnitureSelection = useEditorStore((state) => state.clearFurnitureSelection); // Feature #38
  const updateFurniturePlacement = useEditorStore((state) => state.updateFurniturePlacement);
  const currentTool = useEditorStore((state) => state.currentTool);
  const addAction = useEditorStore((state) => state.addAction);
  const rooms = useEditorStore((state) => state.rooms);

  const isSelected = selectedFurnitureId === furniture.id || selectedFurnitureIds.includes(furniture.id);
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; z: number } | null>(null);
  const [snappedWall, setSnappedWall] = useState<'north' | 'south' | 'east' | 'west' | null>(null);

  console.log('[DEBUG FurnitureMesh] Rendering furniture:', furniture);
  console.log('[DEBUG FurnitureMesh] Dimensions:', { width, height, depth });
  console.log('[DEBUG FurnitureMesh] Position:', [furniture.position_x, furniture.position_y, furniture.position_z]);

  const handlePointerDown = (e: any) => {
    // Check if it's a right-click (button 2)
    if (e.button === 2) {
      e.stopPropagation();
      // Dispatch custom event for furniture context menu
      window.dispatchEvent(new CustomEvent('canvasContextMenu', {
        detail: {
          clientX: e.nativeEvent.clientX,
          clientY: e.nativeEvent.clientY,
          type: 'furniture',
          furniture: furniture
        }
      }));
      return;
    }

    // Left click - select furniture
    if (e.button === 0 && currentTool === 'select') {
      e.stopPropagation();

      // Feature #38: Multi-select with Shift+Click
      if (e.nativeEvent.shiftKey) {
        // Shift+Click: toggle this item in the multi-selection
        toggleFurnitureSelection(furniture.id);
      } else {
        // Regular click: clear multi-selection and select this item
        clearFurnitureSelection();
        setSelectedFurnitureId(furniture.id);
      }

      // Start drag only for single selection (not during multi-select)
      if (!e.nativeEvent.shiftKey) {
        setIsDragging(true);
        setDragStart({ x: furniture.position_x, z: furniture.position_z });
      }
    }
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging || !dragStart || currentTool !== 'select') return;

    e.stopPropagation();

    // Get the intersection point with the ground plane (y=0)
    const point = e.intersections.find((i: any) => i.object.userData?.isGround);
    if (point) {
      let newX = point.point.x;
      let newZ = point.point.z;
      let newRotationY = furniture.rotation_y || 0;
      let wallSnap: 'north' | 'south' | 'east' | 'west' | null = null;

      // Feature #36: Snap-to-wall placement
      // Find the room this furniture belongs to
      const room = rooms.find(r => r.id === furniture.room_id);
      if (room) {
        const roomX = room.position_x || 0;
        const roomZ = room.position_z || 0;
        const roomWidth = room.dimensions_json?.width || 4;
        const roomDepth = room.dimensions_json?.depth || 4;

        // Calculate wall positions (assuming room is centered at roomX, roomZ)
        const walls = {
          north: { z: roomZ + roomDepth / 2, normal: [0, 0, -1], rotation: Math.PI },      // +Z wall, faces -Z
          south: { z: roomZ - roomDepth / 2, normal: [0, 0, 1], rotation: 0 },             // -Z wall, faces +Z
          east:  { x: roomX + roomWidth / 2, normal: [-1, 0, 0], rotation: -Math.PI / 2 }, // +X wall, faces -X
          west:  { x: roomX - roomWidth / 2, normal: [1, 0, 0], rotation: Math.PI / 2 },   // -X wall, faces +X
        };

        const snapDistance = 0.5; // Snap within 0.5 meters of wall
        const wallOffset = depth / 2 + 0.05; // Place furniture with slight gap from wall

        // Check distance to each wall
        const northDist = Math.abs(newZ - walls.north.z);
        const southDist = Math.abs(newZ - walls.south.z);
        const eastDist = Math.abs(newX - walls.east.x);
        const westDist = Math.abs(newX - walls.west.x);

        // Find closest wall within snap distance
        const minDist = Math.min(northDist, southDist, eastDist, westDist);

        if (minDist < snapDistance) {
          if (minDist === northDist) {
            // Snap to north wall (+Z)
            newZ = walls.north.z - wallOffset;
            newRotationY = walls.north.rotation;
            wallSnap = 'north';
          } else if (minDist === southDist) {
            // Snap to south wall (-Z)
            newZ = walls.south.z + wallOffset;
            newRotationY = walls.south.rotation;
            wallSnap = 'south';
          } else if (minDist === eastDist) {
            // Snap to east wall (+X)
            newX = walls.east.x - wallOffset;
            newRotationY = walls.east.rotation;
            wallSnap = 'east';
          } else if (minDist === westDist) {
            // Snap to west wall (-X)
            newX = walls.west.x + wallOffset;
            newRotationY = walls.west.rotation;
            wallSnap = 'west';
          }
        }
      }

      setSnappedWall(wallSnap);

      // Update local position and rotation immediately for smooth dragging
      if (groupRef.current) {
        groupRef.current.position.x = newX;
        groupRef.current.position.z = newZ;
        groupRef.current.rotation.y = newRotationY;
      }

      // Update store (but don't save to backend yet)
      updateFurniturePlacement(furniture.id, {
        position_x: newX,
        position_z: newZ,
        rotation_y: newRotationY,
      });
    }
  };

  const handlePointerUp = async (e: any) => {
    if (!isDragging) return;

    e.stopPropagation();
    setIsDragging(false);
    setSnappedWall(null);

    // Save final position to backend
    if (dragStart) {
      const newX = furniture.position_x;
      const newZ = furniture.position_z;
      const newRotationY = furniture.rotation_y;

      // Only save if position actually changed
      if (Math.abs(newX - dragStart.x) > 0.01 || Math.abs(newZ - dragStart.z) > 0.01) {
        try {
          await furnitureApi.update(furniture.id, {
            position_x: newX,
            position_y: furniture.position_y,
            position_z: newZ,
            rotation_y: newRotationY,
          });
          console.log('[FurnitureMesh] Position saved to backend:', { x: newX, z: newZ });

          // Add to undo/redo history (Feature #83)
          addAction({
            type: 'furniture_move',
            description: `Moved ${furniture.asset_name || 'furniture'}`,
            data: {
              furnitureId: furniture.id,
              previousPosition: {
                x: dragStart.x,
                y: furniture.position_y,
                z: dragStart.z,
              },
              newPosition: {
                x: newX,
                y: furniture.position_y,
                z: newZ,
              },
            },
          });
        } catch (error) {
          console.error('[FurnitureMesh] Failed to save position:', error);
          toast.error('Failed to save furniture position');

          // Revert position on error
          updateFurniturePlacement(furniture.id, {
            position_x: dragStart.x,
            position_z: dragStart.z,
          });
          if (groupRef.current) {
            groupRef.current.position.x = dragStart.x;
            groupRef.current.position.z = dragStart.z;
          }
        }
      }
    }

    setDragStart(null);
  };

  // Check if this is a lighting asset
  const isLightingAsset = furniture.category === 'Lighting';

  return (
    <group
      ref={groupRef}
      position={[furniture.position_x, furniture.position_y, furniture.position_z]}
      rotation={[furniture.rotation_x || 0, furniture.rotation_y || 0, furniture.rotation_z || 0]}
      scale={[furniture.scale_x || 1, furniture.scale_y || 1, furniture.scale_z || 1]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <Box args={[width, height, depth]} position={[0, height / 2, 0]}>
        <meshStandardMaterial
          color={isLightingAsset ? "#ffeb3b" : "#ff0000"}
          emissive={isLightingAsset ? "#ffeb3b" : "#ff0000"}
          emissiveIntensity={isLightingAsset ? 0.8 : 0.5}
        />
      </Box>

      {/* Add actual light source if this is a lighting asset (Feature #46, #47) */}
      {isLightingAsset && (
        <pointLight
          position={[0, height / 2, 0]}
          intensity={furniture.light_intensity !== undefined ? furniture.light_intensity : 2.0}
          distance={10}
          decay={2}
          color={furniture.light_color || '#fff8e1'}
          castShadow
        />
      )}

      {/* Selection indicator - wireframe box */}
      {isSelected && (
        <Box args={[width + 0.1, height + 0.1, depth + 0.1]} position={[0, height / 2, 0]}>
          <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.8} />
        </Box>
      )}

      {/* Snap-to-wall indicator - Feature #36 */}
      {snappedWall && isDragging && (
        <Box args={[width + 0.2, height + 0.2, depth + 0.2]} position={[0, height / 2, 0]}>
          <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.6} />
        </Box>
      )}
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

export default function Viewport3D({ onOpenSettings }: Viewport3DProps = {}) {
  const draggingAsset = useEditorStore((state) => state.draggingAsset);
  const currentFloorId = useEditorStore((state) => state.currentFloorId);
  const rooms = useEditorStore((state) => state.rooms);
  const addFurniturePlacement = useEditorStore((state) => state.addFurniturePlacement);
  const removeFurniturePlacement = useEditorStore((state) => state.removeFurniturePlacement);
  const setSelectedRoomId = useEditorStore((state) => state.setSelectedRoomId);
  const lightingMode = useEditorStore((state) => state.lightingMode);
  const setLightingMode = useEditorStore((state) => state.setLightingMode);
  const addAction = useEditorStore((state) => state.addAction);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type: 'empty' | 'furniture' | 'room';
    furniture?: any;
    room?: any;
  }>({
    visible: false,
    x: 0,
    y: 0,
    type: 'empty',
  });

  // Room hover tooltip state
  const [roomTooltip, setRoomTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    room: any;
  } | null>(null);

  // Listen for context menu events from the 3D scene
  useEffect(() => {
    const handleCanvasContextMenuEvent = (event: any) => {
      const { clientX, clientY, type, furniture } = event.detail;
      console.log('[DEBUG Viewport3D] Context menu event received:', { clientX, clientY, type, furniture });
      setContextMenu({
        visible: true,
        x: clientX,
        y: clientY,
        type: type || 'empty',
        furniture: furniture,
      });
      console.log('[DEBUG Viewport3D] Context menu state set to visible');
    };

    const handleRoomContextMenuEvent = (event: any) => {
      const { x, y, room } = event.detail;
      setContextMenu({
        visible: true,
        x,
        y,
        type: 'room',
        room,
      });
    };

    window.addEventListener('canvasContextMenu', handleCanvasContextMenuEvent);
    window.addEventListener('roomContextMenu', handleRoomContextMenuEvent);
    return () => {
      window.removeEventListener('canvasContextMenu', handleCanvasContextMenuEvent);
      window.removeEventListener('roomContextMenu', handleRoomContextMenuEvent);
    };
  }, []);

  // Listen for room hover events
  useEffect(() => {
    const handleRoomHover = (event: any) => {
      const { clientX, clientY, room } = event.detail;
      setRoomTooltip({
        visible: true,
        x: clientX,
        y: clientY,
        room,
      });
    };

    const handleRoomHoverEnd = () => {
      setRoomTooltip(null);
    };

    window.addEventListener('roomHover', handleRoomHover);
    window.addEventListener('roomHoverEnd', handleRoomHoverEnd);
    return () => {
      window.removeEventListener('roomHover', handleRoomHover);
      window.removeEventListener('roomHoverEnd', handleRoomHoverEnd);
    };
  }, []);

  // Listen for furniture placement events from the 3D scene (after raycasting)
  useEffect(() => {
    const handlePlaceFurniture = async (event: any) => {
      const { asset, position } = event.detail;

      // Validate position object
      if (!position || typeof position.x !== 'number' || typeof position.z !== 'number') {
        console.error('[ERROR handlePlaceFurniture] Invalid position:', position);
        return;
      }

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

        // Record action in history
        addAction({
          type: 'furniture_add',
          description: `Placed ${asset.name}`,
          data: { furniture: data.furniture },
        });

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

    window.addEventListener('placeFurniture', handlePlaceFurniture);
    return () => window.removeEventListener('placeFurniture', handlePlaceFurniture);
  }, [rooms, addFurniturePlacement]);

  // Context menu handlers
  const handleDeleteFurniture = async (furniture: any) => {
    try {
      // Record action in history BEFORE deleting
      addAction({
        type: 'furniture_remove',
        description: `Deleted ${furniture.asset_name || 'furniture'}`,
        data: { furniture },
      });

      await furnitureApi.delete(furniture.id);
      removeFurniturePlacement(furniture.id);
      toast.success('Furniture deleted', {
        description: `${furniture.asset_name || 'Furniture'} removed`,
      });
    } catch (error) {
      console.error('Error deleting furniture:', error);
      toast.error('Failed to delete furniture', {
        description: 'Please try again',
      });
    }
  };

  const handleDuplicateFurniture = async (furniture: any) => {
    try {
      // Create duplicate with slight offset
      const data = await furnitureApi.create(furniture.room_id, {
        asset_id: furniture.asset_id,
        position_x: furniture.position_x + 1, // Offset by 1 meter
        position_y: furniture.position_y,
        position_z: furniture.position_z + 1,
        rotation_x: furniture.rotation_x,
        rotation_y: furniture.rotation_y,
        rotation_z: furniture.rotation_z,
        scale_x: furniture.scale_x,
        scale_y: furniture.scale_y,
        scale_z: furniture.scale_z,
      });

      addFurniturePlacement(data.furniture);

      // Record action in history
      addAction({
        type: 'furniture_add',
        description: `Duplicated ${furniture.asset_name || 'furniture'}`,
        data: { furniture: data.furniture },
      });

      toast.success('Furniture duplicated', {
        description: `${furniture.asset_name || 'Furniture'} copied`,
      });
    } catch (error) {
      console.error('Error duplicating furniture:', error);
      toast.error('Failed to duplicate furniture', {
        description: 'Please try again',
      });
    }
  };

  const handleShowProperties = (furniture: any) => {
    // Find the room that contains this furniture
    const room = rooms.find((r) => r.id === furniture.room_id);
    if (room) {
      setSelectedRoomId(room.id);
    }
  };

  // Get context menu items based on type
  const getContextMenuItems = (): ContextMenuItem[] => {
    console.log('[DEBUG getContextMenuItems] Type:', contextMenu.type, 'Furniture:', contextMenu.furniture);
    if (contextMenu.type === 'furniture' && contextMenu.furniture) {
      const furniture = contextMenu.furniture;
      return [
        {
          label: 'Properties',
          icon: <Eye className="w-4 h-4" />,
          onClick: () => handleShowProperties(furniture),
        },
        {
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          onClick: () => handleDuplicateFurniture(furniture),
        },
        {
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4" />,
          onClick: () => handleDeleteFurniture(furniture),
          divider: true,
        },
      ];
    } else if (contextMenu.type === 'room' && contextMenu.room) {
      // Room context menu
      const room = contextMenu.room;
      return [
        {
          label: 'Room Properties',
          icon: <Eye className="w-4 h-4" />,
          onClick: () => {
            setSelectedRoomId(room.id);
            toast.success('Room selected - view properties in the right panel');
          },
        },
        {
          label: 'Toggle X-Ray',
          icon: <Settings className="w-4 h-4" />,
          onClick: async () => {
            const currentMode = room.view_mode || 'solid';
            const newMode = currentMode === 'xray' ? 'solid' : 'xray';
            try {
              await roomsApi.update(room.id, { view_mode: newMode });
              const updateRoom = useEditorStore.getState().updateRoom;
              updateRoom(room.id, { view_mode: newMode });
              toast.success(`X-Ray mode ${newMode === 'xray' ? 'enabled' : 'disabled'}`);
            } catch (error) {
              console.error('Error toggling x-ray:', error);
            }
          },
        },
        {
          label: 'Hide Walls',
          icon: <Eye className="w-4 h-4" />,
          onClick: async () => {
            const currentShowWalls = room.show_walls ?? true;
            try {
              await roomsApi.update(room.id, { show_walls: !currentShowWalls });
              const updateRoom = useEditorStore.getState().updateRoom;
              updateRoom(room.id, { show_walls: !currentShowWalls });
              toast.success(`Walls ${!currentShowWalls ? 'shown' : 'hidden'}`);
            } catch (error) {
              console.error('Error toggling walls:', error);
            }
          },
          divider: true,
        },
      ];
    } else {
      // Empty space menu
      const items = [
        {
          label: 'Add Furniture',
          icon: <Armchair className="w-4 h-4" />,
          onClick: () => {
            // Open asset library (left sidebar) - it's already visible but this confirms intent
            toast.info('Drag furniture from the left panel to place it');
          },
        },
        {
          label: 'Global Settings',
          icon: <Settings className="w-4 h-4" />,
          onClick: () => {
            if (onOpenSettings) {
              onOpenSettings();
            } else {
              toast.info('Settings panel not available');
            }
          },
        },
      ];
      console.log('[DEBUG getContextMenuItems] Returning empty space items:', items.length);
      return items;
    }
  };

  // Handle right-click on Canvas wrapper
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'empty',
    });
  };

  // Pass this to Scene to handle furniture context menu
  const handleFurnitureContextMenu = (e: any, furniture: any) => {
    // Get mouse position from the DOM event
    const domEvent = e.nativeEvent as MouseEvent;
    setContextMenu({
      visible: true,
      x: domEvent.clientX,
      y: domEvent.clientY,
      type: 'furniture',
      furniture,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (draggingAsset) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (!draggingAsset) return;

    // Get the canvas element and perform raycast to find 3D position
    const canvas = e.currentTarget.querySelector('canvas');
    if (!canvas) return;

    // Calculate mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Dispatch drop event with calculated position
    // The Scene component will handle the actual raycasting and placement
    window.dispatchEvent(
      new CustomEvent('dropFurniture', {
        detail: {
          asset: draggingAsset,
          screenPosition: { x: e.clientX, y: e.clientY },
          canvasRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        },
      })
    );
  };

  return (
    <div
      className="w-full h-full bg-gray-950"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={handleCanvasContextMenu}
    >
      <Canvas
        camera={{
          position: [10, 10, 10],
          fov: 50,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene onFurnitureContextMenu={handleFurnitureContextMenu} />
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

      {/* Context menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        />
      )}

      {/* Room hover tooltip */}
      {roomTooltip && (
        <RoomTooltip
          x={roomTooltip.x}
          y={roomTooltip.y}
          room={roomTooltip.room}
        />
      )}
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
      console.log('[DEBUG DimensionOverlay] Received updateDimensions:', event.detail);
      setDimensions(event.detail);
    };

    const handleDimensionClear = () => {
      console.log('[DEBUG DimensionOverlay] Received clearDimensions');
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

// Room hover tooltip component
function RoomTooltip({ x, y, room }: { x: number; y: number; room: any }) {
  const unitSystem = useEditorStore((state) => state.unitSystem);

  const width = room.dimensions_json?.width || 0;
  const depth = room.dimensions_json?.depth || 0;
  const area = width * depth;

  return (
    <div
      className="absolute pointer-events-none z-30"
      style={{
        left: `${x + 15}px`,
        top: `${y + 15}px`,
      }}
    >
      <div className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-xl p-3 text-white min-w-[180px]">
        <div className="font-medium text-sm mb-2">{room.name || 'Unnamed Room'}</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Width:</span>
            <span className="font-mono">{formatLength(width, unitSystem)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Length:</span>
            <span className="font-mono">{formatLength(depth, unitSystem)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-700">
            <span className="text-gray-400">Area:</span>
            <span className="font-mono font-medium">{formatArea(area, unitSystem)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
