import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, CheckCircle, Shield, BadgeCheck, TrendingUp, FileText, Car, DollarSign, Clock, AlertCircle, HelpCircle, User, Mail, Phone } from 'lucide-react';
import { PreQualifiedBadge } from '../components/PreQualifiedBadge';
import { LoanRangeBar } from '../components/LoanRangeBar';
import { ScrollReveal } from '../components/ScrollReveal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

interface PrequalificationData {
  loanRange: {
    min: number;
    max: number;
    rate: number;
  };
  vehicleType: string;
  monthlyBudget: number;
  originalFormData?: any;
}

const QualificationResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prequalificationData, setPrequalificationData] = useState<PrequalificationData | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  
  const { loanRange, vehicleType, monthlyBudget, originalFormData, applicationId, tempUserId } = location.state || {};

  useEffect(() => {
    const checkAccess = async () => {
      console.log('QualificationResults: Checking access');
      console.log('QualificationResults: Location state:', {
        fromApproval: location.state?.fromApproval,
        applicationId: location.state?.applicationId,
        tempUserId: location.state?.tempUserId,
        hasLoanRange: !!location.state?.loanRange,
        hasMonthlyBudget: !!location.state?.monthlyBudget
      });
      
      if (!location.state?.fromApproval) {
        console.log('QualificationResults: Not from approval flow, redirecting');
        navigate('/get-approved');
        return;
      }

      if (!applicationId) {
        console.log('QualificationResults: No applicationId, redirecting');
        navigate('/get-approved');
        return;
      }

      try {
        // Fetch the application
        console.log('QualificationResults: Fetching application:', applicationId);
        const { data: application, error } = await supabase
          .from('applications')
          .select('*')
          .eq('id', applicationId)
          .single();

        if (error) {
          console.error('QualificationResults: Error fetching application:', error);
          throw error;
        }

        // If no application found, redirect
        if (!application) {
          console.log('QualificationResults: No application found, redirecting');
          navigate('/get-approved');
          return;
        }

        console.log('QualificationResults: Application found:', {
          id: application.id,
          temp_user_id: application.temp_user_id,
          user_id: application.user_id
        });

        // Check access permissions
        if (user) {
          // For authenticated users, check if they own the application
          if (application.user_id !== user.id && !user.app_metadata?.is_admin) {
            console.log('QualificationResults: User does not own application, redirecting');
            navigate('/dashboard');
            return;
          }
          
          // If user is logged in, they can skip account creation
          setAccountCreated(true);
        } else {
          // For unauthenticated users, check temp_user_id
          if (application.temp_user_id !== tempUserId) {
            console.log('QualificationResults: Invalid tempUserId, redirecting');
            navigate('/get-approved');
            return;
          }
        }

        // Set prequalification data from location state or application data
        if (loanRange && monthlyBudget) {
          console.log('QualificationResults: Using data from location state');
          setPrequalificationData({
            loanRange,
            vehicleType: vehicleType || 'Any',
            monthlyBudget,
            originalFormData
          });
          
          // Set email from form data if available
          if (originalFormData?.email) {
            setEmail(originalFormData.email);
          } else if (application.email) {
            setEmail(application.email);
          }
        } else {
          // Fallback to application data if location state is missing
          console.log('QualificationResults: Using fallback data from application');
          const fallbackData = {
            loanRange: {
              min: application.loan_amount_min || 15000,
              max: application.loan_amount_max || 50000,
              rate: application.interest_rate || 8.99
            },
            vehicleType: application.vehicle_type || 'Any',
            monthlyBudget: application.desired_monthly_payment || 400,
            originalFormData: null
          };
          setPrequalificationData(fallbackData);
          
          // Set email from application if available
          if (application.email) {
            setEmail(application.email);
          }
        }

        setLoadingResults(false);
      } catch (error) {
        console.error('QualificationResults: Error checking access:', error);
        navigate('/get-approved');
      }
    };

    checkAccess();
  }, [applicationId, tempUserId, user, navigate, location.state, loanRange, vehicleType, monthlyBudget, originalFormData]);

  // Show loading state while data is being fetched
  if (loadingResults || !prequalificationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3BAA75]/5 via-white to-[#3BAA75]/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3BAA75] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your qualification results...</p>
        </div>
      </div>
    );
  }

  // Handle sign up with the pre-filled data
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    if (!email || !email.trim()) {
      setPasswordError('Email is required');
      return;
    }
    
    setIsSubmitting(true);

    try {
      console.log('QualificationResults: Signing up with email:', email);
      
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'customer'
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (signUpError) {
        console.error('QualificationResults: Error signing up:', signUpError);
        
        // If user already exists, redirect to login
        if (signUpError.message.includes('already registered') || 
            signUpError.message.includes('already exists') ||
            signUpError.message.includes('user_already_exists') ||
            signUpError.status === 400) {
          navigate('/login', { state: { email } });
          return;
        }
        
        throw signUpError;
      }

      console.log('QualificationResults: Sign up successful:', data?.user?.id);

      if (data?.user) {
        // Update the application with the new user_id
        console.log('QualificationResults: Updating application with user_id:', data.user.id);
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            user_id: data.user.id,
            temp_user_id: null,
            email: email // Also update the email field
          })
          .eq('id', applicationId);

        if (updateError) {
          console.error('QualificationResults: Error updating application:', updateError);
          throw updateError;
        }

        // Clear the temporary user ID from localStorage
        localStorage.removeItem('tempUserId');

        console.log('QualificationResults: Application updated successfully');
        
        // Navigate to the loan results page
        navigate('/loan-results', {
          state: {
            loanRange: prequalificationData.loanRange,
            vehicleType: prequalificationData.vehicleType,
            monthlyBudget: prequalificationData.monthlyBudget,
            applicationId
          }
        });
      }
    } catch (error) {
      console.error('QualificationResults: Error in handleSignUp:', error);
      setPasswordError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3BAA75]/5 via-white to-[#3BAA75]/10">
      {/* Sticky header for mobile only */}
      <div className="sticky top-0 z-20 w-full bg-gradient-to-br from-[#3BAA75]/5 via-white to-[#3BAA75]/10 py-4 px-4 text-center space-y-2 shadow-md lg:hidden">
        <PreQualifiedBadge />
        <h1 className="text-2xl font-bold mt-2 text-gray-900">
          Congratulations!
        </h1>
        {accountCreated && (
          <>
            <p className="text-sm text-gray-600">
              You're pre-qualified for:
            </p>
            <div className="py-2">
              <div className="text-2xl font-bold text-[#3BAA75]">
                ${prequalificationData.loanRange.min.toLocaleString()} - ${prequalificationData.loanRange.max.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                at {prequalificationData.loanRange.rate}% APR
              </div>
            </div>
          </>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-12">
        {/* Desktop header (hidden on mobile) */}
        <div className="hidden lg:block">
          <ScrollReveal>
            <div className="text-center space-y-4">
              <PreQualifiedBadge />
              <h1 className="text-4xl font-bold mt-6 text-gray-900">
                Congratulations! You're Pre-qualified
              </h1>
              {accountCreated && (
                <p className="text-xl text-gray-600">
                  Based on your information, here's what you qualify for:
                </p>
              )}
            </div>
          </ScrollReveal>
        </div>

        <div className="pt-4 lg:mt-12 space-y-8">
          {!accountCreated ? (
            /* Claim This Loan Section - Only shown before account creation */
            <ScrollReveal>
              <div className="bg-white rounded-xl p-4 sm:p-8 shadow-lg">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900">Claim Your Pre-Qualification</h2>
                <p className="text-gray-600 mb-6">
                  Create your account to access your pre-qualification details and continue with your application.
                </p>
                
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Create Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3BAA75] focus:border-transparent"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </div>
                  
                  {passwordError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      {passwordError}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#3BAA75] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2D8259] transition-colors disabled:opacity-70 flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account & View Results
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-[#3BAA75] hover:underline">
                      Sign in
                    </Link>
                  </p>
                </form>
              </div>
            </ScrollReveal>
          ) : (
            /* If account is already created, redirect to loan results page */
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3BAA75] mx-auto mb-4"></div>
                <p className="text-gray-600">Redirecting to your loan results...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QualificationResults;