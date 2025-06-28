import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useUserRole } from '../hooks/useUserRole';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        console.log('AuthCallback: Processing auth callback');
        
        // Get the current session and user
        const { data: { session, user }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthCallback: Error getting session:', sessionError);
          throw sessionError;
        }
        
        // If no user, redirect to login
        if (!user) {
          console.log('AuthCallback: No user found, redirecting to login');
          navigate('/login');
          return;
        }
        
        console.log('AuthCallback: User authenticated:', {
          id: user.id,
          email: user.email,
          app_metadata: user.app_metadata
        });
        
        // Check if user has a valid role
        if (!user.app_metadata?.role) {
          console.log('AuthCallback: User has no role, setting default role: customer');
          
          try {
            // Try to update the user's role
            const { error: updateError } = await supabase.auth.updateUser({
              data: { role: 'customer' }
            });
            
            if (updateError) {
              console.error('AuthCallback: Error updating user role:', updateError);
              throw updateError;
            }
            
            // Refresh the session to get updated metadata
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error('AuthCallback: Error refreshing session:', refreshError);
              throw refreshError;
            }
            
            // Get the updated user
            const { data: { user: refreshedUser } } = await supabase.auth.getUser();
            
            if (!refreshedUser?.app_metadata?.role) {
              console.warn('AuthCallback: Role not set after refresh, using fallback');
            }
          } catch (error) {
            console.error('AuthCallback: Error updating user role:', error);
            setError('Failed to set user role. Some features may be limited.');
          }
        }
        
        // Extract first and last name from email if available
        let firstName = '';
        let lastName = '';
        
        if (user.email) {
          // Try to extract name from email (e.g., john.doe@example.com -> John Doe)
          const emailName = user.email.split('@')[0];
          const nameParts = emailName.split(/[._-]/);
          
          if (nameParts.length > 1) {
            firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
            lastName = nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1);
          } else {
            // If no separator, use the whole name as first name
            firstName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          }
        }
        
        // Check if any applications exist with the user's email but not linked to their user_id
        const { data: applicationsWithEmail, error: emailError } = await supabase
          .from('applications')
          .select('id, email, first_name, last_name, user_id')
          .eq('email', user.email)
          .is('user_id', null);

        if (emailError) {
          console.error('AuthCallback: Error checking applications by email:', emailError);
        }

        // If applications with matching email exist but no user_id, link them
        if (applicationsWithEmail && applicationsWithEmail.length > 0) {
          console.log(`AuthCallback: Found ${applicationsWithEmail.length} unlinked applications with email ${user.email}`);
          
          // Update all applications with the user's email to have their user_id
          const { error: updateError } = await supabase
            .from('applications')
            .update({ 
              user_id: user.id,
              // Only update first_name and last_name if they're empty
              first_name: firstName,
              last_name: lastName
            })
            .eq('email', user.email)
            .is('user_id', null);

          if (updateError) {
            console.error('AuthCallback: Error updating applications with user ID:', updateError);
          } else {
            console.log(`AuthCallback: Successfully linked ${applicationsWithEmail.length} applications to user ${user.id}`);
          }
        }

        // Check if user already has an application
        const { data: existingApplications, error: appError } = await supabase
          .from('applications')
          .select('id, email, first_name, last_name')
          .eq('user_id', user.id);

        if (appError) {
          console.error('AuthCallback: Error checking existing applications:', appError);
        }

        if (!existingApplications || existingApplications.length === 0) {
          console.log('AuthCallback: No existing applications found, creating initial application');
          
          // Create initial application if none exists
          const { data: application, error: applicationError } = await supabase
            .from('applications')
            .insert({
              user_id: user.id,
              status: 'submitted',
              current_stage: 1,
              employment_status: 'employed',
              email: user.email,
              first_name: firstName,
              last_name: lastName
            })
            .select()
            .single();

          if (applicationError) {
            console.error('AuthCallback: Error creating application:', applicationError);
            navigate('/get-approved');
            return;
          }

          console.log('AuthCallback: Created initial application:', application.id);

          // Create initial application stage
          const { error: stageError } = await supabase
            .from('application_stages')
            .insert({
              application_id: application.id,
              stage_number: 1,
              status: 'completed',
              notes: 'Application submitted successfully'
            });

          if (stageError) {
            console.error('AuthCallback: Error creating application stage:', stageError);
          }

          // Create welcome notification
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              title: 'Welcome to Clearpath!',
              message: 'Your account has been created successfully. Start your application process now.',
              read: false
            });

          if (notificationError) {
            console.error('AuthCallback: Error creating welcome notification:', notificationError);
          }
        } else {
          console.log('AuthCallback: User already has applications:', existingApplications.length);
        }

        // Redirect based on user role
        const role = user.app_metadata?.role;
        console.log('AuthCallback: Redirecting based on role:', role);
        
        if (role === 'super_admin') {
          navigate('/admin');
        } else if (role === 'dealer') {
          navigate('/dealer');
        } else {
          // Default to customer dashboard
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('AuthCallback: Error in auth callback:', error);
        setError('Authentication error. Please try logging in again.');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
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
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
    </div>
  );
};

export default AuthCallback;