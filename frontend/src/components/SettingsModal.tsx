import React, { useState, useEffect } from 'react';
import { X, Save, Check, Loader2 } from 'lucide-react';
import { settingsApi } from '../lib/api';
import { toast } from 'sonner';
import { useEditorStore } from '../store/editorStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Settings {
  unit_system: string;
  render_quality: string;
  auto_save_interval: string;
  performance_mode: string;
  trellis_api_key?: string;
  openai_api_key?: string;
  anthropic_api_key?: string;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const setUnitSystem = useEditorStore((state) => state.setUnitSystem);

  const [settings, setSettings] = useState<Settings>({
    unit_system: 'metric',
    render_quality: 'high',
    auto_save_interval: '60000',
    performance_mode: '0',
    trellis_api_key: '',
    openai_api_key: '',
    anthropic_api_key: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'ai-keys'>('general');
  const [touchedApiKeys, setTouchedApiKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      // Reset touched keys when modal opens
      setTouchedApiKeys(new Set());
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsApi.getAll();
      setSettings(prev => ({
        ...prev,
        ...data.settings,
      }));
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate API keys that have been touched
    const apiKeyFields = ['trellis_api_key', 'openai_api_key', 'anthropic_api_key'];
    const emptyTouchedKeys: string[] = [];

    for (const field of apiKeyFields) {
      if (touchedApiKeys.has(field)) {
        const value = settings[field as keyof Settings] as string || '';
        // Check if the value is empty or only whitespace
        if (value.trim() === '') {
          emptyTouchedKeys.push(field);
        }
      }
    }

    // If any touched API keys are empty, show error and prevent save
    if (emptyTouchedKeys.length > 0) {
      const fieldNames = emptyTouchedKeys.map(key => {
        switch (key) {
          case 'trellis_api_key': return 'TRELLIS API Key';
          case 'openai_api_key': return 'OpenAI API Key';
          case 'anthropic_api_key': return 'Anthropic API Key';
          default: return key;
        }
      });
      toast.error(`API key value is required for: ${fieldNames.join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      await settingsApi.update(settings);

      // Update the editor store with the new unit system
      if (settings.unit_system === 'metric' || settings.unit_system === 'imperial') {
        setUnitSystem(settings.unit_system);
      }

      toast.success('Settings saved successfully');
      // Reset touched keys after successful save
      setTouchedApiKeys(new Set());
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof Settings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));

    // Track when API key fields are modified
    const apiKeyFields = ['trellis_api_key', 'openai_api_key', 'anthropic_api_key'];
    if (apiKeyFields.includes(key as string)) {
      setTouchedApiKeys(prev => new Set(prev).add(key as string));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#16161D] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A35]">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#1E1E28]"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-[#2A2A35]">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === 'general'
                ? 'bg-[#1E1E28] text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-[#1E1E28]'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('ai-keys')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === 'ai-keys'
                ? 'bg-[#1E1E28] text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-[#1E1E28]'
            }`}
          >
            AI API Keys
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  {/* Unit System */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Unit System
                    </label>
                    <select
                      value={settings.unit_system}
                      onChange={(e) => handleChange('unit_system', e.target.value)}
                      className="w-full px-4 py-2 bg-[#1E1E28] border border-[#2A2A35] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="metric">Metric (meters, cm)</option>
                      <option value="imperial">Imperial (feet, inches)</option>
                    </select>
                  </div>

                  {/* Render Quality */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Render Quality
                    </label>
                    <select
                      value={settings.render_quality}
                      onChange={(e) => handleChange('render_quality', e.target.value)}
                      className="w-full px-4 py-2 bg-[#1E1E28] border border-[#2A2A35] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="ultra">Ultra</option>
                    </select>
                  </div>

                  {/* Auto-save Interval */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Auto-save Interval
                    </label>
                    <select
                      value={settings.auto_save_interval}
                      onChange={(e) => handleChange('auto_save_interval', e.target.value)}
                      className="w-full px-4 py-2 bg-[#1E1E28] border border-[#2A2A35] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="30000">30 seconds</option>
                      <option value="60000">1 minute</option>
                      <option value="120000">2 minutes</option>
                      <option value="300000">5 minutes</option>
                      <option value="0">Disabled</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-400">
                      How often changes are automatically saved
                    </p>
                  </div>

                  {/* Performance Mode */}
                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.performance_mode === '1'}
                        onChange={(e) => handleChange('performance_mode', e.target.checked ? '1' : '0')}
                        className="w-4 h-4 text-blue-500 bg-[#1E1E28] border-[#2A2A35] rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-300">
                        Performance Mode
                      </span>
                    </label>
                    <p className="mt-2 ml-7 text-sm text-gray-400">
                      Reduces visual quality for smoother editing on lower-end hardware
                    </p>
                  </div>
                </div>
              )}

              {/* AI API Keys Tab */}
              {activeTab === 'ai-keys' && (
                <div className="space-y-6">
                  <p className="text-sm text-gray-400 mb-4">
                    API keys are encrypted at rest. Only the last 4 characters are shown for security.
                  </p>

                  {/* TRELLIS API Key */}
                  <div>
                    <label htmlFor="trellis-key" className="block text-sm font-medium text-gray-300 mb-2">
                      TRELLIS API Key
                    </label>
                    <input
                      id="trellis-key"
                      type="text"
                      value={settings.trellis_api_key || ''}
                      onChange={(e) => handleChange('trellis_api_key', e.target.value)}
                      placeholder="Enter your TRELLIS API key"
                      className="w-full px-4 py-2 bg-[#1E1E28] border border-[#2A2A35] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-2 text-sm text-gray-400">
                      Used for photo-to-3D model generation
                    </p>
                  </div>

                  {/* OpenAI API Key */}
                  <div>
                    <label htmlFor="openai-key" className="block text-sm font-medium text-gray-300 mb-2">
                      OpenAI API Key
                    </label>
                    <input
                      id="openai-key"
                      type="text"
                      value={settings.openai_api_key || ''}
                      onChange={(e) => handleChange('openai_api_key', e.target.value)}
                      placeholder="Enter your OpenAI API key"
                      className="w-full px-4 py-2 bg-[#1E1E28] border border-[#2A2A35] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-2 text-sm text-gray-400">
                      Used for AI-powered room reconstruction
                    </p>
                  </div>

                  {/* Anthropic API Key */}
                  <div>
                    <label htmlFor="anthropic-key" className="block text-sm font-medium text-gray-300 mb-2">
                      Anthropic API Key
                    </label>
                    <input
                      id="anthropic-key"
                      type="text"
                      value={settings.anthropic_api_key || ''}
                      onChange={(e) => handleChange('anthropic_api_key', e.target.value)}
                      placeholder="Enter your Anthropic API key"
                      className="w-full px-4 py-2 bg-[#1E1E28] border border-[#2A2A35] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-2 text-sm text-gray-400">
                      Used for advanced AI features
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#2A2A35]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-[#1E1E28]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
