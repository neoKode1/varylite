'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, Download, Loader2, RotateCcw, Camera, Sparkles, Images, X, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UploadedImage, ProcessingState, CharacterVariation } from '@/types/gemini';

const BASIC_PROMPTS = [
  'Show this character from the side profile',
  'Display this character from behind',
  'Show this character at a 3/4 angle',
  'Generate this character in an action pose',
  'Show this character from a low angle view',
  'Display this character from above looking down'
];

const EXTENDED_PROMPTS = [
  // Close-up shots
  'Close-up shot of this character',
  'Extreme close-up of this character\'s face',
  'Macro shot focusing on character details',
  
  // Angle variations
  'Low angle shot looking up at this character',
  'High angle shot looking down at this character',
  'Dutch angle (tilted) shot of this character',
  'Bird\'s eye view of this character from above',
  'Worm\'s eye view of this character from below',
  
  // Distance variations
  'Extreme wide shot of this character',
  'Wide shot showing full body of this character',
  'Medium shot of this character (waist up)',
  'Medium close-up of this character (chest up)',
  'Over-the-shoulder view of this character',
  
  // Dynamic angles
  'Three-quarter back view of this character',
  'Profile silhouette of this character',
  'Dramatic side lighting on this character',
  'Character from a diagonal perspective',
  'Upward angle emphasizing character height',
  
  // Artistic perspectives
  'Cinematic wide angle of this character',
  'Portrait style shot of this character',
  'Environmental shot with character in scene',
  'Dynamic action angle of this character',
  'Heroic upward angle of this character',
  'Intimate close perspective of this character'
];

interface StoredVariation extends CharacterVariation {
  timestamp: number;
  originalPrompt: string;
  originalImagePreview?: string;
}

