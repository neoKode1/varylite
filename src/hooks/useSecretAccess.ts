'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface SecretAccessData {
  hasAccess: boolean;
  isAdmin: boolean;
  adminUser?: string;
}

export const useSecretAccess = () => {
  const { user } = useAuth();
  const [hasSecretAccess, setHasSecretAccess] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSecretAccess = useCallback(async () => {
    if (!user) {
      setHasSecretAccess(false);
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setHasSecretAccess(false);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/promo', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data: SecretAccessData = await response.json();
        setHasSecretAccess(data.hasAccess);
        setIsAdmin(data.isAdmin || false);
        setAdminUser(data.adminUser || null);
      } else {
        setHasSecretAccess(false);
        setIsAdmin(false);
        setAdminUser(null);
      }
    } catch (error) {
      console.error('Error checking secret access:', error);
      setHasSecretAccess(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check access when user changes
  useEffect(() => {
    checkSecretAccess();
  }, [checkSecretAccess]);

  return {
    hasSecretAccess: hasSecretAccess === true,
    isAdmin,
    adminUser,
    loading,
    checkSecretAccess
  };
};
