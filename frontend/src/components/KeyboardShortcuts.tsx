import { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: ['W', 'A', 'S', 'D'], description: 'Move (First-Person Mode)' },
    { keys: ['Mouse Drag'], description: 'Rotate view' },
    { keys: ['Scroll'], description: 'Zoom in/out' },
    { keys: ['Middle Click + Drag'], description: 'Pan view' },
  ]},
  { category: 'Tools', items: [
    { keys: ['V'], description: 'Select tool' },
    { keys: ['R'], description: 'Draw room' },
    { keys: ['M'], description: 'Measure tool' },
    { keys: ['L'], description: 'Place light' },
    { keys: ['F'], description: 'First-person mode' },
    { keys: ['G'], description: 'Toggle grid' },
  ]},
  { category: 'Edit', items: [
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    { keys: ['Delete'], description: 'Delete selected' },
    { keys: ['Escape'], description: 'Deselect / Exit mode' },
  ]},
  { category: 'View', items: [
    { keys: ['N'], description: 'Toggle day/night' },
    { keys: ['1'], description: 'Front view' },
    { keys: ['2'], description: 'Side view' },
    { keys: ['3'], description: 'Top view' },
  ]},
];

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  // Listen for Ctrl+K / Cmd+K to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, keyIdx) => (
                          <span key={keyIdx}>
                            {keyIdx > 0 && <span className="text-gray-500 mx-1">+</span>}
                            <kbd className="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200 font-mono">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700 bg-gray-900/50">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">K</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook to register keyboard shortcuts globally
export function useKeyboardShortcuts() {
  const setCurrentTool = useEditorStore((state) => state.setCurrentTool);
  const setGridVisible = useEditorStore((state) => state.setGridVisible);
  const gridVisible = useEditorStore((state) => state.gridVisible);
  const setLightingMode = useEditorStore((state) => state.setLightingMode);
  const lightingMode = useEditorStore((state) => state.lightingMode);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
          setCurrentTool('select');
          break;
        case 'r':
          setCurrentTool('draw-wall');
          break;
        case 'm':
          setCurrentTool('measure');
          break;
        case 'l':
          setCurrentTool('place-light');
          break;
        case 'f':
          setCurrentTool('first-person');
          break;
        case 'g':
          setGridVisible(!gridVisible);
          break;
        case 'n':
          setLightingMode(lightingMode === 'day' ? 'night' : 'day');
          break;
      }
      
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTool, setGridVisible, gridVisible, setLightingMode, lightingMode, undo, redo]);
}
