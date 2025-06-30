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

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = session?.user;
        if (!user) {
          navigate('/login');
          return;
        }

        console.log('Authenticated user:', user.email);

        // Set default role if not present
        let refreshedUser = user;
        if (!user.app_metadata?.role) {
          const { error: updateError } = await supabase.auth.updateUser({
            data: { role: 'customer' }
          });

          if (updateError) {
            console.error('Error updating user role:', updateError);
            throw updateError;
          }

          const { data: refreshed, error: refreshError } = await supabase.auth.getUser();
          if (refreshError) throw refreshError;
          refreshedUser = refreshed.user!;
        }

        // Attempt to parse name from email
        const emailName = user.email?.split('@')[0] || '';
        const nameParts = emailName.split(/[._-]/);
        const firstName = nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || '';
        const lastName = nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) || '';

        // Link existing applications by email (if not yet linked to user_id)
        const { data: unlinkedApps } = await supabase
          .from('applications')
          .select('id')
          .eq('email', user.email)
          .is('user_id', null);

        if (unlinkedApps && unlinkedApps.length > 0) {
          const { error: linkError } = await supabase
            .from('applications')
            .update({
              user_id: user.id,
              first_name: firstName,
              last_name: lastName
            })
            .eq('email', user.email)
            .is('user_id', null);

          if (linkError) console.error('Error linking applications:', linkError);
          else toast.success(`Linked ${unlinkedApps.length} existing applications.`);
        }

        // Check if the user already has applications
        const { data: existingApps } = await supabase
          .from('applications')
          .select('id')
          .eq('user_id', user.id);

        if (!existingApps || existingApps.length === 0) {
          const { data: newApp, error: insertError } = await supabase
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

          if (insertError) throw insertError;

          await supabase
            .from('application_stages')
            .insert({
              application_id: newApp.id,
              stage_number: 1,
              status: 'completed',
              notes: 'Application submitted successfully'
            });

          await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              title: 'Welcome to Clearpath!',
              message: 'Your account has been created successfully. Start your application process now.',
              read: false
            });

          toast.success('Your application has been created!');
        }

        // Redirect based on user role
        const role = refreshedUser.app_metadata?.role;
        if (role === 'super_admin') navigate('/admin');
        else if (role === 'dealer') navigate('/dealer');
        else navigate('/dashboard'); // Default customer

      } catch (err) {
        console.error('AuthCallback Error:', err);
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
