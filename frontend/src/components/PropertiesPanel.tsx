import { useEditorStore } from '../store/editorStore';
import { X, ChevronRight, ChevronLeft, Trash2, RotateCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { roomsApi, furnitureApi, wallsApi, lightsApi, roomOperationsApi } from '../lib/api';
import { toast } from 'sonner';
import DeleteRoomDialog from './DeleteRoomDialog';
import { formatLength, formatArea } from '../lib/units';

interface PropertiesPanelProps {
  projectName: string;
}

function PropertiesPanel({ projectName }: PropertiesPanelProps) {
  const { selectedRoomId, setSelectedRoomId, selectedWallId, setSelectedWallId, selectedFurnitureId, setSelectedFurnitureId, selectedFurnitureIds, rooms, floors, currentFloorId, furniturePlacements, setRooms, setFurniturePlacements, updateFurniturePlacement, updateRoom, unitSystem, selectedLightId, setSelectedLightId, lights, updateLight, removeLight } = useEditorStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ceilingHeight, setCeilingHeight] = useState<string>('');
  const [ceilingHeightError, setCeilingHeightError] = useState<string>('');
  const [selectedWall, setSelectedWall] = useState<any>(null);
  const [wallColor, setWallColor] = useState<string>('#e5e7eb');
  const [wallMaterial, setWallMaterial] = useState<string>('paint');
  const [roomName, setRoomName] = useState<string>('');
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [furnitureRotation, setFurnitureRotation] = useState<string>('0');
  const [furnitureScale, setFurnitureScale] = useState<string>('1.0');
  const [lightIntensity, setLightIntensity] = useState<string>('2.0');
  const [lightColor, setLightColor] = useState<string>('#fff8e1');

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const selectedLight = lights.find((l) => l.id === selectedLightId);
  const currentFloor = floors.find((f) => f.id === currentFloorId);
  const selectedFurniture = furniturePlacements.find((f) => f.id === selectedFurnitureId);

  // Get furniture in the selected room
  const roomFurniture = furniturePlacements.filter((f) => f.room_id === selectedRoomId);

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenWidth = () => {
      const isNarrow = window.innerWidth < 768; // md breakpoint
      setIsNarrowScreen(isNarrow);
      // Auto-collapse when resizing to narrow screens
      if (isNarrow) {
        setIsCollapsed(true);
      }
    };

    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  // Initialize ceiling height and room name when room selection changes
  useEffect(() => {
    if (selectedRoom) {
      setCeilingHeight(selectedRoom.ceiling_height.toString());
      setCeilingHeightError('');
      setRoomName(selectedRoom.name || '');
    }
  }, [selectedRoom?.id]);

  // Fetch wall data when a wall is selected
  useEffect(() => {
    const fetchWall = async () => {
      if (selectedWallId && selectedRoomId) {
        try {
          const response = await wallsApi.getByRoomId(selectedRoomId);
          const wall = response.walls.find((w: any) => w.id === selectedWallId);
          if (wall) {
            setSelectedWall(wall);
            setWallColor(wall.color || '#e5e7eb');
            setWallMaterial(wall.material || 'paint');
          }
        } catch (error) {
          console.error('Error fetching wall:', error);
        }
      } else {
        setSelectedWall(null);
      }
    };
    fetchWall();
  }, [selectedWallId, selectedRoomId]);

  // Initialize furniture rotation when furniture selection changes
  useEffect(() => {
    if (selectedFurniture) {
      // Convert radians to degrees for display
      const degrees = ((selectedFurniture.rotation_y || 0) * 180 / Math.PI);
      setFurnitureRotation(degrees.toFixed(1));

      // Initialize scale (uniform scale - we use scale_x as the primary value)
      const scale = selectedFurniture.scale_x || 1.0;
      setFurnitureScale(scale.toFixed(2));

      // Initialize light properties
      setLightIntensity(String(selectedFurniture.light_intensity || 2.0));
      setLightColor(selectedFurniture.light_color || '#fff8e1');
    }
  }, [selectedFurniture?.id]);

  // Handle furniture rotation change
  const handleFurnitureRotationChange = (degrees: string) => {
    setFurnitureRotation(degrees);
  };

  // Handle furniture rotation save
  const handleFurnitureRotationSave = async () => {
    if (!selectedFurniture) return;

    const degrees = parseFloat(furnitureRotation);
    if (isNaN(degrees)) {
      toast.error('Please enter a valid rotation angle');
      return;
    }

    // Convert degrees to radians
    const radians = degrees * Math.PI / 180;

    try {
      await furnitureApi.update(selectedFurniture.id, {
        rotation_y: radians,
      });

      // Update local state
      updateFurniturePlacement(selectedFurniture.id, {
        rotation_y: radians,
      });

      toast.success('Furniture rotated', {
        description: `Rotated to ${degrees}°`
      });
    } catch (error) {
      console.error('Error updating furniture rotation:', error);
      toast.error('Failed to rotate furniture');
    }
  };

  // Quick rotate furniture by specified degrees
  const handleQuickRotate = async (deltaDegrees: number) => {
    if (!selectedFurniture) return;

    const currentDegrees = parseFloat(furnitureRotation);
    const newDegrees = (currentDegrees + deltaDegrees) % 360;
    const radians = newDegrees * Math.PI / 180;

    try {
      await furnitureApi.update(selectedFurniture.id, {
        rotation_y: radians,
      });

      // Update local state
      updateFurniturePlacement(selectedFurniture.id, {
        rotation_y: radians,
      });

      setFurnitureRotation(newDegrees.toFixed(1));

      toast.success(`Rotated ${deltaDegrees > 0 ? '+' : ''}${deltaDegrees}°`);
    } catch (error) {
      console.error('Error rotating furniture:', error);
      toast.error('Failed to rotate furniture');
    }
  };

  // Handle furniture scale change
  const handleFurnitureScaleChange = (scale: string) => {
    setFurnitureScale(scale);
  };

  // Handle furniture scale save
  const handleFurnitureScaleSave = async () => {
    if (!selectedFurniture) return;

    const scaleValue = parseFloat(furnitureScale);
    if (isNaN(scaleValue)) {
      toast.error('Please enter a valid scale value');
      return;
    }

    if (scaleValue <= 0) {
      toast.error('Scale must be greater than 0');
      return;
    }

    if (scaleValue > 10) {
      toast.error('Scale cannot exceed 10x');
      return;
    }

    try {
      // Apply uniform scale to all axes
      await furnitureApi.update(selectedFurniture.id, {
        scale_x: scaleValue,
        scale_y: scaleValue,
        scale_z: scaleValue,
      });

      // Update local state
      updateFurniturePlacement(selectedFurniture.id, {
        scale_x: scaleValue,
        scale_y: scaleValue,
        scale_z: scaleValue,
      });

      toast.success('Furniture scaled', {
        description: `Scaled to ${scaleValue}x`
      });
    } catch (error) {
      console.error('Error updating furniture scale:', error);
      toast.error('Failed to scale furniture');
    }
  };

  // Quick scale furniture by preset values
  const handleQuickScale = async (scaleValue: number) => {
    if (!selectedFurniture) return;

    try {
      await furnitureApi.update(selectedFurniture.id, {
        scale_x: scaleValue,
        scale_y: scaleValue,
        scale_z: scaleValue,
      });

      // Update local state
      updateFurniturePlacement(selectedFurniture.id, {
        scale_x: scaleValue,
        scale_y: scaleValue,
        scale_z: scaleValue,
      });

      setFurnitureScale(scaleValue.toFixed(2));

      toast.success(`Scaled to ${scaleValue}x`);
    } catch (error) {
      console.error('Error scaling furniture:', error);
      toast.error('Failed to scale furniture');
    }
  };

  // Handle light intensity change
  const handleLightIntensityChange = (value: string) => {
    setLightIntensity(value);
  };

  // Handle light intensity save
  const handleLightIntensitySave = async () => {
    if (!selectedFurniture) return;

    const intensityValue = parseFloat(lightIntensity);
    if (isNaN(intensityValue)) {
      toast.error('Please enter a valid intensity value');
      return;
    }

    if (intensityValue < 0) {
      toast.error('Intensity cannot be negative');
      return;
    }

    if (intensityValue > 10) {
      toast.error('Intensity cannot exceed 10');
      return;
    }

    try {
      await furnitureApi.update(selectedFurniture.id, {
        light_intensity: intensityValue,
      });

      // Update local state
      updateFurniturePlacement(selectedFurniture.id, {
        light_intensity: intensityValue,
      });

      toast.success('Light intensity updated', {
        description: `Set to ${intensityValue}`
      });
    } catch (error) {
      console.error('Error updating light intensity:', error);
      toast.error('Failed to update light intensity');
    }
  };

  // Handle light color change
  const handleLightColorChange = async (color: string) => {
    if (!selectedFurniture) return;

    setLightColor(color);

    try {
      await furnitureApi.update(selectedFurniture.id, {
        light_color: color,
      });

      // Update local state
      updateFurniturePlacement(selectedFurniture.id, {
        light_color: color,
      });

      toast.success('Light color updated');
    } catch (error) {
      console.error('Error updating light color:', error);
      toast.error('Failed to update light color');
    }
  };

  // Handle wall color change
  const handleWallColorChange = async (color: string) => {
    if (!selectedWall) return;

    setWallColor(color);

    try {
      await wallsApi.update(selectedWall.id, { color });
      toast.success('Wall color updated');

      // Trigger re-fetch of walls by updating selected wall
      setSelectedWall({ ...selectedWall, color });
    } catch (error) {
      console.error('Error updating wall color:', error);
      toast.error('Failed to update wall color');
    }
  };

  // Handle wall material change
  const handleWallMaterialChange = async (material: string) => {
    if (!selectedWall) return;

    setWallMaterial(material);

    try {
      await wallsApi.update(selectedWall.id, { material });
      toast.success('Wall material updated', {
        description: `Changed to ${material}`
      });

      // Trigger re-fetch of walls by updating selected wall
      setSelectedWall({ ...selectedWall, material });
    } catch (error) {
      console.error('Error updating wall material:', error);
      toast.error('Failed to update wall material');
    }
  };

  // Handle ceiling height change with validation
  const handleCeilingHeightChange = (value: string) => {
    setCeilingHeight(value);
    setCeilingHeightError('');

    const numValue = parseFloat(value);

    // Validate on blur or when user stops typing
    if (value && !isNaN(numValue)) {
      if (numValue < 2.0) {
        setCeilingHeightError('Ceiling height must be at least 2.0m');
      } else if (numValue > 10.0) {
        setCeilingHeightError('Ceiling height cannot exceed 10m');
      }
    }
  };

  // Handle ceiling height save
  const handleCeilingHeightSave = async () => {
    if (!selectedRoom) return;

    const numValue = parseFloat(ceilingHeight);

    if (isNaN(numValue)) {
      setCeilingHeightError('Please enter a valid number');
      return;
    }

    if (numValue < 2.0) {
      setCeilingHeightError('Ceiling height must be at least 2.0m');
      return;
    }

    if (numValue > 10.0) {
      setCeilingHeightError('Ceiling height cannot exceed 10m');
      return;
    }

    try {
      // Update via API
      await roomsApi.update(selectedRoom.id, {
        ceiling_height: numValue,
      });

      // Update local state
      const updatedRooms = rooms.map((r) =>
        r.id === selectedRoom.id ? { ...r, ceiling_height: numValue } : r
      );
      setRooms(updatedRooms);

      toast.success('Ceiling height updated', {
        description: `Set to ${numValue}m`,
      });

      setCeilingHeightError('');
    } catch (error) {
      console.error('Error updating ceiling height:', error);
      toast.error('Failed to update ceiling height', {
        description: 'Please try again',
      });
    }
  };

  // Handle room name save
  const handleRoomNameSave = async () => {
    if (!selectedRoom) return;

    const trimmedName = roomName.trim();

    try {
      // Update via API
      await roomsApi.update(selectedRoom.id, {
        name: trimmedName || null,
      });

      // Update local state
      const updatedRooms = rooms.map((r) =>
        r.id === selectedRoom.id ? { ...r, name: trimmedName || null } : r
      );
      setRooms(updatedRooms);

      toast.success('Room name updated', {
        description: trimmedName || 'Name cleared',
      });
    } catch (error) {
      console.error('Error updating room name:', error);
      toast.error('Failed to update room name', {
        description: 'Please try again',
      });
    }
  };

  const handleDeleteRoom = async (deleteFurniture: boolean) => {
    if (!selectedRoom) return;

    try {
      if (deleteFurniture) {
        // Delete all furniture in the room first
        await Promise.all(
          roomFurniture.map((furniture) => furnitureApi.delete(furniture.id))
        );

        // Update store to remove furniture
        setFurniturePlacements(
          furniturePlacements.filter((f) => f.room_id !== selectedRoomId)
        );
      }
      // If not deleting furniture, we keep it (furniture will be orphaned but visible in space)

      // Delete the room
      await roomsApi.delete(selectedRoom.id);

      // Update store to remove room
      setRooms(rooms.filter((r) => r.id !== selectedRoom.id));

      // Clear selection
      setSelectedRoomId(null);

      // Close dialog
      setDeleteDialogOpen(false);

      // Show success message
      toast.success('Room deleted', {
        description: deleteFurniture
          ? `${selectedRoom.name || 'Room'} and ${roomFurniture.length} furniture item(s) deleted`
          : `${selectedRoom.name || 'Room'} deleted, furniture kept in space`,
      });
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('Failed to delete room', {
        description: 'Please try again',
      });
    }
  };

  // Toggle button (always visible)
  const toggleButton = (
    <button
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="absolute top-20 -left-10 z-10 bg-gray-800/95 border border-gray-700 rounded-l-lg p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
      title={isCollapsed ? 'Expand Properties Panel' : 'Collapse Properties Panel'}
    >
      {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>
  );

  // Render collapsed state
  if (isCollapsed) {
    return toggleButton;
  }

  return (
    <>
      {toggleButton}
      <div className={`absolute top-16 bg-gray-800/95 border border-gray-700 rounded-lg shadow-xl max-h-[calc(100vh-6rem)] overflow-y-auto ${
        isNarrowScreen ? 'right-2 w-[calc(100vw-1rem)] max-w-sm' : 'right-4 w-80'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 sticky top-0 bg-gray-800/95 z-10">
          <h2 className="text-lg font-semibold text-white">Properties</h2>
          {selectedRoom && (
            <button
              onClick={() => setSelectedRoomId(null)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Deselect Room"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {selectedFurnitureIds.length > 1 ? (
            // Feature #38: Multi-select message
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Multiple Items Selected</label>
              <div className="text-white font-medium mb-2">{selectedFurnitureIds.length} items selected</div>
              <p className="text-gray-400 text-sm mb-4">
                Multiple furniture items are selected. Click on a single item to view and edit its properties.
              </p>
              <button
                onClick={() => {
                  const { clearFurnitureSelection } = useEditorStore.getState();
                  clearFurnitureSelection();
                }}
                className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
              >
                Clear Selection
              </button>
            </div>
          ) : selectedFurniture ? (
            // Furniture Properties (when single furniture is selected)
            <>
              {/* Furniture Name/Type */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Furniture</label>
                <div className="text-white font-medium">{selectedFurniture.asset_name || 'Unknown Item'}</div>
                {selectedFurniture.category && (
                  <div className="text-gray-400 text-sm mt-1">{selectedFurniture.category}</div>
                )}
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Dimensions</label>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Width</span>
                    <span className="text-white font-mono">{formatLength(selectedFurniture.width || 1, unitSystem)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Height</span>
                    <span className="text-white font-mono">{formatLength(selectedFurniture.height || 1, unitSystem)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Depth</span>
                    <span className="text-white font-mono">{formatLength(selectedFurniture.depth || 1, unitSystem)}</span>
                  </div>
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Position</label>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">X</span>
                    <span className="text-white font-mono">{formatLength(selectedFurniture.position_x, unitSystem, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Y</span>
                    <span className="text-white font-mono">{formatLength(selectedFurniture.position_y, unitSystem, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Z</span>
                    <span className="text-white font-mono">{formatLength(selectedFurniture.position_z, unitSystem, 2)}</span>
                  </div>
                </div>
              </div>

              {/* Rotation (Feature #34) */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Rotation</label>
                <div className="flex gap-2 items-center mb-3">
                  <input
                    type="number"
                    step="1"
                    value={furnitureRotation}
                    onChange={(e) => handleFurnitureRotationChange(e.target.value)}
                    onBlur={handleFurnitureRotationSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFurnitureRotationSave();
                        e.currentTarget.blur();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="0"
                  />
                  <span className="text-gray-400 text-sm">degrees</span>
                </div>

                {/* Quick Rotation Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleQuickRotate(-90)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors flex items-center justify-center gap-1"
                    title="Rotate -90°"
                  >
                    <RotateCw className="w-4 h-4 transform scale-x-[-1]" />
                    -90°
                  </button>
                  <button
                    onClick={() => handleQuickRotate(90)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors flex items-center justify-center gap-1"
                    title="Rotate +90°"
                  >
                    <RotateCw className="w-4 h-4" />
                    +90°
                  </button>
                  <button
                    onClick={() => handleQuickRotate(180)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors flex items-center justify-center gap-1"
                    title="Rotate 180°"
                  >
                    <RotateCw className="w-4 h-4" />
                    180°
                  </button>
                </div>
              </div>

              {/* Scale (Feature #35) */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Scale</label>
                <div className="flex gap-2 items-center mb-3">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={furnitureScale}
                    onChange={(e) => handleFurnitureScaleChange(e.target.value)}
                    onBlur={handleFurnitureScaleSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFurnitureScaleSave();
                        e.currentTarget.blur();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="1.0"
                  />
                  <span className="text-gray-400 text-sm">×</span>
                </div>

                {/* Quick Scale Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleQuickScale(0.5)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
                    title="Scale to 0.5x"
                  >
                    0.5×
                  </button>
                  <button
                    onClick={() => handleQuickScale(1.0)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
                    title="Reset to 1.0x"
                  >
                    1.0×
                  </button>
                  <button
                    onClick={() => handleQuickScale(1.5)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
                    title="Scale to 1.5x"
                  >
                    1.5×
                  </button>
                </div>
              </div>

              {/* Light Properties (Feature #47) - Only show for Lighting category */}
              {selectedFurniture.category === 'Lighting' && (
                <div className="border-t border-gray-700 pt-4">
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    💡 Light Properties
                  </label>

                  {/* Light Intensity */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-400 mb-2">Intensity</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={lightIntensity}
                        onChange={(e) => handleLightIntensityChange(e.target.value)}
                        onBlur={handleLightIntensitySave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleLightIntensitySave();
                            e.currentTarget.blur();
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="2.0"
                      />
                      <span className="text-gray-400 text-xs">0-10</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Higher values create brighter light</p>
                  </div>

                  {/* Light Color */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={lightColor}
                        onChange={(e) => handleLightColorChange(e.target.value)}
                        className="h-10 w-20 rounded cursor-pointer bg-gray-700 border border-gray-600"
                      />
                      <input
                        type="text"
                        value={lightColor}
                        onChange={(e) => handleLightColorChange(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="#fff8e1"
                        maxLength={7}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleLightColorChange('#ffffff')}
                        className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
                        title="Cool White"
                      >
                        Cool White
                      </button>
                      <button
                        onClick={() => handleLightColorChange('#fff8e1')}
                        className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
                        title="Warm White"
                      >
                        Warm White
                      </button>
                      <button
                        onClick={() => handleLightColorChange('#ffd700')}
                        className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
                        title="Warm Yellow"
                      >
                        Yellow
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Deselect Button */}
              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={() => setSelectedFurnitureId(null)}
                  className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
                >
                  Deselect Furniture
                </button>
              </div>
            </>
          ) : selectedRoom ? (
            // Room Properties (when room is selected)
            <>
              {/* Room Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onBlur={handleRoomNameSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRoomNameSave();
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Unnamed Room"
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Dimensions</label>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Width</span>
                    <span className="text-white font-mono">{formatLength(selectedRoom.dimensions_json.width, unitSystem)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Length</span>
                    <span className="text-white font-mono">{formatLength(selectedRoom.dimensions_json.depth, unitSystem)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                    <span className="text-gray-300 text-sm">Floor Area</span>
                    <span className="text-white font-mono">{formatArea(selectedRoom.dimensions_json.width * selectedRoom.dimensions_json.depth, unitSystem)}</span>
                  </div>
                </div>
              </div>

              {/* Ceiling Height (Editable) */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Ceiling Height</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="2.0"
                    max="10.0"
                    value={ceilingHeight}
                    onChange={(e) => handleCeilingHeightChange(e.target.value)}
                    onBlur={handleCeilingHeightSave}
                    className={`flex-1 px-3 py-2 bg-gray-700/50 border ${
                      ceilingHeightError ? 'border-red-500' : 'border-gray-600'
                    } rounded text-white font-mono focus:outline-none focus:border-blue-500 transition-colors`}
                    placeholder="2.8"
                  />
                  <span className="text-gray-400 self-center text-sm">m</span>
                </div>
                {ceilingHeightError && (
                  <p className="text-red-400 text-xs mt-1">{ceilingHeightError}</p>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Position</label>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">X</span>
                    <span className="text-white font-mono">{formatLength(selectedRoom.position_x, unitSystem, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Z</span>
                    <span className="text-white font-mono">{formatLength(selectedRoom.position_z, unitSystem, 2)}</span>
                  </div>
                </div>
              </div>

              {/* Wall Color Picker - shown when wall is selected */}
              {selectedWall && (
                <div className="border-t border-gray-700 pt-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Wall Color <span className="text-blue-400">(Selected Wall)</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={wallColor}
                      onChange={(e) => handleWallColorChange(e.target.value)}
                      className="h-10 w-20 rounded cursor-pointer bg-gray-700 border border-gray-600"
                    />
                    <input
                      type="text"
                      value={wallColor}
                      onChange={(e) => handleWallColorChange(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="#e5e7eb"
                      maxLength={7}
                    />
                  </div>

                  {/* Wall Material Selector */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Wall Material / Texture
                    </label>
                    <select
                      value={wallMaterial}
                      onChange={(e) => handleWallMaterialChange(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="paint">Paint (Solid Color)</option>
                      <option value="brick">Brick</option>
                      <option value="wood_panel">Wood Panel</option>
                      <option value="tile">Tile</option>
                      <option value="concrete">Concrete</option>
                      <option value="wallpaper">Wallpaper</option>
                      <option value="stone">Stone</option>
                      <option value="marble">Marble</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setSelectedWallId(null)}
                    className="mt-4 w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
                  >
                    Deselect Wall
                  </button>
                </div>
              )}

              {/* Floor Material Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Floor Material</label>
                <select
                  value={selectedRoom.floor_material || 'hardwood'}
                  onChange={async (e) => {
                    try {
                      const newMaterial = e.target.value;
                      await roomsApi.update(selectedRoom.id, {
                        floor_material: newMaterial,
                      });

                      // Update local state
                      const updatedRooms = rooms.map((r) =>
                        r.id === selectedRoom.id ? { ...r, floor_material: newMaterial } : r
                      );
                      setRooms(updatedRooms);

                      toast.success('Floor material updated', {
                        description: `Changed to ${newMaterial}`,
                      });
                    } catch (error) {
                      console.error('Error updating floor material:', error);
                      toast.error('Failed to update floor material');
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="hardwood">Hardwood</option>
                  <option value="tile">Tile</option>
                  <option value="carpet">Carpet</option>
                  <option value="marble">Marble</option>
                  <option value="laminate">Laminate</option>
                  <option value="concrete">Concrete</option>
                </select>
              </div>

              {/* View Settings */}
              <div className="border-t border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  👁️ View Settings
                </label>

                {/* Opacity Slider */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">Opacity</span>
                    <span className="text-xs text-white font-mono">{Math.round((selectedRoom.opacity ?? 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round((selectedRoom.opacity ?? 1) * 100)}
                    onChange={async (e) => {
                      const opacity = parseInt(e.target.value) / 100;
                      try {
                        await roomsApi.update(selectedRoom.id, { opacity });
                        updateRoom(selectedRoom.id, { opacity });
                      } catch (error) {
                        console.error('Error updating opacity:', error);
                      }
                    }}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* View Mode */}
                <div className="mb-4">
                  <span className="text-xs text-gray-400 block mb-2">View Mode</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['solid', 'wireframe', 'xray'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={async () => {
                          try {
                            await roomsApi.update(selectedRoom.id, { view_mode: mode });
                            updateRoom(selectedRoom.id, { view_mode: mode });
                            toast.success(`View mode: ${mode}`);
                          } catch (error) {
                            console.error('Error updating view mode:', error);
                          }
                        }}
                        className={`px-2 py-1.5 text-xs rounded transition-colors capitalize ${
                          (selectedRoom.view_mode || 'solid') === mode
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show/Hide Toggles */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-gray-300">Show Floor</span>
                    <input
                      type="checkbox"
                      checked={selectedRoom.show_floor ?? true}
                      onChange={async (e) => {
                        const show_floor = e.target.checked;
                        try {
                          await roomsApi.update(selectedRoom.id, { show_floor });
                          updateRoom(selectedRoom.id, { show_floor });
                        } catch (error) {
                          console.error('Error updating show_floor:', error);
                        }
                      }}
                      className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-gray-300">Show Ceiling</span>
                    <input
                      type="checkbox"
                      checked={selectedRoom.show_ceiling ?? true}
                      onChange={async (e) => {
                        const show_ceiling = e.target.checked;
                        try {
                          await roomsApi.update(selectedRoom.id, { show_ceiling });
                          updateRoom(selectedRoom.id, { show_ceiling });
                        } catch (error) {
                          console.error('Error updating show_ceiling:', error);
                        }
                      }}
                      className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-gray-300">Show Walls</span>
                    <input
                      type="checkbox"
                      checked={selectedRoom.show_walls ?? true}
                      onChange={async (e) => {
                        const show_walls = e.target.checked;
                        try {
                          await roomsApi.update(selectedRoom.id, { show_walls });
                          updateRoom(selectedRoom.id, { show_walls });
                        } catch (error) {
                          console.error('Error updating show_walls:', error);
                        }
                      }}
                      className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Colors</label>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Floor</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border border-gray-600"
                        style={{ backgroundColor: selectedRoom.floor_color || '#d1d5db' }}
                      />
                      <span className="text-white font-mono text-xs">
                        {selectedRoom.floor_color || '#d1d5db'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Ceiling</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border border-gray-600"
                        style={{ backgroundColor: selectedRoom.ceiling_color || '#f3f4f6' }}
                      />
                      <span className="text-white font-mono text-xs">
                        {selectedRoom.ceiling_color || '#f3f4f6'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Room Operations */}
              <div className="pt-4 border-t border-gray-700">
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  🔧 Room Operations
                </label>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const result = await roomOperationsApi.split(selectedRoom.id, 'x', 0.5);
                          if (result.success) {
                            toast.success('Room split vertically');
                            // Refresh rooms
                            const roomsData = await roomsApi.getByFloor(selectedRoom.floor_id);
                            const setRooms = useEditorStore.getState().setRooms;
                            setRooms(roomsData.rooms);
                          }
                        } catch (error) {
                          console.error('Error splitting room:', error);
                          toast.error('Failed to split room');
                        }
                      }}
                      className="px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                    >
                      Split ↔ (L/R)
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const result = await roomOperationsApi.split(selectedRoom.id, 'z', 0.5);
                          if (result.success) {
                            toast.success('Room split horizontally');
                            // Refresh rooms
                            const roomsData = await roomsApi.getByFloor(selectedRoom.floor_id);
                            const setRooms = useEditorStore.getState().setRooms;
                            setRooms(roomsData.rooms);
                          }
                        } catch (error) {
                          console.error('Error splitting room:', error);
                          toast.error('Failed to split room');
                        }
                      }}
                      className="px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                    >
                      Split ↕ (F/B)
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete Room Button */}
              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  className="w-full px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 hover:border-red-600/50 text-red-400 hover:text-red-300 font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Room
                </button>
              </div>
            </>
          ) : (
            // Project/Floor Overview (when nothing is selected)
            <>
              {/* Project Info */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Project</label>
                <div className="text-white font-medium">{projectName}</div>
              </div>

              {/* Current Floor */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Current Floor</label>
                <div className="text-white font-medium">{currentFloor?.name || 'No floor selected'}</div>
              </div>

              {/* Statistics */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Statistics</label>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Total Floors</span>
                    <span className="text-white font-mono">{floors.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Rooms on This Floor</span>
                    <span className="text-white font-mono">
                      {rooms.filter(r => r.floor_id === currentFloorId).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Total Rooms</span>
                    <span className="text-white font-mono">{rooms.length}</span>
                  </div>
                </div>
              </div>

              {/* Help Text */}
              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400">
                  Select a room in the viewport to view and edit its properties.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Room Dialog */}
      <DeleteRoomDialog
        isOpen={deleteDialogOpen}
        roomName={selectedRoom?.name || 'Unnamed Room'}
        furnitureCount={roomFurniture.length}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleteWithFurniture={() => handleDeleteRoom(true)}
        onDeleteKeepFurniture={() => handleDeleteRoom(false)}
      />
    </>
  );
}

export default PropertiesPanel;
