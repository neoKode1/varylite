// Credit Enforcement Service
// Handles credit checking and deduction for generation requests

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vqmzepfbgbwtzbpmrevx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface CreditCheckResult {
  allowed: boolean;
  reason: string;
  message: string;
  creditBalance?: number;
  gracePeriodExpiresAt?: string;
  timeRemaining?: number;
}

export interface CreditDeductionResult {
  success: boolean;
  creditsUsed: number;
  remainingBalance: number;
  error?: string;
}

// Model cost mapping (credits per generation)
const MODEL_COSTS: Record<string, number> = {
  // Image models (1 credit each)
  'nano-banana': 1,
  'runway-t2i': 1,
  'minimax-2.0': 1,
  'kling-2.1-master': 1,
  'gemini-25-flash-image-edit': 1,
  'seedream-4-edit': 1,
  
  // Video models (4 credits each)
  'veo3-fast': 4,
  'runway-video': 4,
  'minimax-video-generation': 4,
  'kling-video-pro': 4,
  'decart-lucy-14b': 4,
  'minimax-i2v-director': 4,
  'hailuo-02-pro': 4,
  'stable-video-diffusion-i2v': 4,
  'modelscope-i2v': 4,
  'text2video-zero-i2v': 4,
  'wan-v2-2-a14b-i2v-lora': 4,
  'cogvideo-i2v': 4,
  'zeroscope-t2v': 4,
  
  // Ultra-premium models (63 credits each)
  'seedance-pro': 63
};

/**
 * Check if user can generate with the specified model
 */
export async function checkUserGenerationPermission(
  userId: string,
  model: string
): Promise<CreditCheckResult> {
  try {
    console.log(`🔍 [CREDIT CHECK] Starting permission check for user: ${userId}`);
    console.log(`🔍 [CREDIT CHECK] Model: ${model}`);
    
    // Get model cost
    const modelCost = MODEL_COSTS[model] || 1; // Default to 1 credit if model not found
    console.log(`💰 [CREDIT CHECK] Model ${model} costs ${modelCost} credits`);
    
    // First, let's check the user's current credit balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credit_balance, first_generation_at, created_at, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ [CREDIT CHECK] Failed to fetch user data:', userError);
      return {
        allowed: false,
        reason: 'database_error',
        message: 'Unable to fetch user data'
      };
    }

    console.log(`👤 [CREDIT CHECK] User email: ${userData.email}`);
    console.log(`💰 [CREDIT CHECK] Current credit balance: ${userData.credit_balance || 0}`);
    console.log(`📅 [CREDIT CHECK] User created at: ${userData.created_at}`);
    console.log(`🆕 [CREDIT CHECK] First generation at: ${userData.first_generation_at || 'not set'}`);
    
    // Call the database function
    const { data, error } = await supabase.rpc('check_user_generation_permission', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('❌ [CREDIT CHECK] Database error:', error);
      console.error('❌ [CREDIT CHECK] Error message:', error.message);
      console.error('❌ [CREDIT CHECK] Error details:', error.details);
      return {
        allowed: false,
        reason: 'database_error',
        message: 'Unable to check credit status'
      };
    }
    
    console.log(`✅ [CREDIT CHECK] Permission check result:`, data);
    
    // Parse the result
    const result = data as CreditCheckResult;
    
    // If user has sufficient credits, check if they have enough for this specific model
    if (result.allowed && result.reason === 'sufficient_credits' && result.creditBalance) {
      if (result.creditBalance < modelCost) {
        return {
          allowed: false,
          reason: 'insufficient_credits_for_model',
          message: `Insufficient credits. Need ${modelCost} credits for ${model}, have ${result.creditBalance}`,
          creditBalance: result.creditBalance
        };
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ [CREDIT CHECK] Error:', error);
    return {
      allowed: false,
      reason: 'error',
      message: 'Unable to check credit status'
    };
  }
}

/**
 * Track user's first generation (starts grace period for new users)
 */
export async function trackUserFirstGeneration(userId: string): Promise<void> {
  try {
    console.log(`📝 [FIRST GENERATION] Starting first generation tracking for user: ${userId}`);
    
    // Check if user already has first_generation_at set
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('first_generation_at, email, created_at')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('❌ [FIRST GENERATION] Failed to fetch user data:', fetchError);
      return;
    }

    console.log(`📝 [FIRST GENERATION] User email: ${existingUser.email}`);
    console.log(`📝 [FIRST GENERATION] User created at: ${existingUser.created_at}`);
    console.log(`📝 [FIRST GENERATION] Existing first generation: ${existingUser.first_generation_at || 'none'}`);

    if (existingUser.first_generation_at) {
      console.log('ℹ️ [FIRST GENERATION] User already has first generation tracked, skipping');
      return;
    }

    const { error } = await supabase.rpc('track_user_first_generation', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('❌ [FIRST GENERATION] Database error:', error);
      console.error('❌ [FIRST GENERATION] Error message:', error.message);
      console.error('❌ [FIRST GENERATION] Error details:', error.details);
    } else {
      console.log(`✅ [FIRST GENERATION] Successfully tracked first generation for user ${userId}`);
      console.log(`✅ [FIRST GENERATION] Grace period started for new user`);
    }
  } catch (error) {
    console.error('❌ [FIRST GENERATION] Unexpected error:', error);
  }
}

