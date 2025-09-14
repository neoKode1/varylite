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
    // Give everyone access - no restrictions
    setHasSecretAccess(true);
    setIsAdmin(false);
    setAdminUser(null);
    setLoading(false);
  }, [user]);

  // Check access when user changes
  useEffect(() => {
    checkSecretAccess();
  }, [checkSecretAccess]);

  return {
    hasSecretAccess: true, // Always true - no restrictions
    isAdmin: false,
    adminUser: null,
    loading: false,
    checkSecretAccess
  };
};
