import { useEditorStore } from '../store/editorStore';
import { X } from 'lucide-react';

function PropertiesPanel() {
  const { selectedRoomId, setSelectedRoomId, rooms } = useEditorStore();

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  if (!selectedRoom) {
    return null;
  }

  const { width, depth } = selectedRoom.dimensions_json;
  const area = width * depth;

  return (
    <div className="absolute top-16 right-4 w-80 bg-gray-800/95 border border-gray-700 rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Properties</h2>
        <button
          onClick={() => setSelectedRoomId(null)}
          className="text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Room Name */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
          <div className="text-white font-medium">{selectedRoom.name || 'Unnamed Room'}</div>
        </div>

        {/* Dimensions */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Dimensions</label>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Width</span>
              <span className="text-white font-mono">{width.toFixed(1)} m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Length</span>
              <span className="text-white font-mono">{depth.toFixed(1)} m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Ceiling Height</span>
              <span className="text-white font-mono">{selectedRoom.ceiling_height.toFixed(1)} m</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-700">
              <span className="text-gray-300 text-sm">Floor Area</span>
              <span className="text-white font-mono">{area.toFixed(2)} m²</span>
            </div>
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Position</label>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">X</span>
              <span className="text-white font-mono">{selectedRoom.position_x.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Z</span>
              <span className="text-white font-mono">{selectedRoom.position_z.toFixed(2)} m</span>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Materials</label>
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
      </div>
    </div>
  );
}

export default PropertiesPanel;
