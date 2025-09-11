'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, Download, Loader2, RotateCcw, Camera, Sparkles, Images, X, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit, MessageCircle, HelpCircle, ArrowRight, ArrowUp, FolderOpen, Grid3X3, User, Lock } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import type { UploadedFile, UploadedImage, ProcessingState, CharacterVariation } from '@/types/gemini';

// Secret Level Generation mode types - NEW MODELS ONLY
type SecretGenerationMode = 
  | 'bytedance-dreamina-v3-1-text-to-image'
  | 'bytedance-seedance-v1-pro-image-to-video'
  | 'elevenlabs-tts-multilingual-v2'
  | 'fast-sdxl'
  | 'flux-krea'
  | 'flux-pro-kontext'
  | 'imagen4-preview'
  | 'kling-video-v2-1-master-image-to-video'
  | 'minimax-hailuo-02-pro-image-to-video'
  | 'minimax-video-01'
  | 'minimax-video-generation'
  | 'nano-banana-edit'
  | 'qwen-image-edit'
  | 'stable-diffusion-v35-large'
  | 'veo3-fast-image-to-video'
  | 'veo3-image-to-video'
  | 'veo3-standard'
  | 'wan-v2-2-a14b-image-to-video-lora'
  // Lip Sync Models
  | 'wav2lip'
  | 'latentsync'
  | 'sync-fondo'
  | 'musetalk';

import AnimatedError from '@/components/AnimatedError';
import { useAnimatedError } from '@/hooks/useAnimatedError';
import { useAuth } from '@/contexts/AuthContext';
import { HelpModal } from '@/components/HelpModal';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useUserGallery } from '@/hooks/useUserGallery';
import { Header } from '@/components/Header';
import { AuthModal } from '@/components/AuthModal';
import { UsageLimitBanner, UsageCounter } from '@/components/UsageLimitBanner';
import { UserCounter } from '@/components/UserCounter';

// Secret Level Prompts
const SECRET_PROMPTS = [
  'Generate a mystical creature with glowing eyes',
  'Create an otherworldly landscape with floating islands',
  'Design a futuristic cityscape with neon lights',
  'Generate a magical forest with ancient trees',
  'Create a cosmic scene with swirling galaxies',
  'Design a steampunk mechanical contraption',
  'Generate a cyberpunk character with neon accents',
  'Create an underwater palace with bioluminescent creatures',
  'Design a post-apocalyptic wasteland scene',
  'Generate a fantasy castle in the clouds'
];

const SECRET_EXTENDED_PROMPTS = [
  // Mystical and Fantasy
  'Mystical portal opening to another dimension',
  'Ancient dragon soaring through storm clouds',
  'Crystal cave with glowing formations',
  'Floating islands connected by magical bridges',
  'Phoenix rising from flames with golden feathers',
  
  // Sci-Fi and Futuristic
  'Space station orbiting a distant planet',
  'Robot city with towering metallic structures',
  'Time machine with swirling temporal energy',
  'Alien landscape with multiple moons',
  'Cyberpunk street with holographic advertisements',
  
  // Dark and Gothic
  'Gothic cathedral with flying buttresses',
  'Vampire castle shrouded in mist',
  'Haunted forest with twisted trees',
  'Gothic mansion with gargoyle guardians',
  'Dark wizard tower reaching into storm clouds',
  
  // Nature and Organic
  'Bioluminescent forest at night',
  'Giant tree city with treehouse dwellings',
  'Coral reef city underwater',
  'Mushroom forest with giant fungi',
  'Living rock formations that pulse with energy',
  
  // Abstract and Surreal
  'Melting clock landscape in surreal style',
  'Impossible architecture defying gravity',
  'Fractal patterns forming natural structures',
  'Dreamlike landscape with floating objects',
  'Abstract representation of human emotions'
];

// Configuration
const ENABLE_SECRET_FEATURES = true;

