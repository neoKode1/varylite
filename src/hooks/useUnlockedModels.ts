'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Mapping from secret page models to generate page models
const SECRET_TO_GENERATE_MODEL_MAP: Record<string, string> = {
  // Text-to-Image Models
  'nano-banana-text-to-image': 'nano-banana',
  'flux-dev-text-to-image': 'flux-dev',
  'gemini-pro-vision-text-to-image': 'runway-t2i', // Map to existing model
  'flux-1.1-pro-text-to-image': 'runway-t2i', // Map to existing model
  'imagen-3-text-to-image': 'runway-t2i', // Map to existing model
  'dall-e-3-text-to-image': 'runway-t2i', // Map to existing model
  'midjourney-v6-text-to-image': 'runway-t2i', // Map to existing model
  'stable-diffusion-xl-text-to-image': 'runway-t2i', // Map to existing model
  'stable-diffusion-v3-text-to-image': 'runway-t2i', // Map to existing model
  'flux-schnell-text-to-image': 'runway-t2i', // Map to existing model
  'stable-diffusion-v2-text-to-image': 'runway-t2i', // Map to existing model
  'flux-1.0-text-to-image': 'runway-t2i', // Map to existing model
  
  // Text-to-Video Models
  'veo-3-text-to-video': 'veo3-fast-t2v',
  'runway-gen-3-text-to-video': 'runway-video',
  'pika-labs-text-to-video': 'veo3-fast-t2v', // Map to existing model
  'stable-video-diffusion-text-to-video': 'veo3-fast-t2v', // Map to existing model
  'zeroscope-text-to-video': 'veo3-fast-t2v', // Map to existing model
  'modelscope-text-to-video': 'veo3-fast-t2v', // Map to existing model
  'cogvideo-text-to-video': 'veo3-fast-t2v', // Map to existing model
  'text2video-zero-text-to-video': 'veo3-fast-t2v', // Map to existing model
  
  // Image-to-Video Models (Non-video-variant)
  'veo-3-image-to-video': 'veo3-fast',
  'runway-gen-3-image-to-video': 'runway-video',
  'pika-labs-image-to-video': 'veo3-fast', // Map to existing model
  'stable-video-diffusion-image-to-video': 'veo3-fast', // Map to existing model
  'modelscope-image-to-video': 'veo3-fast', // Map to existing model
  'cogvideo-image-to-video': 'veo3-fast', // Map to existing model
  'text2video-zero-image-to-video': 'veo3-fast', // Map to existing model
  
  // Legacy Models
  'bytedance-dreamina-v3-1-text-to-image': 'runway-t2i', // Map to existing model
  'bytedance-seedance-v1-pro-image-to-video': 'seedance-pro',
  'elevenlabs-tts-multilingual-v2': 'runway-t2i', // Map to existing model
  'fast-sdxl': 'runway-t2i', // Map to existing model
  'flux-krea': 'runway-t2i', // Map to existing model
  'flux-pro-kontext': 'runway-t2i', // Map to existing model
  'imagen4-preview': 'runway-t2i', // Map to existing model
  
  // Runway ALEPH Model
  'runway-aleph-image-to-video': 'runway-video',
  'lucy-14b-image-to-video': 'decart-lucy-14b', // This is a video variant model
  'kling-video-v2-1-master-image-to-video': 'kling-video-pro', // This is a video variant model
  'minimax-hailuo-02-pro-image-to-video': 'hailuo-02-pro', // This is a video variant model
  'minimax-video-01': 'minimax-i2v-director', // This is a video variant model
};

// Video variant models that should only be available in video mode
const VIDEO_VARIANT_MODELS = [
  'decart-lucy-14b',
  'minimax-i2v-director', 
  'hailuo-02-pro',
  'kling-video-pro'
];

export const useUnlockedModels = () => {
  const { user } = useAuth();
  const [unlockedSecretModels, setUnlockedSecretModels] = useState<Set<string>>(new Set());
  const [unlockedGenerateModels, setUnlockedGenerateModels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchUnlockedModels = useCallback(async () => {
    if (!user) {
      setUnlockedSecretModels(new Set());
      setUnlockedGenerateModels(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUnlockedSecretModels(new Set());
        setUnlockedGenerateModels(new Set());
        setLoading(false);
        return;
      }

      const response = await fetch('/api/unlock-model', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const secretModels = new Set<string>(data.unlockedModels?.map((m: any) => m.model_name) || []);
        setUnlockedSecretModels(secretModels);

        // Convert to generate page models
        const generateModels = new Set<string>();
        secretModels.forEach(secretModel => {
          const generateModel = SECRET_TO_GENERATE_MODEL_MAP[secretModel];
          if (generateModel) {
            generateModels.add(generateModel);
          }
        });
        setUnlockedGenerateModels(generateModels);
      } else {
        setUnlockedSecretModels(new Set());
        setUnlockedGenerateModels(new Set());
      }
    } catch (error) {
      console.error('Error fetching unlocked models:', error);
      setUnlockedSecretModels(new Set());
      setUnlockedGenerateModels(new Set());
    } finally {
      setLoading(false);
    }
  }, [user]);

  const unlockModel = useCallback(async (secretModelName: string) => {
    if (!user) return false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const response = await fetch('/api/unlock-model', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modelName: secretModelName })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          setUnlockedSecretModels(prev => new Set([...prev, secretModelName]));
          
          // Update generate models if mapped
          const generateModel = SECRET_TO_GENERATE_MODEL_MAP[secretModelName];
          if (generateModel) {
            setUnlockedGenerateModels(prev => new Set([...prev, generateModel]));
          }
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error unlocking model:', error);
      return false;
    }
  }, [user]);

  const isSecretModelUnlocked = useCallback((secretModelName: string) => {
    return unlockedSecretModels.has(secretModelName);
  }, [unlockedSecretModels]);

  const isGenerateModelUnlocked = useCallback((generateModelName: string) => {
    return unlockedGenerateModels.has(generateModelName);
  }, [unlockedGenerateModels]);

  const isVideoVariantModel = useCallback((modelName: string) => {
    return VIDEO_VARIANT_MODELS.includes(modelName);
  }, []);

  // Fetch unlocked models when user changes
  useEffect(() => {
    fetchUnlockedModels();
  }, [fetchUnlockedModels]);

  return {
    unlockedSecretModels,
    unlockedGenerateModels,
    loading,
    unlockModel,
    isSecretModelUnlocked,
    isGenerateModelUnlocked,
    isVideoVariantModel,
    refreshUnlockedModels: fetchUnlockedModels
  };
};
