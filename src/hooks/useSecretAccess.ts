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
      setIsAdmin(false);
      setAdminUser(null);
      setLoading(false);
      return;
    }

    try {
      // Check if user is admin by email or database field
      const isAdminUser = user.email === '1deeptechnology@gmail.com';
      
      // Also check database for is_admin field
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      const isAdminFromDB = userData?.is_admin || false;
      const finalIsAdmin = isAdminUser || isAdminFromDB;
      
      setHasSecretAccess(true); // Give everyone access - no restrictions
      setIsAdmin(finalIsAdmin);
      setAdminUser(finalIsAdmin ? user.email : null);
      setLoading(false);
      
      console.log('🔐 Admin check:', {
        email: user.email,
        isAdminEmail: isAdminUser,
        isAdminDB: isAdminFromDB,
        finalIsAdmin
      });
      
    } catch (error) {
      console.error('Error checking admin status:', error);
      setHasSecretAccess(true);
      setIsAdmin(false);
      setAdminUser(null);
      setLoading(false);
    }
  }, [user]);

  // Check access when user changes
  useEffect(() => {
    checkSecretAccess();
  }, [checkSecretAccess]);

  return {
    hasSecretAccess,
    isAdmin,
    adminUser,
    loading,
    checkSecretAccess
  };
};