export default function Home() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentStep: ''
  });
  const [variations, setVariations] = useState<CharacterVariation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<StoredVariation[]>([]);
  const [showGallery, setShowGallery] = useState(true);
  const [showExtendedPrompts, setShowExtendedPrompts] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState<number>(0);

  // Load gallery from localStorage on component mount
  useEffect(() => {
    const savedGallery = localStorage.getItem('varyai-gallery');
    if (savedGallery) {
      try {
        setGallery(JSON.parse(savedGallery));
      } catch (error) {
        console.error('Error loading gallery from localStorage:', error);
      }
    }
  }, []);

  // Save gallery to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('varyai-gallery', JSON.stringify(gallery));
  }, [gallery]);

  // Add variations to gallery
  const addToGallery = useCallback((newVariations: CharacterVariation[], originalPrompt: string, originalImagePreview?: string) => {
    const timestamp = Date.now();
    const storedVariations: StoredVariation[] = newVariations.map(variation => ({
      ...variation,
      timestamp,
      originalPrompt,
      originalImagePreview
    }));
    
    setGallery(prev => [...storedVariations, ...prev]); // Add new items to the beginning
  }, []);

  // Clear gallery
  const clearGallery = useCallback(() => {
    setGallery([]);
    localStorage.removeItem('varyai-gallery');
  }, []);

  // Remove single item from gallery
  const removeFromGallery = useCallback((variationId: string, timestamp: number) => {
    setGallery(prev => prev.filter(item => !(item.id === variationId && item.timestamp === timestamp)));
  }, []);

  // Get all gallery images with URLs for navigation
  const galleryImagesWithUrls = gallery.filter(item => item.imageUrl);

  // Handle full-screen image viewing
  const handleImageClick = useCallback((imageUrl: string) => {
    const index = galleryImagesWithUrls.findIndex(item => item.imageUrl === imageUrl);
    setFullScreenImage(imageUrl);
    setFullScreenImageIndex(index >= 0 ? index : 0);
  }, [galleryImagesWithUrls]);

  const closeFullScreen = useCallback(() => {
    setFullScreenImage(null);
  }, []);

  // Navigation functions for full-screen gallery
  const navigateFullScreen = useCallback((direction: 'prev' | 'next') => {
    if (galleryImagesWithUrls.length === 0) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = fullScreenImageIndex > 0 ? fullScreenImageIndex - 1 : galleryImagesWithUrls.length - 1;
    } else {
      newIndex = fullScreenImageIndex < galleryImagesWithUrls.length - 1 ? fullScreenImageIndex + 1 : 0;
    }
    
    setFullScreenImageIndex(newIndex);
    setFullScreenImage(galleryImagesWithUrls[newIndex].imageUrl!);
  }, [galleryImagesWithUrls, fullScreenImageIndex]);

  const goToPrevious = useCallback(() => navigateFullScreen('prev'), [navigateFullScreen]);
  const goToNext = useCallback(() => navigateFullScreen('next'), [navigateFullScreen]);

  // Handle keyboard navigation for full-screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fullScreenImage) return;
      
      switch (e.key) {
        case 'Escape':
          closeFullScreen();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
      }
    };

    if (fullScreenImage) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [fullScreenImage, closeFullScreen, goToPrevious, goToNext]);

  // Convert image URL to base64
  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix
          resolve(base64.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error('Failed to convert image URL to base64');
    }
  };

  // Handle varying an existing generated image
  const handleVaryImage = async (imageUrl: string, originalPrompt?: string) => {
    if (processing.isProcessing) {
      setError('Already processing. Please wait...');
      return;
    }

    try {
      setError(null);
      setVariations([]);
      setProcessing({
        isProcessing: true,
        progress: 10,
        currentStep: 'Converting image...'
      });

      // Convert the image URL to base64
      const base64Image = await urlToBase64(imageUrl);
      
      setProcessing({
        isProcessing: true,
        progress: 30,
        currentStep: 'Processing with Gemini AI...'
      });

      // Use the original prompt or a default variation prompt
      const varyPrompt = originalPrompt || prompt.trim() || 'Generate 4 new variations of this character from different angles';

      const response = await fetch('/api/vary-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [base64Image],
          prompt: varyPrompt
        }),
      });

      setProcessing(prev => ({ ...prev, progress: 70, currentStep: 'Generating variations...' }));

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate variations');
      }

      const newVariations = data.variations || [];
      setVariations(newVariations);
      
      // Add to gallery
      if (newVariations.length > 0) {
        addToGallery(newVariations, varyPrompt, imageUrl);
      }
      
      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 100,
          currentStep: 'Complete!'
        });
      }, 500);

    } catch (error) {
      console.error('Error varying image:', error);
      setError(error instanceof Error ? error.message : 'Failed to vary image');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  const handleImageUpload = useCallback((files: File[]) => {
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Please upload valid image files (JPG, PNG)');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Image size must be less than 10MB');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setError(null);
    const newImages: UploadedImage[] = [];
    let processedCount = 0;
    
    validFiles.forEach((file) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const preview = URL.createObjectURL(file);
        
        newImages.push({
          file,
          preview,
          base64: base64.split(',')[1], // Remove data:image/...;base64, prefix
          type: 'reference' // Default type
        });
        
        processedCount++;
        // Update state when all files are processed
        if (processedCount === validFiles.length) {
          setUploadedImages(prev => [...prev, ...newImages]);
        }
      };
      
      reader.readAsDataURL(file);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageUpload(files);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(Array.from(files));
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  }, [handleImageUpload]);

  const handleProcessCharacter = async () => {
    if (uploadedImages.length === 0 || !prompt.trim()) {
      setError('Please upload at least one image and enter a variation prompt');
      return;
    }

    setError(null);
    setVariations([]);
    setProcessing({
      isProcessing: true,
      progress: 20,
      currentStep: 'Analyzing character...'
    });

    try {
      setProcessing(prev => ({ ...prev, progress: 40, currentStep: 'Processing with Gemini AI...' }));
      
      const response = await fetch('/api/vary-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: uploadedImages.map(img => img.base64),
          prompt: prompt.trim()
        }),
      });

      setProcessing(prev => ({ ...prev, progress: 70, currentStep: 'Generating variations...' }));

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to process character variations');
      }

      setProcessing(prev => ({ ...prev, progress: 100, currentStep: 'Complete!' }));
      const newVariations = data.variations || [];
      setVariations(newVariations);
      
      // Add to gallery
      if (newVariations.length > 0) {
        addToGallery(newVariations, prompt.trim(), uploadedImages[0]?.preview);
      }
      
      setTimeout(() => {
        setProcessing({
          isProcessing: false,
          progress: 0,
          currentStep: ''
        });
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setProcessing({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  };

  const handleDownloadVariation = async (variation: CharacterVariation) => {
    if (variation.imageUrl) {
      // Download the generated image
      try {
        const response = await fetch(variation.imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `character-${variation.angle.toLowerCase().replace(/\s+/g, '-')}-${variation.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download image:', error);
        // Fallback to description download
        downloadDescription();
      }
    } else {
      downloadDescription();
    }

    function downloadDescription() {
      // Create a downloadable text file with the variation description
      const blob = new Blob([variation.description], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `character-variation-${variation.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    setUploadedImages([]);
    setPrompt('');
    setVariations([]);
    setError(null);
    setProcessing({
      isProcessing: false,
      progress: 0,
      currentStep: ''
    });
  };

  return (
    <div className="min-h-screen relative">
      {/* Semi-transparent overlay for content readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      
      <div className="relative z-10 flex">
        {/* Main Content */}
        <div className={`transition-all duration-300 ${showGallery ? 'w-2/3' : 'w-full'}`}>
          <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-16 bg-black bg-opacity-40 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
          <h1 className="text-4xl font-bold text-white">
            vARY<span className="text-gray-400">ai</span>
          </h1>
          <button
            onClick={() => setShowGallery(!showGallery)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-lg"
            title={showGallery ? 'Hide Gallery' : 'Show Gallery'}
          >
            {showGallery ? 'Hide' : 'Show'} gallery
          </button>
        </div>

        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="max-w-2xl w-full">
            {/* Description */}
            <div className="text-center mb-8 bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
              <p className="text-gray-300 text-lg">
                Upload a character image and generate 4 unique angle variations using AI.
              </p>
            </div>

            {/* Main Input Area */}
            {uploadedImages.length === 0 ? (
              <div
                className="border-2 border-white rounded-lg p-16 text-center hover:border-gray-300 transition-colors cursor-pointer bg-black bg-opacity-40 backdrop-blur-sm"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-white mb-2">
                  Drag & drop your character images here
                </p>
                <p className="text-gray-400">
                  or click to browse files (JPG, PNG - max 10MB each)
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Multiple Images Preview */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image.preview}
                        alt={`Character ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg shadow-lg"
                      />
                      <button
                        onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                  
                  {/* Add More Images Button */}
                  <div
                    className="border-2 border-dashed border-white rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <div className="text-center">
                      <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Add More</p>
                    </div>
                  </div>
                </div>
                
                {/* Clear All Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setUploadedImages([])}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Clear All Images
                  </button>
                </div>

                {/* Prompt Input */}
                <div className="space-y-4 bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the angle or pose variations you want..."
                    className="w-full p-6 border-2 border-white rounded-lg bg-transparent text-white placeholder-gray-400 focus:outline-none focus:border-gray-300 resize-none text-lg"
                    rows={4}
                  />

                  <div className="space-y-4">
                    {/* Basic Prompts */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {BASIC_PROMPTS.map((example) => (
                        <button
                          key={example}
                          onClick={() => setPrompt(example)}
                          className="px-3 py-1 text-sm bg-white text-black rounded-full hover:bg-gray-100 transition-colors"
                        >
                          {example}
                        </button>
                      ))}
                    </div>

                    {/* More Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => setShowExtendedPrompts(!showExtendedPrompts)}
                        className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors border border-gray-600"
                      >
                        {showExtendedPrompts ? 'Show Less' : 'More Shot Types'}
                      </button>
                    </div>

                    {/* Extended Prompts */}
                    {showExtendedPrompts && (
                      <div className="mt-4 p-4 bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg border border-gray-600">
                        <h4 className="text-white text-sm font-medium mb-3 text-center">Professional Camera Angles & Shot Types</h4>
                        
                        {/* Close-up shots */}
                        <div className="mb-4">
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Close-up Shots</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(0, 3).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Angle variations */}
                        <div className="mb-4">
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Angle Variations</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(3, 8).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Distance variations */}
                        <div className="mb-4">
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Distance & Framing</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(8, 13).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dynamic angles */}
                        <div className="mb-4">
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Dynamic Perspectives</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(13, 18).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Artistic perspectives */}
                        <div>
                          <h5 className="text-gray-300 text-xs font-medium mb-2">Artistic & Cinematic</h5>
                          <div className="flex flex-wrap gap-2">
                            {EXTENDED_PROMPTS.slice(18).map((example) => (
                              <button
                                key={example}
                                onClick={() => setPrompt(example)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleProcessCharacter}
                      disabled={processing.isProcessing || !prompt.trim()}
                      className="px-8 py-4 bg-white text-black rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                      {processing.isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {processing.currentStep}
                        </>
                      ) : (
                        "Generate Character Variations"
                      )}
                    </button>
                  </div>

                  {processing.isProcessing && (
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full transition-all duration-500"
                        style={{ width: `${processing.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-red-900 bg-opacity-90 backdrop-blur-sm border border-red-700 rounded-lg p-4 mb-8">
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {variations.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 mt-12">
            <h2 className="text-2xl font-semibold mb-8 text-white text-center bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-4 border border-white border-opacity-20">Character Variations</h2>
            
            {/* Info message if no images are generated */}
            {variations.length > 0 && !variations.some(v => v.imageUrl) && (
              <div className="bg-blue-900 bg-opacity-90 backdrop-blur-sm border border-blue-700 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-300" />
                  <p className="text-blue-200 font-medium">Character descriptions generated!</p>
                </div>
                <p className="text-blue-300 text-sm mt-1">
                  Add your FAL_KEY to your .env.local file to generate actual character images.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {variations.map((variation) => (
                <div
                  key={variation.id}
                  className="border border-white rounded-lg p-6 hover:border-gray-300 transition-colors bg-black bg-opacity-40 backdrop-blur-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        {variation.angle}
                      </h3>
                      <p className="text-sm text-gray-400">{variation.pose}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => variation.imageUrl && handleVaryImage(variation.imageUrl, prompt)}
                        className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        disabled={!variation.imageUrl || processing.isProcessing}
                        title="Create new variations from this image"
                      >
                        <Sparkles className="w-4 h-4" />
                        Vary
                      </button>
                      <button
                        onClick={() => handleDownloadVariation(variation)}
                        className="flex items-center gap-1 px-3 py-1 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                        title="Download variation description"
                      >
                        <Download className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                  </div>
                  
                  {variation.imageUrl ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <img
                          src={variation.imageUrl}
                          alt={`${variation.angle} - ${variation.pose}`}
                          className="w-full h-48 object-cover rounded-lg shadow-md cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleImageClick(variation.imageUrl!)}
                        />
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-300 text-xs leading-relaxed">
                          {variation.description}
                        </p>
                        {variation.description.includes('blocked by content policy') && (
                          <div className="mt-2 p-2 bg-yellow-900 bg-opacity-50 rounded border border-yellow-600">
                            <p className="text-yellow-300 text-xs">
                              ⚠️ Image generation was restricted. Only text description available.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {variation.description}
                      </p>
                      {variation.description.includes('blocked by content policy') && (
                        <div className="mt-2 p-2 bg-yellow-900 bg-opacity-50 rounded border border-yellow-600">
                          <p className="text-yellow-300 text-xs">
                            ⚠️ Image generation was restricted. Only text description available.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
        </div>

        {/* Gallery Panel */}
        {showGallery && (
          <div className="w-1/3 bg-gray-800 bg-opacity-90 backdrop-blur-sm border-l border-gray-700 h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2 text-white">
                  <Images className="w-6 h-6 text-white" />
                  Gallery ({gallery.length})
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={clearGallery}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                    title="Clear all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear
                  </button>
                  <button
                    onClick={() => setShowGallery(false)}
                    className="flex items-center gap-1 px-3 py-1 bg-white text-black rounded hover:bg-gray-100 transition-colors text-sm"
                    title="Hide gallery"
                  >
                    <X className="w-4 h-4" />
                    Hide
                  </button>
                </div>
              </div>

              {gallery.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Images className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No variations yet</p>
                  <p className="text-sm">Generated character variations will appear here</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {gallery.map((item) => (
                    <div
                      key={`${item.id}-${item.timestamp}`}
                      className="border border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-700 bg-opacity-80 backdrop-blur-sm"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-sm">
                            {item.angle}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-300 mt-1">
                            &ldquo;{item.originalPrompt}&rdquo;
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromGallery(item.id, item.timestamp)}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                          title="Remove from gallery"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {item.imageUrl ? (
                        <div className="space-y-3">
                          <img
                            src={item.imageUrl}
                            alt={`${item.angle} - ${item.pose}`}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleImageClick(item.imageUrl!)}
                          />
                          <div className="bg-gray-700 bg-opacity-80 backdrop-blur-sm rounded p-2">
                            <p className="text-xs text-gray-300 leading-relaxed">
                              {item.description.substring(0, 150)}
                              {item.description.length > 150 ? '...' : ''}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVaryImage(item.imageUrl!, item.originalPrompt)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm font-medium"
                              disabled={processing.isProcessing}
                            >
                              <Sparkles className="w-4 h-4" />
                              Vary
                            </button>
                            <button
                              onClick={() => handleDownloadVariation(item)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white text-black rounded hover:bg-gray-100 transition-colors text-sm font-medium"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-700 rounded p-3">
                          <p className="text-xs text-gray-300 leading-relaxed">
                            {item.description}
                          </p>
                          {item.description.includes('blocked by content policy') && (
                            <div className="mt-2 p-2 bg-yellow-900 bg-opacity-50 rounded border border-yellow-600">
                              <p className="text-yellow-300 text-xs">
                                ⚠️ Image generation was restricted
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Image Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={closeFullScreen}
        >
          <div className="relative w-[90%] h-[90%] flex items-center justify-center">
            <img
              src={fullScreenImage}
              alt="Full screen view"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
            />
            
            {/* Navigation Arrows */}
            {galleryImagesWithUrls.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-70 transition-colors"
                  title="Previous image (Left arrow)"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-70 transition-colors"
                  title="Next image (Right arrow)"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            {/* Close Button */}
            <button
              onClick={closeFullScreen}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-3 hover:bg-opacity-70 transition-colors"
              title="Close (Press Esc)"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image Info */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm">
              <div className="text-center">
                {galleryImagesWithUrls.length > 1 && (
                  <div className="mb-1">
                    {fullScreenImageIndex + 1} of {galleryImagesWithUrls.length}
                  </div>
                )}
                <div>
                  Click outside, press ESC to close{galleryImagesWithUrls.length > 1 ? ', or use arrow keys to navigate' : ''}
                </div>
              </div>
            </div>

            {/* Current Image Details */}
            {galleryImagesWithUrls[fullScreenImageIndex] && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm max-w-md">
                <div className="font-semibold">
                  {galleryImagesWithUrls[fullScreenImageIndex].angle}
                </div>
                <div className="text-gray-300 text-xs">
                  {galleryImagesWithUrls[fullScreenImageIndex].pose}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}