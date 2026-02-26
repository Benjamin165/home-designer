import { useEditorStore } from '../store/editorStore';
import { floorsApi } from '../lib/api';
import { Plus } from 'lucide-react';
import { useState } from 'react';

interface FloorSwitcherProps {
  projectId: number;
}

function FloorSwitcher({ projectId }: FloorSwitcherProps) {
  const { floors, setFloors, currentFloorId, setCurrentFloorId } = useEditorStore();
  const [isAdding, setIsAdding] = useState(false);

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

  return (
    <div className="fixed right-4 top-24 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 z-10 flex flex-col gap-2">
      {/* Floor list */}
      <div className="flex flex-col gap-1">
        {floors.map((floor) => (
          <button
            key={floor.id}
            onClick={() => handleFloorClick(floor.id)}
            className={`
              px-3 py-2 rounded text-sm font-medium transition-colors text-left
              ${
                currentFloorId === floor.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
            title={floor.name}
          >
            {floor.name}
          </button>
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
  );
}

export default FloorSwitcher;
