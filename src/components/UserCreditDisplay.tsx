'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Image, Video, Zap, Crown, Lock, Unlock, RefreshCw } from 'lucide-react';

interface CreditSummary {
  user_id: string;
  current_balance: number;
  low_balance_threshold: number;
  tier: string;
  total_credits_purchased: number;
  last_credit_purchase: string | null;
}

interface ModelCost {
  model_name: string;
  cost_per_generation: number;
  allowed_tiers: string[];
  is_active: boolean;
}

interface CreditDisplayProps {
  showSecretModels?: boolean;
  compact?: boolean;
  onPurchaseCredits?: () => void;
}

export interface CreditDisplayRef {
  refresh: () => void;
}

const UserCreditDisplay = forwardRef<CreditDisplayRef, CreditDisplayProps>(({ showSecretModels = false, compact = false, onPurchaseCredits }, ref) => {
  const { user } = useAuth();
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [modelCosts, setModelCosts] = useState<ModelCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchCreditInfo();
    }
  }, [user?.id, showSecretModels]);

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refresh: fetchCreditInfo
  }));

  const fetchCreditInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      // Fetch user credit information
      const creditResponse = await fetch(`/api/user-credits?userId=${user.id}`);
      
      if (!creditResponse.ok) {
        const errorData = await creditResponse.json().catch(() => ({}));
        console.error('Credit API Error:', creditResponse.status, errorData);
        throw new Error(`Failed to fetch credit information: ${creditResponse.status} ${errorData.error || creditResponse.statusText}`);
      }

      const creditData = await creditResponse.json();
      
      if (!creditData.success) {
        throw new Error(creditData.error || 'Invalid response from credit API');
      }

      setCreditSummary(creditData.summary);

      // Fetch model costs
      const modelResponse = await fetch('/api/model-costs');
      
      if (!modelResponse.ok) {
        console.warn('Failed to fetch model costs, using defaults');
        setModelCosts([]);
      } else {
        const modelData = await modelResponse.json();
        if (modelData.success) {
          setModelCosts(modelData.models);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching credit info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credit information');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'basic': return <Image className="w-4 h-4" />;
      case 'premium': return <Video className="w-4 h-4" />;
      case 'ultra-premium': return <Crown className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic': return 'text-green-400 bg-green-500/20';
      case 'premium': return 'text-yellow-400 bg-yellow-500/20';
      case 'ultra-premium': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-white/10 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-400 text-sm font-medium">Credit Information Error</p>
            <p className="text-red-300 text-xs mt-1">{error}</p>
          </div>
          <button
            onClick={fetchCreditInfo}
            disabled={loading}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
            title="Retry"
          >
            <RefreshCw className={`w-4 h-4 text-red-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  if (!creditSummary) {
    return (
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <p className="text-white/60 text-sm">No credit information available</p>
      </div>
    );
  }

  const { current_balance } = creditSummary;

  // Calculate generations possible for each model category
  const calculations = {
    basic: modelCosts.filter(model => model.cost_per_generation <= 0.04).map(model => ({
      model_name: model.model_name,
      display_name: model.model_name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      generations_possible: Math.floor(current_balance / model.cost_per_generation),
      cost_per_generation: model.cost_per_generation,
      is_secret_level: false
    })),
    premium: modelCosts.filter(model => model.cost_per_generation > 0.04 && model.cost_per_generation <= 0.20).map(model => ({
      model_name: model.model_name,
      display_name: model.model_name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      generations_possible: Math.floor(current_balance / model.cost_per_generation),
      cost_per_generation: model.cost_per_generation,
      is_secret_level: false
    })),
    ultraPremium: modelCosts.filter(model => model.cost_per_generation > 0.20).map(model => ({
      model_name: model.model_name,
      display_name: model.model_name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      generations_possible: Math.floor(current_balance / model.cost_per_generation),
      cost_per_generation: model.cost_per_generation,
      is_secret_level: false
    }))
  };

  if (compact) {
    return (
      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-white font-medium">${current_balance.toFixed(2)}</span>
          </div>
          <div className="text-xs text-white/60">
            {calculations.basic.length > 0 && (
              <span className="text-green-400">
                ~{Math.max(...calculations.basic.map(c => c.generations_possible))} basic
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h3 className="text-white font-semibold">Your Credits</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCreditInfo}
            disabled={loading}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Refresh credits"
          >
            <RefreshCw className={`w-4 h-4 text-white/60 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">${current_balance.toFixed(2)}</div>
            <div className="text-xs text-white/60">Available Balance</div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-green-400">
            {calculations.basic.reduce((sum, calc) => sum + calc.generations_possible, 0)}
          </div>
          <div className="text-xs text-white/60">Basic Generations</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-yellow-400">
            {calculations.premium.reduce((sum, calc) => sum + calc.generations_possible, 0)}
          </div>
          <div className="text-xs text-white/60">Premium Generations</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-red-400">
            {calculations.ultraPremium.reduce((sum, calc) => sum + calc.generations_possible, 0)}
          </div>
          <div className="text-xs text-white/60">Ultra-Premium</div>
        </div>
      </div>

      {/* Model Breakdown */}
      <div className="space-y-3">
        {['basic', 'premium', 'ultraPremium'].map((category) => {
          const models = calculations[category as keyof typeof calculations];
          if (models.length === 0) return null;

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                {getCategoryIcon(category)}
                <h4 className="text-white font-medium capitalize">
                  {category === 'ultraPremium' ? 'Ultra-Premium' : category} Models
                </h4>
                <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(category)}`}>
                  {models.length} models
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {models.map((model) => (
                  <div key={model.model_name} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">
                          {model.display_name}
                        </span>
                        {model.is_secret_level && (
                          <Lock className="w-3 h-3 text-purple-400" />
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">
                          {model.generations_possible}
                        </div>
                        <div className="text-xs text-white/60">
                          ${model.cost_per_generation.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Purchase Credits Button */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <button className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200">
          Purchase More Credits
        </button>
      </div>
    </div>
  );
});

UserCreditDisplay.displayName = 'UserCreditDisplay';

export default UserCreditDisplay;
