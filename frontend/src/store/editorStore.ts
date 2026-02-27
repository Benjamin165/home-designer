import { create } from 'zustand';

export type EditorTool = 'select' | 'draw-wall' | 'measure' | 'place-furniture' | 'pan' | 'first-person';

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
  // View settings
  opacity: number; // 0.0 to 1.0
  show_floor: boolean;
  show_ceiling: boolean;
  show_walls: boolean;
  view_mode: 'solid' | 'wireframe' | 'xray';
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

// Action types for undo/redo
export type ActionType =
  | 'furniture_add'
  | 'furniture_remove'
  | 'furniture_move'
  | 'room_add'
  | 'room_remove';

export interface HistoryAction {
  id: string;
  type: ActionType;
  timestamp: Date;
  description: string;
  data: {
    furniture?: FurniturePlacement;
    room?: Room;
    // For furniture_move: store previous and new positions
    previousPosition?: { x: number; y: number; z: number };
    newPosition?: { x: number; y: number; z: number };
    furnitureId?: number;
  };
}

export interface EditorState {
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
  updateRoom: (id: number, updates: Partial<Room>) => void;
  removeRoom: (id: number) => void;

  // Furniture placements
  furniturePlacements: FurniturePlacement[];
  setFurniturePlacements: (placements: FurniturePlacement[]) => void;
  addFurniturePlacement: (placement: FurniturePlacement) => void;
  removeFurniturePlacement: (id: number) => void;
  updateFurniturePlacement: (id: number, updates: Partial<FurniturePlacement>) => void;

  // Selection
  selectedRoomId: number | null;
  setSelectedRoomId: (id: number | null) => void;
  selectedFurnitureId: number | null;
  setSelectedFurnitureId: (id: number | null) => void;
  selectedFurnitureIds: number[]; // Feature #38: Multi-select
  toggleFurnitureSelection: (id: number) => void; // Feature #38: Add/remove from selection
  clearFurnitureSelection: () => void; // Feature #38: Clear all selections
  selectedWallId: number | null;
  setSelectedWallId: (id: number | null) => void;

  // Unit system
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (system: 'metric' | 'imperial') => void;

  // Dragging state for furniture
  draggingAsset: any | null; // Full asset object with all properties
  setDraggingAsset: (asset: any | null) => void;

  // Grid visibility
  gridVisible: boolean;
  setGridVisible: (visible: boolean) => void;

  // Lighting mode
  lightingMode: 'day' | 'night';
  setLightingMode: (mode: 'day' | 'night') => void;