export default function SecretPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { showError, hideError, errorMessage, isVisible } = useAnimatedError();
  const { usageStats, isAnonymous, trackUsage } = useUsageTracking();
  const { addToGallery, removeFromGallery, gallery } = useUserGallery();

  // Authentication states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // File upload states
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Generation states
  const [generationMode, setGenerationMode] = useState<SecretGenerationMode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    currentStep: '',
    progress: 0,
    totalSteps: 0
  });

  // UI states
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  // Secret Level specific states
  const [secretLevel, setSecretLevel] = useState<number>(1);
  const [unlockedModels, setUnlockedModels] = useState<Set<SecretGenerationMode>>(new Set());

  // Initialize with basic models unlocked
  useEffect(() => {
    const basicModels: SecretGenerationMode[] = [
      'bytedance-dreamina-v3-1-text-to-image',
      'fast-sdxl',
      'stable-diffusion-v35-large',
      'wav2lip',
      'latentsync',
      'sync-fondo',
      'musetalk'
    ];
    setUnlockedModels(new Set(basicModels));
  }, []);

  // Generation time estimation functions
  const getEstimatedTimeForMode = (mode: SecretGenerationMode): number => {
    const timeEstimates = {
      'bytedance-dreamina-v3-1-text-to-image': 20,
      'bytedance-seedance-v1-pro-image-to-video': 60,
      'elevenlabs-tts-multilingual-v2': 10,
      'fast-sdxl': 15,
      'flux-krea': 25,
      'flux-pro-kontext': 30,
      'imagen4-preview': 35,
      'kling-video-v2-1-master-image-to-video': 90,
      'minimax-hailuo-02-pro-image-to-video': 120,
      'minimax-video-01': 100,
      'minimax-video-generation': 110,
      'nano-banana-edit': 20,
      'qwen-image-edit': 25,
      'stable-diffusion-v35-large': 40,
      'veo3-fast-image-to-video': 45,
      'veo3-image-to-video': 60,
      'veo3-standard': 50,
      'wan-v2-2-a14b-image-to-video-lora': 80,
      // Lip Sync Models
      'wav2lip': 30,
      'latentsync': 45,
      'sync-fondo': 40,
      'musetalk': 35
    };
    return timeEstimates[mode] || 30;
  };

  const startGenerationTimer = (mode: SecretGenerationMode) => {
    const estimated = getEstimatedTimeForMode(mode);
    setEstimatedTime(estimated);
    setGenerationStartTime(Date.now());
  };

  // Get display name for generation mode
  const getModelDisplayName = useCallback((mode: SecretGenerationMode): string => {
    const displayNames: Record<SecretGenerationMode, string> = {
      'bytedance-dreamina-v3-1-text-to-image': 'Dreamina V3.1',
      'bytedance-seedance-v1-pro-image-to-video': 'Seedance V1 Pro',
      'elevenlabs-tts-multilingual-v2': 'ElevenLabs TTS',
      'fast-sdxl': 'Fast SDXL',
      'flux-krea': 'Flux Krea',
      'flux-pro-kontext': 'Flux Pro Kontext',
      'imagen4-preview': 'Imagen4 Preview',
      'kling-video-v2-1-master-image-to-video': 'Kling V2.1 Master',
      'minimax-hailuo-02-pro-image-to-video': 'Minimax Hailuo 02 Pro',
      'minimax-video-01': 'Minimax Video 01',
      'minimax-video-generation': 'Minimax Video Gen',
      'nano-banana-edit': 'Nano Banana Edit',
      'qwen-image-edit': 'Qwen Image Edit',
      'stable-diffusion-v35-large': 'Stable Diffusion V3.5',
      'veo3-fast-image-to-video': 'Veo3 Fast I2V',
      'veo3-image-to-video': 'Veo3 I2V',
      'veo3-standard': 'Veo3 Standard',
      'wan-v2-2-a14b-image-to-video-lora': 'Wan V2.2 A14b LoRA',
      // Lip Sync Models
      'wav2lip': 'Wav2Lip',
      'latentsync': 'LatentSync',
      'sync-fondo': '[sync.] Fondo',
      'musetalk': 'MuseTalk'
    };
    return displayNames[mode] || mode;
  }, []);

  // Determine generation mode based on uploaded files
  const determineGenerationMode = useCallback((): SecretGenerationMode | null => {
    const hasImages = uploadedFiles.some(file => file.fileType === 'image');
    const hasVideos = uploadedFiles.some(file => file.fileType === 'video');
    
    if (hasImages && uploadedFiles.length === 1) {
      // Single image - could be image-to-video or image editing
      return null; // Let user choose
    } else if (!hasImages && !hasVideos) {
      // Text-to-image or text-to-video
      return 'bytedance-dreamina-v3-1-text-to-image';
    }
    
    return null;
  }, [uploadedFiles]);

  // Get available generation modes for current state
  const getAvailableModes = useCallback((): SecretGenerationMode[] => {
    const hasImages = uploadedFiles.some(file => file.fileType === 'image');
    const hasVideos = uploadedFiles.some(file => file.fileType === 'video');
    
    const modes: SecretGenerationMode[] = [];
    
    // Always allow text-to-image models
    if (unlockedModels.has('bytedance-dreamina-v3-1-text-to-image')) {
      modes.push('bytedance-dreamina-v3-1-text-to-image');
    }
    if (unlockedModels.has('fast-sdxl')) {
      modes.push('fast-sdxl');
    }
    if (unlockedModels.has('stable-diffusion-v35-large')) {
      modes.push('stable-diffusion-v35-large');
    }
    if (unlockedModels.has('flux-krea')) {
      modes.push('flux-krea');
    }
    if (unlockedModels.has('flux-pro-kontext')) {
      modes.push('flux-pro-kontext');
    }
    if (unlockedModels.has('imagen4-preview')) {
      modes.push('imagen4-preview');
    }
    
    if (hasImages) {
      if (uploadedFiles.length === 1) {
        // Single image - image-to-video or image editing models
        if (unlockedModels.has('bytedance-seedance-v1-pro-image-to-video')) {
          modes.push('bytedance-seedance-v1-pro-image-to-video');
        }
        if (unlockedModels.has('kling-video-v2-1-master-image-to-video')) {
          modes.push('kling-video-v2-1-master-image-to-video');
        }
        if (unlockedModels.has('minimax-hailuo-02-pro-image-to-video')) {
          modes.push('minimax-hailuo-02-pro-image-to-video');
        }
        if (unlockedModels.has('veo3-fast-image-to-video')) {
          modes.push('veo3-fast-image-to-video');
        }
        if (unlockedModels.has('veo3-image-to-video')) {
          modes.push('veo3-image-to-video');
        }
        if (unlockedModels.has('wan-v2-2-a14b-image-to-video-lora')) {
          modes.push('wan-v2-2-a14b-image-to-video-lora');
        }
        if (unlockedModels.has('nano-banana-edit')) {
          modes.push('nano-banana-edit');
        }
        if (unlockedModels.has('qwen-image-edit')) {
          modes.push('qwen-image-edit');
        }
      }
    }
    
    // Text-to-video models when no images are uploaded
    if (!hasImages && !hasVideos) {
      if (unlockedModels.has('minimax-video-01')) {
        modes.push('minimax-video-01');
      }
      if (unlockedModels.has('minimax-video-generation')) {
        modes.push('minimax-video-generation');
      }
      if (unlockedModels.has('veo3-standard')) {
        modes.push('veo3-standard');
      }
    }
    
    // Lip sync models - require both video and audio
    if (hasVideos && uploadedFiles.length >= 2) {
      if (unlockedModels.has('wav2lip')) {
        modes.push('wav2lip');
      }
      if (unlockedModels.has('latentsync')) {
        modes.push('latentsync');
      }
      if (unlockedModels.has('sync-fondo')) {
        modes.push('sync-fondo');
      }
      if (unlockedModels.has('musetalk')) {
        modes.push('musetalk');
      }
    }
    
    return modes;
  }, [uploadedFiles, unlockedModels]);

  // Auto-detect generation mode when files change
  useEffect(() => {
    const detectedMode = determineGenerationMode();
    if (detectedMode !== null) {
      setGenerationMode(detectedMode);
    } else {
      setGenerationMode(null);
    }
  }, [uploadedFiles, determineGenerationMode]);

  // Authentication handlers
  const handleSignInClick = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const handleSignUpClick = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  // File upload handlers
  const handleFileUpload = async (files: FileList) => {
    if (!user) {
      showError('Please sign in to upload files');
      return;
    }

    setIsUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          showError(`Unsupported file type: ${file.type}`);
          continue;
        }

        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          showError(`File too large: ${file.name} (max 50MB)`);
          continue;
        }

        const uploadedFile: UploadedFile = {
          id: `file-${Date.now()}-${i}`,
          file,
          fileType: file.type.startsWith('image/') ? 'image' : 'video',
          preview: URL.createObjectURL(file),
          name: file.name,
          size: file.size
        };

        newFiles.push(uploadedFile);
      }

      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error('Error uploading files:', error);
      showError('Error uploading files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file && file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  // Generation handlers
  const handleSecretGeneration = async () => {
    if (!user) {
      showError('Please sign in to generate content');
      return;
    }

    if (!generationMode) {
      showError('Please select a generation mode');
      return;
    }

    setIsGenerating(true);
    setProcessingAction(`secret-${generationMode}-${Date.now()}`);
    startGenerationTimer(generationMode);

    try {
      console.log(`🚀 Starting secret generation with ${generationMode}`);
      
      // Determine API endpoint based on model type
      let apiEndpoint = '';
      let requestBody: any = { model: generationMode };

      if (['wav2lip', 'latentsync', 'sync-fondo', 'musetalk'].includes(generationMode)) {
        // Lip sync models
        apiEndpoint = '/api/fal/lip-sync';
        
        if (uploadedFiles.length < 2) {
          showError('Lip sync requires both video and audio files');
          return;
        }
        
        const videoFile = uploadedFiles.find(f => f.fileType === 'video');
        const audioFile = uploadedFiles.find(f => f.fileType === 'video' && f !== videoFile);
        
        if (!videoFile || !audioFile) {
          showError('Please upload both a video file and an audio file for lip sync');
          return;
        }
        
        requestBody = {
          model: generationMode,
          videoUrl: videoFile.preview,
          audioUrl: audioFile.preview,
          quality: 'high',
          fps: 25
        };
      } else if (['bytedance-dreamina-v3-1-text-to-image', 'fast-sdxl', 'stable-diffusion-v35-large', 'flux-krea', 'flux-pro-kontext', 'imagen4-preview'].includes(generationMode)) {
        // Text-to-image models
        apiEndpoint = '/api/fal/text-to-image';
        requestBody = {
          model: generationMode,
          prompt: 'A mystical creature with glowing eyes in a fantasy landscape',
          size: '1024x1024'
        };
      } else if (['bytedance-seedance-v1-pro-image-to-video', 'kling-video-v2-1-master-image-to-video', 'minimax-hailuo-02-pro-image-to-video', 'veo3-fast-image-to-video', 'veo3-image-to-video', 'wan-v2-2-a14b-image-to-video-lora'].includes(generationMode)) {
        // Image-to-video models
        apiEndpoint = '/api/fal/image-to-video';
        
        if (uploadedFiles.length === 0) {
          showError('Please upload an image for video generation');
          return;
        }
        
        const imageFile = uploadedFiles.find(f => f.fileType === 'image');
        if (!imageFile) {
          showError('Please upload an image file');
          return;
        }
        
        requestBody = {
          model: generationMode,
          imageUrl: imageFile.preview,
          prompt: 'Create a cinematic animation with subtle movements',
          duration: 5,
          motionStrength: 0.5
        };
      } else if (['minimax-video-01', 'minimax-video-generation', 'veo3-standard'].includes(generationMode)) {
        // Text-to-video models
        apiEndpoint = '/api/fal/text-to-video';
        requestBody = {
          model: generationMode,
          prompt: 'A futuristic cityscape with flying cars during sunset',
          duration: 5,
          aspectRatio: '16:9'
        };
      } else if (['nano-banana-edit', 'qwen-image-edit'].includes(generationMode)) {
        // Image editing models
        apiEndpoint = '/api/fal/image-edit';
        
        if (uploadedFiles.length === 0) {
          showError('Please upload an image for editing');
          return;
        }
        
        const imageFile = uploadedFiles.find(f => f.fileType === 'image');
        if (!imageFile) {
          showError('Please upload an image file');
          return;
        }
        
        requestBody = {
          model: generationMode,
          imageUrl: imageFile.preview,
          prompt: 'Transform this image with magical effects',
          operation: 'edit',
          strength: 0.8
        };
      } else if (['elevenlabs-tts-multilingual-v2'].includes(generationMode)) {
        // Text-to-speech models
        apiEndpoint = '/api/fal/text-to-speech';
        requestBody = {
          model: generationMode,
          text: 'Hello! This is a test of the text-to-speech functionality.',
          voice: 'alloy',
          language: 'en',
          speed: 1.0
        };
      }

      if (!apiEndpoint) {
        showError('Model not yet implemented');
        return;
      }

      // Make API call
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'API request failed');
      }

      console.log(`✅ Secret generation completed:`, result);
      
      // Add to gallery if successful
      if (result.data && result.data.video) {
        await addToGallery({
          id: `secret-${generationMode}-${Date.now()}`,
          description: `Secret generation: ${getModelDisplayName(generationMode)}`,
          angle: 'Secret Level',
          pose: 'Advanced AI',
          image_url: null,
          video_url: result.data.video.url,
          file_type: 'video',
          original_prompt: requestBody.prompt || 'Secret generation',
          original_image_preview: null
        });
      } else if (result.data && result.data.image) {
        await addToGallery({
          id: `secret-${generationMode}-${Date.now()}`,
          description: `Secret generation: ${getModelDisplayName(generationMode)}`,
          angle: 'Secret Level',
          pose: 'Advanced AI',
          image_url: result.data.image.url,
          video_url: null,
          file_type: 'image',
          original_prompt: requestBody.prompt || 'Secret generation',
          original_image_preview: null
        });
      }

      // Track usage
      await trackUsage('image_generation', 'fal_ai', {
        model: generationMode,
        prompt: requestBody.prompt || 'Secret generation'
      });

    } catch (error) {
      console.error('Secret generation error:', error);
      showError(`Error during secret generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
      setProcessingAction(null);
      setGenerationStartTime(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [uploadedFiles]);

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/80">Loading Secret Level...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Header 
        onSignUpClick={handleSignUpClick}
        onSignInClick={handleSignInClick}
        hideCommunityButton={false}
        hideAnalytics={false}
      />
      
      <AnimatedError 
        message={errorMessage}
        isVisible={isVisible}
        onClose={hideError}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />

      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      <UsageLimitBanner />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Secret Level Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-yellow-400 mr-3" />
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              SECRET LEVEL
            </h1>
            <Lock className="w-8 h-8 text-yellow-400 ml-3" />
          </div>
          <p className="text-xl text-white/80 mb-2">
            Advanced AI Models • Exclusive Access • Premium Features
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-white/60">
            <span>Level: {secretLevel}</span>
            <span>•</span>
            <span>Models Unlocked: {unlockedModels.size}</span>
            <span>•</span>
            <span>Total Available: 22</span>
          </div>
        </div>

        {/* Secret Level Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - File Upload */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Upload Files
              </h2>
              
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-yellow-400 bg-yellow-400/10' 
                    : 'border-white/20 hover:border-white/40'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Camera className="w-12 h-12 text-white/60 mx-auto mb-4" />
                <p className="text-white/80 mb-2">
                  Drag & drop files here or click to browse
                </p>
                <p className="text-sm text-white/60">
                  Images, Videos (max 50MB each)
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 cursor-pointer"
                >
                  Choose Files
                </label>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-white mb-3">Uploaded Files</h3>
                  <div className="space-y-3">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            {file.fileType === 'image' ? (
                              <Images className="w-5 h-5 text-white" />
                            ) : (
                              <Camera className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{file.name}</p>
                            <p className="text-white/60 text-xs">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-white/60 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Generation Options */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Secret Generation Models
              </h2>

              {/* Available Models */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-3">Available Models</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getAvailableModes().map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setGenerationMode(mode)}
                      className={`p-4 rounded-lg border transition-all duration-300 text-left ${
                        generationMode === mode
                          ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                          : 'border-white/20 hover:border-white/40 text-white/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{getModelDisplayName(mode)}</p>
                          <p className="text-sm opacity-75">
                            ~{getEstimatedTimeForMode(mode)}s
                          </p>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Secret Prompts */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-3">Secret Prompts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {SECRET_PROMPTS.slice(0, 6).map((prompt, index) => (
                    <button
                      key={index}
                      className="p-3 text-left bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-300 text-white/80 hover:text-white"
                    >
                      <p className="text-sm">{prompt}</p>
                    </button>
                  ))}
                </div>
                
                {expandedPrompts.has('secret') ? (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {SECRET_EXTENDED_PROMPTS.map((prompt, index) => (
                      <button
                        key={index}
                        className="p-3 text-left bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-300 text-white/80 hover:text-white"
                      >
                        <p className="text-sm">{prompt}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => setExpandedPrompts(prev => new Set([...prev, 'secret']))}
                    className="mt-3 w-full p-3 text-center bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-300 text-white/80 hover:text-white"
                  >
                    <ChevronDown className="w-4 h-4 mx-auto" />
                  </button>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleSecretGeneration}
                disabled={!generationMode || isGenerating || !user}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
                  !generationMode || isGenerating || !user
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white transform hover:scale-105 shadow-lg hover:shadow-yellow-500/25'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Generating Secret Content...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Lock className="w-5 h-5 mr-2" />
                    Generate Secret Content
                  </div>
                )}
              </button>

              {/* Generation Progress */}
              {isGenerating && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80 text-sm">Generating...</span>
                    <span className="text-white/60 text-sm">
                      {estimatedTime > 0 && generationStartTime ? (
                        Math.max(0, estimatedTime - Math.floor((Date.now() - generationStartTime) / 1000))
                      ) : estimatedTime}s
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${Math.min(100, ((Date.now() - (generationStartTime || Date.now())) / 1000) / estimatedTime * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usage Counter */}
        <div className="mt-8 flex justify-center">
          <UsageCounter />
        </div>
      </div>
    </div>
  );
}
