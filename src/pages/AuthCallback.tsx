import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        console.log('AuthCallback: Processing auth callback');

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('AuthCallback: Error getting session:', sessionError);
          throw sessionError;
        }

        // Clear the URL hash to remove the access token
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

        const user = session?.user;
        if (!user) {
          console.log('AuthCallback: No user found in session, redirecting to login');
          navigate('/login');
          return;
        }

        console.log('AuthCallback: Authenticated user:', user.email);

        // Check if user has a role, if not set default role
        if (!user.app_metadata?.role) {
          console.log('AuthCallback: User has no role, setting default role');
          try {
            const { error: updateError } = await supabase.auth.updateUser({
              data: { role: 'customer' }
            });

            if (updateError) {
              console.error('AuthCallback: Error updating user role:', updateError);
              // Continue despite error - we'll try again in useAuth hook
            } else {
              console.log('AuthCallback: Default role set successfully');
            }
          } catch (roleError) {
            console.error('AuthCallback: Exception setting role:', roleError);
            // Continue despite error - we'll try again in useAuth hook
          }
        }

        // Check if the user already has applications
        try {
          const { data: existingApps, error: appsError } = await supabase
            .from('applications')
            .select('id')
            .eq('user_id', user.id);

          if (appsError) {
            console.error('AuthCallback: Error checking for existing applications:', appsError);
            // Continue despite error
          }

          // If no applications found, we'll create one in the Dashboard component
          // This is a change from the previous approach where we created it here
          console.log('AuthCallback: Found', existingApps?.length || 0, 'existing applications');
        } catch (error) {
          console.error('AuthCallback: Error in application check:', error);
          // Continue despite error
        }

        // Redirect based on user role
        redirectBasedOnRole(user);
      } catch (err) {
        console.error('AuthCallback: Unhandled error:', err);
        setError('Authentication error. Please try logging in again.');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  const redirectBasedOnRole = (user: any) => {
    console.log('AuthCallback: Redirecting based on role:', user?.app_metadata?.role);
    
    // Redirect based on user role
    const role = user.app_metadata?.role;
    if (role === 'super_admin') {
      navigate('/admin');
    } else if (role === 'dealer') {
      navigate('/dealer');
    } else {
      // Default to dashboard for regular users
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent mb-4" />
          <p className="text-gray-600">Finalizing your authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-[#3BAA75] text-white px-4 py-2 rounded-lg hover:bg-[#2D8259] transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;