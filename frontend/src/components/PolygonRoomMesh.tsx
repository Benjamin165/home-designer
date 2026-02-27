/**
 * PolygonRoomMesh Component
 * 
 * Renders a polygon-shaped room using THREE.Shape and ExtrudeGeometry.
 * Supports non-rectangular room shapes with any number of vertices.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useProceduralTexture } from '../hooks/useTexture';

interface Vertex {
  x: number;
  y: number;
}

interface PolygonRoomMeshProps {
  vertices: Vertex[];
  height: number;
  floorMaterial?: string;
  floorColor?: string;
  ceilingColor?: string;
  wireframe?: boolean;
  opacity?: number;
  isXray?: boolean;
  showFloor?: boolean;
  showCeiling?: boolean;
}

export function PolygonFloor({
  vertices,
  material = 'hardwood',
  customColor,
  wireframe = false,
  opacity = 1,
  isXray = false,
}: {
  vertices: Vertex[];
  material?: string;
  customColor?: string;
  wireframe?: boolean;
  opacity?: number;
  isXray?: boolean;
}) {
  // Calculate approximate dimensions for texture scaling
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  vertices.forEach(v => {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  });
  const width = maxX - minX;
  const depth = maxY - minY;

  // Get procedural texture
  const textureType = material === 'carpet' ? 'carpet' :
                     material === 'tile' || material === 'marble' ? 'tile' :
                     material === 'concrete' || material === 'stone' ? 'concrete' : 'hardwood';
  const repeatX = Math.max(1, Math.round(width));
  const repeatY = Math.max(1, Math.round(depth));
  const texture = useProceduralTexture(textureType, repeatX, repeatY);

  // Create shape from vertices
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (vertices.length < 3) return s;
    
    s.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      s.lineTo(vertices[i].x, vertices[i].y);
    }
    s.closePath();
    return s;
  }, [vertices]);

  // Material properties
  const materialProps: Record<string, { color: string; roughness: number; metalness: number }> = {
    hardwood: { color: '#ffffff', roughness: 0.4, metalness: 0 },
    tile: { color: '#ffffff', roughness: 0.2, metalness: 0.1 },
    carpet: { color: '#ffffff', roughness: 0.95, metalness: 0 },
    marble: { color: '#F5F5F5', roughness: 0.1, metalness: 0.2 },
    concrete: { color: '#ffffff', roughness: 0.9, metalness: 0 },
    stone: { color: '#ffffff', roughness: 0.85, metalness: 0.1 },
  };

  const props = materialProps[material] || materialProps.hardwood;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        map={wireframe ? undefined : texture}
        color={customColor || props.color}
        roughness={props.roughness}
        metalness={props.metalness}
        wireframe={wireframe}
        transparent={opacity < 1 || isXray}
        opacity={opacity}
        depthWrite={!isXray}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function PolygonCeiling({
  vertices,
  height,
  color = '#f3f4f6',
  wireframe = false,
  opacity = 1,
  isXray = false,
}: {
  vertices: Vertex[];
  height: number;
  color?: string;
  wireframe?: boolean;
  opacity?: number;
  isXray?: boolean;
}) {
  // Create shape from vertices
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (vertices.length < 3) return s;
    
    s.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      s.lineTo(vertices[i].x, vertices[i].y);
    }
    s.closePath();
    return s;
  }, [vertices]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        metalness={0}
        wireframe={wireframe}
        transparent={opacity < 1 || isXray}
        opacity={opacity}
        depthWrite={!isXray}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function PolygonWalls({
  vertices,
  height,
  color = '#e5e7eb',
  wireframe = false,
  opacity = 1,
  isXray = false,
  wallThickness = 0.15,
}: {
  vertices: Vertex[];
  height: number;
  color?: string;
  wireframe?: boolean;
  opacity?: number;
  isXray?: boolean;
  wallThickness?: number;
}) {
  // Create wall segments from vertices
  const wallSegments = useMemo(() => {
    const segments: Array<{
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      length: number;
      angle: number;
      centerX: number;
      centerZ: number;
    }> = [];

    for (let i = 0; i < vertices.length; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % vertices.length];
      
      const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      
      segments.push({
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        length,
        angle,
        centerX: (start.x + end.x) / 2,
        centerZ: (start.y + end.y) / 2,
      });
    }

    return segments;
  }, [vertices]);

  return (
    <group>
      {wallSegments.map((wall, i) => (
        <mesh
          key={i}
          position={[wall.centerX, height / 2, wall.centerZ]}
          rotation={[0, wall.angle, 0]}
        >
          <boxGeometry args={[wall.length, height, wallThickness]} />
          <meshStandardMaterial
            color={color}
            roughness={0.8}
            metalness={0}
            wireframe={wireframe}
            transparent={opacity < 1 || isXray}
            opacity={opacity}
            depthWrite={!isXray}
            side={isXray ? THREE.DoubleSide : THREE.FrontSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Complete polygon room with floor, ceiling, and walls
 */
export function PolygonRoomMesh({
  vertices,
  height,
  floorMaterial = 'hardwood',
  floorColor,
  ceilingColor = '#f3f4f6',
  wireframe = false,
  opacity = 1,
  isXray = false,
  showFloor = true,
  showCeiling = true,
}: PolygonRoomMeshProps) {
  if (!vertices || vertices.length < 3) return null;

  return (
    <group>
      {showFloor && (
        <PolygonFloor
          vertices={vertices}
          material={floorMaterial}
          customColor={floorColor}
          wireframe={wireframe}
          opacity={opacity}
          isXray={isXray}
        />
      )}
      {showCeiling && (
        <PolygonCeiling
          vertices={vertices}
          height={height}
          color={ceilingColor}
          wireframe={wireframe}
          opacity={opacity}
          isXray={isXray}
        />
      )}
      <PolygonWalls
        vertices={vertices}
        height={height}
        wireframe={wireframe}
        opacity={opacity}
        isXray={isXray}
      />
    </group>
  );
}

export default PolygonRoomMesh;
