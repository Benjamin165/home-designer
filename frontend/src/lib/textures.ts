/**
 * Texture Manager for Home Designer
 * 
 * Manages loading and caching of PBR textures for floors, walls, and ceilings.
 * Supports both bundled textures and CDN-loaded extras.
 */

import * as THREE from 'three';

// Texture types
export type FloorMaterial = 'hardwood' | 'tile' | 'carpet' | 'marble' | 'laminate' | 'concrete' | 'parquet' | 'stone';
export type WallMaterial = 'paint' | 'brick' | 'wood_panel' | 'tile' | 'concrete' | 'wallpaper' | 'stone' | 'marble';
export type CeilingMaterial = 'paint' | 'wood' | 'exposed_beams' | 'tile';

// Texture set for PBR materials
export interface TextureSet {
  diffuse?: THREE.Texture;
  normal?: THREE.Texture;
  roughness?: THREE.Texture;
  ao?: THREE.Texture;  // Ambient occlusion
  displacement?: THREE.Texture;
}

// Material properties
export interface MaterialProps {
  color: string;
  roughness: number;
  metalness: number;
  textureRepeat?: { x: number; y: number };
}

// Base URLs for textures
const BUNDLED_BASE = '/textures';
const CDN_BASE = 'https://cdn.polyhaven.com/asset_img/thumbs'; // Example CDN

// Default material properties (used when textures aren't loaded)
export const FLOOR_MATERIALS: Record<FloorMaterial, MaterialProps> = {
  hardwood: { color: '#8B4513', roughness: 0.4, metalness: 0, textureRepeat: { x: 4, y: 4 } },
  tile: { color: '#E8E8E8', roughness: 0.2, metalness: 0.1, textureRepeat: { x: 4, y: 4 } },
  carpet: { color: '#4a5568', roughness: 0.95, metalness: 0, textureRepeat: { x: 2, y: 2 } },
  marble: { color: '#F5F5F5', roughness: 0.1, metalness: 0.2, textureRepeat: { x: 2, y: 2 } },
  laminate: { color: '#D2691E', roughness: 0.3, metalness: 0, textureRepeat: { x: 4, y: 4 } },
  concrete: { color: '#808080', roughness: 0.9, metalness: 0, textureRepeat: { x: 3, y: 3 } },
  parquet: { color: '#a0522d', roughness: 0.35, metalness: 0, textureRepeat: { x: 6, y: 6 } },
  stone: { color: '#696969', roughness: 0.85, metalness: 0.1, textureRepeat: { x: 2, y: 2 } },
};

export const WALL_MATERIALS: Record<WallMaterial, MaterialProps> = {
  paint: { color: '#e5e7eb', roughness: 0.8, metalness: 0, textureRepeat: { x: 1, y: 1 } },
  brick: { color: '#8B4513', roughness: 0.9, metalness: 0.05, textureRepeat: { x: 4, y: 2 } },
  wood_panel: { color: '#A0522D', roughness: 0.6, metalness: 0, textureRepeat: { x: 2, y: 4 } },
  tile: { color: '#F5F5DC', roughness: 0.2, metalness: 0.1, textureRepeat: { x: 4, y: 4 } },
  concrete: { color: '#808080', roughness: 0.95, metalness: 0, textureRepeat: { x: 2, y: 2 } },
  wallpaper: { color: '#f0f0f0', roughness: 0.6, metalness: 0, textureRepeat: { x: 2, y: 2 } },
  stone: { color: '#696969', roughness: 0.85, metalness: 0.1, textureRepeat: { x: 2, y: 2 } },
  marble: { color: '#F8F8FF', roughness: 0.15, metalness: 0.2, textureRepeat: { x: 1, y: 1 } },
};

// Texture cache
const textureCache = new Map<string, THREE.Texture>();
const textureLoader = new THREE.TextureLoader();

// Track loading state
const loadingTextures = new Map<string, Promise<THREE.Texture>>();

/**
 * Load a texture with caching
 */
