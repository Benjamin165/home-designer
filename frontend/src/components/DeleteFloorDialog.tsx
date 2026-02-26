import { AlertTriangle, X } from 'lucide-react';

interface DeleteFloorDialogProps {
  isOpen: boolean;
  floorName: string;
  roomCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteFloorDialog({
  isOpen,
  floorName,
  roomCount,
  onClose,
  onConfirm,
}: DeleteFloorDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Delete Floor?</h2>
              <p className="text-sm text-gray-400 mt-0.5">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-300">
            You are about to delete <span className="font-semibold text-white">{floorName}</span>.
          </p>

          {roomCount > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-200 font-medium">
                This floor contains {roomCount} room{roomCount > 1 ? 's' : ''}.
              </p>
              <p className="text-red-100/70 text-sm mt-1">
                All rooms and furniture on this floor will be permanently deleted.
              </p>
            </div>
          )}

          {roomCount === 0 && (
            <p className="text-gray-400 text-sm">
              This floor is empty and can be safely deleted.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 p-6 pt-0">
          <button
            onClick={onConfirm}
            className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            Delete Floor{roomCount > 0 ? ' & All Rooms' : ''}
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
