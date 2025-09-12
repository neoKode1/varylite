import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CreditCheckResult {
  hasCredits: boolean;
  availableCredits: number;
  modelCost: number;
  error?: string;
}

interface CreditUsageResult {
  success: boolean;
  creditsUsed: number;
  remainingCredits: number;
  error?: string;
}

export const useCreditCheck = () => {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [using, setUsing] = useState(false);

  const checkUserCredits = useCallback(async (modelName: string): Promise<CreditCheckResult> => {
    if (!user?.id) {
      return {
        hasCredits: false,
        availableCredits: 0,
        modelCost: 0,
        error: 'User not authenticated'
      };
    }

    try {
      setChecking(true);
      
      const response = await fetch('/api/check-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          modelName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check credits');
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Error checking credits:', error);
      return {
        hasCredits: false,
        availableCredits: 0,
        modelCost: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setChecking(false);
    }
  }, [user?.id]);

  const useCredits = useCallback(async (
    modelName: string,
    generationType: 'image' | 'video' | 'character_variation',
    generationId?: string
  ): Promise<CreditUsageResult> => {
    if (!user?.id) {
      return {
        success: false,
        creditsUsed: 0,
        remainingCredits: 0,
        error: 'User not authenticated'
      };
    }

    try {
      setUsing(true);
      
      const response = await fetch('/api/use-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          modelName,
          generationType,
          generationId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to use credits');
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Error using credits:', error);
      return {
        success: false,
        creditsUsed: 0,
        remainingCredits: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setUsing(false);
    }
  }, [user?.id]);

  return {
    checkUserCredits,
    useCredits,
    checking,
    using
  };
};
