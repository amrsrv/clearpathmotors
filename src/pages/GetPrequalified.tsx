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

  useEffect(() => {
    if (user) {
      const checkExistingApplication = async () => {
        try {
          const { data: existingApp } = await supabase
            .from('applications')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (existingApp) {
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
    console.log('Form completed:', applicationId, tempUserId, user);

    if (user) {
      try {
        const { error: updateError } = await supabase
          .from('applications')
          .update({ user_id: user.id, temp_user_id: null })
          .eq('id', applicationId);

        if (updateError) {
          console.error('Error updating application:', updateError);
          toast.error('Failed to link application');
          return;
        }

        toast.success('Application submitted!');
        navigate('/dashboard', { replace: true });
        return;
      } catch (error) {
        console.error('Update error:', error);
        toast.error('An error occurred.');
        return;
      }
    }

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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-lg px-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* Optional Header Message */}
        </motion.div>

        <PreQualificationForm onComplete={handleFormComplete} />
      </div>
    </div>
  );
};

export default GetPrequalified;