import * as THREE from 'three';
import { useEditorStore, type EditorState } from '../store/editorStore';
import { WallMaterial } from './RoomMaterials';

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
  opacity?: number;
  wireframe?: boolean;
  xray?: boolean;
}

export function WallMesh({ wall, roomPosX: _roomPosX, roomPosZ: _roomPosZ, isCurrentFloor = true, opacity, wireframe = false, xray = false }: WallMeshProps) {
  const selectedWallId = useEditorStore((state: EditorState) => state.selectedWallId);
  const setSelectedWallId = useEditorStore((state: EditorState) => state.setSelectedWallId);
  const currentTool = useEditorStore((state: EditorState) => state.currentTool);

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
  const wallMaterialType = wall.material || 'paint';

  // Calculate effective opacity
  const effectiveOpacity = opacity ?? (isCurrentFloor ? 1.0 : 0.3);

  return (
    <mesh
      position={[centerX, wallHeight / 2, centerZ]}
      rotation={[0, angle, 0]}
      onClick={handleClick}
    >
      <boxGeometry args={[wallLength, wallHeight, wallThickness]} />
      <WallMaterial
        material={wallMaterialType}
        customColor={wallColor}
        wireframe={wireframe}
        transparent={effectiveOpacity < 1 || xray}
        opacity={effectiveOpacity}
        depthWrite={!xray}
        side={xray ? THREE.DoubleSide : THREE.FrontSide}
        isSelected={isSelected}
        wallWidth={wallLength}
        wallHeight={wallHeight}
      />
    </mesh>
  );
}
