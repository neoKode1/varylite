import { supabase } from './supabase';

export interface CreditNotificationData {
  userId: string;
  currentBalance: number;
  threshold: number;
  modelName?: string;
  generationType?: string;
}

export interface CreditNotificationResult {
  success: boolean;
  notificationSent: boolean;
  message: string;
  error?: string;
}

export class CreditNotificationService {
  /**
   * Check if user needs a low balance notification
   */
  static async checkLowBalanceNotification(userId: string): Promise<CreditNotificationResult> {
    try {
      // Call the database function to check low balance
      const { data, error } = await supabase.rpc('check_low_balance_notification', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error checking low balance:', error);
        return {
          success: false,
          notificationSent: false,
          message: 'Error checking balance',
          error: error.message
        };
      }

      if (!data || !data.needsNotification) {
        return {
          success: true,
          notificationSent: false,
          message: 'No notification needed'
        };
      }

      // Send the notification
      return await this.sendLowBalanceNotification({
        userId,
        currentBalance: data.currentBalance,
        threshold: data.threshold,
        modelName: undefined,
        generationType: undefined
      });

    } catch (error) {
      console.error('Error in checkLowBalanceNotification:', error);
      return {
        success: false,
        notificationSent: false,
        message: 'Unexpected error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send low balance notification to user
   */
  static async sendLowBalanceNotification(data: CreditNotificationData): Promise<CreditNotificationResult> {
    try {
      const { userId, currentBalance, threshold, modelName, generationType } = data;

      // Determine notification type and message
      let notificationType = 'credit_low_balance';
      let subject = 'Low Credit Balance - VaryAI';
      let message = `You have ${currentBalance} credits remaining. Consider purchasing more credits to continue generating.`;

      if (currentBalance <= 1) {
        notificationType = 'credit_critical_balance';
        subject = 'Critical Credit Balance - VaryAI';
        message = `You have only ${currentBalance} credit remaining! Purchase more credits now to continue generating.`;
      }

      // Add context if available
      if (modelName && generationType) {
        message += `\n\nLast generation: ${generationType} using ${modelName}`;
      }

      // Send notification via API
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          message,
          subject,
          type: notificationType
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Low balance notification sent to user ${userId}`);
        return {
          success: true,
          notificationSent: true,
          message: `Notification sent to ${result.email}`
        };
      } else {
        console.error('Failed to send notification:', result.error);
        return {
          success: false,
          notificationSent: false,
          message: 'Failed to send notification',
          error: result.error
        };
      }

    } catch (error) {
      console.error('Error sending low balance notification:', error);
      return {
        success: false,
        notificationSent: false,
        message: 'Error sending notification',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send credit purchase confirmation notification
   */
  static async sendCreditPurchaseNotification(
    userId: string, 
    creditsPurchased: number, 
    totalCost: number,
    purchaseType: 'subscription' | 'credit_pack'
  ): Promise<CreditNotificationResult> {
    try {
      const subject = 'Credits Added - VaryAI';
      let message = `Thank you for your purchase! You've added ${creditsPurchased} credits to your account for $${totalCost.toFixed(2)}.`;

      if (purchaseType === 'subscription') {
        message += `\n\nYour subscription will automatically renew and add ${creditsPurchased} credits each billing cycle.`;
      } else {
        message += `\n\nThese credits will be available immediately for your next generation.`;
      }

      message += `\n\nHappy generating!`;

      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          message,
          subject,
          type: 'credit_purchase_confirmation'
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Credit purchase notification sent to user ${userId}`);
        return {
          success: true,
          notificationSent: true,
          message: `Purchase confirmation sent to ${result.email}`
        };
      } else {
        return {
          success: false,
          notificationSent: false,
          message: 'Failed to send purchase confirmation',
          error: result.error
        };
      }

    } catch (error) {
      console.error('Error sending credit purchase notification:', error);
      return {
        success: false,
        notificationSent: false,
        message: 'Error sending purchase confirmation',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send weekly usage summary notification
   */
  static async sendWeeklyUsageSummary(userId: string): Promise<CreditNotificationResult> {
    try {
      // Get user's usage for the past week
      const { data: usageData, error: usageError } = await supabase
        .from('credit_usage_log')
        .select('model_name, credits_used, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (usageError) {
        console.error('Error fetching usage data:', usageError);
        return {
          success: false,
          notificationSent: false,
          message: 'Error fetching usage data',
          error: usageError.message
        };
      }

      // Get current balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('credit_balance')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        return {
          success: false,
          notificationSent: false,
          message: 'User not found',
          error: 'User not found'
        };
      }

      const totalCreditsUsed = usageData?.reduce((sum, usage) => sum + usage.credits_used, 0) || 0;
      const currentBalance = userData.credit_balance;

      const subject = 'Weekly Usage Summary - VaryAI';
      let message = `Here's your weekly usage summary:\n\n`;
      message += `• Credits used this week: ${totalCreditsUsed}\n`;
      message += `• Current balance: ${currentBalance} credits\n`;
      message += `• Generations completed: ${usageData?.length || 0}\n\n`;

      if (usageData && usageData.length > 0) {
        message += `Most used models:\n`;
        const modelUsage = usageData.reduce((acc, usage) => {
          acc[usage.model_name] = (acc[usage.model_name] || 0) + usage.credits_used;
          return acc;
        }, {} as Record<string, number>);

        Object.entries(modelUsage)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .forEach(([model, credits]) => {
            message += `• ${model}: ${credits} credits\n`;
          });
      }

      message += `\nKeep creating amazing content!`;

      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          message,
          subject,
          type: 'weekly_usage_summary'
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Weekly usage summary sent to user ${userId}`);
        return {
          success: true,
          notificationSent: true,
          message: `Weekly summary sent to ${result.email}`
        };
      } else {
        return {
          success: false,
          notificationSent: false,
          message: 'Failed to send weekly summary',
          error: result.error
        };
      }

    } catch (error) {
      console.error('Error sending weekly usage summary:', error);
      return {
        success: false,
        notificationSent: false,
        message: 'Error sending weekly summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check and send notifications after credit usage
   */
  static async checkAndNotifyAfterUsage(
    userId: string,
    modelName: string,
    generationType: string,
    creditsUsed: number,
    remainingCredits: number
  ): Promise<CreditNotificationResult> {
    try {
      // Check if user needs notification
      const notificationResult = await this.checkLowBalanceNotification(userId);
      
      if (notificationResult.success && notificationResult.notificationSent) {
        console.log(`🔔 Low balance notification sent to user ${userId} after ${modelName} generation`);
      }

      return notificationResult;

    } catch (error) {
      console.error('Error checking notifications after usage:', error);
      return {
        success: false,
        notificationSent: false,
        message: 'Error checking notifications',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
