import { useState, useEffect } from 'react';
import { X, Upload, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { aiApi } from '../lib/api';
import { toast } from 'sonner';

interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type GenerationStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

export default function AIGenerationModal({ isOpen, onClose, onSuccess }: AIGenerationModalProps) {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');
  const [category, setCategory] = useState('Furniture');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<number | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStatus('idle');
        setSelectedFile(null);
        setPreviewUrl(null);
        setAssetName('');
        setCategory('Furniture');
        setErrorMessage(null);
        setGenerationId(null);
      }, 300); // Wait for modal animation
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setAssetName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!selectedFile || !assetName.trim()) {
      toast.error('Please provide a photo and asset name');
      return;
    }

    setStatus('uploading');
    setErrorMessage(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('photo', selectedFile);
      formData.append('name', assetName.trim());
      formData.append('category', category);
      formData.append('subcategory', 'Generated');

      // Upload and generate
      setStatus('processing');
      const result = await aiApi.generateFromPhoto(formData);

      setGenerationId(result.generationId);
      setStatus('completed');
      toast.success('3D model generated successfully!');

      // Wait a moment then close and refresh
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('Generation error:', error);
      setStatus('failed');
      setErrorMessage(error.userMessage || error.message || 'Failed to generate model');

      // Extract generation ID from error if available
      if (error.generationId) {
        setGenerationId(error.generationId);
      }
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage(null);
    // Keep the file and inputs so user can try again
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Generate from Photo
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            disabled={status === 'processing' || status === 'uploading'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Status indicator */}
          {status === 'processing' && (
            <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-4 flex items-start gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-300 font-medium">Generating 3D model...</p>
                <p className="text-blue-400 text-sm mt-1">
                  This may take a few moments. Please wait.
                </p>
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="bg-green-900 bg-opacity-30 border border-green-700 rounded p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-300 font-medium">Model generated successfully!</p>
                <p className="text-green-400 text-sm mt-1">
                  Your new asset has been added to the library.
                </p>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 font-medium">Generation failed</p>
                <p className="text-red-400 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* File upload */}
          {!selectedFile ? (
            <div>
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-300 font-medium mb-1">
                  Click to upload furniture photo
                </p>
                <p className="text-xs text-gray-400">
                  PNG, JPG, or WebP (max 10MB)
                </p>
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={status === 'processing' || status === 'uploading'}
              />
            </div>
          ) : (
            <div>
              {/* Preview */}
              <div className="relative">
                <img
                  src={previewUrl || ''}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                {status === 'idle' && (
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Asset name */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Asset Name
                </label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g., Modern Chair"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={status !== 'idle' && status !== 'failed'}
                />
              </div>

              {/* Category */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={status !== 'idle' && status !== 'failed'}
                >
                  <option value="Furniture">Furniture</option>
                  <option value="Decor">Decor</option>
                  <option value="Lighting">Lighting</option>
                  <option value="Plants">Plants</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          {status === 'failed' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={status === 'processing' || status === 'uploading'}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!selectedFile || !assetName.trim() || status === 'processing' || status === 'uploading' || status === 'completed'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {status === 'processing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate 3D Model'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
