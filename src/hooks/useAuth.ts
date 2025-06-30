import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Function to refresh user data manually
  const refreshUser = useCallback(async () => {
    try {
      console.log('useAuth: manually refreshing user data');
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('useAuth: Error refreshing user:', error);
        
        // If the error is due to missing or invalid session, clear the session
        if (error.message?.includes('Auth session missing') || 
            error.message?.includes('session_not_found') ||
            error.message?.includes('Invalid session')) {
          console.log('useAuth: Clearing invalid session due to auth error');
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.error('useAuth: Error signing out during session cleanup:', signOutError);
          }
        }
        
        setUser(null);
        return null;
      }
      
      console.log('useAuth: user refresh successful:', currentUser ? {
        id: currentUser.id,
        email: currentUser.email,
        app_metadata: currentUser.app_metadata
      } : 'null');
      
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.error('useAuth: Error in refreshUser:', error);
      setUser(null);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    console.log('useAuth: initializing auth hook');
    
    const initializeAuth = async () => {
      try {
        console.log('useAuth: getting initial session');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('useAuth: Error getting session:', error);
          
          // If the error is due to missing or invalid session, clear any stale data
          if (error.message?.includes('Auth session missing') || 
              error.message?.includes('session_not_found') ||
              error.message?.includes('Invalid session')) {
            console.log('useAuth: Clearing invalid session during initialization');
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.error('useAuth: Error signing out during initialization cleanup:', signOutError);
            }
          }
          
          setUser(null);
          setSession(null);
          setLoading(false);
          setInitialized(true);
          return;
        }
        
        console.log('useAuth: session result:', { 
          hasSession: !!currentSession, 
          user: currentSession?.user ? { 
            id: currentSession.user.id, 
            email: currentSession.user.email,
            app_metadata: currentSession.user.app_metadata
          } : null 
        });
        
        setUser(currentSession?.user || null);
        setSession(currentSession);
        
        // If user has no role, set default role
        if (currentSession?.user && !currentSession.user.app_metadata?.role) {
          try {
            console.log('useAuth: user has no role, setting default role to customer');
            await supabase.auth.updateUser({
              data: { role: 'customer' }
            });
            console.log('useAuth: default role set to customer');
            
            // Refresh user to get updated metadata
            await refreshUser();
          } catch (roleError) {
            console.error('useAuth: Error setting default role:', roleError);
          }
        }
      } catch (error) {
        console.error('useAuth: Error in initializeAuth:', error);
        setUser(null);
        setSession(null);
      } finally {
        console.log('useAuth: completed initial session check, setting loading=false');
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('useAuth: authStateChange event:', event, {
        hasSession: !!currentSession,
        user: currentSession?.user ? {
          id: currentSession.user.id,
          email: currentSession.user.email,
          app_metadata: currentSession.user.app_metadata
        } : null
      });
      
      setUser(currentSession?.user || null);
      setSession(currentSession);
      setLoading(false);
      
      // Handle specific auth events
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // If user just signed in, check if they have a role
        if (currentSession?.user && !currentSession.user.app_metadata?.role) {
          try {
            console.log('useAuth: user has no role, setting default role to customer');
            await supabase.auth.updateUser({
              data: { role: 'customer' }
            });
            console.log('useAuth: default role set to customer');
            
            // Refresh user to get updated metadata
            await refreshUser();
          } catch (error) {
            console.error('useAuth: Error setting default role:', error);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('useAuth: user signed out, clearing state');
        setUser(null);
        setSession(null);
      }
    });

    return () => {
      console.log('useAuth: unsubscribing from auth state changes');
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log('useAuth: attempting to sign in with:', normalizedEmail);
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      
      if (signInError) {
        console.error('useAuth: Supabase sign in error:', signInError);
        let errorMessage = 'An error occurred while signing in. Please try again.';
        
        if (signInError.message.includes('Invalid login credentials')) {
          errorMessage = 'The email or password you entered is incorrect.';
        } else if (signInError.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before logging in.';
        } else if (signInError.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please try again later.';
        }
        
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      console.log('useAuth: sign in successful:', { 
        userId: data.user?.id,
        email: data.user?.email,
        role: data.user?.app_metadata?.role 
      });
      
      // Update local state immediately
      setUser(data.user);
      setSession(data.session);
      toast.success('Login successful! Welcome back.');
      
      return { data, error: null };
    } catch (error: any) {
      console.error('useAuth: Sign in error:', error);
      return { 
        data: null, 
        error
      };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('useAuth: attempting to sign up:', email);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            role: 'customer'
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error('useAuth: sign up error:', error);
        if (error.message.includes('already registered') || 
            error.message.includes('already exists') ||
            error.message.includes('user_already_exists') ||
            error.status === 400) {
          toast.error('An account with this email already exists. Please sign in instead.');
          throw new Error('EMAIL_EXISTS');
        }
        toast.error(error.message || 'Sign up failed. Please try again.');
        throw error;
      }
      
      console.log('useAuth: sign up successful:', { 
        userId: data.user?.id, 
        email: data.user?.email 
      });
      
      toast.success('Account created successfully! Check your email for verification.');
      return { data, error: null };
    } catch (error: any) {
      console.error('useAuth: Sign up error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log('useAuth: attempting to sign out');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('useAuth: sign out error:', error);
        
        // Check if the error is due to a missing or invalid session
        const errorMessage = error.message || '';
        const isSessionError = 
          errorMessage.includes('Auth session missing') ||
          errorMessage.includes('Session from session_id claim in JWT does not exist') ||
          errorMessage.includes('session_not_found') ||
          errorMessage.includes('Invalid session') ||
          error.status === 403;

        if (isSessionError) {
          // If the session doesn't exist on the server, clear local state and succeed
          console.log('useAuth: Session not found on server, clearing local state');
          setUser(null);
          setSession(null);
          toast.success('Logged out successfully');
          return; // Don't throw error, treat as successful sign out
        }
        
        toast.error('Failed to log out. Please try again.');
        throw error;
      }
      
      console.log('useAuth: sign out successful, clearing user state');
      setUser(null);
      setSession(null);
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('useAuth: Sign out error:', error);
      
      // For non-session errors, still clear state but also throw the error
      setUser(null);
      setSession(null);
      toast.error('Error signing out. Please try again.');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Use a production URL for password reset in development
      const redirectTo = process.env.NODE_ENV === 'development' 
        ? 'https://clearpathmotors.com/update-password'
        : `${window.location.origin}/update-password`;

      console.log('useAuth: sending password reset email to:', email);
      console.log('useAuth: redirect URL:', redirectTo);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo
      });

      if (error) {
        console.error('useAuth: Reset password error:', error);
        toast.error(error.message || 'Failed to send reset email. Please try again.');
        throw error;
      }

      console.log('useAuth: password reset email sent successfully');
      toast.success('Password reset email sent. Check your inbox.');
      return { error: null };
    } catch (error: any) {
      console.error('useAuth: Reset password error:', error);
      return { 
        error: {
          message: error.message || 'An error occurred while resetting the password. Please try again later.'
        }
      };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      console.log('useAuth: updating password');
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('useAuth: Update password error:', error);
        toast.error(error.message || 'Failed to update password. Please try again.');
        throw error;
      }
      
      console.log('useAuth: password updated successfully');
      toast.success('Password updated successfully! You can now sign in with your new password.');
      return { error: null };
    } catch (error: any) {
      console.error('useAuth: Update password error:', error);
      toast.error(error.message || 'Failed to update password. Please try again.');
      return { error };
    }
  };

  const getUser = async () => {
    try {
      console.log('useAuth: getting current user');
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('useAuth: Error getting user:', error);
        return null;
      }
      
      console.log('useAuth: got user:', currentUser ? {
        id: currentUser.id,
        email: currentUser.email,
        app_metadata: currentUser.app_metadata
      } : 'null');
      
      return currentUser;
    } catch (error) {
      console.error('useAuth: Error in getUser:', error);
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
    signOut,
    resetPassword,
    updatePassword,
    getUser,
    refreshUser
  };
};