// Credit Distribution Calculator
// Calculates how to distribute remaining credits among users

export interface ModelCost {
  name: string;
  cost: number;
  category: 'basic' | 'premium' | 'ultra-premium';
}

export interface CreditDistribution {
  totalBalance: number;
  estimatedUsers: number;
  creditsPerUser: number;
  generationsPerUser: {
    nanoBanana: number;
    veo3Fast: number;
    seedancePro: number;
    runwayVideo: number;
  };
  totalGenerations: {
    nanoBanana: number;
    veo3Fast: number;
    seedancePro: number;
    runwayVideo: number;
  };
  recommendations: string[];
}

export class CreditDistributionCalculator {
  private static readonly MODEL_COSTS: ModelCost[] = [
    // Base Level Models
    { name: 'nano-banana', cost: 0.0398, category: 'basic' },
    { name: 'runway-t2i', cost: 0.0398, category: 'basic' },
    { name: 'minimax-2.0', cost: 0.0398, category: 'basic' },
    { name: 'kling-2.1-master', cost: 0.0398, category: 'basic' },
    { name: 'veo3-fast', cost: 0.15, category: 'premium' },
    { name: 'runway-video', cost: 0.15, category: 'premium' },
    
    // Secret Level Models (estimated costs)
    { name: 'seedance-pro', cost: 2.50, category: 'ultra-premium' },
    { name: 'seedance-pro-t2v', cost: 2.50, category: 'ultra-premium' },
    { name: 'veo-3-text-to-video', cost: 0.25, category: 'premium' },
    { name: 'veo-3-image-to-video', cost: 0.25, category: 'premium' },
    { name: 'runway-gen-3-text-to-video', cost: 0.20, category: 'premium' },
    { name: 'runway-gen-3-image-to-video', cost: 0.20, category: 'premium' },
    { name: 'flux-1.1-pro-text-to-image', cost: 0.05, category: 'basic' },
    { name: 'imagen-3-text-to-image', cost: 0.08, category: 'basic' },
    { name: 'dall-e-3-text-to-image', cost: 0.08, category: 'basic' },
    { name: 'midjourney-v6-text-to-image', cost: 0.10, category: 'basic' },
    { name: 'stable-diffusion-xl-text-to-image', cost: 0.04, category: 'basic' },
    { name: 'flux-dev-text-to-image', cost: 0.04, category: 'basic' },
    { name: 'stable-diffusion-v3-text-to-image', cost: 0.05, category: 'basic' },
    { name: 'flux-schnell-text-to-image', cost: 0.03, category: 'basic' },
    { name: 'stable-diffusion-v2-text-to-image', cost: 0.03, category: 'basic' },
    { name: 'flux-1.0-text-to-image', cost: 0.04, category: 'basic' },
    { name: 'pika-labs-text-to-video', cost: 0.15, category: 'premium' },
    { name: 'pika-labs-image-to-video', cost: 0.15, category: 'premium' },
    { name: 'stable-video-diffusion-text-to-video', cost: 0.12, category: 'premium' },
    { name: 'stable-video-diffusion-image-to-video', cost: 0.12, category: 'premium' },
    { name: 'zeroscope-text-to-video', cost: 0.10, category: 'premium' },
    { name: 'modelscope-text-to-video', cost: 0.08, category: 'premium' },
    { name: 'modelscope-image-to-video', cost: 0.08, category: 'premium' },
    { name: 'cogvideo-text-to-video', cost: 0.10, category: 'premium' },
    { name: 'cogvideo-image-to-video', cost: 0.10, category: 'premium' },
    { name: 'text2video-zero-text-to-video', cost: 0.08, category: 'premium' },
    { name: 'text2video-zero-image-to-video', cost: 0.08, category: 'premium' },
    
    // Legacy Secret Models
    { name: 'bytedance-dreamina-v3-1-text-to-image', cost: 0.06, category: 'basic' },
    { name: 'bytedance-seedance-v1-pro-image-to-video', cost: 2.50, category: 'ultra-premium' },
    { name: 'elevenlabs-tts-multilingual-v2', cost: 0.02, category: 'basic' },
    { name: 'fast-sdxl', cost: 0.04, category: 'basic' },
    { name: 'flux-krea', cost: 0.05, category: 'basic' },
    { name: 'flux-pro-kontext', cost: 0.06, category: 'basic' },
    { name: 'imagen4-preview', cost: 0.08, category: 'basic' },
    { name: 'kling-video-v2-1-master-image-to-video', cost: 0.15, category: 'premium' },
    { name: 'minimax-hailuo-02-pro-image-to-video', cost: 0.15, category: 'premium' },
    { name: 'minimax-video-01', cost: 0.12, category: 'premium' },
    { name: 'minimax-video-generation', cost: 0.12, category: 'premium' },
    { name: 'nano-banana-edit', cost: 0.0398, category: 'basic' },
    { name: 'qwen-image-edit', cost: 0.05, category: 'basic' },
    { name: 'stable-diffusion-v35-large', cost: 0.05, category: 'basic' },
    { name: 'veo3-fast-image-to-video', cost: 0.15, category: 'premium' },
    { name: 'veo3-image-to-video', cost: 0.25, category: 'premium' },
    { name: 'veo3-standard', cost: 0.20, category: 'premium' },
    { name: 'wan-v2-2-a14b-image-to-video-lora', cost: 0.10, category: 'premium' },
    { name: 'wav2lip', cost: 0.08, category: 'premium' },
    { name: 'latentsync', cost: 0.10, category: 'premium' },
    { name: 'sync-fondo', cost: 0.08, category: 'premium' },
    { name: 'musetalk', cost: 0.10, category: 'premium' },
  ];

