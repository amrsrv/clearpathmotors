import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthSession } from '../hooks/useAuthSession';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import type { Session } from '@supabase/supabase-js';

const FORM_STORAGE_KEY = 'clearpath_prequalification_form_data';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  user: Session['user'] | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { session, loading } = useAuthSession();

  const signOut = async () => {
    try {
      console.log('AuthContext: Starting signOut process');
      
      // Clear all Supabase and application-related items from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || 
            key === 'tempUserId' || 
            key === 'chatAnonymousId' || 
            key === FORM_STORAGE_KEY) {
          localStorage.removeItem(key);
        }
      });
      
      // Replace the current history entry with login page
      // This prevents going back to protected pages with browser back button
      window.history.replaceState(null, '', '/login');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthContext: Error during signOut:', error);
        throw error;
      }
      
      console.log('AuthContext: SignOut successful, performing hard redirect');
      
      // Show success message
      toast.success('Signed out successfully');
      
      // Perform a hard redirect to ensure complete state reset
      window.location.href = '/login';
    } catch (error) {
      console.error('AuthContext: Error in signOut:', error);
      toast.error('Sign out failed, redirecting anyway');
      
      // Force navigation even if signOut fails
      window.location.href = '/login';
    }
  };

  const value: AuthContextType = {
    session,
    loading,
    user: session?.user || null,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};