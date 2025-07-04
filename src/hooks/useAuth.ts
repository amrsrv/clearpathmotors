import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

const AUTH_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  timeoutDuration: 15000,
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    maxRetries = AUTH_RETRY_CONFIG.maxRetries,
    initialDelay = AUTH_RETRY_CONFIG.initialDelay,
    maxDelay = AUTH_RETRY_CONFIG.maxDelay
  ): Promise<T> => {
    let retries = 0;
    let delay = initialDelay;
    while (true) {
      try {
        return await fn();
      } catch (error) {
        if (retries >= maxRetries) throw error;
        await sleep(delay);
        delay = Math.min(delay * 1.5 + Math.random() * 300, maxDelay);
        retries++;
      }
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const { data: { user: currentUser }, error } = await retryWithBackoff(() => supabase.auth.getUser());
      if (error) throw error;
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error: initialSessionError } = await supabase.auth.getSession();
        if (initialSessionError) throw initialSessionError;

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth initialization timed out')), AUTH_RETRY_CONFIG.timeoutDuration)
        );

        const sessionPromise = retryWithBackoff(() => supabase.auth.getSession().then(({ data, error }) => {
          if (error) throw error;
          return { currentSession: data.session };
        }));

        const { currentSession } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as { currentSession: Session | null };

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          if (currentSession.user && !currentSession.user.app_metadata?.role) {
            await supabase.auth.updateUser({ data: { role: 'customer' } });
            const { data: { user: updatedUser } } = await supabase.auth.getUser();
            setUser(updatedUser);
          }
        }

        setLoading(false);
        setInitialized(true);
      } catch (error) {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setUser(currentSession?.user || null);
      setSession(currentSession);
      setLoading(false);
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && currentSession?.user && !currentSession.user.app_metadata?.role) {
        await supabase.auth.updateUser({ data: { role: 'customer' } });
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        setUser(updatedUser);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        localStorage.removeItem('tempUserId');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await retryWithBackoff(() =>
        supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      );
      if (error) throw error;
      setUser(data.user);
      setSession(data.session);
      toast.success('Login successful!');
      return { data, error: null };
    } catch (error: any) {
      toast.error('Login failed.');
      return { data: null, error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await retryWithBackoff(() =>
        supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { role: 'customer' },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })
      );
      if (error) throw error;
      toast.success('Sign up successful!');
      return { data, error: null };
    } catch (error: any) {
      toast.error('Sign up failed.');
      return { data: null, error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://clearpathmotors.com/dashboard'
        }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      toast.error('Google sign-in failed.');
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setSession(null);
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key === 'tempUserId') {
          localStorage.removeItem(key);
        }
      });
      const { error } = await retryWithBackoff(() => supabase.auth.signOut());
      if (error) throw error;
      toast.success('Signed out.');
    } catch (error) {
      toast.error('Sign out failed.');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectTo = `${window.location.origin}/update-password`;
      const { data, error } = await retryWithBackoff(() =>
        supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
      );
      if (error) throw error;
      toast.success('Reset link sent.');
      return { error: null };
    } catch (error: any) {
      toast.error('Reset failed.');
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await retryWithBackoff(() =>
        supabase.auth.updateUser({ password: newPassword })
      );
      if (error) throw error;
      toast.success('Password updated.');
      return { error: null };
    } catch (error: any) {
      toast.error('Update failed.');
      return { error };
    }
  };

  const getUser = async () => {
    try {
      const { data: { user: currentUser }, error } = await retryWithBackoff(() => supabase.auth.getUser());
      if (error) return null;
      return currentUser;
    } catch (error) {
      return null;
    }
  };

  return {
    user,
    session,
    loading,
    initialized,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    getUser,
    refreshUser
  };
};
