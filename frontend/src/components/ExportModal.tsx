import React, { useState } from 'react';
import { X, Download, FileText, Image, Box } from 'lucide-react';
import { exportApi } from '../lib/api';
import { toast } from 'sonner';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  currentFloorId?: number;
  currentFloorName?: string;
}

type ExportType = 'floorplan' | 'screenshot' | 'scene';

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  currentFloorId,
  currentFloorName
}) => {
  const [selectedType, setSelectedType] = useState<ExportType>('floorplan');
  const [isExporting, setIsExporting] = useState(false);
  const [includeAllFloors, setIncludeAllFloors] = useState(true);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);

      if (selectedType === 'floorplan') {
        // Export floor plan as PDF
        const floorId = includeAllFloors ? undefined : currentFloorId;
        const blob = await exportApi.exportFloorPlan(projectId, floorId, 'pdf');

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `${projectName.replace(/[^a-z0-9]/gi, '_')}_floorplan${includeAllFloors ? '_all_floors' : `_${currentFloorName?.replace(/[^a-z0-9]/gi, '_')}`}.pdf`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success('Floor plan exported successfully!');
        onClose();
      } else if (selectedType === 'screenshot') {
        // Capture screenshot from Three.js canvas
        const canvas = document.querySelector('canvas');
        if (!canvas) {
          throw new Error('Canvas not found');
        }

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            toast.error('Failed to capture screenshot');
            setIsExporting(false);
            return;
          }

          // Create download link
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const fileName = `${projectName.replace(/[^a-z0-9]/gi, '_')}_screenshot_${new Date().getTime()}.png`;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          toast.success('Screenshot captured successfully!');
          setIsExporting(false);
          onClose();
        }, 'image/png', 1.0); // High quality PNG
      } else if (selectedType === 'scene') {
        // Export 3D scene as GLB
        // Dispatch custom event to request scene export from Viewport3D
        const exportPromise = new Promise<any>((resolve, reject) => {
          const handler = (event: any) => {
            window.removeEventListener('sceneExportReady', handler);
            if (event.detail.error) {
              reject(new Error(event.detail.error));
            } else {
              resolve(event.detail.scene);
            }
          };
          window.addEventListener('sceneExportReady', handler);

          // Request scene export
          window.dispatchEvent(new CustomEvent('requestSceneExport'));

          // Timeout after 10 seconds
          setTimeout(() => {
            window.removeEventListener('sceneExportReady', handler);
            reject(new Error('Export timeout'));
          }, 10000);
        });

        const scene = await exportPromise;

        // Use GLTFExporter to export the scene
        const exporter = new GLTFExporter();
        exporter.parse(
          scene,
          (result) => {
            // result is an ArrayBuffer for GLB format
            const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fileName = `${projectName.replace(/[^a-z0-9]/gi, '_')}_scene.glb`;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success('3D scene exported successfully!');
            setIsExporting(false);
            onClose();
          },
          (error) => {
            console.error('GLTFExporter error:', error);
            toast.error('Failed to export 3D scene');
            setIsExporting(false);
          },
          { binary: true } // Export as GLB (binary format)
        );
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(error.userMessage || 'Failed to export. Please try again.');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1E1E28] rounded-lg shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A35]">
          <h2 className="text-xl font-semibold text-white">Export Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isExporting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Export Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              Export Type
            </label>

            {/* Floor Plan PDF */}
            <button
              onClick={() => setSelectedType('floorplan')}
              className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                selectedType === 'floorplan'
                  ? 'border-blue-600 bg-blue-600/10'
                  : 'border-[#2A2A35] hover:border-[#3A3A45]'
              }`}
              disabled={isExporting}
            >
              <div className={`mt-1 ${selectedType === 'floorplan' ? 'text-blue-600' : 'text-gray-400'}`}>
                <FileText size={24} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-white">Floor Plan (PDF)</div>
                <div className="text-sm text-gray-400 mt-1">
                  2D top-down view with room dimensions and labels
                </div>
              </div>
            </button>

            {/* Screenshot */}
            <button
              onClick={() => setSelectedType('screenshot')}
              className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                selectedType === 'screenshot'
                  ? 'border-blue-600 bg-blue-600/10'
                  : 'border-[#2A2A35] hover:border-[#3A3A45]'
              }`}
              disabled={isExporting}
            >
              <div className={`mt-1 ${selectedType === 'screenshot' ? 'text-blue-600' : 'text-gray-400'}`}>
                <Image size={24} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-white">Screenshot (PNG)</div>
                <div className="text-sm text-gray-400 mt-1">
                  High-resolution render from current camera view
                </div>
              </div>
            </button>

            {/* 3D Scene */}
            <button
              onClick={() => setSelectedType('scene')}
              className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                selectedType === 'scene'
                  ? 'border-blue-600 bg-blue-600/10'
                  : 'border-[#2A2A35] hover:border-[#3A3A45]'
              }`}
              disabled={isExporting}
            >
              <div className={`mt-1 ${selectedType === 'scene' ? 'text-blue-600' : 'text-gray-400'}`}>
                <Box size={24} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-white">3D Scene (GLB)</div>
                <div className="text-sm text-gray-400 mt-1">
                  Export full 3D model for use in other applications
                </div>
              </div>
            </button>
          </div>

          {/* Floor Selection (for floor plan only) */}
          {selectedType === 'floorplan' && currentFloorId && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Floors to Include
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={includeAllFloors}
                    onChange={() => setIncludeAllFloors(true)}
                    className="w-4 h-4 text-blue-600 bg-[#16161D] border-[#2A2A35] focus:ring-blue-600 focus:ring-2"
                    disabled={isExporting}
                  />
                  <span className="text-sm text-white">All floors</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={!includeAllFloors}
                    onChange={() => setIncludeAllFloors(false)}
                    className="w-4 h-4 text-blue-600 bg-[#16161D] border-[#2A2A35] focus:ring-blue-600 focus:ring-2"
                    disabled={isExporting}
                  />
                  <span className="text-sm text-white">
                    Current floor only ({currentFloorName || 'Ground Floor'})
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#2A2A35]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