  /**
   * Calculate credit distribution for remaining balance
   */
  static calculateDistribution(
    totalBalance: number,
    estimatedUsers: number = 24 // Based on analytics data
  ): CreditDistribution {
    const creditsPerUser = totalBalance / estimatedUsers;
    
    // Calculate generations per user for base level models
    const generationsPerUser = {
      nanoBanana: Math.floor(creditsPerUser / 0.0398),
      veo3Fast: Math.floor(creditsPerUser / 0.15),
      seedancePro: Math.floor(creditsPerUser / 2.50), // Now secret level only
      runwayVideo: Math.floor(creditsPerUser / 0.15),
    };

    // Calculate total generations across all users
    const totalGenerations = {
      nanoBanana: generationsPerUser.nanoBanana * estimatedUsers,
      veo3Fast: generationsPerUser.veo3Fast * estimatedUsers,
      seedancePro: generationsPerUser.seedancePro * estimatedUsers,
      runwayVideo: generationsPerUser.runwayVideo * estimatedUsers,
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      creditsPerUser,
      generationsPerUser,
      totalBalance,
      estimatedUsers
    );

    return {
      totalBalance,
      estimatedUsers,
      creditsPerUser,
      generationsPerUser,
      totalGenerations,
      recommendations,
    };
  }

  /**
   * Calculate secret level model usage potential
   */
  static calculateSecretLevelUsage(
    creditsPerUser: number,
    secretLevelUsers: number = 5 // Estimated secret level users
  ): {
    basicModels: { name: string; generations: number; cost: number }[];
    premiumModels: { name: string; generations: number; cost: number }[];
    ultraPremiumModels: { name: string; generations: number; cost: number }[];
    totalSecretUsage: number;
  } {
    const basicModels = this.MODEL_COSTS
      .filter(model => model.category === 'basic')
      .map(model => ({
        name: model.name,
        generations: Math.floor(creditsPerUser / model.cost),
        cost: model.cost
      }));

    const premiumModels = this.MODEL_COSTS
      .filter(model => model.category === 'premium')
      .map(model => ({
        name: model.name,
        generations: Math.floor(creditsPerUser / model.cost),
        cost: model.cost
      }));

    const ultraPremiumModels = this.MODEL_COSTS
      .filter(model => model.category === 'ultra-premium')
      .map(model => ({
        name: model.name,
        generations: Math.floor(creditsPerUser / model.cost),
        cost: model.cost
      }));

    const totalSecretUsage = secretLevelUsers * creditsPerUser;

    return {
      basicModels,
      premiumModels,
      ultraPremiumModels,
      totalSecretUsage,
    };
  }

