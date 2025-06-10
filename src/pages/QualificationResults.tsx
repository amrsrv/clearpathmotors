import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, CheckCircle, Shield, BadgeCheck, TrendingUp, FileText, Car, DollarSign, Clock, AlertCircle, HelpCircle, User, Mail, Phone } from 'lucide-react';
import { PreQualifiedBadge } from '../components/PreQualifiedBadge';
import { LoanRangeBar } from '../components/LoanRangeBar';
import { ScrollReveal } from '../components/ScrollReveal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

const QualificationResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loanRange, vehicleType, monthlyBudget, originalFormData, applicationId, tempUserId } = location.state || {};

  useEffect(() => {
    const checkAccess = async () => {
      if (!location.state?.fromApproval) {
        navigate('/get-approved');
        return;
      }

      if (!applicationId) {
        navigate('/get-approved');
        return;
      }

      try {
        // Fetch the application
        const { data: application, error } = await supabase
          .from('applications')
          .select('*')
          .eq('id', applicationId)
          .single();

        if (error) throw error;

        // If no application found, redirect
        if (!application) {
          navigate('/get-approved');
          return;
        }

        // Check access permissions
        if (user) {
          // For authenticated users, check if they own the application
          if (application.user_id !== user.id && !user.app_metadata?.is_admin) {
            navigate('/dashboard');
            return;
          }
        } else {
          // For unauthenticated users, check temp_user_id
          if (application.temp_user_id !== tempUserId) {
            navigate('/get-approved');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking access:', error);
        navigate('/get-approved');
      }
    };

    checkAccess();
  }, [applicationId, tempUserId, user, navigate, location.state]);

  // Calculate monthly payments based on loan amount and rate
  const calculateMonthlyPayment = (amount: number, rate: number, term: number = 60) => {
    const monthlyRate = rate / 1200;
    return Math.round(
      (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
      (Math.pow(1 + monthlyRate, term) - 1)
    );
  };

  const standardMonthlyPayment = calculateMonthlyPayment(loanRange.min, loanRange.rate + 3);
  const competitiveMonthlyPayment = calculateMonthlyPayment(loanRange.min, loanRange.rate);
  const monthlySavings = standardMonthlyPayment - competitiveMonthlyPayment;
  const totalSavings = monthlySavings * 60; // Based on 60-month term

  const handleSignUp = () => {
    navigate('/signup', {
      state: {
        formData: originalFormData,
        applicationId,
        tempUserId
      }
    });
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
            ${loanRange.min.toLocaleString()} - ${loanRange.max.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">
            at {loanRange.rate}% APR
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
                  Based on your desired monthly payment of ${monthlyBudget}, we've calculated a loan range that fits your budget 
                  while maintaining comfortable monthly payments. This estimate reflects what you're most likely to be approved 
                  for with a 95% chance of approval.
                </p>
              </div>
              
              <div className="mt-8">
                <LoanRangeBar
                  min={loanRange.min}
                  max={loanRange.max}
                  rate={loanRange.rate}
                />
              </div>
            </div>
          </ScrollReveal>

          {/* Monthly Payment Comparison */}
          <ScrollReveal>
            <div className="bg-white rounded-xl p-4 sm:p-8 shadow-lg">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-900">Monthly Payment Comparison</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Other Lenders</h3>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      ${standardMonthlyPayment}
                    </div>
                    <div className="text-sm text-gray-600">
                      at {(loanRange.rate + 3).toFixed(2)}% APR
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
                      at {loanRange.rate}% APR
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

          {/* Sign Up CTA */}
          <ScrollReveal>
            <div className="bg-gradient-to-br from-[#2A7A5B] to-[#1F5F3F] rounded-xl p-4 sm:p-8 text-white shadow-xl">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-6">Create Your Account</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 rounded-full p-2">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Personal Dashboard</p>
                        <p className="text-sm text-white/80">Track your application progress</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 rounded-full p-2">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Instant Updates</p>
                        <p className="text-sm text-white/80">Get notified about your application status</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 rounded-full p-2">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Direct Support</p>
                        <p className="text-sm text-white/80">Access to our dedicated support team</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <motion.button
                    onClick={handleSignUp}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-white text-[#2A7A5B] px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    Create Account
                    <ArrowRight className="h-5 w-5" />
                  </motion.button>
                  <p className="mt-4 text-sm text-white/80">
                    Already have an account?{' '}
                    <Link to="/login" className="text-white hover:text-white/90 underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* CTA Section */}
          <ScrollReveal>
            <div className="bg-white rounded-xl p-4 sm:p-8 text-center shadow-lg">
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-gray-900">Ready to Move Forward?</h2>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                Schedule your free consultation with our financing expert to discuss your options and get all your questions answered.
              </p>
              
              <a
                href="https://calendly.com/clearpath/consultation"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-[#2A7A5B] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#15402F] transition-colors group gap-2 shadow-md hover:shadow-xl"
              >
                <Calendar className="w-5 h-5" />
                Schedule Your Consultation
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              
              <div className="mt-6 text-gray-600">
                <p className="font-medium">What to expect:</p>
                <ul className="text-sm mt-2 space-y-1">
                  <li>• 30-minute free consultation</li>
                  <li>• Detailed review of your options</li>
                  <li>• No obligation to proceed</li>
                  <li>• Get all your questions answered</li>
                </ul>
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
                    a: "Schedule your consultation to review your options, choose your vehicle, and complete the final approval process."
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