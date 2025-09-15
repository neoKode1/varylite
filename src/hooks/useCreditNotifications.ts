import { useState, useCallback } from 'react';
import { CreditNotificationService } from '@/lib/creditNotificationService';

export interface CreditNotificationHook {
  checkLowBalance: (userId: string) => Promise<boolean>;
  sendLowBalanceNotification: (data: {
    userId: string;
    currentBalance: number;
    threshold: number;
    modelName?: string;
    generationType?: string;
  }) => Promise<boolean>;
  sendPurchaseConfirmation: (data: {
    userId: string;
    creditsPurchased: number;
    totalCost: number;
    purchaseType: 'subscription' | 'credit_pack';
  }) => Promise<boolean>;
  sendWeeklySummary: (userId: string) => Promise<boolean>;
  checkAfterUsage: (data: {
    userId: string;
    modelName: string;
    generationType: string;
    creditsUsed: number;
    remainingCredits: number;
  }) => Promise<boolean>;
  isLoading: boolean;
}

export const useCreditNotifications = (): CreditNotificationHook => {
  const [isLoading, setIsLoading] = useState(false);

  const checkLowBalance = useCallback(async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await CreditNotificationService.checkLowBalanceNotification(userId);
      return result.success && result.notificationSent;
    } catch (error) {
      console.error('Error checking low balance:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendLowBalanceNotification = useCallback(async (data: {
    userId: string;
    currentBalance: number;
    threshold: number;
    modelName?: string;
    generationType?: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await CreditNotificationService.sendLowBalanceNotification(data);
      return result.success && result.notificationSent;
    } catch (error) {
      console.error('Error sending low balance notification:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendPurchaseConfirmation = useCallback(async (data: {
    userId: string;
    creditsPurchased: number;
    totalCost: number;
    purchaseType: 'subscription' | 'credit_pack';
  }): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await CreditNotificationService.sendCreditPurchaseNotification(
        data.userId,
        data.creditsPurchased,
        data.totalCost,
        data.purchaseType
      );
      return result.success && result.notificationSent;
    } catch (error) {
      console.error('Error sending purchase confirmation:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendWeeklySummary = useCallback(async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await CreditNotificationService.sendWeeklyUsageSummary(userId);
      return result.success && result.notificationSent;
    } catch (error) {
      console.error('Error sending weekly summary:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAfterUsage = useCallback(async (data: {
    userId: string;
    modelName: string;
    generationType: string;
    creditsUsed: number;
    remainingCredits: number;
  }): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await CreditNotificationService.checkAndNotifyAfterUsage(
        data.userId,
        data.modelName,
        data.generationType,
        data.creditsUsed,
        data.remainingCredits
      );
      return result.success && result.notificationSent;
    } catch (error) {
      console.error('Error checking notifications after usage:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    checkLowBalance,
    sendLowBalanceNotification,
    sendPurchaseConfirmation,
    sendWeeklySummary,
    checkAfterUsage,
    isLoading
  };
};
