import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Check if user has a role, if not, assign 'customer' role
        if (user && !user.app_metadata?.role) {
          const { error: updateError } = await supabase.auth.updateUser({
            data: { role: 'customer' }
          });
          
          if (updateError) {
            console.error('Error updating user role:', updateError);
            toast.error('Failed to set user role. Some features may be limited.');
          }
        }
        
        if (user) {
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
            console.error('Error checking applications by email:', emailError);
          }

          // If applications with matching email exist but no user_id, link them
          if (applicationsWithEmail && applicationsWithEmail.length > 0) {
            console.log(`Found ${applicationsWithEmail.length} unlinked applications with email ${user.email}`);
            
            // Update all applications with the user's email to have their user_id
            const { error: updateError } = await supabase
              .from('applications')
              .update({ 
                user_id: user.id,
                // Only update first_name and last_name if they're empty
                first_name: sql => `COALESCE(first_name, '${firstName}')`,
                last_name: sql => `COALESCE(last_name, '${lastName}')`
              })
              .eq('email', user.email)
              .is('user_id', null);

            if (updateError) {
              console.error('Error updating applications with user ID:', updateError);
            } else {
              console.log(`Successfully linked ${applicationsWithEmail.length} applications to user ${user.id}`);
            }
          }

          // Check if user already has an application
          const { data: existingApplications } = await supabase
            .from('applications')
            .select('id, email, first_name, last_name')
            .eq('user_id', user.id);

          if (!existingApplications || existingApplications.length === 0) {
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

          // Redirect to dashboard after successful authentication
          // Redirect based on user role
          const role = user.app_metadata?.role;
          if (role === 'super_admin') {
            navigate('/admin');
          } else if (role === 'dealer') {
            navigate('/dealer');
          } else {
            // Default to customer dashboard
            navigate('/dashboard');
          }
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