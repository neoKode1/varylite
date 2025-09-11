import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ModelUsage {
  modelName: string;
  generationType: string;
  costCredits: number;
}

interface UserProgressionData {
  level: number;
  totalGenerations: number;
  uniqueModelsUsed: number;
  lastLevelUp: string | null;
  unlockedModels: string[];
  modelUsage: ModelUsage[];
}

interface LevelUpResult {
  leveledUp: boolean;
  currentLevel: number;
  previousLevel: number;
  unlockedModels: string[];
}

export const useUserProgression = () => {
  const { user } = useAuth();
  const [progressionData, setProgressionData] = useState<UserProgressionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user progression data
  const fetchProgressionData = useCallback(async () => {
    if (!user) {
      setProgressionData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const response = await fetch('/api/user-progression', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch progression data');
      }

      const data = await response.json();
      if (data.success) {
        setProgressionData({
          level: data.level,
          totalGenerations: data.totalGenerations,
          uniqueModelsUsed: data.uniqueModelsUsed,
          lastLevelUp: data.lastLevelUp,
          unlockedModels: data.unlockedModels,
          modelUsage: data.modelUsage
        });
      } else {
        throw new Error(data.error || 'Failed to fetch progression data');
      }
    } catch (err) {
      console.error('Error fetching progression data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Track model usage and check for level up
  const trackModelUsage = useCallback(async (
    modelName: string,
    generationType: string,
    costCredits: number = 0
  ): Promise<LevelUpResult | null> => {
    if (!user) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const response = await fetch('/api/user-progression', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modelName,
          generationType,
          costCredits
        })
      });

      if (!response.ok) {
        throw new Error('Failed to track model usage');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh progression data after tracking
        await fetchProgressionData();
        
        return {
          leveledUp: data.leveledUp,
          currentLevel: data.currentLevel,
          previousLevel: data.previousLevel,
          unlockedModels: data.unlockedModels
        };
      } else {
        throw new Error(data.error || 'Failed to track model usage');
      }
    } catch (err) {
      console.error('Error tracking model usage:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [user, fetchProgressionData]);

  // Calculate progress to next level
  const getProgressToNextLevel = useCallback(() => {
    if (!progressionData) return { current: 0, total: 5, percentage: 0 };

    const currentLevel = progressionData.level;
    const uniqueModelsUsed = progressionData.uniqueModelsUsed;
    
    // Each level requires 5 more unique models
    const modelsForCurrentLevel = (currentLevel - 1) * 5;
    const modelsForNextLevel = currentLevel * 5;
    
    const current = uniqueModelsUsed - modelsForCurrentLevel;
    const total = modelsForNextLevel - modelsForCurrentLevel;
    const percentage = Math.min(100, (current / total) * 100);

    return { current, total, percentage };
  }, [progressionData]);

  // Get models needed for next level
  const getModelsNeededForNextLevel = useCallback(() => {
    if (!progressionData) return 5;

    const currentLevel = progressionData.level;
    const uniqueModelsUsed = progressionData.uniqueModelsUsed;
    const modelsForNextLevel = currentLevel * 5;
    
    return Math.max(0, modelsForNextLevel - uniqueModelsUsed);
  }, [progressionData]);

  // Check if a model is unlocked
  const isModelUnlocked = useCallback((modelName: string) => {
    if (!progressionData) return false;
    return progressionData.unlockedModels.includes(modelName);
  }, [progressionData]);

  // Get cost tier for balancing
  const getModelCostTier = useCallback((modelName: string) => {
    // Define cost tiers for balancing
    const highCostModels = [
      'nano-banana-text-to-image',
      'gemini-pro-vision-text-to-image',
      'flux-1.1-pro-text-to-image',
      'imagen-3-text-to-image',
      'dall-e-3-text-to-image',
      'veo-3-text-to-video',
      'runway-gen-3-text-to-video',
      'veo-3-image-to-video',
      'runway-gen-3-image-to-video'
    ];

    const mediumCostModels = [
      'midjourney-v6-text-to-image',
      'stable-diffusion-xl-text-to-image',
      'flux-dev-text-to-image',
      'stable-diffusion-v3-text-to-image',
      'pika-labs-text-to-video',
      'stable-video-diffusion-text-to-video',
      'pika-labs-image-to-video',
      'stable-video-diffusion-image-to-video'
    ];

    if (highCostModels.includes(modelName)) return 'high';
    if (mediumCostModels.includes(modelName)) return 'medium';
    return 'low';
  }, []);

  // Fetch data when user changes
  useEffect(() => {
    fetchProgressionData();
  }, [fetchProgressionData]);

  return {
    progressionData,
    loading,
    error,
    fetchProgressionData,
    trackModelUsage,
    getProgressToNextLevel,
    getModelsNeededForNextLevel,
    isModelUnlocked,
    getModelCostTier
  };
};