  /**
   * Calculate distribution for different user count scenarios
   */
  static calculateMultipleScenarios(totalBalance: number): {
    scenario: string;
    userCount: number;
    creditsPerUser: number;
    generationsPerUser: {
      nanoBanana: number;
      veo3Fast: number;
      seedancePro: number;
    };
  }[] {
    const scenarios = [
      { name: 'Conservative (20 users)', count: 20 },
      { name: 'Current Estimate (24 users)', count: 24 },
      { name: 'Optimistic (30 users)', count: 30 },
      { name: 'Growth (40 users)', count: 40 },
    ];

    return scenarios.map(scenario => {
      const creditsPerUser = totalBalance / scenario.count;
      return {
        scenario: scenario.name,
        userCount: scenario.count,
        creditsPerUser,
        generationsPerUser: {
          nanoBanana: Math.floor(creditsPerUser / 0.0398),
          veo3Fast: Math.floor(creditsPerUser / 0.15),
          seedancePro: Math.floor(creditsPerUser / 2.50),
        },
      };
    });
  }

  /**
   * Calculate purchase recommendations based on model usage
   */
  static calculatePurchaseRecommendations(
    userCredits: number,
    targetGenerations: {
      nanoBanana?: number;
      veo3Fast?: number;
      seedancePro?: number;
    }
  ): {
    requiredCredits: number;
    recommendedPurchase: number;
    purchaseOptions: Array<{
      amount: number;
      generations: {
        nanoBanana: number;
        veo3Fast: number;
        seedancePro: number;
      };
    }>;
  } {
    // Calculate required credits for target generations
    const requiredCredits = 
      (targetGenerations.nanoBanana || 0) * 0.0398 +
      (targetGenerations.veo3Fast || 0) * 0.15 +
      (targetGenerations.seedancePro || 0) * 2.50;

    const additionalCreditsNeeded = Math.max(0, requiredCredits - userCredits);
    
    // Round up to nearest purchase option
    const recommendedPurchase = Math.ceil(additionalCreditsNeeded * 100) / 100;

    // Generate purchase options starting at $1.99
    const purchaseOptions = [
      { amount: 1.99, generations: this.calculateGenerationsForAmount(1.99) },
      { amount: 4.99, generations: this.calculateGenerationsForAmount(4.99) },
      { amount: 9.99, generations: this.calculateGenerationsForAmount(9.99) },
      { amount: 19.99, generations: this.calculateGenerationsForAmount(19.99) },
      { amount: 49.99, generations: this.calculateGenerationsForAmount(49.99) },
    ];

    return {
      requiredCredits,
      recommendedPurchase,
      purchaseOptions,
    };
  }

  private static calculateGenerationsForAmount(amount: number) {
    return {
      nanoBanana: Math.floor(amount / 0.0398),
      veo3Fast: Math.floor(amount / 0.15),
      seedancePro: Math.floor(amount / 2.50),
    };
  }

  private static generateRecommendations(
    creditsPerUser: number,
    generationsPerUser: any,
    totalBalance: number,
    estimatedUsers: number
  ): string[] {
    const recommendations: string[] = [];

    // Basic recommendations
    recommendations.push(`Each user gets $${creditsPerUser.toFixed(2)} in credits`);
    recommendations.push(`Total estimated users: ${estimatedUsers}`);

    // Generation recommendations
    if (generationsPerUser.nanoBanana > 0) {
      recommendations.push(`Each user can generate ${generationsPerUser.nanoBanana} Nano Banana images`);
    }
    if (generationsPerUser.veo3Fast > 0) {
      recommendations.push(`Each user can generate ${generationsPerUser.veo3Fast} VEO3 Fast videos`);
    }
    if (generationsPerUser.seedancePro > 0) {
      recommendations.push(`Each user can generate ${generationsPerUser.seedancePro} Seedance Pro videos`);
    }

    // Usage recommendations
    if (creditsPerUser < 1.00) {
      recommendations.push('⚠️ Low credit allocation - consider encouraging purchases');
    } else if (creditsPerUser < 5.00) {
      recommendations.push('✅ Moderate credit allocation - good for testing');
    } else {
      recommendations.push('🎉 High credit allocation - generous for users');
    }

    // Purchase recommendations
    recommendations.push('💡 Users can purchase additional credits starting at $1.99');
    recommendations.push('📈 Monitor usage patterns to optimize future distributions');

    return recommendations;
  }
}

// Example usage and calculations for $120 balance
export const CURRENT_DISTRIBUTION = CreditDistributionCalculator.calculateDistribution(120);

export const DISTRIBUTION_SCENARIOS = CreditDistributionCalculator.calculateMultipleScenarios(120);
