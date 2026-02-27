/**
 * React hooks for texture loading in Three.js components
 */

import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import {
  FloorMaterial,
  WallMaterial,
  TextureSet,
  FLOOR_MATERIALS,
  WALL_MATERIALS,
  loadTextureSet,
} from '../lib/textures';

/**
 * Hook to load a floor material with textures
 */
export function useFloorMaterial(
  material: FloorMaterial,
  customColor?: string,
  roomWidth: number = 4,
  roomDepth: number = 4
) {
  const [textureSet, setTextureSet] = useState<TextureSet>({});
  const props = FLOOR_MATERIALS[material] || FLOOR_MATERIALS.hardwood;

  // Calculate texture repeat based on room size
  const repeat = useMemo(() => ({
    x: (props.textureRepeat?.x || 4) * (roomWidth / 4),
    y: (props.textureRepeat?.y || 4) * (roomDepth / 4),
  }), [props.textureRepeat, roomWidth, roomDepth]);

  useEffect(() => {
    const loadTextures = async () => {
      try {
        const basePath = `/textures/floor/${material}`;
        const textures = await loadTextureSet(basePath, repeat);
        setTextureSet(textures);
      } catch {
        // Textures not available, use fallback colors
        setTextureSet({});
      }
    };
    loadTextures();
  }, [material, repeat.x, repeat.y]);

  // Return material props with textures
  return {
    color: customColor || props.color,
    roughness: props.roughness,
    metalness: props.metalness,
    map: textureSet.diffuse,
    normalMap: textureSet.normal,
    roughnessMap: textureSet.roughness,
    aoMap: textureSet.ao,
  };
}

/**
 * Hook to load a wall material with textures
 */
export function useWallMaterial(
  material: WallMaterial,
  customColor?: string,
  wallWidth: number = 4,
  wallHeight: number = 2.8
) {
  const [textureSet, setTextureSet] = useState<TextureSet>({});
  const props = WALL_MATERIALS[material] || WALL_MATERIALS.paint;

  // Calculate texture repeat based on wall size
  const repeat = useMemo(() => ({
    x: (props.textureRepeat?.x || 1) * (wallWidth / 4),
    y: (props.textureRepeat?.y || 1) * (wallHeight / 2.8),
  }), [props.textureRepeat, wallWidth, wallHeight]);

  useEffect(() => {
    const loadTextures = async () => {
      try {
        const basePath = `/textures/wall/${material}`;
        const textures = await loadTextureSet(basePath, repeat);
        setTextureSet(textures);
      } catch {
        // Textures not available, use fallback colors
        setTextureSet({});
      }
    };
    loadTextures();
  }, [material, repeat.x, repeat.y]);

  return {
    color: customColor || props.color,
    roughness: props.roughness,
    metalness: props.metalness,
    map: textureSet.diffuse,
    normalMap: textureSet.normal,
    roughnessMap: textureSet.roughness,
    aoMap: textureSet.ao,
  };
}

/**
 * Simple procedural texture generator for immediate use
 */
export function useProceduralTexture(
  type: 'hardwood' | 'tile' | 'carpet' | 'brick' | 'concrete',
  repeatX: number = 4,
  repeatY: number = 4
) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    switch (type) {
      case 'hardwood': {
        // Wood grain pattern
        const gradient = ctx.createLinearGradient(0, 0, 0, size);
        gradient.addColorStop(0, '#8B5A2B');
        gradient.addColorStop(0.3, '#A0522D');
        gradient.addColorStop(0.5, '#8B4513');
        gradient.addColorStop(0.7, '#A0522D');
        gradient.addColorStop(1, '#8B5A2B');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // Add grain lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 50; i++) {
          const y = Math.random() * size;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(size, y + (Math.random() - 0.5) * 20);
          ctx.stroke();
        }
        break;
      }
      case 'tile': {
        // Checkerboard tile
        const tileSize = size / 4;
        ctx.fillStyle = '#E8E8E8';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#D0D0D0';
        for (let x = 0; x < 4; x++) {
          for (let y = 0; y < 4; y++) {
            if ((x + y) % 2 === 0) {
              ctx.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
            }
          }
        }
        // Grout lines
        ctx.strokeStyle = '#AAAAAA';
        ctx.lineWidth = 4;
        for (let i = 0; i <= 4; i++) {
          ctx.beginPath();
          ctx.moveTo(i * tileSize, 0);
          ctx.lineTo(i * tileSize, size);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i * tileSize);
          ctx.lineTo(size, i * tileSize);
          ctx.stroke();
        }
        break;
      }
      case 'carpet': {
        // Carpet texture with noise
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(0, 0, size, size);
        for (let x = 0; x < size; x += 4) {
          for (let y = 0; y < size; y += 4) {
            const brightness = 0.9 + Math.random() * 0.2;
            ctx.fillStyle = `rgba(74, 85, 104, ${brightness})`;
            ctx.fillRect(x, y, 4, 4);
          }
        }
        break;
      }
      case 'brick': {
        const brickWidth = size / 4;
        const brickHeight = size / 8;
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, size, size);
        
        for (let row = 0; row < 8; row++) {
          const offset = row % 2 === 0 ? 0 : brickWidth / 2;
          for (let col = -1; col < 5; col++) {
            // Brick with slight color variation
            const variation = Math.random() * 30 - 15;
            ctx.fillStyle = `rgb(${139 + variation}, ${69 + variation / 2}, ${19 + variation / 3})`;
            ctx.fillRect(
              col * brickWidth + offset + 2,
              row * brickHeight + 2,
              brickWidth - 4,
              brickHeight - 4
            );
          }
        }
        // Mortar (already base color)
        break;
      }
      case 'concrete': {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, size, size);
        // Add noise
        for (let x = 0; x < size; x += 2) {
          for (let y = 0; y < size; y += 2) {
            const gray = 100 + Math.random() * 56;
            ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
            ctx.fillRect(x, y, 2, 2);
          }
        }
        break;
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [type, repeatX, repeatY]);

  return texture;
}
