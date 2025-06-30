import React from 'react';
import { motion } from 'framer-motion';
import PreQualificationForm from '../components/PreQualificationForm';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const GetPrequalified = () => {
  const navigate = useNavigate();
  const { user, signUp } = useAuth();

  const handleFormComplete = async (applicationId: string, tempUserId: string, formData: any) => {
    // If user is already logged in, update the application and redirect to dashboard
    if (user) {
      try {
        // Update the application with the user's ID
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            user_id: user.id,
            temp_user_id: null
          })
          .eq('id', applicationId);

        if (updateError) {
          console.error('Error updating application:', updateError);
          toast.error('Failed to link application to your account');
          return;
        }

        // Redirect to dashboard
        toast.success('Application submitted successfully!');
        navigate('/dashboard', { replace: true });
        return;
      } catch (error) {
        console.error('Error in handleFormComplete for logged-in user:', error);
        toast.error('An error occurred. Please try again.');
        return;
      }
    }

    // For non-logged in users, attempt to create an account
    try {
      // Ensure we have email and password
      if (!formData.email || !formData.password) {
        toast.error('Email and password are required');
        return;
      }

      // Attempt to sign up the user
      const { data, error: signUpError } = await signUp(formData.email, formData.password);
      
      if (signUpError) {
        // Handle case where email already exists
        if (signUpError.message === 'EMAIL_EXISTS' || 
            signUpError.message.includes('already registered') || 
            signUpError.message.includes('already exists') ||
            signUpError.message.includes('user_already_exists') ||
            signUpError.status === 400) {
          
          toast.error('An account with this email already exists. Please sign in.');
          navigate('/login', { 
            state: { 
              email: formData.email,
              redirectAfterLogin: '/dashboard'
            }
          });
          return;
        }
        
        // Handle other signup errors
        console.error('Error signing up:', signUpError);
        toast.error(signUpError.message || 'Failed to create account');
        
        // Still navigate to qualification results as fallback
        navigate('/qualification-results', {
          state: {
            fromApproval: true,
            applicationId,
            tempUserId,
            originalFormData: formData
          }
        });
        return;
      }

      // If signup was successful and we have a user
      if (data?.user) {
        // Update the application with the new user_id
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            user_id: data.user.id,
            temp_user_id: null
          })
          .eq('id', applicationId)
          .eq('temp_user_id', tempUserId);

        if (updateError) {
          console.error('Error updating application:', updateError);
          toast.error('Failed to link application to your account');
          
          // Still navigate to dashboard as the user is created
          navigate('/dashboard', { replace: true });
          return;
        }

        // Success! Redirect to dashboard
        toast.success('Account created and application submitted successfully!');
        navigate('/dashboard', { replace: true });
      } else {
        // Fallback if user creation succeeded but no user object was returned
        navigate('/qualification-results', {
          state: {
            fromApproval: true,
            applicationId,
            tempUserId,
            originalFormData: formData
          }
        });
      }
    } catch (error: any) {
      console.error('Error in handleFormComplete:', error);
      toast.error('An error occurred. Please try again.');
      
      // Navigate to qualification results as fallback
      navigate('/qualification-results', {
        state: {
          fromApproval: true,
          applicationId,
          tempUserId,
          originalFormData: formData
        }
      });
    }
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