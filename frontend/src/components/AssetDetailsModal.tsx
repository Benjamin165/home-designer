import { X } from 'lucide-react';

interface Asset {
  id: number;
  name: string;
  category: string;
  subcategory: string;
  source: string;
  model_path: string;
  thumbnail_path: string;
  width: number;
  height: number;
  depth: number;
  is_favorite: number;
}

interface AssetDetailsModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetDetailsModal({ asset, isOpen, onClose }: AssetDetailsModalProps) {
  if (!isOpen || !asset) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-semibold text-white">{asset.name}</h2>
            <p className="text-gray-400 text-sm mt-1">
              {asset.category} · {asset.subcategory}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preview */}
          <div className="bg-gray-700 rounded-lg aspect-video flex items-center justify-center">
            {asset.thumbnail_path ? (
              <img
                src={asset.thumbnail_path}
                alt={asset.name}
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-2">📦</div>
                <p className="text-sm">3D Model Preview</p>
                <p className="text-xs mt-1">{asset.model_path}</p>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Dimensions */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Dimensions</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Width:</span>
                  <span className="text-white font-medium">{asset.width}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Height:</span>
                  <span className="text-white font-medium">{asset.height}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Depth:</span>
                  <span className="text-white font-medium">{asset.depth}m</span>
                </div>
              </div>
            </div>

            {/* Category Info */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Category:</span>
                  <span className="text-white font-medium">{asset.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Type:</span>
                  <span className="text-white font-medium">{asset.subcategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Source:</span>
                  <span className="text-white font-medium capitalize">{asset.source}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Dimensions Summary */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Dimensions Summary</span>
            </div>
            <p className="text-white font-mono text-lg">
              {asset.width}m × {asset.height}m × {asset.depth}m
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Width × Height × Depth
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Could add "Add to Scene" functionality here
                onClose();
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add to Scene
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
