import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import PreQualificationForm from '../components/PreQualificationForm';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const GetPrequalified = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if user is already authenticated
  useEffect(() => {
    if (user) {
      // Check if user already has an application
      const checkExistingApplication = async () => {
        try {
          const { data: existingApp } = await supabase
            .from('applications')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (existingApp) {
            // User already has an application, redirect to dashboard
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('Error checking for existing application:', error);
        }
      };
      
      checkExistingApplication();
    }
  }, [user, navigate]);

  const handleFormComplete = async (applicationId: string, tempUserId: string, formData: any) => {
    console.log('GetPrequalified: Form completed with applicationId:', applicationId);
    console.log('GetPrequalified: tempUserId:', tempUserId);
    console.log('GetPrequalified: Current user state:', user ? { id: user.id, email: user.email } : 'null');
    
    // If user is already logged in, update the application and redirect to dashboard
    if (user) {
      try {
        console.log('GetPrequalified: User is logged in, updating application with user_id:', user.id);
        // Update the application with the user's ID
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            user_id: user.id,
            temp_user_id: null
          })
          .eq('id', applicationId);

        if (updateError) {
          console.error('GetPrequalified: Error updating application:', updateError);
          toast.error('Failed to link application to your account');
          return;
        }

        console.log('GetPrequalified: Application updated successfully, redirecting to dashboard');
        // Redirect to dashboard
        toast.success('Application submitted successfully!');
        navigate('/dashboard', { replace: true });
        return;
      } catch (error) {
        console.error('GetPrequalified: Error in handleFormComplete for logged-in user:', error);
        toast.error('An error occurred. Please try again.');
        return;
      }
    }

    console.log('GetPrequalified: User not logged in, redirecting to qualification results with data for claim page');
    // For non-logged in users, redirect to qualification results with data for claim page
    navigate('/qualification-results', {
      state: {
        fromApproval: true,
        applicationId,
        tempUserId,
        originalFormData: formData,
        loanRange: {
          min: formData.loan_amount_min || 15000,
          max: formData.loan_amount_max || 50000,
          rate: formData.interest_rate || 5.99
        },
        vehicleType: formData.vehicle_type,
        monthlyBudget: formData.desired_monthly_payment
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-start bg-gradient-to-br from-[#3BAA75]/10 via-white to-[#3BAA75]/5 pb-0">
      <div className="w-full max-w-lg mx-auto px-4 pt-6 md:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 md:mb-8"
        >
          {/* Title Section */}
          <div className="mb-6 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 text-gray-900">
             QUALIFY IN <span className="text-[#33a381]">MINUTES</span>
            </h1>
            
            {/* Bank Logos */}
            <div className="mt-5 md:mt-8">
              <p className="text-base md:text-lg text-gray-700 mb-3 md:mb-4">Our top lenders</p>
              <div className="flex justify-center items-center gap-3 md:gap-4 flex-wrap">
                <div className="bg-gray-50 rounded-full p-2 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
                  <img 
                    src="https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px.png" 
                    alt="TD Bank" 
                    className="w-10 md:w-12 h-auto"
                  />
                </div>
                <div className="bg-gray-50 rounded-full p-2 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
                  <img 
                    src="https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-2.png" 
                    alt="CIBC" 
                    className="w-10 md:w-12 h-auto"
                  />
                </div>
                <div className="bg-gray-50 rounded-full p-2 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
                  <img 
                    src="https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-3.png" 
                    alt="RBC" 
                    className="w-10 md:w-12 h-auto"
                  />
                </div>
                <div className="bg-gray-50 rounded-full p-2 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
                  <img 
                    src="https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-4.png" 
                    alt="Scotiabank" 
                    className="w-10 md:w-12 h-auto"
                  />
                </div>
                <div className="bg-gray-50 rounded-full p-2 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
                  <img 
                    src="https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-7.png" 
                    alt="iA Financial" 
                    className="w-10 md:w-12 h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <PreQualificationForm onComplete={handleFormComplete} />
      </div>
    </div>
  );
};

export default GetPrequalified;