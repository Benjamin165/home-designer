import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore } from '../store/editorStore';

interface FirstPersonControlsProps {
  enabled: boolean;
  onExit: () => void;
  rooms: any[];
  playerHeight?: number;
  moveSpeed?: number;
  lookSpeed?: number;
}

export function FirstPersonControls({
  enabled,
  onExit,
  rooms,
  playerHeight = 1.7,
  moveSpeed = 5,
  lookSpeed = 0.002,
}: FirstPersonControlsProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  
  // Movement state
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  
  // Set camera position when entering first-person mode
  useEffect(() => {
    if (enabled) {
      // Position camera at player height in the center of the first room
      if (rooms.length > 0) {
        const room = rooms[0];
        camera.position.set(
          room.position_x || 0,
          playerHeight,
          room.position_z || 0
        );
      } else {
        camera.position.set(0, playerHeight, 0);
      }
      camera.rotation.set(0, 0, 0);
    }
  }, [enabled, rooms, camera, playerHeight]);
  
  // Keyboard controls
  useEffect(() => {
    if (!enabled) return;
    
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveForward.current = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          moveBackward.current = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          moveLeft.current = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          moveRight.current = true;
          break;
        case 'Escape':
          onExit();
          break;
      }
    };
    
    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveForward.current = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          moveBackward.current = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          moveLeft.current = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          moveRight.current = false;
          break;
      }
    };
    
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [enabled, onExit]);
  
  // Collision detection
  const checkCollision = (newPosition: THREE.Vector3): boolean => {
    const playerRadius = 0.3;
    
    for (const room of rooms) {
      const roomX = room.position_x || 0;
      const roomZ = room.position_z || 0;
      const width = room.dimensions_json?.width || 4;
      const depth = room.dimensions_json?.depth || 4;
      
      // Wall boundaries
      const minX = roomX - width / 2 + playerRadius;
      const maxX = roomX + width / 2 - playerRadius;
      const minZ = roomZ - depth / 2 + playerRadius;
      const maxZ = roomZ + depth / 2 - playerRadius;
      
      // Check if player is inside this room
      if (newPosition.x >= minX && newPosition.x <= maxX &&
          newPosition.z >= minZ && newPosition.z <= maxZ) {
        return false; // No collision, player is inside room
      }
    }
    
    // Check if colliding with any wall
    for (const room of rooms) {
      const roomX = room.position_x || 0;
      const roomZ = room.position_z || 0;
      const width = room.dimensions_json?.width || 4;
      const depth = room.dimensions_json?.depth || 4;
      
      // Simple AABB collision with walls
      const wallThickness = 0.15;
      
      // Check collision with walls
      // This is simplified - a full implementation would check each wall segment
    }
    
    return false; // Allow movement for now (simplified)
  };
  
  // Movement loop
  useFrame((_, delta) => {
    if (!enabled || !isLocked) return;
    
    velocity.current.x -= velocity.current.x * 10.0 * delta;
    velocity.current.z -= velocity.current.z * 10.0 * delta;
    
    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
    direction.current.normalize();
    
    if (moveForward.current || moveBackward.current) {
      velocity.current.z -= direction.current.z * moveSpeed * delta;
    }
    if (moveLeft.current || moveRight.current) {
      velocity.current.x -= direction.current.x * moveSpeed * delta;
    }
    
    // Get camera direction
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    // Calculate right vector
    const right = new THREE.Vector3();
    right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
    
    // Calculate new position
    const newPosition = camera.position.clone();
    newPosition.addScaledVector(cameraDirection, -velocity.current.z);
    newPosition.addScaledVector(right, -velocity.current.x);
    
    // Apply movement (with optional collision detection)
    if (!checkCollision(newPosition)) {
      camera.position.copy(newPosition);
    }
    
    // Keep camera at player height
    camera.position.y = playerHeight;
  });
  
  if (!enabled) return null;
  
  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => setIsLocked(true)}
      onUnlock={() => {
        setIsLocked(false);
        onExit();
      }}
    />
  );
}

// First Person Mode UI Overlay
export function FirstPersonOverlay({ onExit }: { onExit: () => void }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-4 h-0.5 bg-white/50 absolute left-1/2 -translate-x-1/2" />
        <div className="h-4 w-0.5 bg-white/50 absolute top-1/2 -translate-y-1/2" />
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-3 rounded-lg text-sm pointer-events-auto">
        <p className="font-semibold mb-2">First Person Mode</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-300">
          <span>WASD / Arrows</span>
          <span>Move</span>
          <span>Mouse</span>
          <span>Look around</span>
          <span>ESC</span>
          <span>Exit</span>
        </div>
        <button
          onClick={onExit}
          className="mt-3 w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
        >
          Exit First Person
        </button>
      </div>
    </div>
  );
}

export default FirstPersonControls;
