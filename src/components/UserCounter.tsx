'use client';

import { useState, useEffect } from 'react';
import { Users, Activity, UserPlus, TrendingUp } from 'lucide-react';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  lastUpdated: string;
  status: string;
}

export const UserCounter: React.FC = () => {
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    lastUpdated: '',
    status: 'loading'
  });
  const [isVisible, setIsVisible] = useState(true);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user-stats');
      const data = await response.json();
      setUserStats(data);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      setUserStats(prev => ({ ...prev, status: 'error' }));
    }
  };

  const trackUserActivity = async () => {
    try {
      // Generate a simple user ID and session ID based on session storage
      let userId = sessionStorage.getItem('varyai_user_id');
      let sessionId = sessionStorage.getItem('varyai_session_id');
      
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('varyai_user_id', userId);
      }
      
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('varyai_session_id', sessionId);
      }

      await fetch('/api/user-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          sessionId,
          action: 'page_view'
        })
      });
    } catch (error) {
      console.error('Failed to track user activity:', error);
    }
  };

  useEffect(() => {
    // Fetch initial stats
    fetchUserStats();
    
    // Track user activity
    trackUserActivity();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchUserStats, 30000);

    // Track activity every 5 minutes
    const activityInterval = setInterval(trackUserActivity, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(activityInterval);
    };
  }, []);

  if (!isVisible) return null;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 text-white shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <h3 className="font-semibold text-sm">Community Growth</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white/70 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Total Users */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs text-white/80">Total</span>
          </div>
          <div className="text-2xl font-bold">
            {userStats.status === 'loading' ? '...' : formatNumber(userStats.totalUsers)}
          </div>
        </div>

        {/* Active Users */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-xs text-white/80">Active</span>
          </div>
          <div className="text-2xl font-bold text-green-300">
            {userStats.status === 'loading' ? '...' : formatNumber(userStats.activeUsers)}
          </div>
        </div>

        {/* New Today */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <UserPlus className="w-4 h-4" />
            <span className="text-xs text-white/80">New Today</span>
          </div>
          <div className="text-2xl font-bold text-yellow-300">
            {userStats.status === 'loading' ? '...' : formatNumber(userStats.newUsersToday)}
          </div>
        </div>
      </div>

      {/* Growth Indicator */}
      {userStats.newUsersToday > 0 && (
        <div className="mt-3 flex items-center justify-center space-x-1 text-xs text-white/80">
          <TrendingUp className="w-3 h-3" />
          <span>Growing community!</span>
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-2 text-xs text-white/60 text-center">
        Updated {userStats.lastUpdated ? new Date(userStats.lastUpdated).toLocaleTimeString() : 'Just now'}
      </div>
    </div>
  );
};