export async function loadTexture(path: string, repeat?: { x: number; y: number }): Promise<THREE.Texture> {
  // Check cache first
  if (textureCache.has(path)) {
    const cached = textureCache.get(path)!;
    if (repeat) {
      cached.repeat.set(repeat.x, repeat.y);
    }
    return cached;
  }

  // Check if already loading
  if (loadingTextures.has(path)) {
    const texture = await loadingTextures.get(path)!;
    if (repeat) {
      texture.repeat.set(repeat.x, repeat.y);
    }
    return texture;
  }

  // Start loading
  const loadPromise = new Promise<THREE.Texture>((resolve, reject) => {
    textureLoader.load(
      path,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        if (repeat) {
          texture.repeat.set(repeat.x, repeat.y);
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(path, texture);
        loadingTextures.delete(path);
        resolve(texture);
      },
      undefined,
      (error) => {
        console.warn(`Failed to load texture: ${path}`, error);
        loadingTextures.delete(path);
        reject(error);
      }
    );
  });

  loadingTextures.set(path, loadPromise);
  return loadPromise;
}

/**
 * Load a full PBR texture set
 */
export async function loadTextureSet(
  basePath: string,
  repeat?: { x: number; y: number }
): Promise<TextureSet> {
  const textureSet: TextureSet = {};

  // Try to load each texture type
  const textureTypes = [
    { key: 'diffuse', suffix: '_diffuse.jpg' },
    { key: 'normal', suffix: '_normal.jpg' },
    { key: 'roughness', suffix: '_roughness.jpg' },
    { key: 'ao', suffix: '_ao.jpg' },
  ];

  await Promise.allSettled(
    textureTypes.map(async ({ key, suffix }) => {
      try {
        const texture = await loadTexture(`${basePath}${suffix}`, repeat);
        if (key === 'normal') {
          texture.colorSpace = THREE.LinearSRGBColorSpace;
        }
        (textureSet as any)[key] = texture;
      } catch {
        // Texture not available, that's okay
      }
    })
  );

  return textureSet;
}

/**
 * Get floor material properties with optional textures
 */
export function getFloorMaterialProps(material: FloorMaterial): MaterialProps {
  return FLOOR_MATERIALS[material] || FLOOR_MATERIALS.hardwood;
}

/**
 * Get wall material properties
 */
export function getWallMaterialProps(material: WallMaterial): MaterialProps {
  return WALL_MATERIALS[material] || WALL_MATERIALS.paint;
}

/**
 * Create a Three.js material from properties
 */
export function createMaterial(
  props: MaterialProps,
  textureSet?: TextureSet,
  options?: {
    transparent?: boolean;
    opacity?: number;
    wireframe?: boolean;
    side?: THREE.Side;
    depthWrite?: boolean;
  }
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: props.color,
    roughness: props.roughness,
    metalness: props.metalness,
    transparent: options?.transparent ?? false,
    opacity: options?.opacity ?? 1,
    wireframe: options?.wireframe ?? false,
    side: options?.side ?? THREE.FrontSide,
    depthWrite: options?.depthWrite ?? true,
  });

  if (textureSet) {
    if (textureSet.diffuse) material.map = textureSet.diffuse;
    if (textureSet.normal) material.normalMap = textureSet.normal;
    if (textureSet.roughness) material.roughnessMap = textureSet.roughness;
    if (textureSet.ao) material.aoMap = textureSet.ao;
  }

  return material;
}

/**
 * Generate a procedural texture (for simple patterns)
 */
export function createProceduralTexture(
  type: 'checker' | 'stripes' | 'dots',
  colors: [string, string],
  size: number = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  switch (type) {
    case 'checker': {
      const tileSize = size / 8;
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? colors[0] : colors[1];
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
      break;
    }
    case 'stripes': {
      const stripeWidth = size / 16;
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = i % 2 === 0 ? colors[0] : colors[1];
        ctx.fillRect(i * stripeWidth, 0, stripeWidth, size);
      }
      break;
    }
    case 'dots': {
      ctx.fillStyle = colors[0];
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = colors[1];
      const dotSize = size / 16;
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          ctx.beginPath();
          ctx.arc(
            (x + 0.5) * (size / 8),
            (y + 0.5) * (size / 8),
            dotSize,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Preload common textures
 */
export async function preloadTextures(): Promise<void> {
  const commonTextures = [
    `${BUNDLED_BASE}/floor/hardwood`,
    `${BUNDLED_BASE}/floor/tile`,
    `${BUNDLED_BASE}/wall/brick`,
  ];

  await Promise.allSettled(
    commonTextures.map((basePath) => loadTextureSet(basePath))
  );
}

// Dispose of all cached textures (call on unmount)
export function disposeTextures(): void {
  textureCache.forEach((texture) => texture.dispose());
  textureCache.clear();
}
