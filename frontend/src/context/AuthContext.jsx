import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, supabaseConfigReason } from '../services/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize and subscribe to Supabase Auth state changes
  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured || !supabase) {
      if (mounted) {
        setLoading(false);
        setAuthError(supabaseConfigReason || 'Supabase credentials not configured in frontend/.env');
      }
      return;
    }

    // 1. Fetch existing session from browser storage
    const getInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession error:', error.message);
          if (mounted) setAuthError(error.message);
        } else if (mounted) {
          setSession(data?.session || null);
          setUser(data?.session?.user || null);
        }
      } catch (err) {
        console.error('Session retrieval exception:', err);
        if (mounted) setAuthError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getInitialSession();

    // 2. Subscribe to live auth state changes (login, logout, token refresh)
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user || null);
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Determine whether authenticated user possesses an approved operator role in app_metadata
  const isAuthorizedOperator = useMemo(() => {
    if (!user) return false;

    // Only trust app_metadata (immutable by client, provisioned strictly by administrator)
    const appMeta = user.app_metadata;
    if (!appMeta || typeof appMeta !== 'object') return false;

    const isOperator = appMeta.is_operator === true || appMeta.is_operator === 'true';
    const role = typeof appMeta.role === 'string' ? appMeta.role.toLowerCase().trim() : '';

    return isOperator || ['operator', 'admin', 'prcbo_operator'].includes(role);
  }, [user]);

  // Sign In with corporate email and password
  const signIn = useCallback(async ({ email, password }) => {
    if (!isSupabaseConfigured || !supabase) {
      const err = new Error(supabaseConfigReason || 'Supabase credentials are not configured');
      setAuthError(err.message);
      return { data: null, error: err };
    }

    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: (email || '').trim(),
        password
      });

      if (error) {
        setAuthError(error.message);
        return { data: null, error };
      }

      setSession(data.session);
      setUser(data.user);
      return { data, error: null };
    } catch (err) {
      const errorObj = { message: err.message || 'An unexpected sign in error occurred' };
      setAuthError(errorObj.message);
      return { data: null, error: errorObj };
    }
  }, []);

  // Sign Out
  const signOut = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setUser(null);
      return { error: null };
    }

    setAuthError(null);
    try {
      const { error } = await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      if (error) {
        setAuthError(error.message);
        return { error };
      }
      return { error: null };
    } catch (err) {
      setSession(null);
      setUser(null);
      return { error: { message: err.message } };
    }
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isAuthenticated: !!session && !!user,
        isAuthorizedOperator,
        loading,
        authError,
        isSupabaseConfigured,
        supabaseConfigReason,
        signIn,
        signOut,
        clearAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
