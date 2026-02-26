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
  isCurrentFloor?: boolean;
}

export function WallMesh({ wall, roomPosX, roomPosZ, isCurrentFloor = true }: WallMeshProps) {
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
  const wallMaterial = wall.material || 'paint';

  // Material properties for different wall types
  const getMaterialProps = () => {
    switch (wallMaterial) {
      case 'brick':
        return { color: '#8B4513', roughness: 0.9, metalness: 0.1 };
      case 'wood_panel':
        return { color: '#A0522D', roughness: 0.7, metalness: 0.0 };
      case 'tile':
        return { color: '#F5F5DC', roughness: 0.3, metalness: 0.2 };
      case 'concrete':
        return { color: '#808080', roughness: 0.95, metalness: 0.0 };
      case 'wallpaper':
        return { color: wallColor, roughness: 0.6, metalness: 0.0 };
      case 'stone':
        return { color: '#696969', roughness: 0.85, metalness: 0.1 };
      case 'marble':
        return { color: '#F8F8FF', roughness: 0.2, metalness: 0.3 };
      case 'paint':
      default:
        return { color: wallColor, roughness: 0.8, metalness: 0.0 };
    }
  };

  const matProps = getMaterialProps();

  return (
    <mesh
      position={[centerX, wallHeight / 2, centerZ]}
      rotation={[0, angle, 0]}
      onClick={handleClick}
    >
      <boxGeometry args={[wallLength, wallHeight, wallThickness]} />
      <meshStandardMaterial
        color={matProps.color}
        roughness={matProps.roughness}
        metalness={matProps.metalness}
        emissive={isSelected ? '#3b82f6' : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
        transparent={!isCurrentFloor}
        opacity={isCurrentFloor ? 1.0 : 0.3}
      />
    </mesh>
  );
}
