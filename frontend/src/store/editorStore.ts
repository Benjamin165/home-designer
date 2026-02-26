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

  // Rooms
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;

  // Selection
  selectedRoomId: number | null;
  setSelectedRoomId: (id: number | null) => void;

  // Unit system
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (system: 'metric' | 'imperial') => void;
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

  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => ({ rooms: [...state.rooms, room] })),

  selectedRoomId: null,
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),

  unitSystem: 'metric',
  setUnitSystem: (system) => set({ unitSystem: system }),
}));
