'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp } from 'lucide-react';

interface UserGrowthData {
  newUsers24h: number;
  timestamp: string;
  period: string;
}

export function UserGrowthCounter() {
  const [userGrowth, setUserGrowth] = useState<UserGrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserGrowth = async () => {
      try {
        console.log('📊 [UserGrowthCounter] Fetching user growth data...');
        const response = await fetch('/api/user-growth');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ [UserGrowthCounter] User growth data received:', result.data);
          setUserGrowth(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch user growth data');
        }
      } catch (err) {
        console.error('❌ [UserGrowthCounter] Error fetching user growth:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Set fallback data for demo purposes
        setUserGrowth({
          newUsers24h: 12, // Fallback number
          timestamp: new Date().toISOString(),
          period: '24 hours'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserGrowth();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchUserGrowth, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
        <div className="flex items-center justify-center space-x-2">
          <Users className="w-5 h-5 text-blue-400 animate-pulse" />
          <span className="text-white">Loading user growth...</span>
        </div>
      </div>
    );
  }

  if (error && !userGrowth) {
    return (
      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
        <div className="flex items-center justify-center space-x-2">
          <Users className="w-5 h-5 text-red-400" />
          <span className="text-red-300">Unable to load user data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
      <div className="flex items-center justify-center space-x-2 mb-3">
        <Users className="w-6 h-6 text-blue-400" />
        <TrendingUp className="w-5 h-5 text-green-400" />
      </div>
      
      <div className="text-center">
        <div className="text-3xl font-bold text-white mb-1">
          {userGrowth?.newUsers24h || 0}
        </div>
        <div className="text-sm text-gray-300 mb-2">
          New Users (24h)
        </div>
        <div className="text-xs text-gray-400">
          Last updated: {userGrowth?.timestamp ? new Date(userGrowth.timestamp).toLocaleTimeString() : 'Unknown'}
        </div>
      </div>
      
      {error && (
        <div className="mt-2 text-xs text-yellow-400 text-center">
          Using fallback data
        </div>
      )}
    </div>
  );
}
