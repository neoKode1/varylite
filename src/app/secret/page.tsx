'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, Download, Loader2, RotateCcw, Camera, Sparkles, Images, X, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit, MessageCircle, HelpCircle, ArrowRight, ArrowUp, FolderOpen, Grid3X3, User, Lock, Play, XCircle } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import type { UploadedFile, UploadedImage, ProcessingState, CharacterVariation } from '@/types/gemini';

// Secret Level Generation mode types - NEW MODELS ONLY
type SecretGenerationMode = 
  // Text-to-Image Models (Priority Order: Highest to Lowest)
  | 'nano-banana-text-to-image'
  | 'gemini-pro-vision-text-to-image'
  | 'flux-1.1-pro-text-to-image'
  | 'imagen-3-text-to-image'
  | 'dall-e-3-text-to-image'
  | 'midjourney-v6-text-to-image'
  | 'stable-diffusion-xl-text-to-image'
  | 'flux-dev-text-to-image'
  | 'stable-diffusion-v3-text-to-image'
  | 'flux-schnell-text-to-image'
  | 'stable-diffusion-v2-text-to-image'
  | 'flux-1.0-text-to-image'
  
  // Text-to-Video Models (Priority Order: Highest to Lowest)
  | 'veo-3-text-to-video'
  | 'runway-gen-3-text-to-video'
  | 'pika-labs-text-to-video'
  | 'stable-video-diffusion-text-to-video'
  | 'zeroscope-text-to-video'
  | 'modelscope-text-to-video'
  | 'cogvideo-text-to-video'
  | 'text2video-zero-text-to-video'
  
  // Image-to-Video Models (Priority Order: Highest to Lowest)
  | 'veo-3-image-to-video'
  | 'runway-gen-3-image-to-video'
  | 'pika-labs-image-to-video'
  | 'stable-video-diffusion-image-to-video'
  | 'modelscope-image-to-video'
  | 'cogvideo-image-to-video'
  | 'text2video-zero-image-to-video'
  
  // Legacy Models (Keep existing ones)
  | 'bytedance-dreamina-v3-1-text-to-image'
  | 'bytedance-seedance-v1-pro-image-to-video'
  | 'elevenlabs-tts-multilingual-v2'
  | 'fast-sdxl'
  | 'flux-krea'
  | 'flux-pro-kontext'
  | 'imagen4-preview'
  
  // Runway ALEPH Model
  | 'runway-aleph-image-to-video'
  | 'lucy-14b-image-to-video'
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
import { useUserProgression } from '@/hooks/useUserProgression';
import { useUnlockedModels } from '@/hooks/useUnlockedModels';
import { LevelProgressionModal } from '@/components/LevelProgressionModal';
import { LevelProgressIndicator } from '@/components/LevelProgressIndicator';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useUserGallery } from '@/hooks/useUserGallery';
import { Header } from '@/components/Header';
import { AuthModal } from '@/components/AuthModal';
import { UsageLimitBanner, UsageCounter } from '@/components/UsageLimitBanner';
import { UserCounter } from '@/components/UserCounter';
import { supabase } from '@/lib/supabase';

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
  const { showError, errors, removeError } = useAnimatedError();
  const { usageStats, isAnonymous, trackUsage } = useUsageTracking();
  const { addToGallery, removeFromGallery, gallery } = useUserGallery();
  const {
    progressionData,
    trackModelUsage,
    getProgressToNextLevel,
    getModelsNeededForNextLevel,
    isModelUnlocked,
    getModelCostTier
  } = useUserProgression();
  
  const { unlockModel, isSecretModelUnlocked } = useUnlockedModels();

  // Authentication states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [hasSecretAccess, setHasSecretAccess] = useState<boolean | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [showAllModels, setShowAllModels] = useState(false);
  
  // Level progression states
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{
    leveledUp: boolean;
    currentLevel: number;
    previousLevel: number;
    unlockedModels: string[];
  } | null>(null);

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
    isProcessing: false,
    currentStep: '',
    progress: 0
  });
  
  // 4-variant generation states
  const [generatedVariants, setGeneratedVariants] = useState<Array<{
    id: string;
    type: 'image' | 'video';
    url?: string;
    loading: boolean;
    error?: string;
    prompt?: string;
  }>>([
    { id: 'variant-1', type: 'video', loading: false },
    { id: 'variant-2', type: 'video', loading: false },
    { id: 'variant-3', type: 'video', loading: false },
    { id: 'variant-4', type: 'video', loading: false }
  ]);

  // Main video result for dedicated display panel
  const [mainVideoResult, setMainVideoResult] = useState<{
    url?: string;
    loading: boolean;
    error?: string;
    prompt?: string;
    type?: 'image' | 'video';
  }>({
    loading: false
  });

  // UI states
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  // Secret Level specific states
  const [secretLevel, setSecretLevel] = useState<number>(1);
  const [unlockedModels, setUnlockedModels] = useState<Set<SecretGenerationMode>>(new Set());
  const [userLevel, setUserLevel] = useState<number>(1); // Track user's actual level

  // Initialize with basic models unlocked and determine user level
  useEffect(() => {
    const determineUserLevel = () => {
      if (!user) return 1;
      
      // Check if user has promo code access (admin or special access)
      if (hasSecretAccess) {
        // Users with promo codes start at higher levels
        return user.email === '1deeptechnology@gmail.com' ? 5 : 3; // Admin gets level 5, promo users get level 3
      }
      
      // Existing users (created before today) start at Level 1
      const userCreatedAt = new Date(user.created_at || '2024-01-01');
      const today = new Date();
      const daysSinceCreation = Math.floor((today.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceCreation > 0) {
        return 1; // Existing users start at Level 1
      }
      
      return 1; // Default to Level 1
    };
    
    const userLevel = determineUserLevel();
    setUserLevel(userLevel);
    
    const basicModels: SecretGenerationMode[] = [
      // Level 1 Beta Models - Prioritized with image models first
      'nano-banana-text-to-image',        // FAL proxy - IMAGE MODEL
      'flux-dev-text-to-image',           // FAL proxy (Edit model) - IMAGE MODEL
      'lucy-14b-image-to-video',          // FAL proxy (Lucy-14B Image-to-Video) - IMAGE MODEL
      'minimax-hailuo-02-pro-image-to-video',  // FAL proxy (Minimax Image-to-Video) - IMAGE MODEL
      'kling-video-v2-1-master-image-to-video', // FAL proxy (Kling Image-to-Video) - IMAGE MODEL
      'runway-aleph-image-to-video',      // Runway API route (ALEPH Restyled) - IMAGE MODEL
      'minimax-video-01'   // Direct API route (Minimax Endframe) - VIDEO MODEL
    ];
    setUnlockedModels(new Set(basicModels));
  }, [user, hasSecretAccess]);

  // Check user's secret access
  const checkSecretAccess = useCallback(async () => {
    if (!user) {
      setHasSecretAccess(false);
      setAccessLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setHasSecretAccess(false);
        setAccessLoading(false);
        return;
      }

      const response = await fetch('/api/promo', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHasSecretAccess(data.hasAccess);
        setIsAdmin(data.isAdmin || false);
        setAdminUser(data.adminUser || null);
      } else {
        setHasSecretAccess(false);
        setIsAdmin(false);
        setAdminUser(null);
      }
    } catch (error) {
      console.error('Error checking secret access:', error);
      setHasSecretAccess(false);
    } finally {
      setAccessLoading(false);
    }
  }, [user]);

  // Check access when user changes
  useEffect(() => {
    checkSecretAccess();
  }, [checkSecretAccess]);

  // Get all available models
  const getAllAvailableModels = (): SecretGenerationMode[] => {
    return [
      // Text-to-Image Models (Priority Order: Highest to Lowest)
      'nano-banana-text-to-image',
      'gemini-pro-vision-text-to-image',
      'flux-1.1-pro-text-to-image',
      'imagen-3-text-to-image',
      'dall-e-3-text-to-image',
      'midjourney-v6-text-to-image',
      'stable-diffusion-xl-text-to-image',
      'flux-dev-text-to-image',
      'stable-diffusion-v3-text-to-image',
      'flux-schnell-text-to-image',
      'stable-diffusion-v2-text-to-image',
      'flux-1.0-text-to-image',
      
      // Text-to-Video Models (Priority Order: Highest to Lowest)
      'veo-3-text-to-video',
      'runway-gen-3-text-to-video',
      'pika-labs-text-to-video',
      'stable-video-diffusion-text-to-video',
      'zeroscope-text-to-video',
      'modelscope-text-to-video',
      'cogvideo-text-to-video',
      'text2video-zero-text-to-video',
      
      // Image-to-Video Models (Priority Order: Highest to Lowest)
      'veo-3-image-to-video',
      'runway-gen-3-image-to-video',
      'pika-labs-image-to-video',
      'stable-video-diffusion-image-to-video',
      'modelscope-image-to-video',
      'cogvideo-image-to-video',
      'text2video-zero-image-to-video',
      
      // Legacy Models (Keep existing ones)
      'bytedance-dreamina-v3-1-text-to-image',
      'bytedance-seedance-v1-pro-image-to-video',
      'elevenlabs-tts-multilingual-v2',
      'fast-sdxl',
      'flux-krea',
      'flux-pro-kontext',
      'imagen4-preview',
      'kling-video-v2-1-master-image-to-video',
      'minimax-hailuo-02-pro-image-to-video',
      'minimax-video-01',
      'minimax-video-generation',
      'nano-banana-edit',
      'qwen-image-edit',
      'stable-diffusion-v35-large',
      'veo3-fast-image-to-video',
      'veo3-image-to-video',
      'veo3-standard',
      'wan-v2-2-a14b-image-to-video-lora',
      'wav2lip',
      'latentsync',
      'sync-fondo',
      'musetalk'
    ];
  };

  // Get models to display based on admin status and progression
  const getDisplayModels = (): SecretGenerationMode[] => {
    if (isAdmin) {
      return getAllAvailableModels();
    }
    
    if (showAllModels) {
      return getAllAvailableModels();
    }
    
    // For regular users, show unlocked models from progression system
    if (progressionData?.unlockedModels) {
      return getAllAvailableModels().filter(model => 
        progressionData.unlockedModels.includes(model) || 
        unlockedModels.has(model)
      );
    }
    
    return Array.from(unlockedModels);
  };

  // Generation time estimation functions
  const getEstimatedTimeForMode = (mode: SecretGenerationMode): number => {
    const timeEstimates = {
      // Text-to-Image Models (Priority Order: Highest to Lowest)
      'nano-banana-text-to-image': 8,
      'gemini-pro-vision-text-to-image': 12,
      'flux-1.1-pro-text-to-image': 15,
      'imagen-3-text-to-image': 18,
      'dall-e-3-text-to-image': 20,
      'midjourney-v6-text-to-image': 25,
      'stable-diffusion-xl-text-to-image': 15,
      'flux-dev-text-to-image': 12,
      'stable-diffusion-v3-text-to-image': 20,
      'flux-schnell-text-to-image': 8,
      'stable-diffusion-v2-text-to-image': 25,
      'flux-1.0-text-to-image': 18,
      
      // Runway ALEPH Model
      'lucy-14b-image-to-video': 15, // Lightning fast performance
      'runway-aleph-image-to-video': 25,
      
      // Text-to-Video Models (Priority Order: Highest to Lowest)
      'veo-3-text-to-video': 45,
      'runway-gen-3-text-to-video': 60,
      'pika-labs-text-to-video': 30,
      'stable-video-diffusion-text-to-video': 40,
      'zeroscope-text-to-video': 35,
      'modelscope-text-to-video': 50,
      'cogvideo-text-to-video': 45,
      'text2video-zero-text-to-video': 30,
      
      // Image-to-Video Models (Priority Order: Highest to Lowest)
      'veo-3-image-to-video': 40,
      'runway-gen-3-image-to-video': 55,
      'pika-labs-image-to-video': 25,
      'stable-video-diffusion-image-to-video': 35,
      'modelscope-image-to-video': 45,
      'cogvideo-image-to-video': 40,
      'text2video-zero-image-to-video': 25,
      
      // Legacy Models (Keep existing ones)
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
      // Text-to-Image Models (Priority Order: Highest to Lowest)
      'nano-banana-text-to-image': '🖼️ Nano Banana Pro',
      'gemini-pro-vision-text-to-image': '🖼️ Gemini Pro Vision',
      'flux-1.1-pro-text-to-image': '🖼️ Flux 1.1 Pro',
      'imagen-3-text-to-image': '🖼️ Imagen 3',
      'dall-e-3-text-to-image': '🖼️ DALL-E 3',
      'midjourney-v6-text-to-image': '🖼️ Midjourney V6',
      'stable-diffusion-xl-text-to-image': '🖼️ Stable Diffusion XL',
      'flux-dev-text-to-image': '🖼️ Flux Dev',
      'stable-diffusion-v3-text-to-image': '🖼️ Stable Diffusion V3',
      'flux-schnell-text-to-image': '🖼️ Flux Schnell',
      'stable-diffusion-v2-text-to-image': '🖼️ Stable Diffusion V2',
      'flux-1.0-text-to-image': '🖼️ Flux 1.0',
      
      // Image-to-Video Models (Priority Order: Highest to Lowest)
      'lucy-14b-image-to-video': '🎬 Lucy-14B Lightning Fast',
      'runway-aleph-image-to-video': '🎬 Runway ALEPH Restyled',
      'minimax-hailuo-02-pro-image-to-video': '🎬 Minimax Hailuo Pro',
      'kling-video-v2-1-master-image-to-video': '🎬 Kling Video Master',
      
      // Text-to-Video Models (Priority Order: Highest to Lowest)
      'veo-3-text-to-video': 'Veo 3 Text-to-Video',
      'runway-gen-3-text-to-video': 'Runway Gen-3',
      'pika-labs-text-to-video': 'Pika Labs',
      'stable-video-diffusion-text-to-video': 'Stable Video Diffusion',
      'zeroscope-text-to-video': 'Zeroscope',
      'modelscope-text-to-video': 'ModelScope',
      'cogvideo-text-to-video': 'CogVideo',
      'text2video-zero-text-to-video': 'Text2Video-Zero',
      
      // Image-to-Video Models (Priority Order: Highest to Lowest)
      'veo-3-image-to-video': 'Veo 3 Image-to-Video',
      'runway-gen-3-image-to-video': 'Runway Gen-3 Image',
      'pika-labs-image-to-video': 'Pika Labs Image',
      'stable-video-diffusion-image-to-video': 'Stable Video Diffusion Image',
      'modelscope-image-to-video': 'ModelScope Image',
      'cogvideo-image-to-video': 'CogVideo Image',
      'text2video-zero-image-to-video': 'Text2Video-Zero Image',
      
      // Legacy Models (Keep existing ones)
      'bytedance-dreamina-v3-1-text-to-image': 'Dreamina V3.1',
      'bytedance-seedance-v1-pro-image-to-video': 'Seedance V1 Pro',
      'elevenlabs-tts-multilingual-v2': 'ElevenLabs TTS',
      'fast-sdxl': 'Fast SDXL',
      'flux-krea': 'Flux Krea',
      'flux-pro-kontext': 'Flux Pro Kontext',
      'imagen4-preview': 'Imagen4 Preview',
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
          file,
          fileType: file.type.startsWith('image/') ? 'image' : 'video',
          preview: URL.createObjectURL(file),
          base64: '', // Will be set after conversion
          type: 'reference' // Default type
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

  const removeFile = (fileIndex: number) => {
    setUploadedFiles(prev => {
      const file = prev[fileIndex];
      if (file && file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, index) => index !== fileIndex);
    });
  };

  // Helper function to generate cinematic prompts based on model type
  const generateCinematicPrompts = (modelType: string, basePrompt: string = '') => {
    const basePrompts = {
      'image-to-video': [
        'Start with the first frame and create a close-up shot, slowly zooming in on the character\'s face with dramatic lighting and subtle facial expressions',
        'Start with the first frame and create a static shot, keeping the camera completely still while the character moves subtly with minimal background motion',
        'Start with the first frame and create a tracking shot, following the character with smooth camera movement from left to right, maintaining focus on the subject',
        'Start with the first frame and create a wide establishing shot, slowly pulling back to reveal the full environment and character in cinematic composition'
      ],
      'text-to-video': [
        'Create a cinematic close-up shot with dramatic lighting, focusing on facial expressions and subtle movements',
        'Generate a static wide shot with minimal camera movement, emphasizing the character\'s presence in the environment',
        'Produce a dynamic tracking shot with smooth camera movement following the character through the scene',
        'Create an establishing shot that slowly reveals the full environment with cinematic composition and lighting'
      ],
      'default': [
        'Create a cinematic animation with dramatic close-up focus and subtle character movements',
        'Generate a static shot with minimal motion, emphasizing composition and lighting',
        'Produce a dynamic tracking shot with smooth camera movement and character interaction',
        'Create a wide establishing shot with cinematic composition and environmental details'
      ]
    };

    const prompts = basePrompts[modelType as keyof typeof basePrompts] || basePrompts.default;
    
    // If there's a base prompt, incorporate it
    if (basePrompt) {
      return prompts.map(prompt => `${basePrompt}. ${prompt}`);
    }
    
    return prompts;
  };

  // Helper function to add timeout to API calls
  const withTimeout = (promise: Promise<any>, timeoutMs: number): Promise<any> => {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  };

  // Helper function to generate a single variant with async handling
  const generateSingleVariantAsync = async (variantIndex: number, baseRequestBody: any, apiEndpoint: string): Promise<any> => {
    // Add variation to the request body (different seeds, prompts, etc.)
    const variantRequestBody = { ...baseRequestBody };
    
    // Add variation parameters
    if (variantRequestBody.seed !== undefined) {
      variantRequestBody.seed = Math.floor(Math.random() * 1000000);
    }
    
    // Determine model type for cinematic prompts
    let modelType = 'default';
    if (apiEndpoint.includes('image-to-video')) {
      modelType = 'image-to-video';
    } else if (apiEndpoint.includes('text-to-video')) {
      modelType = 'text-to-video';
    }
    
    // Generate cinematic prompts based on model type
    const cinematicPrompts = generateCinematicPrompts(modelType, variantRequestBody.prompt);
    
    if (variantRequestBody.prompt && typeof variantRequestBody.prompt === 'string') {
      variantRequestBody.prompt = cinematicPrompts[variantIndex] || variantRequestBody.prompt;
    }
    
    // Vary motion strength for video models based on shot type
    if (variantRequestBody.motionStrength !== undefined) {
      const motionStrengths = [0.2, 0.1, 0.6, 0.4]; // Close-up: low, Static: very low, Tracking: high, Wide: medium
      variantRequestBody.motionStrength = motionStrengths[variantIndex] || 0.5;
    }
    
    // Add cinematic-specific parameters for video models
    if (apiEndpoint.includes('image-to-video') || apiEndpoint.includes('text-to-video')) {
      // Cost-saving: Use shorter duration for video models
      if (variantRequestBody.duration !== undefined) {
        variantRequestBody.duration = 3; // Reduced from 4-6 seconds to 3 seconds for cost savings
      }
      
      // Cost-saving: Use minimal motion for cost reduction
      if (variantRequestBody.motionStrength !== undefined) {
        variantRequestBody.motionStrength = 0.2; // Reduced motion for cost savings
      }
      
      // Vary camera movement intensity (but keep minimal for cost savings)
      const cameraMovements = ['minimal', 'subtle', 'minimal', 'subtle']; // All minimal for cost savings
      variantRequestBody.cameraMovement = cameraMovements[variantIndex];
      
      // Add style variations (but keep simple for cost savings)
      const styles = ['minimalist', 'minimalist', 'minimalist', 'minimalist']; // All minimalist for cost savings
      variantRequestBody.style = styles[variantIndex];
    }
    
    console.log(`🎬 Generating variant ${variantIndex + 1} with prompt: ${variantRequestBody.prompt}`);
    
    // Use longer timeout for video generation (10 minutes) since Fal.ai queue can take time
    const timeoutMs = apiEndpoint.includes('video') ? 600000 : 120000; // 10 min for video, 2 min for others
    
    try {
      const response = await withTimeout(
        fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(variantRequestBody)
        }),
        timeoutMs
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Variant ${variantIndex + 1} generation failed`);
      }

      console.log(`✅ Variant ${variantIndex + 1} completed with data:`, result.data);
      return result;
    } catch (error) {
      console.error(`❌ Variant ${variantIndex + 1} error:`, error);
      throw error;
    }
  };

  // Check daily limit for video models (cost-saving measure)
  const checkDailyLimit = (model: string): boolean => {
    if (!model.includes('video')) {
      return true; // No limit for non-video models
    }
    
    const today = new Date().toDateString();
    const lastUsedKey = `video-model-last-used-${user?.id}`;
    const lastUsedDate = localStorage.getItem(lastUsedKey);
    
    if (lastUsedDate === today) {
      return false; // Already used today
    }
    
    return true; // Can use
  };

  // Update daily limit tracking
  const updateDailyLimit = (model: string) => {
    if (!model.includes('video')) {
      return; // No tracking needed for non-video models
    }
    
    const today = new Date().toDateString();
    const lastUsedKey = `video-model-last-used-${user?.id}`;
    localStorage.setItem(lastUsedKey, today);
  };

  // Helper function to convert image URL to base64
  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting URL to base64:', error);
      throw new Error('Failed to convert image URL to base64');
    }
  };

  // Handle editing an existing image (inject into next available input slot)
  const handleEditImage = async (imageUrl: string, originalPrompt?: string) => {
    try {
      console.log('🎨 Editing image:', imageUrl);
      
      // Check if we already have 4 images (max slots)
      if (uploadedFiles.length >= 4) {
        showError('Maximum of 4 images allowed. Please remove an image first.');
        return;
      }
      
      // Convert the image URL to base64
      const base64Image = await urlToBase64(imageUrl);
      
      // Create a new uploaded file object
      const newFile: UploadedFile = {
        file: new File([], `edit-image-${Date.now()}.jpg`, { type: 'image/jpeg' }),
        preview: imageUrl,
        base64: base64Image,
        type: 'reference',
        fileType: 'image'
      };
      
      // Add to existing files (don't replace)
      setUploadedFiles(prev => [...prev, newFile]);
      
      // Note: Secret page doesn't have a prompt input field
      
      // Show notification
      showError(`🎨 Image added to slot ${uploadedFiles.length + 1}! You can add up to 4 images total.`);
      
    } catch (error) {
      console.error('Error loading image for editing:', error);
      showError('Failed to load image for editing');
    }
  };

  // Handle varying an existing generated image
  const handleVaryImage = async (imageUrl: string, originalPrompt?: string) => {
    console.log('🎨 handleVaryImage called with:', { imageUrl, originalPrompt });
    
    if (processingState.isProcessing) {
      console.log('⚠️ Already processing, skipping...');
      showError('Already processing. Please wait...');
      return;
    }

    try {
      console.log('🔄 Starting image variation process...');
      setGeneratedVariants(prev => prev.map(variant => ({
        ...variant,
        loading: false,
        error: undefined,
        url: undefined
      })));
      
      setProcessingState({
        isProcessing: true,
        progress: 10,
        currentStep: 'Converting image...'
      });

      // Convert the image URL to base64
      console.log('🔄 Converting image URL to base64...');
      const base64Image = await urlToBase64(imageUrl);
      console.log('✅ Base64 conversion complete, length:', base64Image.length);
      
      setProcessingState({
        isProcessing: true,
        progress: 30,
        currentStep: 'Processing with Gemini AI...'
      });

      // Use the original prompt or a default variation prompt
      const varyPrompt = originalPrompt || 'Generate 4 new variations of this character from different angles';
      console.log('📝 Using prompt:', varyPrompt);

      console.log('🔄 Making API call to /api/vary-character...');
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate variations');
      }

      setProcessingState({
        isProcessing: true,
        progress: 70,
        currentStep: 'Generating variations...'
      });

      const data = await response.json();
      console.log('✅ Variations received:', data);

      if (data.variations && data.variations.length > 0) {
        // Update the variants with the new generated images
        setGeneratedVariants(prev => prev.map((variant, index) => {
          const variation = data.variations[index];
          if (variation && variation.imageUrl) {
            return {
              ...variant,
              loading: false,
              url: variation.imageUrl,
              type: 'image',
              error: undefined
            };
          }
          return variant;
        }));

        setProcessingState({
          isProcessing: true,
          progress: 100,
          currentStep: 'Complete!'
        });

        setTimeout(() => {
          setProcessingState({
            isProcessing: false,
            progress: 0,
            currentStep: ''
          });
        }, 1000);

        // Clear input images after successful generation
        setUploadedFiles([]);
        console.log('🧹 Cleared input images after successful variation generation');

        console.log('✅ Image variation process completed successfully');
      } else {
        throw new Error('No variations were generated');
      }

    } catch (error) {
      console.error('❌ Error in handleVaryImage:', error);
      showError(`Failed to generate variations: ${(error as Error).message}`);
      setProcessingState({
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
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

    // Check daily limit for video models (cost-saving measure)
    if (!checkDailyLimit(generationMode)) {
      showError('Provider network not available. Daily limit reached for video models.');
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
      } else if (['lucy-14b-image-to-video', 'bytedance-seedance-v1-pro-image-to-video', 'kling-video-v2-1-master-image-to-video', 'minimax-hailuo-02-pro-image-to-video', 'veo3-fast-image-to-video', 'veo3-image-to-video', 'wan-v2-2-a14b-image-to-video-lora'].includes(generationMode)) {
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
      } else if (generationMode === 'runway-aleph-image-to-video') {
        // Runway ALEPH Restyled - uses Runway API directly
        apiEndpoint = '/api/runway/aleph';
        
        if (uploadedFiles.length === 0) {
          showError('Please upload an image for Runway ALEPH restyling');
          return;
        }
        
        const imageFile = uploadedFiles.find(f => f.fileType === 'image');
        if (!imageFile) {
          showError('Please upload an image file');
          return;
        }
        
        requestBody = {
          imageUrl: imageFile.preview,
          prompt: 'Restyle this image with cinematic quality and artistic enhancement',
          style: 'cinematic'
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

      // Cost-saving: Use 1 variant for video models, 4 for image models
      const isVideoModel = generationMode.includes('video');
      const variantCount = isVideoModel ? 1 : 4; // Cost-saving measure
      
      console.log(`💰 Cost-saving: Using ${variantCount} variant(s) for ${isVideoModel ? 'video' : 'image'} model`);
      
      // Initialize variants with loading state
      setGeneratedVariants(prev => prev.map((variant, index) => ({
        ...variant,
        loading: index < variantCount, // Only load active slots
        error: undefined,
        url: undefined // Clear existing content
      })));

      // Initialize main video result for video models
      if (isVideoModel) {
        setMainVideoResult({
          loading: true,
          error: undefined,
          url: undefined,
          type: 'video'
        });
      } else {
        setMainVideoResult({ loading: false });
      }

      // Generate variants in parallel with async handling
      console.log(`🚀 Starting ${variantCount} parallel variant generations for ${generationMode}`);
      console.log(`📡 API Endpoint: ${apiEndpoint}`);
      console.log(`🎯 Request Body:`, JSON.stringify(requestBody, null, 2));
      
      const variantPromises = Array.from({ length: variantCount }, (_, index) => {
        console.log(`🎬 Starting variant ${index + 1} generation`);
        return generateSingleVariantAsync(index, requestBody, apiEndpoint)
          .then(result => {
            console.log(`✅ Variant ${index + 1} completed successfully`);
            console.log(`📊 Variant ${index + 1} result:`, result);
            return { index, result, error: null };
          })
          .catch(error => {
            console.error(`❌ Variant ${index + 1} failed:`, error.message);
            console.error(`🔍 Variant ${index + 1} error details:`, error);
            return { index, result: null, error: error.message };
          });
      });
      
      console.log(`📋 Created ${variantPromises.length} variant promises`);

      // Handle results as they come in (not waiting for all)
      variantPromises.forEach((promise, promiseIndex) => {
        promise.then(result => {
          console.log(`🎯 Variant ${result.index + 1} result received:`, result);
          
          // Update the specific variant when it completes
          setGeneratedVariants(prev => prev.map((variant, index) => {
            if (index === result.index) {
              if (result.error) {
                console.log(`❌ Variant ${result.index + 1} failed:`, result.error);
                return {
                  ...variant,
                  loading: false,
                  error: result.error
                };
              }
              
              const data = result.result?.data;
              if (data?.video) {
                console.log(`✅ Variant ${result.index + 1} video success:`, data.video.url);
                
                // Update main video result for video models (first result only)
                if (isVideoModel && result.index === 0) {
                  setMainVideoResult({
                    loading: false,
                    url: data.video.url,
                    type: 'video',
                    prompt: requestBody.prompt || 'Secret generation'
                  });
                }
                
                return {
                  ...variant,
                  loading: false,
                  url: data.video.url,
                  type: 'video',
                  prompt: requestBody.prompt || 'Secret generation'
                };
              } else if (data?.image) {
                console.log(`✅ Variant ${result.index + 1} image success:`, data.image.url);
                
                // Update main video result for image models (first result only)
                if (!isVideoModel && result.index === 0) {
                  setMainVideoResult({
                    loading: false,
                    url: data.image.url,
                    type: 'image',
                    prompt: requestBody.prompt || 'Secret generation'
                  });
                }
                
                return {
                  ...variant,
                  loading: false,
                  url: data.image.url,
                  type: 'image',
                  prompt: requestBody.prompt || 'Secret generation'
                };
              }
              
              console.log(`⚠️ Variant ${result.index + 1} no valid data:`, data);
              return {
                ...variant,
                loading: false,
                error: 'No valid result received'
              };
            }
            return variant;
          }));

          // Add to gallery when variant completes
          if (!result.error && result.result?.data) {
            const data = result.result.data;
            const variantId = `secret-${generationMode}-${Date.now()}-${result.index}`;
            
            console.log(`📸 Adding variant ${result.index + 1} to gallery:`, data);
            
            if (data.video) {
              addToGallery([{
                id: variantId,
                description: `Secret generation variant ${result.index + 1}: ${getModelDisplayName(generationMode)}`,
          angle: 'Secret Level',
          pose: 'Advanced AI',
          imageUrl: undefined,
                videoUrl: data.video.url,
                fileType: 'video' as const
        }], requestBody.prompt || 'Secret generation');
            } else if (data.image) {
              addToGallery([{
                id: variantId,
                description: `Secret generation variant ${result.index + 1}: ${getModelDisplayName(generationMode)}`,
          angle: 'Secret Level',
          pose: 'Advanced AI',
                imageUrl: data.image.url,
          videoUrl: undefined,
                fileType: 'image' as const
        }], requestBody.prompt || 'Secret generation');
      }
          }
        }).catch(error => {
          console.error(`💥 Variant promise error:`, error);
        });
      });

      // Wait for all variants to complete (or fail)
      const variantResults = await Promise.all(variantPromises);
      
      // Log results summary
      const successfulVariants = variantResults.filter(r => !r.error && r.result);
      const failedVariants = variantResults.filter(r => r.error);
      
      console.log(`📊 Generation Summary (Cost-Saving Mode):`);
      console.log(`   ✅ Successful: ${successfulVariants.length}/${variantCount}`);
      console.log(`   ❌ Failed: ${failedVariants.length}/${variantCount}`);
      console.log(`   💰 Cost-saving: ${isVideoModel ? '1 video variant' : '4 image variants'}`);
      
      if (failedVariants.length > 0) {
        console.log(`   Failed variants:`, failedVariants.map(v => `Variant ${v.index + 1}: ${v.error}`));
        
        // Show user-friendly error message
        if (successfulVariants.length < 2) {
          showError(`Only ${successfulVariants.length} out of 4 variants generated successfully. Some may have failed due to API limits or timeouts.`);
        } else if (successfulVariants.length < 4) {
          console.log(`⚠️ Partial success: ${successfulVariants.length}/4 variants completed`);
        }
      }
      
      console.log(`✅ Secret generation completed - all variants processed`);

      // Clear input images after successful generation
      setUploadedFiles([]);
      console.log('🧹 Cleared input images after successful secret generation');

      // Results are handled asynchronously above, no need for duplicate processing

      // Track usage
      await trackUsage('image_generation', 'nano_banana', {
        model: generationMode,
        prompt: requestBody.prompt || 'Secret generation'
      });

      // Track model usage for progression system
      const generationType = generationMode.includes('text-to-image') ? 'text-to-image' :
                           generationMode.includes('text-to-video') ? 'text-to-video' :
                           generationMode.includes('image-to-video') ? 'image-to-video' :
                           generationMode.includes('lip-sync') ? 'lip-sync' : 'other';
      
      const costTier = getModelCostTier(generationMode);
      const costCredits = costTier === 'high' ? 10 : costTier === 'medium' ? 5 : 1;
      
      const levelUpResult = await trackModelUsage(generationMode, generationType, costCredits);
      
      // Show level up modal if user leveled up
      if (levelUpResult?.leveledUp) {
        setLevelUpData(levelUpResult);
        setShowLevelUpModal(true);
      }

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
  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/80">Loading Secret Level...</p>
        </div>
      </div>
    );
  }

  // Check if user has secret access
  if (user && hasSecretAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <Lock className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Secret Level Access Required</h1>
          <p className="text-white/80 mb-6">
            You need a valid promo code to access the Secret Level features. 
            Enter your promo code in your profile settings to unlock advanced AI models.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => router.push('/profile')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
            >
              Go to Profile Settings
            </button>
            <button
              onClick={() => router.push('/generate')}
              className="w-full bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-6 py-3 rounded-xl border border-white/20 transition-all duration-300"
            >
              Back to Generate
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Video Background */}
      <div className="fixed inset-0 w-full h-full z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-30"
        >
          <source src="/Hailuo_Video_A dark, cosmic horror-like the_422674688974839808.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      <Header 
        onSignUpClick={handleSignUpClick}
        onSignInClick={handleSignInClick}
        hideCommunityButton={false}
        hideAnalytics={false}
        showExitSecretLevel={true}
      />
      
      {errors.map((error) => (
        <AnimatedError 
          key={error.id}
          message={error.message}
          type={error.type}
          onClose={() => removeError(error.id)}
        />
      ))}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />

      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      <UsageLimitBanner 
        onSignUpClick={() => setShowAuthModal(true)}
        onSaveToAccountClick={() => setShowAuthModal(true)}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Secret Level Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-yellow-400 mr-3" />
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              {userLevel === 1 ? 'LEVEL ONE' : `LEVEL ${userLevel}`}
            </h1>
            <Lock className="w-8 h-8 text-yellow-400 ml-3" />
          </div>
          <p className="text-xl text-white/80 mb-2">
            Beta AI Models • Level-Based Access • Premium Features
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-white/60">
            <span>User Level: {userLevel}</span>
            <span>•</span>
            <span>Models Available: {getDisplayModels().length}</span>
            <span>•</span>
            <span>Total Models: {getAllAvailableModels().length}</span>
            {isAdmin && (
              <>
                <span>•</span>
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  ADMIN: {adminUser || 'Chad (@1deeptechnology)'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Level Progression Indicator */}
        {progressionData && (
          <div className="mb-8">
            <LevelProgressIndicator
              level={progressionData.level}
              totalGenerations={progressionData.totalGenerations}
              uniqueModelsUsed={progressionData.uniqueModelsUsed}
              progressToNext={getProgressToNextLevel()}
              modelsNeededForNext={getModelsNeededForNextLevel()}
            />
          </div>
        )}

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
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            {file.fileType === 'image' ? (
                              <Images className="w-5 h-5 text-white" />
                            ) : (
                              <Camera className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{file.file.name}</p>
                            <p className="text-white/60 text-xs">
                              {(file.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-white">Available Models</h3>
                  {!isAdmin && (
                    <button
                      onClick={() => setShowAllModels(!showAllModels)}
                      className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
                    >
                      {showAllModels ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Show Unlocked Only
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show All Models
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getDisplayModels().map((mode) => {
                    const isUnlocked = unlockedModels.has(mode) || isModelUnlocked(mode) || isSecretModelUnlocked(mode);
                    const isAdminModel = isAdmin;
                    const costTier = getModelCostTier(mode);
                    return (
                      <button
                        key={mode}
                        onClick={async () => {
                          // If model is not unlocked, try to unlock it first
                          if (!isUnlocked && !isAdminModel) {
                            const unlocked = await unlockModel(mode);
                            if (unlocked) {
                              showError(`🎉 ${getModelDisplayName(mode)} unlocked!`);
                            } else {
                              showError('Failed to unlock model. Please try again.');
                              return;
                            }
                          }
                          setGenerationMode(mode);
                        }}
                        disabled={!isUnlocked && !isAdminModel}
                        className={`p-4 rounded-lg border transition-all duration-300 text-left ${
                          generationMode === mode
                            ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                            : isUnlocked || isAdminModel
                            ? 'border-white/20 hover:border-white/40 text-white/80 hover:text-white'
                            : 'border-white/10 text-white/40 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{getModelDisplayName(mode)}</p>
                            <p className="text-sm opacity-75">
                              ~{getEstimatedTimeForMode(mode)}s
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {!isUnlocked && !isAdminModel && (
                                <p className="text-xs text-red-400">🔒 Locked</p>
                              )}
                              {/* Model Type Badges */}
                              {(mode.includes('text-to-image') || mode.includes('image-to-video')) && (
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">🖼️ Image Model</span>
                              )}
                              {mode.includes('video') && (
                                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">🎬 Daily Limit</span>
                              )}
                              {costTier === 'high' && (
                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">Premium</span>
                              )}
                              {costTier === 'medium' && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">Standard</span>
                              )}
                              {costTier === 'low' && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Economy</span>
                              )}
                            </div>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${
                            isUnlocked || isAdminModel 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                              : 'bg-gray-500'
                          }`}></div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!isAdmin && (
                  <div className="mt-3 text-center">
                    <p className="text-white/60 text-sm">
                      {showAllModels 
                        ? `Showing all ${getAllAvailableModels().length} models (${unlockedModels.size} unlocked)`
                        : `Showing ${unlockedModels.size} unlocked models`
                      }
                    </p>
                  </div>
                )}
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
              
              {/* Cost-Saving Info */}
              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 text-orange-400 mt-0.5">💰</div>
                  <div className="text-sm text-orange-300">
                    <p className="font-medium mb-1">Cost-Saving Measures Active</p>
                    <p className="text-orange-400/80">
                      {generationMode?.includes('video') ? (
                        <>
                          Video models: 1 variant per day, 3-second duration, minimal motion. 
                          Daily limit reached? Try image models instead.
                        </>
                      ) : (
                        <>
                          Image models: 4 variants per generation, full quality. 
                          Video models have daily limits for cost control.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

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

              {/* Main Video Display Panel */}
              {(mainVideoResult.loading || mainVideoResult.url || mainVideoResult.error) && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                    <Play className="w-5 h-5 mr-2" />
                    Main Result
                  </h3>
                  <div className="relative w-full max-w-5xl mx-auto">
                    <div className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-500 shadow-2xl hover:shadow-green-500/25 hover:scale-[1.02] ${
                      mainVideoResult.loading
                        ? 'border-yellow-400/50 bg-yellow-400/10'
                        : mainVideoResult.error
                          ? 'border-red-400/50 bg-red-400/10'
                          : mainVideoResult.url
                            ? 'border-green-400/50 bg-green-400/10'
                            : 'border-white/20 bg-white/5'
                    }`}>
                      {mainVideoResult.loading ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center text-white/80">
                            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                            <p className="text-lg font-medium">Generating Main Result...</p>
                            <p className="text-sm opacity-75">Creating your {mainVideoResult.type || 'content'}</p>
            </div>
          </div>
                      ) : mainVideoResult.error ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center text-red-400">
                            <XCircle className="w-12 h-12 mx-auto mb-4" />
                            <p className="text-lg font-medium">Generation Failed</p>
                            <p className="text-sm opacity-75">{mainVideoResult.error}</p>
                          </div>
                        </div>
                      ) : mainVideoResult.url ? (
                        <div className="group relative w-full h-full">
                          {mainVideoResult.type === 'video' ? (
                            <video
                              src={mainVideoResult.url}
                              className="w-full h-full object-cover"
                              controls
                              autoPlay
                              muted
                              loop
                              playsInline
                            />
                          ) : (
                            <img
                              src={mainVideoResult.url}
                              alt="Generated content"
                              className="w-full h-full object-cover"
                            />
                          )}
                          {/* Overlay with prompt */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                            <div className="text-white">
                              <p className="font-medium text-lg">Main Result</p>
                              <p className="text-sm opacity-80">{mainVideoResult.prompt}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center text-white/40">
                            <Camera className="w-12 h-12 mx-auto mb-4" />
                            <p className="text-lg">Ready for Generation</p>
                            <p className="text-sm">Select a model and generate content</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2x2 Grid Results Display */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <Grid3X3 className="w-5 h-5 mr-2" />
                  Generated Variants
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {generatedVariants.map((variant, index) => {
                    // Hide first slot for video models since it's displayed in main panel
                    const isVideoModel = generationMode?.includes('video');
                    if (isVideoModel && index === 0) {
                      return null;
                    }
                    
                    return (
                    <div
                      key={variant.id}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                        variant.loading
                          ? 'border-yellow-400/50 bg-yellow-400/10'
                          : variant.error
                            ? 'border-red-400/50 bg-red-400/10'
                            : variant.url
                              ? 'border-green-400/50 bg-green-400/10'
                              : 'border-white/20 bg-white/5'
                      }`}
                    >
                      {variant.loading ? (
                        // Loading state
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center text-white/80">
                            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                            <p className="text-sm">Generating...</p>
                            <p className="text-xs">
                              {index === 0 && 'Close-up Shot'}
                              {index === 1 && 'Static Shot'}
                              {index === 2 && 'Tracking Shot'}
                              {index === 3 && 'Wide Shot'}
                            </p>
                          </div>
                        </div>
                      ) : variant.error ? (
                        // Error state
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center text-red-400">
                            <X className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Error</p>
                            <p className="text-xs">{variant.error}</p>
                          </div>
                        </div>
                      ) : variant.url ? (
                        // Success state - show generated content
                        <div className="w-full h-full relative group">
                          {variant.type === 'video' ? (
                            <video
                              src={variant.url}
                              className="w-full h-full object-cover"
                              controls
                              muted
                            />
                          ) : (
                            <img
                              src={variant.url}
                              alt="Generated content"
                              className="w-full h-full object-cover"
                            />
                          )}
                          {/* Overlay with variant info and action buttons */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                            {/* Top section with variant info */}
                            <div className="text-white text-sm">
                              <p className="font-medium">Variant {index + 1}</p>
                              <p className="text-xs opacity-80">
                                {index === 0 && 'Close-up Shot'}
                                {index === 1 && 'Static Shot'}
                                {index === 2 && 'Tracking Shot'}
                                {index === 3 && 'Wide Shot'}
                              </p>
                            </div>
                            
                            {/* Bottom section with action buttons */}
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleEditImage(variant.url!)}
                                disabled={processingState.isProcessing}
                                className="text-xs text-blue-300 hover:text-blue-200 transition-colors px-2 py-1 rounded bg-blue-900/30 hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Inject into input slot for editing"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleVaryImage(variant.url!)}
                                disabled={processingState.isProcessing}
                                className="text-xs text-purple-300 hover:text-purple-200 transition-colors px-2 py-1 rounded bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Generate variations with nano_banana"
                              >
                                Vary
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Empty state
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center text-white/40">
                            <Camera className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">
                              {index === 0 && 'Close-up Shot'}
                              {index === 1 && 'Static Shot'}
                              {index === 2 && 'Tracking Shot'}
                              {index === 3 && 'Wide Shot'}
                            </p>
                            <p className="text-xs">Ready</p>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Counter */}
        <div className="mt-8 flex justify-center">
          <UsageCounter 
            onSignUpClick={() => setShowAuthModal(true)}
          />
        </div>
      </div>
      
      {/* Level Up Modal */}
      {levelUpData && (
        <LevelProgressionModal
          isOpen={showLevelUpModal}
          onClose={() => {
            setShowLevelUpModal(false);
            setLevelUpData(null);
          }}
          levelUpData={levelUpData}
        />
      )}
    </div>
  );
}
