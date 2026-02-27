import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useEditorStore } from '../store/editorStore';
import { lightsApi } from '../lib/api';
import { toast } from 'sonner';

interface LightData {
  id: number;
  room_id: number;
  type: 'point' | 'spot' | 'area';
  name: string | null;
  position_x: number;
  position_y: number;
  position_z: number;
  intensity: number;
  color: string;
  cone_angle: number | null;
  distance: number;
  decay: number;
  cast_shadow: boolean;
  color_temperature: number;
  target_x: number | null;
  target_y: number | null;
  target_z: number | null;
  width: number | null;
  height: number | null;
  penumbra: number;
}

interface LightMeshProps {
  light: LightData;
  roomPosition: { x: number; z: number };
}

// Helper to convert color temperature to RGB
function kelvinToRGB(kelvin: number): string {
  // Clamp kelvin to reasonable range
  kelvin = Math.max(1000, Math.min(12000, kelvin));
  
  let r, g, b;
  
  // Red
  if (kelvin <= 6600) {
    r = 255;
  } else {
    r = kelvin / 100 - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }
  
  // Green
  if (kelvin <= 6600) {
    g = kelvin / 100;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
  } else {
    g = kelvin / 100 - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
  }
  g = Math.max(0, Math.min(255, g));
  
  // Blue
  if (kelvin >= 6600) {
    b = 255;
  } else if (kelvin <= 1900) {
    b = 0;
  } else {
    b = kelvin / 100 - 10;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
    b = Math.max(0, Math.min(255, b));
  }
  
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export function LightMesh({ light, roomPosition }: LightMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight | THREE.SpotLight>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; z: number } | null>(null);
  
  const selectedLightId = useEditorStore((state) => state.selectedLightId);
  const setSelectedLightId = useEditorStore((state) => state.setSelectedLightId);
  const updateLight = useEditorStore((state) => state.updateLight);
  const currentTool = useEditorStore((state) => state.currentTool);
  const lightingMode = useEditorStore((state) => state.lightingMode);
  
  const isSelected = selectedLightId === light.id;
  
  // Calculate absolute position
  const posX = roomPosition.x + light.position_x;
  const posY = light.position_y;
  const posZ = roomPosition.z + light.position_z;
  
  // Calculate light color - use color temperature if color is white
  const lightColor = light.color === '#ffffff' 
    ? kelvinToRGB(light.color_temperature)
    : light.color;
  
  // Intensity multiplier based on day/night mode
  const effectiveIntensity = lightingMode === 'night' 
    ? light.intensity * 1.5 
    : light.intensity * 0.3;
  
  const handleClick = (e: any) => {
    if (currentTool === 'select') {
      e.stopPropagation();
      setSelectedLightId(light.id);
    }
  };
  
  const handlePointerDown = (e: any) => {
    if (currentTool === 'select' && isSelected) {
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({ x: e.point.x, y: e.point.y, z: e.point.z });
    }
  };
  
  const handlePointerMove = (e: any) => {
    if (isDragging && dragStart) {
      const newX = light.position_x + (e.point.x - dragStart.x);
      const newZ = light.position_z + (e.point.z - dragStart.z);
      
      // Update visual position immediately
      if (meshRef.current) {
        meshRef.current.position.x = roomPosition.x + newX;
        meshRef.current.position.z = roomPosition.z + newZ;
      }
      if (lightRef.current) {
        lightRef.current.position.x = roomPosition.x + newX;
        lightRef.current.position.z = roomPosition.z + newZ;
      }
    }
  };
  
  const handlePointerUp = async () => {
    if (isDragging && meshRef.current) {
      const newX = meshRef.current.position.x - roomPosition.x;
      const newZ = meshRef.current.position.z - roomPosition.z;
      
      try {
        await lightsApi.update(light.id, {
          position_x: newX,
          position_z: newZ,
        });
        updateLight(light.id, { position_x: newX, position_z: newZ });
        toast.success('Light moved');
      } catch (error) {
        console.error('Error moving light:', error);
        toast.error('Failed to move light');
      }
    }
    setIsDragging(false);
    setDragStart(null);
  };
  
  // Light bulb visual representation
  const bulbSize = light.type === 'area' ? 0.15 : 0.1;
  const glowColor = new THREE.Color(lightColor);
  
  return (
    <group position={[posX, posY, posZ]}>
      {/* Light bulb visual */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {light.type === 'area' ? (
          <boxGeometry args={[light.width || 0.5, 0.05, light.height || 0.5]} />
        ) : (
          <sphereGeometry args={[bulbSize, 16, 16]} />
        )}
        <meshStandardMaterial
          color={isSelected ? '#3b82f6' : lightColor}
          emissive={glowColor}
          emissiveIntensity={lightingMode === 'night' ? 2 : 0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Actual Three.js light */}
      {light.type === 'point' && (
        <pointLight
          ref={lightRef as any}
          color={lightColor}
          intensity={effectiveIntensity}
          distance={light.distance}
          decay={light.decay}
          castShadow={light.cast_shadow}
        />
      )}
      
      {light.type === 'spot' && (
        <>
          <spotLight
            ref={lightRef as any}
            color={lightColor}
            intensity={effectiveIntensity}
            distance={light.distance}
            angle={(light.cone_angle || 45) * Math.PI / 180}
            penumbra={light.penumbra}
            decay={light.decay}
            castShadow={light.cast_shadow}
            target-position={[
              light.target_x ?? posX,
              light.target_y ?? 0,
              light.target_z ?? posZ,
            ]}
          />
          {/* Spotlight cone visualization when selected */}
          {isSelected && (
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -light.distance / 2, 0]}>
              <coneGeometry args={[
                Math.tan((light.cone_angle || 45) * Math.PI / 180) * light.distance,
                light.distance,
                16,
                1,
                true
              ]} />
              <meshBasicMaterial 
                color="#3b82f6" 
                transparent 
                opacity={0.1} 
                wireframe 
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </>
      )}
      
      {/* Area light glow effect */}
      {light.type === 'area' && (
        <rectAreaLight
          color={lightColor}
          intensity={effectiveIntensity * 5}
          width={light.width || 0.5}
          height={light.height || 0.5}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}
      
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

export default LightMesh;
