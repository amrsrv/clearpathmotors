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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 px-4">
            Get Pre-Qualified Today
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 px-4">
            Complete this application to see your personalized financing options
          </p>
        </motion.div>
        
        <div className="w-full flex">
          <div className="w-full lg:w-3/4 mx-auto">
            <PreQualificationForm onComplete={handleFormComplete} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-16">
        <div className="bg-[#3BAA75]/5 rounded-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Why Get Pre-Qualified?
              </h2>
              <p className="text-gray-600 mb-6">
                Pre-qualification gives you a clear picture of what you can afford before you start shopping.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="bg-[#3BAA75]/10 rounded-full p-2">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                  </div>
                  <span>Know your budget before shopping</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-[#3BAA75]/10 rounded-full p-2">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                  </div>
                  <span>No impact on your credit score</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-[#3BAA75]/10 rounded-full p-2">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                  </div>
                  <span>Stronger negotiating position</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-[#3BAA75]/10 rounded-full p-2">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                  </div>
                  <span>Faster purchase process</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Our Commitment to You</h3>
                <p className="text-gray-600 mt-2">We prioritize your privacy and security</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-[#3BAA75]/10 rounded-full p-2 mt-1">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Bank-Level Security</p>
                    <p className="text-sm text-gray-600">Your data is encrypted with 256-bit SSL technology</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-[#3BAA75]/10 rounded-full p-2 mt-1">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Soft Credit Check</p>
                    <p className="text-sm text-gray-600">We only perform a soft inquiry that won't affect your score</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-[#3BAA75]/10 rounded-full p-2 mt-1">
                    <CheckCircle className="h-5 w-5 text-[#3BAA75]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">No Obligation</p>
                    <p className="text-sm text-gray-600">Get pre-qualified with no commitment to proceed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetPrequalified;