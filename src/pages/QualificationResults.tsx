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
      
      // If user is already logged in, redirect directly to dashboard
      if (user) {
        console.log('QualificationResults: User already logged in, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
        return;
      }

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

  // Calculate monthly payments based on loan amount and rate
  const calculateMonthlyPayment = (amount: number, rate: number, term: number = 60) => {
    const monthlyRate = rate / 1200;
    return Math.round(
      (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
      (Math.pow(1 + monthlyRate, term) - 1)
    );
  };

  const standardMonthlyPayment = calculateMonthlyPayment(prequalificationData.loanRange.min, prequalificationData.loanRange.rate + 3);
  const competitiveMonthlyPayment = calculateMonthlyPayment(prequalificationData.loanRange.min, prequalificationData.loanRange.rate);
  const monthlySavings = standardMonthlyPayment - competitiveMonthlyPayment;
  const totalSavings = monthlySavings * 60; // Based on 60-month term

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
            temp_user_id: null
          })
          .eq('id', applicationId);

        if (updateError) {
          console.error('QualificationResults: Error updating application:', updateError);
          throw updateError;
        }

        // Clear the temporary user ID from localStorage
        localStorage.removeItem('tempUserId');

        console.log('QualificationResults: Application updated successfully, redirecting to dashboard');
        // Redirect to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('QualificationResults: Error in handleSignUp:', error);
      setPasswordError('An error occurred. Please try again.');
    } finally {
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
              <p className="text-xl text-gray-600">
                Based on your information, here's what you qualify for:
              </p>
            </div>
          </ScrollReveal>
        </div>

        <div className="pt-4 lg:mt-12 space-y-8">
          {/* Loan Range Card */}
          <ScrollReveal>
            <div className="bg-[#2A7A5B] rounded-xl p-4 sm:p-8 text-white shadow-xl">
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl font-medium">Available Loan Amount</h2>
                <p className="text-white/80 text-sm leading-relaxed md:block hidden">
                  Based on your desired monthly payment of ${prequalificationData.monthlyBudget}, we've calculated a loan range that fits your budget 
                  while maintaining comfortable monthly payments. This estimate reflects what you're most likely to be approved 
                  for with a 95% chance of approval.
                </p>
              </div>
              
              <div className="mt-8">
                <LoanRangeBar
                  min={prequalificationData.loanRange.min}
                  max={prequalificationData.loanRange.max}
                  rate={prequalificationData.loanRange.rate}
                />
              </div>
            </div>
          </ScrollReveal>

          {/* Claim This Loan Section */}
          <ScrollReveal>
            <div className="bg-white rounded-xl p-4 sm:p-8 shadow-lg">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900">Claim This Loan</h2>
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
                      Create Account & Continue
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

          {/* Monthly Payment Comparison */}
          <ScrollReveal>
            <div className="bg-white rounded-xl p-4 sm:p-8 text-center shadow-lg">
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-gray-900">Monthly Payment Comparison</h2>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                See how our competitive rates can save you money over the life of your loan.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Other Lenders</h3>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      ${standardMonthlyPayment}
                    </div>
                    <div className="text-sm text-gray-600">
                      at {(prequalificationData.loanRange.rate + 3).toFixed(2)}% APR
                    </div>
                  </div>
                </div>

                <div className="bg-[#2A7A5B]/5 p-6 rounded-lg border-2 border-[#2A7A5B]/20">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-[#2A7A5B] mb-4">ClearPath Rate</h3>
                    <div className="text-3xl font-bold text-[#2A7A5B] mb-2">
                      ${competitiveMonthlyPayment}
                    </div>
                    <div className="text-sm text-[#2A7A5B]/80">
                      at {prequalificationData.loanRange.rate}% APR
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-emerald-800 font-medium">
                      Save ${monthlySavings.toLocaleString()} monthly
                    </p>
                    <p className="text-sm text-emerald-600">
                      That's ${totalSavings.toLocaleString()} over your 60-month term
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Benefits Grid */}
          <ScrollReveal>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Shield className="h-8 w-8 text-[#2A7A5B]" />,
                  title: "95% Approval Rate",
                  description: "Higher chance of getting approved with our network of lenders"
                },
                {
                  icon: <BadgeCheck className="h-8 w-8 text-[#2A7A5B]" />,
                  title: "Competitive Rates",
                  description: "Starting from just 4.99% APR for qualified buyers"
                },
                {
                  icon: <TrendingUp className="h-8 w-8 text-[#2A7A5B]" />,
                  title: "Credit Building",
                  description: "Improve your credit score with regular payments"
                }
              ].map((benefit) => (
                <div key={benefit.title} className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="mb-4">{benefit.icon}</div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* FAQ Section */}
          <ScrollReveal>
            <div className="bg-white rounded-xl p-4 sm:p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <HelpCircle className="h-6 w-6 text-[#2A7A5B]" />
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Common Questions</h2>
              </div>
              <div className="space-y-6">
                {[
                  {
                    q: "How long is this pre-qualification valid?",
                    a: "Your pre-qualification is valid for 30 days from today. After that, we may need to do a quick re-assessment."
                  },
                  {
                    q: "Will this affect my credit score?",
                    a: "No, this pre-qualification used a soft credit check which doesn't impact your credit score."
                  },
                  {
                    q: "Can I choose any vehicle?",
                    a: "You can choose any vehicle within your approved loan range from our network of certified dealers."
                  },
                  {
                    q: "What happens next?",
                    a: "Create your account to track your application, then schedule your consultation to review your options, choose your vehicle, and complete the final approval process."
                  }
                ].map((item) => (
                  <div key={item.q}>
                    <h3 className="font-medium text-gray-900 mb-2">{item.q}</h3>
                    <p className="text-gray-600">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default QualificationResults;