  // Undo/Redo
  history: HistoryAction[];
  historyIndex: number;
  addAction: (action: Omit<HistoryAction, 'id' | 'timestamp'>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

export const useEditorStore: any = create<EditorState>((set, get) => ({
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
  getCameraPosition: (floorId: number) => {
    const state = get();
    return state.cameraPositions[floorId];
  },

  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => ({ rooms: [...state.rooms, room] })),
  updateRoom: (id, updates) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),
  removeRoom: (id) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== id),
    })),

  furniturePlacements: [],
  setFurniturePlacements: (placements) => set({ furniturePlacements: placements }),
  addFurniturePlacement: (placement) =>
    set((state) => ({ furniturePlacements: [...state.furniturePlacements, placement] })),
  removeFurniturePlacement: (id) =>
    set((state) => ({
      furniturePlacements: state.furniturePlacements.filter((p) => p.id !== id),
    })),
  updateFurniturePlacement: (id, updates) =>
    set((state) => ({
      furniturePlacements: state.furniturePlacements.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  selectedRoomId: null,
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),

  selectedFurnitureId: null,
  setSelectedFurnitureId: (id) => set({ selectedFurnitureId: id }),

  // Feature #38: Multi-select furniture
  selectedFurnitureIds: [],
  toggleFurnitureSelection: (id) => set((state) => {
    const isSelected = state.selectedFurnitureIds.includes(id);
    if (isSelected) {
      // Remove from selection
      return {
        selectedFurnitureIds: state.selectedFurnitureIds.filter(fid => fid !== id),
        selectedFurnitureId: state.selectedFurnitureIds.length > 1
          ? state.selectedFurnitureIds.find(fid => fid !== id) || null
          : null
      };
    } else {
      // Add to selection
      return {
        selectedFurnitureIds: [...state.selectedFurnitureIds, id],
        selectedFurnitureId: id // Set as primary selection
      };
    }
  }),
  clearFurnitureSelection: () => set({ selectedFurnitureIds: [], selectedFurnitureId: null }),

  selectedWallId: null,
  setSelectedWallId: (id) => set({ selectedWallId: id }),

  unitSystem: 'metric',
  setUnitSystem: (system) => set({ unitSystem: system }),

  draggingAsset: null,
  setDraggingAsset: (asset) => set({ draggingAsset: asset }),

  gridVisible: true,
  setGridVisible: (visible) => set({ gridVisible: visible }),

  lightingMode: 'day',
  setLightingMode: (mode) => set({ lightingMode: mode }),

  // Undo/Redo implementation
  history: [],
  historyIndex: -1,

  addAction: (action) =>
    set((state) => {
      // Create new action with ID and timestamp
      const newAction: HistoryAction = {
        ...action,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };

      // When adding a new action, discard any "future" actions (redo stack)
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newAction);

      // Limit history to last 100 actions to prevent memory issues
      const limitedHistory = newHistory.slice(-100);

      return {
        history: limitedHistory,
        historyIndex: limitedHistory.length - 1,
      };
    }),

  undo: async () => {
    const state = useEditorStore.getState();
    if (!state.canUndo()) return;

    const action = state.history[state.historyIndex];

    // Import furnitureApi here to avoid circular dependencies
    const { furnitureApi } = await import('../lib/api');

    try {
      let affectedFurnitureId: number | null = null;

      // Reverse the action
      switch (action.type) {
        case 'furniture_add':
          // Remove the furniture that was added
          if (action.data.furniture) {
            await furnitureApi.delete(action.data.furniture.id);
            state.removeFurniturePlacement(action.data.furniture.id);
            affectedFurnitureId = action.data.furniture.id;
          }
          break;

        case 'furniture_remove':
          // Re-add the furniture that was removed
          if (action.data.furniture) {
            const data = await furnitureApi.create(action.data.furniture.room_id, {
              asset_id: action.data.furniture.asset_id,
              position_x: action.data.furniture.position_x,
              position_y: action.data.furniture.position_y,
              position_z: action.data.furniture.position_z,
              rotation_x: action.data.furniture.rotation_x,
              rotation_y: action.data.furniture.rotation_y,
              rotation_z: action.data.furniture.rotation_z,
              scale_x: action.data.furniture.scale_x,
              scale_y: action.data.furniture.scale_y,
              scale_z: action.data.furniture.scale_z,
            });
            state.addFurniturePlacement(data.furniture);
            affectedFurnitureId = data.furniture.id;
          }
          break;

        case 'furniture_move':
          // Restore previous position
          if (action.data.furnitureId && action.data.previousPosition) {
            await furnitureApi.update(action.data.furnitureId, {
              position_x: action.data.previousPosition.x,
              position_y: action.data.previousPosition.y,
              position_z: action.data.previousPosition.z,
            });
            state.updateFurniturePlacement(action.data.furnitureId, {
              position_x: action.data.previousPosition.x,
              position_y: action.data.previousPosition.y,
              position_z: action.data.previousPosition.z,
            });
            affectedFurnitureId = action.data.furnitureId;
          }
          break;

        // Add more action types as needed
      }

      // Move history index back
      set({ historyIndex: state.historyIndex - 1 });

      // Preserve selection for the affected furniture (Feature #83)
      if (affectedFurnitureId !== null && state.selectedFurnitureId === affectedFurnitureId) {
        // Keep it selected
        set({ selectedFurnitureId: affectedFurnitureId });
      }
    } catch (error) {
      console.error('Error undoing action:', error);
      throw error;
    }
  },

  redo: async () => {
    const state = useEditorStore.getState();
    if (!state.canRedo()) return;

    // Move index forward first to get the action to redo
    const nextIndex = state.historyIndex + 1;
    const action = state.history[nextIndex];

    const { furnitureApi } = await import('../lib/api');

    try {
      let affectedFurnitureId: number | null = null;

      // Re-apply the action
      switch (action.type) {
        case 'furniture_add':
          // Re-add the furniture
          if (action.data.furniture) {
            const data = await furnitureApi.create(action.data.furniture.room_id, {
              asset_id: action.data.furniture.asset_id,
              position_x: action.data.furniture.position_x,
              position_y: action.data.furniture.position_y,
              position_z: action.data.furniture.position_z,
              rotation_x: action.data.furniture.rotation_x,
              rotation_y: action.data.furniture.rotation_y,
              rotation_z: action.data.furniture.rotation_z,
              scale_x: action.data.furniture.scale_x,
              scale_y: action.data.furniture.scale_y,
              scale_z: action.data.furniture.scale_z,
            });
            state.addFurniturePlacement(data.furniture);
            affectedFurnitureId = data.furniture.id;
          }
          break;

        case 'furniture_remove':
          // Re-remove the furniture
          if (action.data.furniture) {
            await furnitureApi.delete(action.data.furniture.id);
            state.removeFurniturePlacement(action.data.furniture.id);
            affectedFurnitureId = action.data.furniture.id;
          }
          break;

        case 'furniture_move':
          // Reapply new position
          if (action.data.furnitureId && action.data.newPosition) {
            await furnitureApi.update(action.data.furnitureId, {
              position_x: action.data.newPosition.x,
              position_y: action.data.newPosition.y,
              position_z: action.data.newPosition.z,
            });
            state.updateFurniturePlacement(action.data.furnitureId, {
              position_x: action.data.newPosition.x,
              position_y: action.data.newPosition.y,
              position_z: action.data.newPosition.z,
            });
            affectedFurnitureId = action.data.furnitureId;
          }
          break;
      }

      // Move history index forward
      set({ historyIndex: nextIndex });

      // Preserve selection for the affected furniture (Feature #83)
      if (affectedFurnitureId !== null && state.selectedFurnitureId === affectedFurnitureId) {
        // Keep it selected
        set({ selectedFurnitureId: affectedFurnitureId });
      }
    } catch (error) {
      console.error('Error redoing action:', error);
      throw error;
    }
  },

  canUndo: () => {
    const state = get();
    return state.historyIndex >= 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  clearHistory: () => set({ history: [], historyIndex: -1 }),
}));
