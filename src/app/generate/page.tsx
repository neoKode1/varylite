'use client';

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Upload, Download, Loader2, X, Trash2, ChevronDown } from 'lucide-react';
// vARYLite - Browser-based storage only

// Types
interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

interface GeneratedScene {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

interface GenerationHistory {
  id: string;
  prompt: string;
  scenes: GeneratedScene[];
  timestamp: number;
}

export default function GeneratePage() {
  // State management
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [sceneDescription, setSceneDescription] = useState('');
  const [thingsToAvoid, setThingsToAvoid] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [imagesToGenerate, setImagesToGenerate] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScenes, setGeneratedScenes] = useState<GeneratedScene[]>([]);
  const [generationHistory, setGenerationHistory] = useState<GenerationHistory[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [userFalApiKey, setUserFalApiKey] = useState('');
  const [useCustomApiKey, setUseCustomApiKey] = useState(false);

  // Hooks - vARYLite browser storage
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  // Browser storage functions for vARYLite
  const saveToLocalStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(`varylite_${key}`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, []);

  const loadFromLocalStorage = useCallback((key: string) => {
    try {
      const data = localStorage.getItem(`varylite_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }, []);

  // Load saved data on component mount
  useEffect(() => {
    const savedScenes = loadFromLocalStorage('generatedScenes') || [];
    const savedHistory = loadFromLocalStorage('generationHistory') || [];
    const savedApiKey = loadFromLocalStorage('userFalApiKey') || '';
    const savedUseCustomKey = loadFromLocalStorage('useCustomApiKey') || false;
    
    setGeneratedScenes(savedScenes);
    setGenerationHistory(savedHistory);
    setUserFalApiKey(savedApiKey);
    setUseCustomApiKey(savedUseCustomKey);
  }, [loadFromLocalStorage]);

  // Save API key settings when they change
  useEffect(() => {
    if (useCustomApiKey) {
      saveToLocalStorage('userFalApiKey', userFalApiKey);
      saveToLocalStorage('useCustomApiKey', useCustomApiKey);
    }
  }, [userFalApiKey, useCustomApiKey, saveToLocalStorage]);

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showFullscreen) {
        if (e.key === 'ArrowLeft') {
          setSelectedImageIndex(prev => 
            prev > 0 ? prev - 1 : generatedScenes.length - 1
          );
        } else if (e.key === 'ArrowRight') {
          setSelectedImageIndex(prev => 
            prev < generatedScenes.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === 'Escape') {
          setShowFullscreen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullscreen, generatedScenes.length]);

  // Style options - matching the screenshot exactly
  const styleOptions = [
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'watercolor', label: 'Watercolor' },
    { id: 'anime', label: 'Anime' },
    { id: 'photorealistic', label: 'Photorealistic' },
    { id: 'cyberpunk', label: 'Cyberpunk' },
  ];

  // Model options - integrating the core models with icons
  const modelOptions = useMemo(() => [
    { id: 'nano-banana', label: 'Nano Banana', type: 'image-edit', cost: 3, icon: '/flux.png' },
    { id: 'seedance-4-edit', label: 'Seedance 4 Edit', type: 'video', cost: 8, icon: '/bytedance-color.svg' },
    { id: 'gemini-flash-edit', label: 'Gemini Flash Edit', type: 'image-edit', cost: 2, icon: '/gemini-color.svg' },
    { id: 'minimax-2-0', label: 'Mini Max 2.0', type: 'video', cost: 10, icon: '/minimax-color.svg' },
    { id: 'kling-avatar', label: 'KlingAvatar', type: 'video', cost: 15, icon: '/kling-color.svg' },
    { id: 'minimax-endframe', label: 'Mini Max End Frame', type: 'video', cost: 12, icon: '/minimax-color.svg' },
  ], []);

  const [selectedModel, setSelectedModel] = useState(modelOptions[0]?.id || '');

  // Click outside handler for dropdown
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsModelDropdownOpen(false);
    }
  }, []);

  // Add/remove click outside listener
  useEffect(() => {
    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isModelDropdownOpen, handleClickOutside]);

  // Model selection handlers
  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    setIsModelDropdownOpen(false);
  }, []);

  const toggleModelDropdown = useCallback(() => {
    setIsModelDropdownOpen(!isModelDropdownOpen);
  }, [isModelDropdownOpen]);

  // File handling
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  }, []);

  // Generation
  const handleGenerate = useCallback(async () => {
    if (!sceneDescription.trim()) return;
    if (uploadedFiles.length === 0) return;

    setIsGenerating(true);
    try {
      const selectedModelConfig = modelOptions.find(m => m.id === selectedModel);
      if (!selectedModelConfig) {
        throw new Error('Invalid model selected');
      }

      console.log(`🚀 [vARYLite] Starting generation with ${selectedModelConfig.label} model...`);
      console.log(`📊 [vARYLite] Model details:`, {
        id: selectedModelConfig.id,
        type: selectedModelConfig.type,
        cost: selectedModelConfig.cost,
        prompt: sceneDescription.substring(0, 100) + (sceneDescription.length > 100 ? '...' : ''),
        filesCount: uploadedFiles.length,
        imagesToGenerate,
      });
      
      // Credit checking removed - proceeding with generation
      console.log(`✅ [vARYLite] Proceeding with generation (browser-based storage).`);

      // Prepare the request based on model type
      let apiEndpoint = '';
      let requestBody: any = {};

      // Upload images to get URLs first
      console.log(`📤 [vARYLite] Starting image upload process for ${uploadedFiles.length} files...`);
      const imageUrls: string[] = [];
      
      for (const uploadedFile of uploadedFiles) {
        const formData = new FormData();
        formData.append('file', uploadedFile.file);
        
        // Add API key header if user provided one
        const headers: Record<string, string> = {};
        if (useCustomApiKey && userFalApiKey) {
          headers['X-Fal-API-Key'] = userFalApiKey;
          console.log(`🔑 [vARYLite] Using user's Fal.ai API key`);
        }
        
        const uploadResponse = await fetch('/api/fal/upload', {
          method: 'POST',
          headers,
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }
        
        const uploadData = await uploadResponse.json();
        imageUrls.push(uploadData.url);
        console.log(`📤 [vARYLite] Uploaded image: ${uploadData.url}`);
      }

      console.log(`✅ [vARYLite] All images uploaded successfully:`, imageUrls);

      // Prepare request based on model
      switch (selectedModel) {
        case 'nano-banana':
          apiEndpoint = '/api/fal/image-edit';
          requestBody = {
            model: 'nano-banana-edit',
            image_url: imageUrls[0],
            prompt: sceneDescription,
            negative_prompt: thingsToAvoid
          };
          break;

        case 'seedance-4-edit':
          apiEndpoint = '/api/fal/seedream-4-edit';
          requestBody = {
            prompt: sceneDescription,
            images: imageUrls.map(url => url.split(',')[1] || url),
            mimeTypes: uploadedFiles.map(() => 'image/jpeg')
          };
          break;

        case 'gemini-flash-edit':
          apiEndpoint = '/api/vary-character';
          requestBody = {
            imageUrls,
            prompt: sceneDescription
          };
          break;

        case 'minimax-2-0':
          apiEndpoint = '/api/minimax-2';
          requestBody = {
            prompt: sceneDescription,
            image_url: imageUrls[0]
          };
          break;

        case 'kling-avatar':
          apiEndpoint = '/api/kling-ai-avatar';
          requestBody = {
            prompt: sceneDescription,
            image_url: imageUrls[0]
          };
          break;

        case 'minimax-endframe':
          if (imageUrls.length < 2) {
            throw new Error('End Frame model requires exactly 2 images');
          }
          apiEndpoint = '/api/endframe';
          requestBody = {
            firstImage: imageUrls[0],
            secondImage: imageUrls[1],
            prompt: sceneDescription
          };
          break;

        default:
          throw new Error('Unknown model selected');
      }

      console.log(`🎯 [vARYLite] Making API call to: ${apiEndpoint}`);
      console.log(`📋 [vARYLite] Request body:`, requestBody);

      // Prepare headers with optional API key
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (useCustomApiKey && userFalApiKey) {
        headers['X-Fal-API-Key'] = userFalApiKey;
        console.log(`🔑 [vARYLite] Using user's Fal.ai API key for generation`);
      }

      // Make the API call
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ [vARYLite] API response received:`, result);

      // Process the response
      let newScenes: GeneratedScene[] = [];
      
      if (result.success && result.images) {
        newScenes = result.images.map((url: string, index: number) => ({
          id: `scene-${Date.now()}-${index}`,
          url,
          prompt: sceneDescription,
          timestamp: Date.now(),
        }));
        console.log(`🖼️ [vARYLite] Created ${newScenes.length} image scenes:`, newScenes);
      } else if (result.videoUrl) {
        newScenes = [{
          id: `scene-${Date.now()}`,
          url: result.videoUrl,
          prompt: sceneDescription,
          timestamp: Date.now(),
        }];
        console.log(`🎬 [vARYLite] Created video scene:`, newScenes);
      }

      console.log(`🎉 [vARYLite] Setting generated scenes:`, newScenes);
      setGeneratedScenes(newScenes);
      
      // Add to history
      const historyEntry: GenerationHistory = {
        id: Math.random().toString(36).substr(2, 9),
        prompt: sceneDescription,
        scenes: newScenes,
        timestamp: Date.now(),
      };
      console.log(`📚 [vARYLite] Adding to history:`, historyEntry);
      const updatedHistory = [historyEntry, ...generationHistory];
      setGenerationHistory(updatedHistory);
      
      // Save to browser storage
      saveToLocalStorage('generatedScenes', newScenes);
      saveToLocalStorage('generationHistory', updatedHistory);
      console.log(`💾 [vARYLite] Saved to browser storage`);

      console.log(`🎉 [vARYLite] Generation completed successfully with ${selectedModelConfig.label}!`);

    } catch (error) {
      console.error('Generation failed:', error);
      alert(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [sceneDescription, uploadedFiles, imagesToGenerate, selectedModel, modelOptions, generationHistory, saveToLocalStorage, useCustomApiKey, userFalApiKey]);

  const downloadScene = useCallback((scene: GeneratedScene) => {
    const link = document.createElement('a');
    link.href = scene.url;
    link.download = `scene-${scene.id}.jpg`;
    link.click();
  }, []);

  const deleteScene = useCallback((sceneId: string) => {
    const updatedScenes = generatedScenes.filter(scene => scene.id !== sceneId);
    setGeneratedScenes(updatedScenes);
    saveToLocalStorage('generatedScenes', updatedScenes);
  }, [generatedScenes, saveToLocalStorage]);

  const deleteHistoryEntry = useCallback((historyId: string) => {
    const updatedHistory = generationHistory.filter(entry => entry.id !== historyId);
    setGenerationHistory(updatedHistory);
    saveToLocalStorage('generationHistory', updatedHistory);
  }, [generationHistory, saveToLocalStorage]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">vARYLite</h1>
          <p className="text-gray-400">Free AI Scene Generator - No registration required</p>
        </div>

        {/* API Key Section */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">🔑 Fal.ai API Key (Optional)</h3>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useCustomApiKey"
                checked={useCustomApiKey}
                onChange={(e) => setUseCustomApiKey(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-500 rounded focus:ring-blue-500"
              />
              <label htmlFor="useCustomApiKey" className="text-sm text-gray-300">
                Use my own API key
              </label>
            </div>
          </div>
          
          {useCustomApiKey && (
            <div className="space-y-3">
              <input
                type="password"
                value={userFalApiKey}
                onChange={(e) => setUserFalApiKey(e.target.value)}
                placeholder="Enter your Fal.ai API key (fal_...)"
                className="w-full p-3 bg-gray-700 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <div className="text-xs text-gray-400 space-y-1">
                <p>• Your API key is stored locally in your browser</p>
                <p>• Get your free API key at <a href="https://fal.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">fal.ai</a></p>
                <p>• Using your own key ensures unlimited generations</p>
              </div>
            </div>
          )}
          
          {!useCustomApiKey && (
            <div className="text-sm text-gray-400">
              <p>💡 <strong>Tip:</strong> Add your own Fal.ai API key for unlimited generations and faster processing!</p>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8">
          
          {/* Left Column - Input and Configuration */}
          <div className="bg-gray-800 rounded-lg p-6 space-y-6">
            
            {/* 1. Upload Image(s) */}
            <div>
              <h3 className="text-lg font-semibold mb-3">1. Upload Image(s)</h3>
              <div
                className="border-2 border-dashed border-gray-500 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-700"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-300 mb-2">Choose file(s)...</p>
                <p className="text-gray-400 text-sm">or drag and drop them here.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-2 bg-gray-700 rounded">
                      <img src={file.preview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                      <div className="flex-1">
                        <p className="text-sm text-white truncate">{file.file.name}</p>
                        <p className="text-xs text-gray-400">{(file.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Describe Your Scene */}
            <div>
              <h3 className="text-lg font-semibold mb-3">2. Describe Your Scene</h3>
              <textarea
                value={sceneDescription}
                onChange={(e) => setSceneDescription(e.target.value)}
                placeholder="Describe what you want to create..."
                className="w-full h-32 p-3 bg-gray-700 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:border-gray-400 focus:outline-none resize-none"
              />
            </div>

            {/* 3. Things to Avoid */}
            <div>
              <h3 className="text-lg font-semibold mb-3">3. (Optional) Things to Avoid</h3>
              <textarea
                value={thingsToAvoid}
                onChange={(e) => setThingsToAvoid(e.target.value)}
                placeholder="e.g., blurry, text, extra fingers"
                className="w-full h-24 p-3 bg-gray-700 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:border-gray-400 focus:outline-none resize-none"
              />
            </div>

            {/* 4. Style Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-3">4. Style</h3>
              <div className="grid grid-cols-2 gap-2">
                {styleOptions.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedStyle === style.id
                        ? 'border-red-500 bg-red-500/10 text-red-400'
                        : 'border-gray-500 bg-gray-700 text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Model Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-3">5. Select Model</h3>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleModelDropdown}
                  className="w-full p-4 bg-gray-700 border border-gray-500 rounded-lg text-left hover:bg-gray-600 transition-colors flex items-center gap-3"
                >
                  {modelOptions.find(m => m.id === selectedModel) && (
                    <>
                      <img
                        src={modelOptions.find(m => m.id === selectedModel)!.icon}
                        alt={modelOptions.find(m => m.id === selectedModel)!.label}
                        className="w-8 h-8 rounded object-contain"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-white">{modelOptions.find(m => m.id === selectedModel)!.label}</div>
                        <div className="text-xs text-gray-400">{modelOptions.find(m => m.id === selectedModel)!.type} • {modelOptions.find(m => m.id === selectedModel)!.cost} credits</div>
                      </div>
                    </>
                  )}
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isModelDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-500 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {modelOptions.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleModelSelect(model.id)}
                        className={`w-full p-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 ${
                          selectedModel === model.id ? 'bg-gray-700' : ''
                        }`}
                      >
                        <img
                          src={model.icon}
                          alt={model.label}
                          className="w-6 h-6 rounded object-contain"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-white">{model.label}</div>
                          <div className="text-xs text-gray-400">{model.type} • {model.cost} credits</div>
                        </div>
                        {selectedModel === model.id && (
                          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !sceneDescription.trim() || uploadedFiles.length === 0}
              className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Scene'
              )}
            </button>
          </div>

          {/* Right Column - Output */}
          <div className="space-y-6">
            
            {/* Generated Scenes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Generated Scenes</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImagesToGenerate(Math.max(1, imagesToGenerate - 1))}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 bg-gray-700 rounded text-sm">{imagesToGenerate}</span>
                  <button
                    onClick={() => setImagesToGenerate(Math.min(8, imagesToGenerate + 1))}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 min-h-[400px]">
                {isGenerating ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p className="text-gray-400">Generating scenes...</p>
                    </div>
                  </div>
                ) : generatedScenes.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {generatedScenes.map((scene, index) => (
                      <div key={scene.id} className="relative group cursor-pointer" onClick={() => {
                        setSelectedImageIndex(index);
                        setShowFullscreen(true);
                      }}>
                        <img
                          src={scene.url}
                          alt={scene.prompt}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadScene(scene);
                              }}
                              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteScene(scene.id);
                              }}
                              className="p-2 bg-red-500 bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No scenes generated yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Gallery at Bottom Right */}
        {generatedScenes.length > 0 && (
          <div className="fixed bottom-6 right-6 w-80 bg-gray-800 rounded-lg p-4 shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Gallery</h3>
              <span className="text-sm text-gray-400">
                {selectedImageIndex + 1} / {generatedScenes.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={() => setSelectedImageIndex(prev => 
                    prev > 0 ? prev - 1 : generatedScenes.length - 1
                  )}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                >
                  ←
                </button>
                <button
                  onClick={() => setShowFullscreen(true)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                >
                  Fullscreen
                </button>
                <button
                  onClick={() => setSelectedImageIndex(prev => 
                    prev < generatedScenes.length - 1 ? prev + 1 : 0
                  )}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                >
                  →
                </button>
              </div>
              
              {/* Current Image */}
              {generatedScenes[selectedImageIndex] && (
                <div className="relative">
                  <img
                    src={generatedScenes[selectedImageIndex].url}
                    alt={generatedScenes[selectedImageIndex].prompt}
                    className="w-full h-32 object-cover rounded-lg cursor-pointer"
                    onClick={() => setShowFullscreen(true)}
                  />
                  <p className="text-xs text-gray-400 mt-2 truncate">
                    {generatedScenes[selectedImageIndex].prompt}
                  </p>
                </div>
              )}
              
              {/* Thumbnail Strip */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {generatedScenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-12 h-12 rounded ${
                      index === selectedImageIndex ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <img
                      src={scene.url}
                      alt={scene.prompt}
                      className="w-full h-full object-cover rounded"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Modal */}
        {showFullscreen && generatedScenes[selectedImageIndex] && (
          <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
            <div className="relative max-w-7xl max-h-full p-4">
              <button
                onClick={() => setShowFullscreen(false)}
                className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10"
              >
                ✕
              </button>
              
              <img
                src={generatedScenes[selectedImageIndex].url}
                alt={generatedScenes[selectedImageIndex].prompt}
                className="max-w-full max-h-full object-contain"
              />
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center text-white">
                <p className="text-lg mb-2">{generatedScenes[selectedImageIndex].prompt}</p>
                <p className="text-sm text-gray-300">
                  {selectedImageIndex + 1} / {generatedScenes.length}
                </p>
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={() => setSelectedImageIndex(prev => 
                      prev > 0 ? prev - 1 : generatedScenes.length - 1
                    )}
                    className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => downloadScene(generatedScenes[selectedImageIndex])}
                    className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => setSelectedImageIndex(prev => 
                      prev < generatedScenes.length - 1 ? prev + 1 : 0
                    )}
                    className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}