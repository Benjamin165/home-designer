import { useState, useEffect } from 'react';
import { assetsApi } from '../lib/api';
import { useEditorStore } from '../store/editorStore';
import { Package, Sofa, Lightbulb, Flower2, Frame, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

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
}

const categoryIcons: Record<string, any> = {
  Furniture: Sofa,
  Lighting: Lightbulb,
  Plants: Flower2,
  Decor: Frame,
};

export default function AssetLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { setDraggingAsset } = useEditorStore();

  useEffect(() => {
    loadAssets();
  }, [selectedCategory, searchQuery]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assetsApi.getAll({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
      });
      setAssets(data.assets || []);
    } catch (err) {
      console.error('Error loading assets:', err);
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (asset: Asset) => (e: React.DragEvent) => {
    setDraggingAsset({ id: asset.id, name: asset.name });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
  };

  const handleDragEnd = () => {
    setDraggingAsset(null);
  };

  // Get unique categories
  const categories = ['All', ...new Set(assets.map((a) => a.category))];

  // Assets are already filtered by the API (category and search)
  const filteredAssets = assets;

  return (
    <div className={`h-full bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-80'
    }`}>
      {isCollapsed ? (
        // Collapsed state - just show expand button
        <div className="flex flex-col items-center py-3">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Expand Asset Library"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="mt-4 writing-mode-vertical text-gray-400 text-sm font-medium" style={{ writingMode: 'vertical-rl' }}>
            Assets
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Asset Library
            </h2>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Collapse Asset Library"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

      {/* Category tabs */}
      <div className="px-2 py-2 border-b border-gray-700 flex gap-1 overflow-x-auto">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
            selectedCategory === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          All
        </button>
        {['Furniture', 'Lighting', 'Plants', 'Decor'].map((cat) => {
          const Icon = categoryIcons[cat] || Package;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat}
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div className="px-4 py-2 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700 text-white pl-10 pr-8 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            aria-label="Search assets"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Asset grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 text-sm mt-2">Loading assets...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadAssets}
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">No assets found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                draggable
                onDragStart={handleDragStart(asset)}
                onDragEnd={handleDragEnd}
                className="bg-gray-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-gray-600 transition-colors group"
              >
                {/* Thumbnail placeholder */}
                <div className="aspect-square bg-gray-600 rounded mb-2 flex items-center justify-center">
                  {categoryIcons[asset.category] ? (
                    (() => {
                      const Icon = categoryIcons[asset.category];
                      return <Icon className="w-8 h-8 text-gray-400" />;
                    })()
                  ) : (
                    <Package className="w-8 h-8 text-gray-400" />
                  )}
                </div>

                {/* Asset info */}
                <div className="text-xs">
                  <p className="font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                    {asset.name}
                  </p>
                  <p className="text-gray-400 mt-0.5">{asset.subcategory}</p>
                  <p className="text-gray-500 mt-0.5 font-mono">
                    {asset.width}×{asset.height}×{asset.depth}m
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

          {/* Help text */}
          <div className="px-4 py-3 border-t border-gray-700 bg-gray-750">
            <p className="text-xs text-gray-400">
              💡 Drag items from the library into the 3D viewport to place them
            </p>
          </div>
        </>
      )}
    </div>
  );
}
