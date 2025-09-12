import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Loader2 } from 'lucide-react';

interface NotificationButtonProps {
  userId: string;
  subject: string;
  message: string;
  type?: string;
  className?: string;
  children?: React.ReactNode;
}

export const NotificationButton: React.FC<NotificationButtonProps> = ({
  userId,
  subject,
  message,
  type = 'notification',
  className = '',
  children
}) => {
  const { sendNotification, isLoading } = useNotifications();
  const { user } = useAuth();

  const handleSendNotification = async () => {
    if (!user?.id) {
      alert('Please sign in to send notifications');
      return;
    }

    const result = await sendNotification({
      userId,
      message,
      subject,
      type
    });

    if (result.success) {
      alert(`Notification sent to ${result.email}!`);
    } else {
      alert(`Failed to send notification: ${result.error}`);
    }
  };

  return (
    <button
      onClick={handleSendNotification}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Mail className="w-4 h-4" />
      )}
      {children || 'Send Notification'}
    </button>
  );
};

// Example usage components
export const WelcomeEmailButton: React.FC<{ userId: string }> = ({ userId }) => {
  const { sendWelcomeEmail, isLoading } = useNotifications();

  const handleSendWelcome = async () => {
    const result = await sendWelcomeEmail(userId);
    if (result.success) {
      alert(`Welcome email sent to ${result.email}!`);
    } else {
      alert(`Failed to send welcome email: ${result.error}`);
    }
  };

  return (
    <button
      onClick={handleSendWelcome}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Mail className="w-4 h-4" />
      )}
      Send Welcome Email
    </button>
  );
};

export const LevelUpEmailButton: React.FC<{ userId: string; newLevel: number }> = ({ userId, newLevel }) => {
  const { sendLevelUpEmail, isLoading } = useNotifications();

  const handleSendLevelUp = async () => {
    const result = await sendLevelUpEmail(userId, newLevel);
    if (result.success) {
      alert(`Level up email sent to ${result.email}!`);
    } else {
      alert(`Failed to send level up email: ${result.error}`);
    }
  };

  return (
    <button
      onClick={handleSendLevelUp}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Mail className="w-4 h-4" />
      )}
      Send Level Up Email
    </button>
  );
};
