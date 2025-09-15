import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CreditSummary {
  current_balance: number;
  low_balance_threshold: number;
  tier: string;
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

  const fetchCreditInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      const response = await fetch(`/api/user-credits?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch credit information: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Invalid response from server');
      }

      setCreditSummary(data.summary);
      setError(null);
    } catch (err) {
      console.error('Error fetching credit info:', err);
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

  const { current_balance, low_balance_threshold } = creditSummary;
  const isLow = current_balance <= low_balance_threshold;
  const isCritical = current_balance <= 1;

  const getCreditColor = () => {
    if (isCritical) return 'text-red-400';
    if (isLow) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getCreditIcon = () => {
    if (isCritical) return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (isLow) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <DollarSign className="w-4 h-4 text-green-400" />;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getCreditIcon()}
      <span className={`text-sm font-medium ${getCreditColor()}`}>
        {current_balance.toFixed(0)} credits
      </span>
      {(isLow || isCritical) && (
        <button
          onClick={onPurchaseCredits}
          className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
            isCritical
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          <CreditCard className="w-3 h-3" />
          <span>Buy</span>
        </button>
      )}
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

  const { current_balance, low_balance_threshold } = creditSummary;
  const isLow = current_balance <= low_balance_threshold;
  const isCritical = current_balance <= 1;

  const getCreditColor = () => {
    if (isCritical) return 'text-red-400';
    if (isLow) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
      }`} />
      <span className={`text-xs font-medium ${getCreditColor()}`}>
        {current_balance.toFixed(0)}
      </span>
    </div>
  );
};
