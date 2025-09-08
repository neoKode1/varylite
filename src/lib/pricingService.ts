import { supabase } from './supabase';
import { 
  UserTier, 
  TierCheckResult, 
  UserUsage, 
  GenerationRequest, 
  PricingConfig,
  DEFAULT_PRICING_CONFIG 
} from '@/types/pricing';

export class PricingService {
  private config: PricingConfig;

  constructor(config: PricingConfig = DEFAULT_PRICING_CONFIG) {
    this.config = config;
  }

  /**
   * Check if a user can generate content based on their tier and usage
   */
  async checkUserCanGenerate(
    userId: string, 
    model: string
  ): Promise<TierCheckResult> {
    try {
      // Get user's current tier and usage
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('tier, monthly_generations, daily_generations, subscription_status')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return {
          canGenerate: false,
          reason: 'User not found',
          tier: 'free',
          remainingGenerations: 0,
          isOverage: false,
          overageRate: 0,
        };
      }

      const tier = user.tier as UserTier;
      const tierConfig = this.config.tiers[tier];
      const modelConfig = this.config.models[model];

      // Check if model is allowed for this tier
      if (!modelConfig || !modelConfig.allowedTiers.includes(tier)) {
        return {
          canGenerate: false,
          reason: 'Model not allowed for this tier',
          tier,
          remainingGenerations: 0,
          isOverage: false,
          overageRate: 0,
        };
      }

      // Check subscription status for paid tiers
      if (tier !== 'free' && user.subscription_status !== 'active') {
        return {
          canGenerate: false,
          reason: 'Subscription inactive',
          tier,
          remainingGenerations: 0,
          isOverage: false,
          overageRate: 0,
        };
      }

      // Check daily limit
      if (user.daily_generations >= tierConfig.dailyGenerations) {
        return {
          canGenerate: false,
          reason: 'Daily limit reached',
          tier,
          remainingGenerations: 0,
          isOverage: false,
          overageRate: 0,
        };
      }

      // Check monthly limit
      if (user.monthly_generations >= tierConfig.monthlyGenerations) {
        return {
          canGenerate: true,
          reason: 'Monthly limit reached, but can use overage',
          tier,
          remainingGenerations: 0,
          isOverage: true,
          overageRate: tierConfig.overageRate,
        };
      }

      // User can generate within limits
      return {
        canGenerate: true,
        reason: 'Within limits',
        tier,
        remainingGenerations: tierConfig.monthlyGenerations - user.monthly_generations,
        isOverage: false,
        overageRate: tierConfig.overageRate,
      };

    } catch (error) {
      console.error('Error checking user generation limits:', error);
      return {
        canGenerate: false,
        reason: 'System error',
        tier: 'free',
        remainingGenerations: 0,
        isOverage: false,
        overageRate: 0,
      };
    }
  }

  /**
   * Record a generation request and update usage counters
   */
  async recordGeneration(request: GenerationRequest): Promise<void> {
    try {
      const { userId, model, cost, tier, isOverage } = request;
      const overageCharge = isOverage ? this.config.tiers[tier].overageRate : 0;

      // Update user usage counters
      const { error: updateError } = await supabase
        .from('users')
        .update({
          monthly_generations: supabase.raw('monthly_generations + 1'),
          daily_generations: supabase.raw('daily_generations + 1'),
          overage_charges: supabase.raw(`overage_charges + ${overageCharge}`),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user usage:', updateError);
        throw updateError;
      }

      // Record detailed usage tracking
      const { error: trackingError } = await supabase
        .from('user_usage_tracking')
        .insert({
          user_id: userId,
          model,
          generation_type: model.includes('video') ? 'video' : 'image',
          cost,
          tier,
          is_overage: isOverage,
          overage_charge: overageCharge,
        });

      if (trackingError) {
        console.error('Error recording usage tracking:', trackingError);
        throw trackingError;
      }

    } catch (error) {
      console.error('Error recording generation:', error);
      throw error;
    }
  }

  /**
   * Get user's current usage statistics
   */
  async getUserUsage(userId: string): Promise<UserUsage | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return null;
      }

      return {
        userId: user.id,
        tier: user.tier as UserTier,
        monthlyGenerations: user.monthly_generations || 0,
        dailyGenerations: user.daily_generations || 0,
        lastResetDate: user.last_reset_date,
        overageCharges: user.overage_charges || 0,
        subscriptionStatus: user.subscription_status,
        subscriptionId: user.subscription_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };

    } catch (error) {
      console.error('Error getting user usage:', error);
      return null;
    }
  }

  /**
   * Update user's tier (for Stripe integration)
   */
  async updateUserTier(
    userId: string, 
    tier: UserTier, 
    subscriptionId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          tier,
          subscription_id: subscriptionId,
          subscription_status: tier === 'free' ? 'active' : 'active',
          tier_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user tier:', error);
        throw error;
      }

    } catch (error) {
      console.error('Error updating user tier:', error);
      throw error;
    }
  }

  /**
   * Reset daily usage counters (call this daily)
   */
  async resetDailyUsage(): Promise<void> {
    try {
      const { error } = await supabase.rpc('reset_daily_usage');
      if (error) {
        console.error('Error resetting daily usage:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error resetting daily usage:', error);
      throw error;
    }
  }

  /**
   * Reset monthly usage counters (call this monthly)
   */
  async resetMonthlyUsage(): Promise<void> {
    try {
      const { error } = await supabase.rpc('reset_monthly_usage');
      if (error) {
        console.error('Error resetting monthly usage:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error resetting monthly usage:', error);
      throw error;
    }
  }

  /**
   * Get tier configuration
   */
  getTierConfig(tier: UserTier) {
    return this.config.tiers[tier];
  }

  /**
   * Get model configuration
   */
  getModelConfig(model: string) {
    return this.config.models[model];
  }

  /**
   * Calculate cost for a generation
   */
  calculateGenerationCost(model: string, isOverage: boolean = false, tier: UserTier = 'free'): number {
    const modelConfig = this.getModelConfig(model);
    if (!modelConfig) return 0;

    const baseCost = modelConfig.cost;
    const overageRate = isOverage ? this.config.tiers[tier].overageRate : 0;

    return baseCost + overageRate;
  }
}

// Export singleton instance
export const pricingService = new PricingService();
