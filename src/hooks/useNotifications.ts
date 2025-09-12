import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  sendWelcomeEmail as sendWelcomeEmailHelper,
  sendLevelUpEmail as sendLevelUpEmailHelper,
  sendUsageLimitEmail as sendUsageLimitEmailHelper,
  sendCustomNotification as sendCustomNotificationHelper
} from '@/lib/notificationHelpers';

interface NotificationData {
  userId: string;
  message: string;
  subject?: string;
  type?: string;
}

interface NotificationResponse {
  success: boolean;
  message?: string;
  error?: string;
  email?: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const sendNotification = async (data: NotificationData): Promise<NotificationResponse> => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: data.userId,
          message: data.message,
          subject: data.subject,
          type: data.type || 'notification'
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: 'Failed to send notification' };
    } finally {
      setIsLoading(false);
    }
  };

  const sendWelcomeEmail = async (userId: string) => {
    const response = await sendWelcomeEmailHelper(userId);
    return await response.json();
  };

  const sendLevelUpEmail = async (userId: string, newLevel: number) => {
    const response = await sendLevelUpEmailHelper(userId, newLevel);
    return await response.json();
  };

  const sendUsageLimitEmail = async (userId: string, limitType: string) => {
    const response = await sendUsageLimitEmailHelper(userId, limitType);
    return await response.json();
  };

  const sendCustomNotification = async (userId: string, subject: string, message: string, type?: string) => {
    const response = await sendCustomNotificationHelper(userId, subject, message, type);
    return await response.json();
  };

  return {
    sendNotification,
    sendWelcomeEmail,
    sendLevelUpEmail,
    sendUsageLimitEmail,
    sendCustomNotification,
    isLoading
  };
};
