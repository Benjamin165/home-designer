/**
 * IKEA Furniture Browser Component
 * 
 * Browse and import furniture from the official IKEA 3D Assembly Dataset.
 */

import { useState, useEffect } from 'react';
import { ikeaApi } from '../lib/api';
import { toast } from 'sonner';
import { Search, Download, Package, Loader2, ExternalLink } from 'lucide-react';

interface IKEAItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  width: number;
  height: number;
  depth: number;
  price?: number;
  glbUrl: string;
  thumbnailUrl?: string;
}

interface IKEABrowserProps {
  onImport?: (asset: any) => void;
  onClose?: () => void;
}

export function IKEABrowser({ onImport, onClose }: IKEABrowserProps) {
  const [items, setItems] = useState<IKEAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState<string | null>(null);
  const [importingAll, setImportingAll] = useState(false);

  // Fetch catalog on mount
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const data = await ikeaApi.getCatalog();
        setItems(data.items);
        setError(null);
      } catch (err) {
        setError('Failed to load IKEA catalog');
        console.error('Error loading IKEA catalog:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // Filter items by search query
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subcategory.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Import a single item
  const handleImport = async (item: IKEAItem) => {
    try {
      setImporting(item.id);
      const result = await ikeaApi.importItem(item.id);
      
      toast.success('Imported to library', {
        description: `${item.name} is now available in your assets`,
      });

      if (onImport) {
        onImport(result.asset);
      }
    } catch (err) {
      console.error('Error importing IKEA item:', err);
      toast.error('Failed to import', {
        description: `Could not import ${item.name}`,
      });
    } finally {
      setImporting(null);
    }
  };

  // Import all items
  const handleImportAll = async () => {
    try {
      setImportingAll(true);
      const result = await ikeaApi.importAll();
      
      toast.success('Import complete', {
        description: `Imported ${result.successCount} items (${result.errorCount} errors)`,
      });
    } catch (err) {
      console.error('Error importing all IKEA items:', err);
      toast.error('Failed to import all items');
    } finally {
      setImportingAll(false);
    }
  };

  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, IKEAItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Loading IKEA catalog...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Package className="w-12 h-12 text-gray-500 mb-4" />
        <p className="text-gray-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-yellow-500 font-bold text-lg mr-2">IKEA</span>
            <span className="text-gray-400 text-sm">Official 3D Models</span>
          </div>
          <button
            onClick={handleImportAll}
            disabled={importingAll}
            className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {importingAll ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1" />
            )}
            Import All
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search IKEA furniture..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedItems).length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No items found matching "{searchQuery}"
          </div>
        ) : (
          Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-sm">{item.name}</h4>
                        <p className="text-gray-500 text-xs mt-1">{item.subcategory}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {(item.width * 100).toFixed(0)} × {(item.height * 100).toFixed(0)} × {(item.depth * 100).toFixed(0)} cm
                        </p>
                        {item.price && (
                          <p className="text-green-400 text-sm mt-1 font-medium">
                            ${item.price.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleImport(item)}
                        disabled={importing === item.id}
                        className="flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 ml-2"
                      >
                        {importing === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Download className="w-3 h-3 mr-1" />
                            Import
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <p className="text-xs text-gray-500 text-center">
          Models from IKEA 3D Assembly Dataset (CC BY-NC-SA 4.0)
          <a
            href="https://github.com/IKEA/IKEA3DAssemblyDataset"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-blue-400 hover:underline inline-flex items-center"
          >
            Learn more <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </p>
      </div>
    </div>
  );
}

export default IKEABrowser;
