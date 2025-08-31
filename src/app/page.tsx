'use client';

import { useState, useCallback } from 'react';
import { Upload, Download, Loader2, RotateCcw, Camera, Sparkles } from 'lucide-react';
import type { UploadedImage, ProcessingState, CharacterVariation } from '@/types/gemini';

const EXAMPLE_PROMPTS = [
  'Show this character from the side profile',
  'Display this character from behind',
  'Show this character at a 3/4 angle',
  'Generate this character in an action pose',
  'Show this character from a low angle view',
  'Display this character from above looking down'
];

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentStep: ''
  });
  const [variations, setVariations] = useState<CharacterVariation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('Image size must be less than 10MB');
      return;
    }

    setError(null);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const preview = URL.createObjectURL(file);
      
      setUploadedImage({
        file,
        preview,
        base64: base64.split(',')[1] // Remove data:image/...;base64, prefix
      });
    };
    
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
  }, [handleImageUpload]);

  const handleProcessCharacter = async () => {
    if (!uploadedImage || !prompt.trim()) {
      setError('Please upload an image and enter a variation prompt');
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
          image: uploadedImage.base64,
          prompt: prompt.trim()
        }),
      });

      setProcessing(prev => ({ ...prev, progress: 70, currentStep: 'Generating variations...' }));

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to process character variations');
      }

      setProcessing(prev => ({ ...prev, progress: 100, currentStep: 'Complete!' }));
      setVariations(data.variations || []);
      
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

  const handleDownloadVariation = (variation: CharacterVariation) => {
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
  };

  const handleReset = () => {
    setUploadedImage(null);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              VaryAI Character Generator
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload a character image and generate 4 unique angle variations using AI. 
            Keep the character consistent while exploring different perspectives and poses.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Camera className="w-6 h-6 text-purple-600" />
              Upload Character Image
            </h2>
            
            {!uploadedImage ? (
              <div
                className="border-2 border-dashed border-purple-300 rounded-lg p-12 text-center hover:border-purple-400 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drag & drop your character image here
                </p>
                <p className="text-gray-500 mb-4">
                  or click to browse files (JPG, PNG - max 10MB)
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  <img
                    src={uploadedImage.preview}
                    alt="Uploaded character"
                    className="w-full h-64 object-cover rounded-lg shadow-md"
                  />
                </div>
                <div className="md:w-2/3 flex flex-col justify-center">
                  <h3 className="text-lg font-semibold mb-2">Character Uploaded</h3>
                  <p className="text-gray-600 mb-4">
                    File: {uploadedImage.file.name} ({(uploadedImage.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-800 transition-colors w-fit"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Upload Different Image
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Prompt Section */}
          {uploadedImage && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-6">Variation Prompt</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                    Describe the angle or pose variations you want:
                  </label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., show from side view, rotate 45 degrees, different action pose..."
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Quick Examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((example) => (
                      <button
                        key={example}
                        onClick={() => setPrompt(example)}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleProcessCharacter}
                  disabled={processing.isProcessing || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing.isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {processing.currentStep}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Character Variations
                    </>
                  )}
                </button>

                {processing.isProcessing && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${processing.progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Results Section */}
          {variations.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-semibold mb-6">Character Variations</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {variations.map((variation) => (
                  <div
                    key={variation.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-purple-700">
                          {variation.angle}
                        </h3>
                        <p className="text-sm text-gray-600">{variation.pose}</p>
                      </div>
                      <button
                        onClick={() => handleDownloadVariation(variation)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors text-sm"
                        title="Download variation description"
                      >
                        <Download className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {variation.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}