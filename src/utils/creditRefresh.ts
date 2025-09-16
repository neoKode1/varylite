/**
 * Utility functions for credit refresh management
 */

export interface CreditUpdateDetail {
  type: 'character_variation' | 'video_generation' | 'image_generation';
  model: string;
  creditsUsed: number;
  remainingCredits: number;
  timestamp: string;
}

/**
 * Dispatch a credit updated event to refresh all credit displays
 */
export const triggerCreditRefresh = (detail: CreditUpdateDetail) => {
  console.log('🔄 Dispatching creditUpdated event:', detail);
  window.dispatchEvent(new CustomEvent('creditUpdated', { detail }));
};

/**
 * Trigger credit refresh after successful generation
 */
export const refreshCreditsAfterGeneration = async (
  userId: string,
  modelName: string,
  generationType: 'character_variation' | 'video' | 'image',
  isAdmin: boolean = false
) => {
  if (!userId || isAdmin) {
    console.log('🔄 Skipping credit deduction for admin user or missing userId');
    return;
  }

  try {
    const response = await fetch('/api/use-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        modelName,
        generationType
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Credits deducted: $${result.creditsUsed.toFixed(4)}, remaining: $${result.remainingCredits.toFixed(2)}`);
      
      // Trigger credit display refresh
      triggerCreditRefresh({
        type: generationType === 'video' ? 'video_generation' : 
              generationType === 'character_variation' ? 'character_variation' : 'image_generation',
        model: modelName,
        creditsUsed: result.creditsUsed,
        remainingCredits: result.remainingCredits,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } else {
      console.error('❌ Failed to deduct credits:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to deduct credits:', error);
    return null;
  }
};