/**
 * Deduct credits for a generation
 */
export async function deductCreditsForGeneration(
  userId: string,
  model: string,
  generationId?: string
): Promise<CreditDeductionResult> {
  try {
    console.log(`💰 [CREDIT DEDUCTION] Starting credit deduction for user: ${userId}`);
    console.log(`💰 [CREDIT DEDUCTION] Model: ${model}`);
    console.log(`💰 [CREDIT DEDUCTION] Generation ID: ${generationId || 'none'}`);
    
    const modelCost = MODEL_COSTS[model] || 1;
    console.log(`💰 [CREDIT DEDUCTION] Model cost: ${modelCost} credits`);
    
    // Get user's current balance before deduction
    const { data: userBefore, error: userError } = await supabase
      .from('users')
      .select('credit_balance, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ [CREDIT DEDUCTION] Failed to fetch user data:', userError);
      return {
        success: false,
        creditsUsed: 0,
        remainingBalance: 0,
        error: 'Failed to fetch user data'
      };
    }

    console.log(`💰 [CREDIT DEDUCTION] User email: ${userBefore.email}`);
    console.log(`💰 [CREDIT DEDUCTION] Balance before deduction: ${userBefore.credit_balance || 0}`);
    
    // Call the database function
    const { data, error } = await supabase.rpc('use_user_credits_for_generation', {
      p_user_id: userId,
      p_model_name: model,
      p_generation_type: model.includes('video') ? 'video' : 'image',
      p_generation_id: generationId || null
    });
    
    if (error) {
      console.error('❌ [CREDIT DEDUCTION] Database error:', error);
      console.error('❌ [CREDIT DEDUCTION] Error message:', error.message);
      console.error('❌ [CREDIT DEDUCTION] Error details:', error.details);
      return {
        success: false,
        creditsUsed: 0,
        remainingBalance: 0,
        error: error.message
      };
    }
    
    console.log(`✅ [CREDIT DEDUCTION] Database function result:`, data);
    console.log(`✅ [CREDIT DEDUCTION] Successfully deducted ${modelCost} credits`);
    console.log(`💰 [CREDIT DEDUCTION] Remaining balance: ${data?.remaining_balance || 0}`);
    
    return {
      success: true,
      creditsUsed: modelCost,
      remainingBalance: data?.remaining_balance || 0
    };
    
  } catch (error) {
    console.error('❌ [CREDIT DEDUCTION] Error:', error);
    return {
      success: false,
      creditsUsed: 0,
      remainingBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get user's current credit balance
 */
export async function getUserCreditBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('credit_balance')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      console.error('❌ [CREDIT BALANCE] Error:', error);
      return 0;
    }
    
    return data.credit_balance || 0;
  } catch (error) {
    console.error('❌ [CREDIT BALANCE] Error:', error);
    return 0;
  }
}

/**
 * Check if user needs low balance notification
 */
export async function checkLowBalanceNotification(userId: string): Promise<void> {
  try {
    console.log(`🔔 [LOW BALANCE] Checking notification for user ${userId}`);
    
    const { error } = await supabase.rpc('check_low_balance_notification', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('❌ [LOW BALANCE] Error:', error);
    } else {
      console.log(`✅ [LOW BALANCE] Notification check completed for user ${userId}`);
    }
  } catch (error) {
    console.error('❌ [LOW BALANCE] Error:', error);
  }
}
