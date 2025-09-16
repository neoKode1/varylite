import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CreditSummary {
  current_balance: number;
  low_balance_threshold: number;
  tier: string;
  is_new_user?: boolean;
  grace_period_expires_at?: string;
  grace_period_message?: string;
}

interface CompactCreditDisplayProps {
  onPurchaseCredits?: () => void;
  className?: string;
}

export const CompactCreditDisplay: React.FC<CompactCreditDisplayProps> = ({ 
  onPurchaseCredits, 
  className = '' 
}) => {
  const { user } = useAuth();
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchCreditInfo();
    }
  }, [user?.id]);

  // Listen for credit updates from other components
  useEffect(() => {
    const handleCreditUpdate = () => {
      console.log('🔄 CompactCreditDisplay: Received creditUpdated event');
      if (user?.id) {
        fetchCreditInfo();
      }
    };

    // Listen for custom events
    window.addEventListener('creditUpdated', handleCreditUpdate);
    
    // Also refresh every 10 seconds to catch any missed updates
    const interval = setInterval(handleCreditUpdate, 10000);

    return () => {
      window.removeEventListener('creditUpdated', handleCreditUpdate);
      clearInterval(interval);
    };
  }, [user?.id]);

  const fetchCreditInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      console.log('🔄 CompactCreditDisplay: Fetching credit info for user:', user.id);
      const response = await fetch(`/api/user-credits?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch credit information: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Invalid response from server');
      }

      console.log('✅ CompactCreditDisplay: Credit info received:', {
        current_balance: data.summary?.current_balance,
        low_balance_threshold: data.summary?.low_balance_threshold,
        tier: data.summary?.tier,
        timestamp: new Date().toISOString()
      });

      setCreditSummary(data.summary);
      setError(null);
    } catch (err) {
      console.error('❌ CompactCreditDisplay: Error fetching credit info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credit information');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Don't show for anonymous users
  }

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 text-gray-300 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (error || !creditSummary) {
    return (
      <div className={`flex items-center space-x-2 text-red-400 ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm">Error</span>
      </div>
    );
  }

  const { current_balance, low_balance_threshold, is_new_user, grace_period_message } = creditSummary;
  const isLow = current_balance <= low_balance_threshold;
  const isCritical = current_balance <= 1;
  const isInGracePeriod = is_new_user && grace_period_message;

  const getCreditColor = () => {
    if (isInGracePeriod) return 'text-blue-400'; // Blue for grace period
    if (isCritical) return 'text-red-400';
    if (isLow) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getCreditIcon = () => {
    if (isInGracePeriod) return <DollarSign className="w-4 h-4 text-blue-400" />; // Blue icon for grace period
    if (isCritical) return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (isLow) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <DollarSign className="w-4 h-4 text-green-400" />;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getCreditIcon()}
      <span className={`text-sm font-medium ${getCreditColor()}`}>
        {isInGracePeriod ? grace_period_message : `${current_balance.toFixed(0)} credits`}
      </span>
      <button
        onClick={fetchCreditInfo}
        disabled={loading}
        className="p-1 hover:bg-white/10 rounded transition-colors"
        title="Refresh credits"
      >
        <RefreshCw className={`w-3 h-3 text-white/60 ${loading ? 'animate-spin' : ''}`} />
      </button>
      <button
        onClick={onPurchaseCredits}
        className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
          isInGracePeriod
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : isCritical
            ? 'bg-red-600 text-white hover:bg-red-700'
            : isLow
            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        <CreditCard className="w-3 h-3" />
        <span>{isInGracePeriod ? 'Buy Now' : 'Buy'}</span>
      </button>
    </div>
  );
};

// Even more compact version for mobile
export const MobileCreditDisplay: React.FC<CompactCreditDisplayProps> = ({ 
  onPurchaseCredits, 
  className = '' 
}) => {
  const { user } = useAuth();
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchCreditInfo();
    }
  }, [user?.id]);

  // Listen for credit updates from other components
  useEffect(() => {
    const handleCreditUpdate = () => {
      console.log('🔄 CompactCreditDisplay: Received creditUpdated event');
      if (user?.id) {
        fetchCreditInfo();
      }
    };

    // Listen for custom events
    window.addEventListener('creditUpdated', handleCreditUpdate);
    
    // Also refresh every 10 seconds to catch any missed updates
    const interval = setInterval(handleCreditUpdate, 10000);

    return () => {
      window.removeEventListener('creditUpdated', handleCreditUpdate);
      clearInterval(interval);
    };
  }, [user?.id]);

  const fetchCreditInfo = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) return;

      const response = await fetch(`/api/user-credits?userId=${user.id}`);
      
      if (!response.ok) return;

      const data = await response.json();
      
      if (data.success) {
        setCreditSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching credit info:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading || !creditSummary) {
    return null;
  }

  const { current_balance, low_balance_threshold, is_new_user, grace_period_message } = creditSummary;
  const isLow = current_balance <= low_balance_threshold;
  const isCritical = current_balance <= 1;
  const isInGracePeriod = is_new_user && grace_period_message;

  const getCreditColor = () => {
    if (isInGracePeriod) return 'text-blue-400'; // Blue for grace period
    if (isCritical) return 'text-red-400';
    if (isLow) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        isInGracePeriod ? 'bg-blue-500' : isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
      }`} />
      <span className={`text-xs font-medium ${getCreditColor()}`}>
        {isInGracePeriod ? grace_period_message : current_balance.toFixed(0)}
      </span>
    </div>
  );
};
