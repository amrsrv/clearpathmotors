import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import PreQualificationForm from '../components/PreQualificationForm';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronRight } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="w-full max-w-4xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
    
        </motion.div>
        
        <div className="w-full flex">
          <div className="w-full lg:w-3/4 mx-auto">
            <PreQualificationForm onComplete={handleFormComplete} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetPrequalified;