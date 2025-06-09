import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Check if user is an admin
          const isAdmin = user.app_metadata?.is_admin === true;
          
          if (isAdmin) {
            // Redirect admin to admin dashboard
            navigate('/admin');
            return;
          }
          
          // For regular users, continue with normal flow
          // Check if an application exists with the user's email
          const { data: existingApplicationByEmail, error: emailError } = await supabase
            .from('applications')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();

          if (emailError) {
            console.error('Error checking application by email:', emailError);
          }

          // Check if user already has an application
          const { data: existingApplication } = await supabase
            .from('applications')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (existingApplicationByEmail && !existingApplication) {
            // Update the existing application with the new user ID
            const { error: updateError } = await supabase
              .from('applications')
              .update({ user_id: user.id })
              .eq('id', existingApplicationByEmail.id);

            if (updateError) {
              console.error('Error updating application with new user ID:', updateError);
            }
          } else if (!existingApplication) {
            // Create initial application if none exists
            const { data: application, error: applicationError } = await supabase
              .from('applications')
              .insert({
                user_id: user.id,
                status: 'submitted',
                current_stage: 1,
                employment_status: 'employed'
              })
              .select()
              .single();

            if (applicationError) {
              console.error('Error creating application:', applicationError);
              navigate('/get-approved');
              return;
            }

            // Create initial application stage
            await supabase
              .from('application_stages')
              .insert({
                application_id: application.id,
                stage_number: 1,
                status: 'completed',
                notes: 'Application submitted successfully'
              });

            // Create welcome notification
            await supabase
              .from('notifications')
              .insert({
                user_id: user.id,
                title: 'Welcome to Clearpath!',
                message: 'Your account has been created successfully. Start your application process now.',
                read: false
              });
          }

          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
    </div>
  );
};

export default AuthCallback;