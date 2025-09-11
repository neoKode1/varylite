'use client';

import React, { useState, useEffect } from 'react';
import { Users, Mail, Calendar, Crown, Star, Zap, Trophy, Gift, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PromoUser {
  id: string;
  redeemed_at: string;
  user_id: string;
  promo_codes: {
    id: string;
    code: string;
    description: string;
    access_type: string;
    max_uses: number;
    used_count: number;
    expires_at: string;
    created_at: string;
    created_by: string;
  };
  user: {
    id: string;
    email: string;
    display_name: string;
    username: string;
    created_at: string;
    secret_level: number;
    total_generations: number;
    unique_models_used: number;
  };
}

export const AdminPromoUsersPanel: React.FC = () => {
  const [promoUsers, setPromoUsers] = useState<PromoUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPromoUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const response = await fetch('/api/admin/promo-users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch promo users');
      }

      const data = await response.json();
      if (data.success) {
        setPromoUsers(data.promoUsers);
      } else {
        throw new Error(data.error || 'Failed to fetch promo users');
      }
    } catch (err) {
      console.error('Error fetching promo users:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoUsers();
  }, []);

  const getLevelIcon = (level: number) => {
    if (level <= 2) return <Star className="w-4 h-4 text-green-400" />;
    if (level <= 4) return <Zap className="w-4 h-4 text-blue-400" />;
    if (level <= 6) return <Trophy className="w-4 h-4 text-purple-400" />;
    if (level <= 8) return <Gift className="w-4 h-4 text-orange-400" />;
    return <Sparkles className="w-4 h-4 text-yellow-400" />;
  };

  const getLevelTitle = (level: number) => {
    if (level <= 2) return 'Novice Creator';
    if (level <= 4) return 'Skilled Artist';
    if (level <= 6) return 'Expert Designer';
    if (level <= 8) return 'Master Creator';
    return 'Legendary Artist';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-white/60" />
          <span className="ml-2 text-white/60">Loading promo users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">Error loading promo users</div>
          <div className="text-white/60 text-sm mb-4">{error}</div>
          <button
            onClick={fetchPromoUsers}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Promo Code Users</h3>
            <p className="text-white/60 text-sm">
              {promoUsers.length} user{promoUsers.length !== 1 ? 's' : ''} with secret access
            </p>
          </div>
        </div>
        <button
          onClick={fetchPromoUsers}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-white/60 hover:text-white" />
        </button>
      </div>

      {promoUsers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <div className="text-white/60 mb-2">No promo users yet</div>
          <div className="text-white/40 text-sm">
            Users who redeem promo codes will appear here
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {promoUsers.map((promoUser) => (
            <div
              key={promoUser.id}
              className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-white/60" />
                      <span className="text-white font-medium">
                        {promoUser.user.display_name || promoUser.user.username || 'Unknown User'}
                      </span>
                    </div>
                    <div className="text-white/60 text-sm">
                      {promoUser.user.email}
                    </div>
                  </div>

                  {/* Level & Stats */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(promoUser.user.secret_level)}
                      <span className="text-white/80 text-sm">
                        Level {promoUser.user.secret_level} • {getLevelTitle(promoUser.user.secret_level)}
                      </span>
                    </div>
                    <div className="text-white/60 text-sm">
                      {promoUser.user.total_generations} generations • {promoUser.user.unique_models_used} models used
                    </div>
                  </div>

                  {/* Promo Code Info */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      <span className="text-white/80 text-sm">
                        Code: {promoUser.promo_codes.code}
                      </span>
                    </div>
                    <div className="text-white/60 text-sm">
                      {promoUser.promo_codes.description}
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="text-right text-sm">
                  <div className="text-white/60 mb-1">
                    Redeemed: {formatDate(promoUser.redeemed_at)}
                  </div>
                  <div className="text-white/40">
                    Joined: {formatDate(promoUser.user.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {promoUsers.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-white font-semibold">{promoUsers.length}</div>
              <div className="text-white/60 text-sm">Total Users</div>
            </div>
            <div>
              <div className="text-white font-semibold">
                {Math.round(promoUsers.reduce((sum, user) => sum + user.user.secret_level, 0) / promoUsers.length * 10) / 10}
              </div>
              <div className="text-white/60 text-sm">Avg Level</div>
            </div>
            <div>
              <div className="text-white font-semibold">
                {promoUsers.reduce((sum, user) => sum + user.user.total_generations, 0)}
              </div>
              <div className="text-white/60 text-sm">Total Generations</div>
            </div>
            <div>
              <div className="text-white font-semibold">
                {promoUsers.reduce((sum, user) => sum + user.user.unique_models_used, 0)}
              </div>
              <div className="text-white/60 text-sm">Models Used</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
