import { useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { aiApi } from '../lib/api';
import { toast } from 'sonner';

interface URLImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportState = 'idle' | 'scraping' | 'preview' | 'importing' | 'success' | 'error';

interface ScrapedData {
  name: string;
  imageUrl: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  sourceUrl: string;
}

export default function URLImportModal({ isOpen, onClose, onSuccess }: URLImportModalProps) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ImportState>('idle');
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [generationId, setGenerationId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Editable fields for preview state
  const [editedName, setEditedName] = useState('');
  const [editedCategory, setEditedCategory] = useState('Furniture');
  const [editedWidth, setEditedWidth] = useState('');
  const [editedHeight, setEditedHeight] = useState('');
  const [editedDepth, setEditedDepth] = useState('');

  const handleScrapeUrl = async () => {
    if (!url.trim()) {
      toast.error('Please enter a product URL');
      return;
    }

    setState('scraping');
    setErrorMessage('');

    try {
      const result = await aiApi.importFromUrl(url);

      // Set scraped data and populate editable fields
      setScrapedData(result.data);
      setGenerationId(result.generationId);
      setEditedName(result.data.name);
      setEditedWidth(result.data.dimensions.width.toFixed(2));
      setEditedHeight(result.data.dimensions.height.toFixed(2));
      setEditedDepth(result.data.dimensions.depth.toFixed(2));

      setState('preview');
    } catch (error: any) {
      setState('error');
      setErrorMessage(error.message || 'Failed to scrape product URL');
    }
  };

  const handleConfirmImport = async () => {
    if (!scrapedData || !editedName.trim()) {
      toast.error('Product name is required');
      return;
    }

    setState('importing');
    setErrorMessage('');

    try {
      await aiApi.confirmUrlImport({
        name: editedName,
        category: editedCategory,
        subcategory: 'URL Import',
        imageUrl: scrapedData.imageUrl,
        dimensions: {
          width: parseFloat(editedWidth) || scrapedData.dimensions.width,
          height: parseFloat(editedHeight) || scrapedData.dimensions.height,
          depth: parseFloat(editedDepth) || scrapedData.dimensions.depth,
        },
        sourceUrl: scrapedData.sourceUrl,
        generationId: generationId || undefined,
      });

      setState('success');
      toast.success('Product imported successfully!');

      // Close modal and refresh assets after a short delay
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (error: any) {
      setState('error');
      setErrorMessage(error.message || 'Failed to import product');
    }
  };

  const handleClose = () => {
    // Reset all state
    setUrl('');
    setState('idle');
    setScrapedData(null);
    setGenerationId(null);
    setErrorMessage('');
    setEditedName('');
    setEditedCategory('Furniture');
    setEditedWidth('');
    setEditedHeight('');
    setEditedDepth('');
    onClose();
  };

  const handleRetry = () => {
    setState('idle');
    setErrorMessage('');
    setScrapedData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Import from URL</h2>
              <p className="text-sm text-gray-400">
                Paste a product URL to scrape image and specifications
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={state === 'scraping' || state === 'importing'}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* URL Input - Show in idle, scraping, and error states */}
          {(state === 'idle' || state === 'scraping' || state === 'error') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/product/chair"
                  disabled={state === 'scraping'}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Enter a URL from an online furniture store or product page
                </p>
              </div>
            </div>
          )}

          {/* Scraping State */}
          {state === 'scraping' && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-300">Scraping product information...</p>
                  <p className="text-xs text-gray-400 mt-1">
                    This may take a few moments as we fetch the page and extract data.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Preview State */}
          {state === 'preview' && scrapedData && (
            <div className="space-y-4">
              {/* Product Image Preview */}
              {scrapedData.imageUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Image
                  </label>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <img
                      src={scrapedData.imageUrl}
                      alt={scrapedData.name}
                      className="max-h-48 mx-auto rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23374151" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239CA3AF" font-family="sans-serif"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter product name"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Furniture">Furniture</option>
                  <option value="Lighting">Lighting</option>
                  <option value="Decor">Decor</option>
                  <option value="Plants">Plants</option>
                </select>
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dimensions (meters)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Width</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={editedWidth}
                      onChange={(e) => setEditedWidth(e.target.value)}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Height</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={editedHeight}
                      onChange={(e) => setEditedHeight(e.target.value)}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Depth</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={editedDepth}
                      onChange={(e) => setEditedDepth(e.target.value)}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  You can adjust these dimensions if the auto-detected values are incorrect
                </p>
              </div>

              {/* Source URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source URL
                </label>
                <input
                  type="text"
                  value={scrapedData.sourceUrl}
                  disabled
                  className="w-full bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          {/* Importing State */}
          {state === 'importing' && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-300">Importing product...</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Saving product to your asset library.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-300">Product imported successfully!</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Your new asset has been added to the library.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && errorMessage && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-300">Import failed</p>
                  <p className="text-xs text-gray-400 mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700 bg-gray-750">
          {(state === 'idle' || state === 'scraping') && (
            <>
              <button
                onClick={handleClose}
                disabled={state === 'scraping'}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleScrapeUrl}
                disabled={state === 'scraping' || !url.trim()}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {state === 'scraping' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  'Scrape URL'
                )}
              </button>
            </>
          )}

          {state === 'preview' && (
            <>
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Try Another URL
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!editedName.trim()}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Product
              </button>
            </>
          )}

          {state === 'importing' && (
            <button
              disabled
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing...
            </button>
          )}

          {state === 'error' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
