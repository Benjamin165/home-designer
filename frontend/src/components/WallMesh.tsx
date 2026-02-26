import { useEditorStore } from '../store/editorStore';
import * as THREE from 'three';

interface Wall {
  id: number;
  room_id: number;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  height: number;
  material: string | null;
  color: string | null;
  texture_path: string | null;
}

interface WallMeshProps {
  wall: Wall;
  roomPosX: number;
  roomPosZ: number;
}

export function WallMesh({ wall, roomPosX, roomPosZ }: WallMeshProps) {
  const selectedWallId = useEditorStore((state) => state.selectedWallId);
  const setSelectedWallId = useEditorStore((state) => state.setSelectedWallId);
  const currentTool = useEditorStore((state) => state.currentTool);

  const isSelected = selectedWallId === wall.id;

  // Calculate wall dimensions and position
  const startX = wall.start_x;
  const startY = wall.start_y;
  const endX = wall.end_x;
  const endY = wall.end_y;

  const wallLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  const wallThickness = 0.15;
  const wallHeight = wall.height;

  // Calculate center position
  const centerX = (startX + endX) / 2;
  const centerZ = (startY + endY) / 2;

  // Calculate rotation angle
  const angle = Math.atan2(endY - startY, endX - startX);

  const handleClick = (e: any) => {
    if (currentTool === 'select') {
      e.stopPropagation();
      setSelectedWallId(wall.id);
    }
  };

  const wallColor = wall.color || '#e5e7eb';

  return (
    <mesh
      position={[centerX, wallHeight / 2, centerZ]}
      rotation={[0, angle, 0]}
      onClick={handleClick}
    >
      <boxGeometry args={[wallLength, wallHeight, wallThickness]} />
      <meshStandardMaterial
        color={wallColor}
        emissive={isSelected ? '#3b82f6' : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
      />
    </mesh>
  );
}
