import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // If user just signed in, check if they have a role
      if (session?.user && !session.user.app_metadata?.role) {
        try {
          // Set default role to customer if none exists
          await supabase.auth.updateUser({
            data: { role: 'customer' }
          });
          console.log('Default role set to customer');
        } catch (error) {
          console.error('Error setting default role:', error);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log('Attempting to sign in with:', normalizedEmail);
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      
      if (signInError) {
        console.error('Supabase sign in error:', signInError);
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

      return { data, error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
      return { 
        data: null, 
        error
      };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
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
        if (error.message.includes('already registered') || 
            error.message.includes('already exists') ||
            error.status === 400) {
          throw new Error('EMAIL_EXISTS');
        }
        throw error;
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signUpDealer = async (email: string, password: string, name: string, phone: string) => {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
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
        if (error.message.includes('already registered') || 
            error.message.includes('already exists') ||
            error.status === 400) {
          throw new Error('EMAIL_EXISTS');
        }
        throw error;
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      
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
        console.log('Session not found on server, clearing local state');
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

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo
      });

      if (error) {
        console.error('Reset password error:', error);
        throw error;
      }

      return { error: null };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return { 
        error: {
          message: error.message || 'An error occurred while resetting the password. Please try again later.'
        }
      };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Update password error:', error);
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