'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Monitor, Smartphone, Square, Video } from 'lucide-react';

interface AspectRatioModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSaveSettings: (settings: GenerationSettings) => void;
  currentSettings?: GenerationSettings;
}

export interface GenerationSettings {
  aspectRatio: string;
  guidanceScale?: number;
  strength?: number;
  seed?: number;
  duration?: number;
  resolution?: string;
  outputFormat?: string;
  styleConsistency?: boolean;
  characterSeparation?: number;
  spatialAwareness?: boolean;
}

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square (1:1)', icon: Square, description: 'Perfect for social media' },
  { value: '16:9', label: 'Landscape (16:9)', icon: Monitor, description: 'Widescreen format' },
  { value: '9:16', label: 'Portrait (9:16)', icon: Smartphone, description: 'Mobile/vertical format' },
  { value: '4:3', label: 'Standard (4:3)', icon: Monitor, description: 'Traditional format' },
  { value: '3:4', label: 'Vertical (3:4)', icon: Smartphone, description: 'Portrait orientation' },
  { value: '21:9', label: 'Ultrawide (21:9)', icon: Monitor, description: 'Cinematic format' }
];

const RESOLUTIONS = [
  { value: '1280x720', label: 'HD (720p)' },
  { value: '1920x1080', label: 'Full HD (1080p)' },
  { value: '2560x1440', label: '2K (1440p)' },
  { value: '3840x2160', label: '4K (2160p)' }
];

const OUTPUT_FORMATS = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' }
];

export default function AspectRatioModal({ 
  isOpen, 
  onClose, 
  selectedModel, 
  onSaveSettings, 
  currentSettings 
}: AspectRatioModalProps) {
  const [settings, setSettings] = useState<GenerationSettings>({
    aspectRatio: '1:1',
    guidanceScale: 7.5,
    strength: 0.8,
    seed: Math.floor(Math.random() * 1000000),
    duration: 5,
    resolution: '1280x720',
    outputFormat: 'jpeg',
    styleConsistency: true,
    characterSeparation: 0.7,
    spatialAwareness: true,
    ...currentSettings
  });

  const [activeTab, setActiveTab] = useState<'aspect' | 'quality' | 'advanced'>('aspect');

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const isImageModel = selectedModel.includes('nano-banana') || 
                       selectedModel.includes('seedream') || 
                       selectedModel.includes('flux');

  const isVideoModel = selectedModel.includes('veo3') || 
                       selectedModel.includes('minimax') || 
                       selectedModel.includes('kling') ||
                       selectedModel.includes('video');

  const handleSave = () => {
    onSaveSettings(settings);
    onClose();
  };

  const handleAspectRatioChange = (ratio: string) => {
    setSettings(prev => ({ ...prev, aspectRatio: ratio }));
  };

  const handleParameterChange = (key: keyof GenerationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Generation Settings</h2>
              <p className="text-sm text-gray-400">Model: {selectedModel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'aspect', label: 'Aspect Ratio', icon: Square },
            { id: 'quality', label: 'Quality', icon: Monitor },
            { id: 'advanced', label: 'Advanced', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Aspect Ratio Tab */}
          {activeTab === 'aspect' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Choose Aspect Ratio</h3>
                <div className="grid grid-cols-2 gap-3">
                  {ASPECT_RATIOS.map(ratio => (
                    <button
                      key={ratio.value}
                      onClick={() => handleAspectRatioChange(ratio.value)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        settings.aspectRatio === ratio.value
                          ? 'border-purple-400 bg-purple-400/10 text-purple-400'
                          : 'border-gray-700 hover:border-gray-600 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ratio.icon className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-medium">{ratio.label}</div>
                          <div className="text-xs opacity-75">{ratio.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Video-specific settings */}
              {isVideoModel && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Video Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Duration (seconds)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={settings.duration}
                        onChange={(e) => handleParameterChange('duration', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>1s</span>
                        <span className="font-medium">{settings.duration}s</span>
                        <span>10s</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Resolution
                      </label>
                      <select
                        value={settings.resolution}
                        onChange={(e) => handleParameterChange('resolution', e.target.value)}
                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                      >
                        {RESOLUTIONS.map(res => (
                          <option key={res.value} value={res.value}>{res.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quality Tab */}
          {activeTab === 'quality' && (
            <div className="space-y-6">
              {/* Image-specific settings */}
              {isImageModel && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Guidance Scale: {settings.guidanceScale}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={settings.guidanceScale}
                      onChange={(e) => handleParameterChange('guidanceScale', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>More Creative</span>
                      <span>More Faithful</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Strength: {settings.strength}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={settings.strength}
                      onChange={(e) => handleParameterChange('strength', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>More Original</span>
                      <span>More Modified</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Seed (for reproducible results)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={settings.seed}
                        onChange={(e) => handleParameterChange('seed', parseInt(e.target.value))}
                        className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                      />
                      <button
                        onClick={() => handleParameterChange('seed', Math.floor(Math.random() * 1000000))}
                        className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        Random
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Output Format
                </label>
                <select
                  value={settings.outputFormat}
                  onChange={(e) => handleParameterChange('outputFormat', e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                >
                  {OUTPUT_FORMATS.map(format => (
                    <option key={format.value} value={format.value}>{format.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && isImageModel && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Style Consistency</label>
                    <p className="text-xs text-gray-400">Maintain consistent style throughout</p>
                  </div>
                  <button
                    onClick={() => handleParameterChange('styleConsistency', !settings.styleConsistency)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.styleConsistency ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.styleConsistency ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Character Separation: {settings.characterSeparation}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={settings.characterSeparation}
                    onChange={(e) => handleParameterChange('characterSeparation', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>More Blended</span>
                    <span>More Separated</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Spatial Awareness</label>
                    <p className="text-xs text-gray-400">Better character positioning</p>
                  </div>
                  <button
                    onClick={() => handleParameterChange('spatialAwareness', !settings.spatialAwareness)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.spatialAwareness ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.spatialAwareness ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
