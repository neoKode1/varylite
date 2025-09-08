// Three-Tier Pricing System Types

export type UserTier = 'free' | 'pro' | 'premium';

export interface TierLimits {
  free: {
    monthlyGenerations: number;
    dailyGenerations: number;
    allowedModels: string[];
    overageRate: number;
  };
  pro: {
    monthlyGenerations: number;
    dailyGenerations: number;
    allowedModels: string[];
    overageRate: number;
    price: number;
  };
  premium: {
    monthlyGenerations: number;
    dailyGenerations: number;
    allowedModels: string[];
    overageRate: number;
    price: number;
  };
}

export interface UserUsage {
  userId: string;
  tier: UserTier;
  monthlyGenerations: number;
  dailyGenerations: number;
  lastResetDate: string;
  overageCharges: number;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  subscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationRequest {
  userId: string;
  model: string;
  timestamp: string;
  cost: number;
  tier: UserTier;
  isOverage: boolean;
}

export interface TierCheckResult {
  canGenerate: boolean;
  reason?: string;
  tier: UserTier;
  remainingGenerations: number;
  isOverage: boolean;
  overageRate: number;
}

export interface PricingConfig {
  tiers: TierLimits;
  models: {
    [key: string]: {
      cost: number;
      allowedTiers: UserTier[];
    };
  };
}

// Default pricing configuration
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  tiers: {
    free: {
      monthlyGenerations: 10,
      dailyGenerations: 3,
      allowedModels: ['nano-banana', 'runway-t2i', 'veo3-fast', 'minimax-2.0', 'kling-2.1-master', 'runway-video'],
      overageRate: 0.05, // $0.05 per generation over limit
    },
    pro: {
      monthlyGenerations: 50,
      dailyGenerations: 20,
      allowedModels: ['nano-banana', 'runway-t2i', 'veo3-fast', 'minimax-2.0', 'kling-2.1-master', 'runway-video'],
      overageRate: 0.05, // $0.05 per generation over limit
      price: 14.99,
    },
    premium: {
      monthlyGenerations: 100,
      dailyGenerations: 50,
      allowedModels: ['nano-banana', 'runway-t2i', 'veo3-fast', 'minimax-2.0', 'kling-2.1-master', 'runway-video', 'seedance-pro'],
      overageRate: 0.04, // $0.04 per generation over limit
      price: 19.99,
    },
  },
  models: {
    'nano-banana': {
      cost: 0.0398,
      allowedTiers: ['free', 'pro', 'premium'],
    },
    'runway-t2i': {
      cost: 0.0398,
      allowedTiers: ['free', 'pro', 'premium'],
    },
    'veo3-fast': {
      cost: 0.15,
      allowedTiers: ['free', 'pro', 'premium'],
    },
    'minimax-2.0': {
      cost: 0.0398,
      allowedTiers: ['free', 'pro', 'premium'],
    },
    'kling-2.1-master': {
      cost: 0.0398,
      allowedTiers: ['free', 'pro', 'premium'],
    },
    'runway-video': {
      cost: 0.15,
      allowedTiers: ['free', 'pro', 'premium'],
    },
    'seedance-pro': {
      cost: 2.50,
      allowedTiers: ['premium'],
    },
  },
};
