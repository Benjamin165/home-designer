/**
 * Room Material Components
 * 
 * Separate components for floor, ceiling, and wall materials
 * that can use hooks for texture loading.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useProceduralTexture } from '../hooks/useTexture';

// Floor material props
interface FloorMaterialProps {
  material: string;
  customColor?: string;
  wireframe?: boolean;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  roomWidth: number;
  roomDepth: number;
}

// Get floor material type for procedural texture
function getFloorTextureType(material: string): 'hardwood' | 'tile' | 'carpet' | 'concrete' {
  switch (material) {
    case 'hardwood':
    case 'laminate':
    case 'parquet':
      return 'hardwood';
    case 'tile':
    case 'marble':
      return 'tile';
    case 'carpet':
      return 'carpet';
    case 'concrete':
    case 'stone':
      return 'concrete';
    default:
      return 'hardwood';
  }
}

// Floor material properties
const FLOOR_PROPS: Record<string, { color: string; roughness: number; metalness: number }> = {
  hardwood: { color: '#ffffff', roughness: 0.4, metalness: 0 },
  tile: { color: '#ffffff', roughness: 0.2, metalness: 0.1 },
  carpet: { color: '#ffffff', roughness: 0.95, metalness: 0 },
  marble: { color: '#F5F5F5', roughness: 0.1, metalness: 0.2 },
  laminate: { color: '#ffffff', roughness: 0.3, metalness: 0 },
  concrete: { color: '#ffffff', roughness: 0.9, metalness: 0 },
  parquet: { color: '#ffffff', roughness: 0.35, metalness: 0 },
  stone: { color: '#ffffff', roughness: 0.85, metalness: 0.1 },
};

export function FloorMaterial({
  material,
  customColor,
  wireframe = false,
  transparent = false,
  opacity = 1,
  depthWrite = true,
  roomWidth,
  roomDepth,
}: FloorMaterialProps) {
  const textureType = getFloorTextureType(material);
  
  // Scale texture repeat based on room size
  const repeatX = Math.max(1, Math.round(roomWidth));
  const repeatY = Math.max(1, Math.round(roomDepth));
  
  const texture = useProceduralTexture(textureType, repeatX, repeatY);
  const props = FLOOR_PROPS[material] || FLOOR_PROPS.hardwood;

  return (
    <meshStandardMaterial
      map={wireframe ? undefined : texture}
      color={customColor || props.color}
      roughness={props.roughness}
      metalness={props.metalness}
      wireframe={wireframe}
      transparent={transparent}
      opacity={opacity}
      depthWrite={depthWrite}
    />
  );
}

// Wall material props
interface WallMaterialProps {
  material: string;
  customColor?: string;
  wireframe?: boolean;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  side?: THREE.Side;
  isSelected?: boolean;
  wallWidth: number;
  wallHeight: number;
}

// Wall material properties
const WALL_PROPS: Record<string, { color: string; roughness: number; metalness: number }> = {
  paint: { color: '#e5e7eb', roughness: 0.8, metalness: 0 },
  brick: { color: '#ffffff', roughness: 0.9, metalness: 0.05 },
  wood_panel: { color: '#A0522D', roughness: 0.6, metalness: 0 },
  tile: { color: '#F5F5DC', roughness: 0.2, metalness: 0.1 },
  concrete: { color: '#ffffff', roughness: 0.95, metalness: 0 },
  wallpaper: { color: '#f0f0f0', roughness: 0.6, metalness: 0 },
  stone: { color: '#696969', roughness: 0.85, metalness: 0.1 },
  marble: { color: '#F8F8FF', roughness: 0.15, metalness: 0.2 },
};

function getWallTextureType(material: string): 'brick' | 'concrete' | 'hardwood' | 'tile' {
  switch (material) {
    case 'brick':
      return 'brick';
    case 'concrete':
    case 'stone':
      return 'concrete';
    case 'wood_panel':
      return 'hardwood';
    case 'tile':
    case 'marble':
      return 'tile';
    default:
      return 'concrete';
  }
}

export function WallMaterial({
  material,
  customColor,
  wireframe = false,
  transparent = false,
  opacity = 1,
  depthWrite = true,
  side = THREE.FrontSide,
  isSelected = false,
  wallWidth,
  wallHeight,
}: WallMaterialProps) {
  const props = WALL_PROPS[material] || WALL_PROPS.paint;
  
  // For paint, don't use texture
  const usesTexture = material !== 'paint' && material !== 'wallpaper';
  const textureType = getWallTextureType(material);
  const repeatX = Math.max(1, Math.round(wallWidth * 2));
  const repeatY = Math.max(1, Math.round(wallHeight));
  
  const texture = useProceduralTexture(textureType, repeatX, repeatY);

  return (
    <meshStandardMaterial
      map={wireframe || !usesTexture ? undefined : texture}
      color={customColor || props.color}
      roughness={props.roughness}
      metalness={props.metalness}
      wireframe={wireframe}
      transparent={transparent}
      opacity={opacity}
      depthWrite={depthWrite}
      side={side}
      emissive={isSelected ? '#3b82f6' : '#000000'}
      emissiveIntensity={isSelected ? 0.3 : 0}
    />
  );
}

// Ceiling material props (simple, no texture usually)
interface CeilingMaterialProps {
  color?: string;
  wireframe?: boolean;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
}

export function CeilingMaterial({
  color = '#f3f4f6',
  wireframe = false,
  transparent = false,
  opacity = 1,
  depthWrite = true,
}: CeilingMaterialProps) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.9}
      metalness={0}
      wireframe={wireframe}
      transparent={transparent}
      opacity={opacity}
      depthWrite={depthWrite}
      side={THREE.DoubleSide}
    />
  );
}
