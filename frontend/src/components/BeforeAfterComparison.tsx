import { useState, useRef, useEffect } from 'react';
import { X, SplitSquareHorizontal, Camera, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeAfterComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  beforeImage: string; // URL to the "before" photo
  afterCanvas?: HTMLCanvasElement | null; // Reference to the 3D viewport canvas
  onCapture?: () => Promise<string>; // Function to capture current viewport as data URL
}

export default function BeforeAfterComparison({
  isOpen,
  onClose,
  beforeImage,
  afterCanvas,
  onCapture,
}: BeforeAfterComparisonProps) {
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'slider' | 'sideBySide'>('slider');
  const containerRef = useRef<HTMLDivElement>(null);

  // Capture the "after" image on mount or when requested
  useEffect(() => {
    if (isOpen && !afterImage) {
      captureAfter();
    }
  }, [isOpen]);

  const captureAfter = async () => {
    try {
      if (onCapture) {
        const dataUrl = await onCapture();
        setAfterImage(dataUrl);
      } else if (afterCanvas) {
        const dataUrl = afterCanvas.toDataURL('image/png');
        setAfterImage(dataUrl);
      } else {
        toast.error('Unable to capture viewport');
      }
    } catch (error) {
      console.error('Error capturing after image:', error);
      toast.error('Failed to capture viewport');
    }
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleDownload = () => {
    if (!afterImage) return;

    // Create a combined image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const beforeImg = new Image();
    const afterImg = new Image();

    beforeImg.onload = () => {
      afterImg.src = afterImage;
    };

    afterImg.onload = () => {
      // Side by side layout
      canvas.width = beforeImg.width * 2 + 20;
      canvas.height = beforeImg.height;

      // Draw background
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw before
      ctx.drawImage(beforeImg, 0, 0);

      // Draw after
      ctx.drawImage(afterImg, beforeImg.width + 20, 0, beforeImg.width, beforeImg.height);

      // Add labels
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(10, 10, 80, 30);
      ctx.fillRect(beforeImg.width + 30, 10, 80, 30);

      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.fillText('Before', 25, 32);
      ctx.fillText('After', beforeImg.width + 45, 32);

      // Download
      const link = document.createElement('a');
      link.download = `before-after-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Comparison image downloaded');
    };

    beforeImg.src = beforeImage;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <SplitSquareHorizontal className="w-5 h-5 text-blue-400" />
            Before / After Comparison
          </h2>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('slider')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'slider'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Slider
              </button>
              <button
                onClick={() => setViewMode('sideBySide')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'sideBySide'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Side by Side
              </button>
            </div>

            <button
              onClick={captureAfter}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Recapture"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              onClick={handleDownload}
              disabled={!afterImage}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {viewMode === 'slider' ? (
            /* Slider View */
            <div
              ref={containerRef}
              className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden cursor-ew-resize select-none"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
            >
              {/* Before Image (Full width, clipped by slider) */}
              <div className="absolute inset-0">
                <img
                  src={beforeImage}
                  alt="Before"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* After Image (Clipped to right of slider) */}
              {afterImage && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                >
                  <img
                    src={afterImage}
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Slider Handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                onMouseDown={handleMouseDown}
                onTouchStart={() => setIsDragging(true)}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <div className="flex items-center gap-0.5">
                    <div className="w-0.5 h-4 bg-gray-400 rounded" />
                    <div className="w-0.5 h-4 bg-gray-400 rounded" />
                  </div>
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 rounded text-white text-sm">
                Before
              </div>
              <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 rounded text-white text-sm">
                After
              </div>

              {/* Loading placeholder */}
              {!afterImage && (
                <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gray-800 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Capturing viewport...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Side by Side View */
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <img
                  src={beforeImage}
                  alt="Before"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 rounded text-white text-sm">
                  Before
                </div>
              </div>

              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {afterImage ? (
                  <img
                    src={afterImage}
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Capturing viewport...</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 rounded text-white text-sm">
                  After
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="px-6 pb-4">
          <p className="text-gray-500 text-sm text-center">
            {viewMode === 'slider'
              ? 'Drag the slider to compare before and after'
              : 'Side-by-side comparison of original photo and 3D render'}
          </p>
        </div>
      </div>
    </div>
  );
}
