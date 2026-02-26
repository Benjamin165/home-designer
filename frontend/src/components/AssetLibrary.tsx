import { useState, useEffect, useRef } from 'react';
import { assetsApi } from '../lib/api';
import { useEditorStore } from '../store/editorStore';
import { Package, Sofa, Lightbulb, Flower2, Frame, ChevronLeft, ChevronRight, Search, X, Sparkles, Star, Link as LinkIcon } from 'lucide-react';
import AIGenerationModal from './AIGenerationModal';
import URLImportModal from './URLImportModal';
import AssetDetailsModal from './AssetDetailsModal';
import { toast } from 'sonner';

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
  is_favorite: number; // SQLite stores boolean as 0 or 1
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
  const [showAIModal, setShowAIModal] = useState(false);
  const [showURLImportModal, setShowURLImportModal] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const isDraggingRef = useRef(false);
  const { setDraggingAsset } = useEditorStore();

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

  useEffect(() => {
    loadAssets();
  }, [selectedCategory, searchQuery, showFavoritesOnly]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assetsApi.getAll({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        favorite: showFavoritesOnly || undefined,
      });
      setAssets(data.assets || []);
    } catch (err) {
      console.error('Error loading assets:', err);
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (assetId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag start
    try {
      const result = await assetsApi.toggleFavorite(assetId);
      // Update the local state
      setAssets(prevAssets =>
        prevAssets.map(asset =>
          asset.id === assetId ? { ...asset, is_favorite: result.asset.is_favorite } : asset
        )
      );
      toast.success(result.asset.is_favorite ? 'Added to favorites' : 'Removed from favorites');

      // If we're in favorites-only view and we just unfavorited, refresh to remove it from list
      if (showFavoritesOnly && !result.asset.is_favorite) {
        loadAssets();
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Failed to update favorite');
    }
  };

  const handleDragStart = (asset: Asset) => (e: React.DragEvent) => {
    isDraggingRef.current = true;
    setDraggingAsset(asset); // Pass the full asset object
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    setDraggingAsset(null);
  };

  const handleAssetClick = (asset: Asset) => {
    // Only open details if user clicked (not dragged)
    if (!isDraggingRef.current) {
      setSelectedAsset(asset);
      setShowDetailsModal(true);
    }
  };

  // Get unique categories
  const categories = ['All', ...new Set(assets.map((a) => a.category))];

  // Assets are already filtered by the API (category and search)
  const filteredAssets = assets;

  return (
    <div className={`h-full bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-80'
    } ${
      // On narrow screens when expanded, make it overlay
      isNarrowScreen && !isCollapsed ? 'absolute left-0 top-0 z-50 shadow-2xl' : 'relative'
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

      {/* Favorites toggle */}
      <div className="px-4 py-2 border-b border-gray-700">
        <button
          onClick={() => {
            setShowFavoritesOnly(!showFavoritesOnly);
            setSelectedCategory(null); // Clear category filter when toggling favorites
          }}
          className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            showFavoritesOnly
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          {showFavoritesOnly ? 'Showing Favorites' : 'Show Favorites'}
        </button>
      </div>

      {/* Category tabs */}
      <div className="px-2 py-2 border-b border-gray-700 flex gap-1 overflow-x-auto">
        <button
          onClick={() => {
            setSelectedCategory(null);
            setShowFavoritesOnly(false);
          }}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
            selectedCategory === null && !showFavoritesOnly
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
              onClick={() => {
                setSelectedCategory(cat);
                setShowFavoritesOnly(false);
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                selectedCategory === cat && !showFavoritesOnly
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

      {/* AI Generation buttons */}
      <div className="px-4 py-2 border-b border-gray-700 space-y-2">
        <button
          onClick={() => setShowAIModal(true)}
          className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Generate from Photo
        </button>
        <button
          onClick={() => setShowURLImportModal(true)}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm font-medium hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
        >
          <LinkIcon className="w-4 h-4" />
          Import from URL
        </button>
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
                onClick={() => handleAssetClick(asset)}
                className="bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-600 transition-colors group relative"
              >
                {/* Favorite star button */}
                <button
                  onClick={(e) => handleToggleFavorite(asset.id, e)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-800/80 hover:bg-gray-900 transition-colors z-10"
                  title={asset.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={`w-4 h-4 transition-colors ${
                      asset.is_favorite
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-400 hover:text-yellow-400'
                    }`}
                  />
                </button>

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

      {/* AI Generation Modal */}
      <AIGenerationModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onSuccess={() => {
          loadAssets(); // Refresh asset list
        }}
      />

      {/* URL Import Modal */}
      <URLImportModal
        isOpen={showURLImportModal}
        onClose={() => setShowURLImportModal(false)}
        onSuccess={() => {
          loadAssets(); // Refresh asset list
        }}
      />

      {/* Asset Details Modal */}
      <AssetDetailsModal
        asset={selectedAsset}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAsset(null);
        }}
      />
    </div>
  );
}
