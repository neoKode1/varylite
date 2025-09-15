import React, { useState, useEffect } from 'react';
import { AlertTriangle, CreditCard, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditNotifications } from '@/hooks/useCreditNotifications';

interface CreditNotificationBannerProps {
  currentBalance: number;
  threshold: number;
  onDismiss?: () => void;
  onPurchase?: () => void;
}

export const CreditNotificationBanner: React.FC<CreditNotificationBannerProps> = ({
  currentBalance,
  threshold,
  onDismiss,
  onPurchase
}) => {
  const { user } = useAuth();
  const { checkLowBalance, isLoading } = useCreditNotifications();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Check if user needs notification
    if (currentBalance <= threshold && !isDismissed) {
      setShowNotification(true);
      
      // Automatically check for low balance notification
      if (user?.id) {
        checkLowBalance(user.id);
      }
    } else {
      setShowNotification(false);
    }
  }, [currentBalance, threshold, isDismissed, user?.id, checkLowBalance]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowNotification(false);
    onDismiss?.();
  };

  const handlePurchase = () => {
    onPurchase?.();
  };

  if (!showNotification || isDismissed) {
    return null;
  }

  const isCritical = currentBalance <= 1;
  const isLow = currentBalance <= threshold;

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 max-w-md mx-auto ${
      isCritical ? 'animate-pulse' : ''
    }`}>
      <div className={`rounded-lg shadow-lg border-l-4 p-4 ${
        isCritical 
          ? 'bg-red-50 border-red-500 text-red-800' 
          : 'bg-yellow-50 border-yellow-500 text-yellow-800'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {isCritical ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
          </div>
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${
              isCritical ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {isCritical ? 'Critical Credit Balance' : 'Low Credit Balance'}
            </h3>
            <div className="mt-1 text-sm">
              <p>
                You have <span className="font-semibold">{currentBalance} credits</span> remaining.
                {isCritical 
                  ? ' Purchase more credits now to continue generating!'
                  : ' Consider purchasing more credits to avoid interruption.'
                }
              </p>
            </div>
            <div className="mt-3 flex space-x-3">
              <button
                onClick={handlePurchase}
                disabled={isLoading}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isCritical
                    ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-yellow-400'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <CreditCard className="w-3 h-3 mr-1" />
                )}
                Purchase Credits
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X className="w-3 h-3 mr-1" />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Credit balance display component
interface CreditBalanceDisplayProps {
  currentBalance: number;
  threshold: number;
  showNotification?: boolean;
}

export const CreditBalanceDisplay: React.FC<CreditBalanceDisplayProps> = ({
  currentBalance,
  threshold,
  showNotification = true
}) => {
  const isLow = currentBalance <= threshold;
  const isCritical = currentBalance <= 1;

  return (
    <div className={`flex items-center space-x-2 ${
      isCritical ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
      }`} />
      <span className="text-sm font-medium">
        {currentBalance} credits
      </span>
      {showNotification && (isLow || isCritical) && (
        <span className="text-xs opacity-75">
          {isCritical ? '(Critical)' : '(Low)'}
        </span>
      )}
    </div>
  );
};

// In-app notification toast
interface CreditNotificationToastProps {
  message: string;
  type: 'success' | 'warning' | 'error';
  onClose: () => void;
  duration?: number;
}

export const CreditNotificationToast: React.FC<CreditNotificationToastProps> = ({
  message,
  type,
  onClose,
  duration = 5000
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm p-4 rounded-lg border shadow-lg ${getToastStyles()}`}>
      <div className="flex items-start">
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
