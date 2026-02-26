import { create } from 'zustand';

export type EditorTool = 'select' | 'draw-wall' | 'measure';

interface Room {
  id: number;
  floor_id: number;
  name: string | null;
  dimensions_json: {
    width: number;
    depth: number;
    vertices?: Array<{ x: number; y: number }>;
  };
  position_x: number;
  position_y: number;
  position_z: number;
  floor_material: string | null;
  floor_color: string | null;
  ceiling_height: number;
  ceiling_material: string | null;
  ceiling_color: string | null;
}

interface Floor {
  id: number;
  project_id: number;
  name: string;
  level: number;
  order_index: number;
}

interface FurniturePlacement {
  id: number;
  room_id: number;
  asset_id: number;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_x: number;
  rotation_y: number;
  rotation_z: number;
  scale_x: number;
  scale_y: number;
  scale_z: number;
  locked: boolean;
  asset_name?: string;
  category?: string;
  width?: number;
  height?: number;
  depth?: number;
  model_path?: string;
}

interface CameraPosition {
  position: [number, number, number];
  target: [number, number, number];
}

interface EditorState {
  // Current tool
  currentTool: EditorTool;
  setCurrentTool: (tool: EditorTool) => void;

  // Project and floors
  projectId: number | null;
  setProjectId: (id: number) => void;

  floors: Floor[];
  setFloors: (floors: Floor[]) => void;

  currentFloorId: number | null;
  setCurrentFloorId: (id: number | null) => void;

  // Camera positions per floor
  cameraPositions: Record<number, CameraPosition>;
  setCameraPosition: (floorId: number, position: CameraPosition) => void;
  getCameraPosition: (floorId: number) => CameraPosition | undefined;

  // Rooms
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;

  // Furniture placements
  furniturePlacements: FurniturePlacement[];
  setFurniturePlacements: (placements: FurniturePlacement[]) => void;
  addFurniturePlacement: (placement: FurniturePlacement) => void;
  removeFurniturePlacement: (id: number) => void;

  // Selection
  selectedRoomId: number | null;
  setSelectedRoomId: (id: number | null) => void;

  // Unit system
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (system: 'metric' | 'imperial') => void;

  // Dragging state for furniture
  draggingAsset: { id: number; name: string } | null;
  setDraggingAsset: (asset: { id: number; name: string } | null) => void;

  // Grid visibility
  gridVisible: boolean;
  setGridVisible: (visible: boolean) => void;

  // Lighting mode
  lightingMode: 'day' | 'night';
  setLightingMode: (mode: 'day' | 'night') => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentTool: 'select',
  setCurrentTool: (tool) => set({ currentTool: tool }),

  projectId: null,
  setProjectId: (id) => set({ projectId: id }),

  floors: [],
  setFloors: (floors) => set({ floors }),

  currentFloorId: null,
  setCurrentFloorId: (id) => set({ currentFloorId: id }),

  cameraPositions: {},
  setCameraPosition: (floorId, position) =>
    set((state) => ({
      cameraPositions: { ...state.cameraPositions, [floorId]: position },
    })),
  getCameraPosition: (floorId) => {
    const state = useEditorStore.getState();
    return state.cameraPositions[floorId];
  },

  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => ({ rooms: [...state.rooms, room] })),

  furniturePlacements: [],
  setFurniturePlacements: (placements) => set({ furniturePlacements: placements }),
  addFurniturePlacement: (placement) =>
    set((state) => ({ furniturePlacements: [...state.furniturePlacements, placement] })),
  removeFurniturePlacement: (id) =>
    set((state) => ({
      furniturePlacements: state.furniturePlacements.filter((p) => p.id !== id),
    })),

  selectedRoomId: null,
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),

  unitSystem: 'metric',
  setUnitSystem: (system) => set({ unitSystem: system }),

  draggingAsset: null,
  setDraggingAsset: (asset) => set({ draggingAsset: asset }),

  gridVisible: true,
  setGridVisible: (visible) => set({ gridVisible: visible }),

  lightingMode: 'day',
  setLightingMode: (mode) => set({ lightingMode: mode }),
}));
