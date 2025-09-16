import { supabaseAdmin } from './supabase';

export interface CreditCheckResult {
  hasCredits: boolean;
  availableCredits: number;
  modelCost: number;
  error?: string;
}

export interface CreditUsageResult {
  success: boolean;
  creditsUsed: number;
  remainingCredits: number;
  error?: string;
}

export class CreditService {
  /**
   * Check if user has sufficient credits for a model
   */
  static async checkUserCredits(
    userId: string, 
    modelName: string
  ): Promise<CreditCheckResult> {
    try {
      if (!supabaseAdmin) {
        return {
          hasCredits: false,
          availableCredits: 0,
          modelCost: 0,
          error: 'Database connection not available'
        };
      }

      // Check if user is admin first
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('is_admin, email')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        return {
          hasCredits: false,
          availableCredits: 0,
          modelCost: 0,
          error: 'User not found'
        };
      }

      // Admin users have unlimited access
      if (userData.is_admin || userData.email === '1deeptechnology@gmail.com') {
        const { data: modelData } = await supabaseAdmin
          .from('model_costs')
          .select('cost_per_generation')
          .eq('model_name', modelName)
          .eq('is_active', true)
          .single();

        return {
          hasCredits: true,
          availableCredits: 999999, // Unlimited for admin
          modelCost: Number(modelData?.cost_per_generation || 0),
        };
      }

      // Get model cost
      const { data: modelData, error: modelError } = await supabaseAdmin
        .from('model_costs')
        .select('cost_per_generation')
        .eq('model_name', modelName)
        .eq('is_active', true)
        .single();

      if (modelError || !modelData) {
        return {
          hasCredits: false,
          availableCredits: 0,
          modelCost: 0,
          error: `Model ${modelName} not found or inactive`
        };
      }

      // Get user's available credits - check both user_credits table and users.credit_balance
      let availableCredits = 0;
      
      // First, try user_credits table
      const { data: creditData, error: creditError } = await supabaseAdmin
        .from('user_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (creditData && !creditError) {
        availableCredits = Number(creditData.balance);
      } else {
        // If not found in user_credits, check users.credit_balance
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('credit_balance')
          .eq('id', userId)
          .single();

        if (userData && !userError) {
          availableCredits = Number(userData.credit_balance || 0);
        } else {
          return {
            hasCredits: false,
            availableCredits: 0,
            modelCost: modelData.cost_per_generation,
            error: 'No credits found for user in either user_credits or users table'
          };
        }
      }
      const modelCost = Number(modelData.cost_per_generation);

      return {
        hasCredits: availableCredits >= modelCost,
        availableCredits,
        modelCost,
      };

    } catch (error) {
      return {
        hasCredits: false,
        availableCredits: 0,
        modelCost: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Use credits for a generation
   */
  static async useCredits(
    userId: string,
    modelName: string,
    generationType: 'image' | 'video' | 'character_variation',
    generationId?: string
  ): Promise<CreditUsageResult> {
    try {
      if (!supabaseAdmin) {
        return {
          success: false,
          creditsUsed: 0,
          remainingCredits: 0,
          error: 'Database connection not available'
        };
      }

      // Check if user is admin first
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('is_admin, email')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        return {
          success: false,
          creditsUsed: 0,
          remainingCredits: 0,
          error: 'User not found'
        };
      }

      // Admin users don't use credits
      if (userData.is_admin || userData.email === '1deeptechnology@gmail.com') {
        const { data: modelData } = await supabaseAdmin
          .from('model_costs')
          .select('cost_per_generation')
          .eq('model_name', modelName)
          .eq('is_active', true)
          .single();

        return {
          success: true,
          creditsUsed: 0, // No credits used for admin
          remainingCredits: 999999, // Unlimited for admin
        };
      }

      // Use the database function to deduct credits
      const { data, error } = await supabaseAdmin.rpc('use_user_credits', {
        p_user_id: userId,
        p_model_name: modelName,
        p_generation_type: generationType,
        p_generation_id: generationId
      });

      if (error) {
        return {
          success: false,
          creditsUsed: 0,
          remainingCredits: 0,
          error: error.message
        };
      }

      if (!data) {
        return {
          success: false,
          creditsUsed: 0,
          remainingCredits: 0,
          error: 'Insufficient credits'
        };
      }

      // Get updated credit balance - check both locations
      let remainingCredits = 0;
      
      const { data: creditData } = await supabaseAdmin
        .from('user_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (creditData) {
        remainingCredits = Number(creditData.balance);
      } else {
        // Check users.credit_balance as fallback
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('credit_balance')
          .eq('id', userId)
          .single();
        
        if (userData) {
          remainingCredits = Number(userData.credit_balance || 0);
        }
      }

      // Get model cost for response
      const { data: modelData } = await supabaseAdmin
        .from('model_costs')
        .select('cost_per_generation')
        .eq('model_name', modelName)
        .eq('is_active', true)
        .single();

      return {
        success: true,
        creditsUsed: Number(modelData?.cost_per_generation || 0),
        remainingCredits: remainingCredits,
      };

    } catch (error) {
      return {
        success: false,
        creditsUsed: 0,
        remainingCredits: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Add credits to a user
   */
  static async addCredits(
    userId: string,
    amount: number,
    creditType: 'grandfathered' | 'purchased' | 'bonus' | 'refund' = 'grandfathered',
    description?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabaseAdmin) {
        return {
          success: false,
          error: 'Database connection not available'
        };
      }

      const { error } = await supabaseAdmin.rpc('add_user_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_credit_type: creditType,
        p_description: description
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's credit balance
   */
  static async getUserCredits(userId: string): Promise<{
    totalCredits: number;
    usedCredits: number;
    availableCredits: number;
    error?: string;
  }> {
    try {
      if (!supabaseAdmin) {
        return {
          totalCredits: 0,
          usedCredits: 0,
          availableCredits: 0,
          error: 'Database connection not available'
        };
      }

      const { data, error } = await supabaseAdmin
        .from('user_credits')
        .select('total_credits, used_credits, available_credits')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return {
          totalCredits: 0,
          usedCredits: 0,
          availableCredits: 0,
          error: 'No credits found for user'
        };
      }

      return {
        totalCredits: Number(data.total_credits),
        usedCredits: Number(data.used_credits),
        availableCredits: Number(data.available_credits),
      };

    } catch (error) {
      return {
        totalCredits: 0,
        usedCredits: 0,
        availableCredits: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's credit transaction history
   */
  static async getUserCreditHistory(
    userId: string,
    limit: number = 50
  ): Promise<{
    transactions: Array<{
      id: string;
      transaction_type: string;
      amount: number;
      model_name?: string;
      description?: string;
      created_at: string;
    }>;
    error?: string;
  }> {
    try {
      if (!supabaseAdmin) {
        return {
          transactions: [],
          error: 'Database connection not available'
        };
      }

      const { data, error } = await supabaseAdmin
        .from('credit_transactions')
        .select('id, transaction_type, amount, model_name, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          transactions: [],
          error: error.message
        };
      }

      return {
        transactions: data || [],
      };

    } catch (error) {
      return {
        transactions: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if user has any credits at all
   */
  static async hasAnyCredits(userId: string): Promise<boolean> {
    try {
      if (!supabaseAdmin) {
        return false;
      }

      // Check if user is admin first
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('is_admin, email')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        return false;
      }

      // Admin users always have access
      if (userData.is_admin || userData.email === '1deeptechnology@gmail.com') {
        return true;
      }

      const credits = await this.getUserCredits(userId);
      return credits.availableCredits > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get model cost for a specific model
   */
  static async getModelCost(modelName: string): Promise<{
    cost: number;
    error?: string;
  }> {
    try {
      if (!supabaseAdmin) {
        return {
          cost: 0,
          error: 'Database connection not available'
        };
      }

      const { data, error } = await supabaseAdmin
        .from('model_costs')
        .select('cost_per_generation')
        .eq('model_name', modelName)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return {
          cost: 0,
          error: `Model ${modelName} not found or inactive`
        };
      }

      return {
        cost: Number(data.cost_per_generation),
      };

    } catch (error) {
      return {
        cost: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
