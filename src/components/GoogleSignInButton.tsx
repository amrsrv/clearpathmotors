import React from 'react';
import { supabase } from '../lib/supabaseClient';

export const GoogleSignInButton: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className = '',
  children
}) => {
  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // No need for redirectTo — Supabase will use the default callback
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Error signing in with Google:', error);
        alert('Sign-in error. Please try again later.');
      }
    } catch (error) {
      console.error('Sign-in failed:', error);
      alert('Failed to sign in with Google.');
    }
  };

  return (
    <button
      onClick={handleSignIn}
      className={`flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-white bg-[#4285F4] hover:bg-[#357AE8] transition-colors ${className}`}
      aria-label="Sign in with Google"
    >
      <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25..." fill="#4285F4" />
        {/* truncated for clarity */}
      </svg>
      {children || 'Sign in with Google'}
    </button>
  );
};
