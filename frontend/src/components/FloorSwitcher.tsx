import { useEditorStore } from '../store/editorStore';
import { floorsApi } from '../lib/api';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import DeleteFloorDialog from './DeleteFloorDialog';

interface FloorSwitcherProps {
  projectId: number;
}

function FloorSwitcher({ projectId }: FloorSwitcherProps) {
  const { floors, setFloors, currentFloorId, setCurrentFloorId, rooms, setRooms } = useEditorStore();
  const [isAdding, setIsAdding] = useState(false);
  const [draggedFloorId, setDraggedFloorId] = useState<number | null>(null);
  const [floorToDelete, setFloorToDelete] = useState<number | null>(null);
  const [hoveredFloorId, setHoveredFloorId] = useState<number | null>(null);

  const handleAddFloor = async () => {
    try {
      setIsAdding(true);

      // Calculate next floor level and order
      const maxLevel = floors.length > 0 ? Math.max(...floors.map(f => f.level)) : -1;
      const maxOrder = floors.length > 0 ? Math.max(...floors.map(f => f.order_index)) : -1;

      const newLevel = maxLevel + 1;
      const newOrder = maxOrder + 1;

      // Determine floor name
      let floorName: string;
      if (newLevel === 0) {
        floorName = 'Ground Floor';
      } else if (newLevel === 1) {
        floorName = 'First Floor';
      } else if (newLevel === 2) {
        floorName = 'Second Floor';
      } else if (newLevel === 3) {
        floorName = 'Third Floor';
      } else {
        floorName = `Floor ${newLevel + 1}`;
      }

      const data = await floorsApi.create(projectId, {
        name: floorName,
        level: newLevel,
        order_index: newOrder,
      });

      // Add the new floor to the list
      const newFloors = [...floors, data.floor];
      setFloors(newFloors);

      // Optionally switch to the new floor
      // setCurrentFloorId(data.floor.id);

      console.log('Floor added:', data.floor);
    } catch (error) {
      console.error('Error adding floor:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleFloorClick = (floorId: number) => {
    setCurrentFloorId(floorId);
  };

  const handleDragStart = (e: React.DragEvent, floorId: number) => {
    setDraggedFloorId(floorId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetFloorId: number) => {
    e.preventDefault();

    if (draggedFloorId === null || draggedFloorId === targetFloorId) {
      setDraggedFloorId(null);
      return;
    }

    // Find the indices of the dragged and target floors
    const draggedIndex = floors.findIndex(f => f.id === draggedFloorId);
    const targetIndex = floors.findIndex(f => f.id === targetFloorId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedFloorId(null);
      return;
    }

    // Reorder the floors array
    const newFloors = [...floors];
    const [draggedFloor] = newFloors.splice(draggedIndex, 1);
    newFloors.splice(targetIndex, 0, draggedFloor);

    // Update order_index for all floors
    const updatedFloors = newFloors.map((floor, index) => ({
      ...floor,
      order_index: index,
    }));

    // Update local state immediately for responsive UI
    setFloors(updatedFloors);

    // Update database
    try {
      await floorsApi.reorder(
        updatedFloors.map(floor => ({
          id: floor.id,
          order_index: floor.order_index,
        }))
      );
      console.log('Floors reordered successfully');
    } catch (error) {
      console.error('Error reordering floors:', error);
      // Revert to original order on error
      setFloors(floors);
    } finally {
      setDraggedFloorId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedFloorId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, floorId: number) => {
    e.stopPropagation(); // Prevent floor selection when clicking delete
    setFloorToDelete(floorId);
  };

  const handleDeleteConfirm = async () => {
    if (!floorToDelete) return;

    try {
      // Delete floor via API (CASCADE will handle rooms)
      await floorsApi.delete(floorToDelete);

      // Remove floor from local state
      const newFloors = floors.filter(f => f.id !== floorToDelete);
      setFloors(newFloors);

      // Remove rooms that belonged to this floor
      const newRooms = rooms.filter(r => r.floor_id !== floorToDelete);
      setRooms(newRooms);

      // If deleted floor was current, switch to another floor
      if (currentFloorId === floorToDelete) {
        if (newFloors.length > 0) {
          // Switch to first remaining floor
          setCurrentFloorId(newFloors[0].id);
        } else {
          setCurrentFloorId(null);
        }
      }

      console.log('Floor deleted:', floorToDelete);
    } catch (error) {
      console.error('Error deleting floor:', error);
      alert('Failed to delete floor. Please try again.');
    } finally {
      setFloorToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setFloorToDelete(null);
  };

  // Get floor being deleted for dialog
  const floorBeingDeleted = floors.find(f => f.id === floorToDelete);
  const roomCountOnFloor = floorBeingDeleted
    ? rooms.filter(r => r.floor_id === floorBeingDeleted.id).length
    : 0;

  return (
    <>
      <div className="fixed right-4 top-24 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 z-10 flex flex-col gap-2">
        {/* Floor list */}
        <div className="flex flex-col gap-1">
          {floors.map((floor) => (
            <div
              key={floor.id}
              className="relative"
              onMouseEnter={() => setHoveredFloorId(floor.id)}
              onMouseLeave={() => setHoveredFloorId(null)}
            >
              <button
                onClick={() => handleFloorClick(floor.id)}
                draggable
                onDragStart={(e) => handleDragStart(e, floor.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, floor.id)}
                onDragEnd={handleDragEnd}
                className={`
                  w-full px-3 py-2 rounded text-sm font-medium transition-colors text-left cursor-move
                  ${
                    currentFloorId === floor.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                  ${draggedFloorId === floor.id ? 'opacity-50' : ''}
                  ${hoveredFloorId === floor.id ? 'pr-10' : ''}
                `}
                title={floor.name}
              >
                {floor.name}
              </button>

              {/* Delete button (visible on hover) */}
              {hoveredFloorId === floor.id && (
                <button
                  onClick={(e) => handleDeleteClick(e, floor.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors z-10"
                  title="Delete Floor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Floor button */}
        <button
          onClick={handleAddFloor}
          disabled={isAdding}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add Floor"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? 'Adding...' : 'Add Floor'}
        </button>
      </div>

      {/* Delete Floor Dialog */}
      <DeleteFloorDialog
        isOpen={floorToDelete !== null}
        floorName={floorBeingDeleted?.name || ''}
        roomCount={roomCountOnFloor}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

export default FloorSwitcher;
