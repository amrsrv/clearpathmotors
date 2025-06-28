import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('useAuth: initializing auth hook');
    
    const getInitialSession = async () => {
      try {
        console.log('useAuth: getting initial session');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('useAuth: Error getting session:', error);
          throw error;
        }
        
        console.log('useAuth: session result:', { 
          hasSession: !!session, 
          user: session?.user ? { 
            id: session.user.id, 
            email: session.user.email,
            app_metadata: session.user.app_metadata
          } : null 
        });
        
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('useAuth: Error getting session:', error);
        setUser(null);
      } finally {
        console.log('useAuth: completed initial session check, setting loading=false');
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('useAuth: authStateChange event:', _event, {
        hasSession: !!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          app_metadata: session.user.app_metadata
        } : null
      });
      
      setUser(session?.user ?? null);
      setLoading(false);
      
      // If user just signed in, check if they have a role
      if (session?.user && !session.user.app_metadata?.role) {
        try {
          console.log('useAuth: user has no role, setting default role to customer');
          // Set default role to customer if none exists
          await supabase.auth.updateUser({
            data: { role: 'customer' }
          });
          console.log('useAuth: default role set to customer');
        } catch (error) {
          console.error('useAuth: Error setting default role:', error);
        }
      }
    });

    return () => {
      console.log('useAuth: unsubscribing from auth state changes');
      subscription.unsubscribe();
    };
  }, []);

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
        
        throw new Error(errorMessage);
      }

      console.log('useAuth: sign in successful:', { 
        userId: data.user?.id,
        email: data.user?.email,
        role: data.user?.app_metadata?.role 
      });
      return { data, error: null };
    } catch (error: any) {
      console.error('useAuth: Sign in error:', error);
      console.log('useAuth: Error details:', JSON.stringify(error, null, 2));
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
            error.status === 400) {
          throw new Error('EMAIL_EXISTS');
        }
        throw error;
      }
      
      console.log('useAuth: sign up successful:', { 
        userId: data.user?.id, 
        email: data.user?.email 
      });
      return { data, error: null };
    } catch (error: any) {
      console.error('useAuth: Sign up error:', error);
      return { data: null, error };
    }
  };

  const signUpDealer = async (email: string, password: string, name: string, phone: string) => {
    try {
      console.log('useAuth: attempting to sign up dealer:', email, name);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            role: 'dealer',
            name,
            phone
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error('useAuth: dealer sign up error:', error);
        if (error.message.includes('already registered') || 
            error.message.includes('already exists') ||
            error.status === 400) {
          throw new Error('EMAIL_EXISTS');
        }
        throw error;
      }
      
      console.log('useAuth: dealer sign up successful:', { 
        userId: data.user?.id, 
        email: data.user?.email,
        role: 'dealer' 
      });
      return { data, error: null };
    } catch (error: any) {
      console.error('useAuth: Dealer sign up error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log('useAuth: attempting to sign out');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('useAuth: sign out error:', error);
        throw error;
      }
      console.log('useAuth: sign out successful, clearing user state');
      setUser(null);
    } catch (error: any) {
      console.error('useAuth: Sign out error:', error);
      
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
        return; // Don't throw error, treat as successful sign out
      }
      
      // For other errors, still throw
      throw new Error('Error signing out. Please try again.');
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
        throw error;
      }

      console.log('useAuth: password reset email sent successfully');
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
        throw error;
      }
      console.log('useAuth: password updated successfully');
      return { error: null };
    } catch (error: any) {
      console.error('useAuth: Update password error:', error);
      return { error };
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signUpDealer,
    resetPassword,
    updatePassword
  };
};