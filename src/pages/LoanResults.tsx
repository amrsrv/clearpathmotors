import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, CheckCircle, Shield, BadgeCheck, TrendingUp, FileText, Car, DollarSign, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import { PreQualifiedBadge } from '../components/PreQualifiedBadge';
import { LoanRangeBar } from '../components/LoanRangeBar';
import { ScrollReveal } from '../components/ScrollReveal';
import { useAuth } from '../context/AuthContext';

interface LoanResultsProps {}

const LoanResults: React.FC<LoanResultsProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { loanRange, vehicleType, monthlyBudget, applicationId } = location.state || {}; 

  useEffect(() => {
    // Redirect if no loan data is available or user is not authenticated
    if (!loanRange || !user) {
      navigate('/get-prequalified');
      return;
    }
  }, [loanRange, user, navigate]);

  // Calculate monthly payments based on loan amount and rate
  const calculateMonthlyPayment = (amount: number, rate: number, term: number = 60) => { 
    const monthlyRate = rate / 1200;
    return Math.round(
      (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
      (Math.pow(1 + monthlyRate, term) - 1)
    );
  };

  const standardMonthlyPayment = calculateMonthlyPayment(loanRange?.min, loanRange?.rate_max + 3);
  const competitiveMonthlyPayment = calculateMonthlyPayment(loanRange?.min, loanRange?.rate_min);
  const monthlySavings = standardMonthlyPayment - competitiveMonthlyPayment; 
  const totalSavings = monthlySavings * 60; // Based on 60-month term

  // If no loan data is available, show loading state
  if (!loanRange) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3BAA75]/5 via-white to-[#3BAA75]/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3BAA75] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your qualification results...</p>
        </div>
      </div>
    );
  }

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
          <div className="text-sm text-gray-600 mt-1">
            at {loanRange.rate_min}% - {loanRange.rate_max}% APR
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {loanRange.term_min} - {loanRange.term_max} month terms
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
                  rate_min={loanRange.rate_min}
                  rate_max={loanRange.rate_max}
                />
              </div>
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
                      at {(loanRange.rate_max + 3).toFixed(2)}% APR
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
                      at {loanRange.rate_min}% APR
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
                      That's ${totalSavings.toLocaleString()} over your {loanRange.term_max}-month term
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
                    a: "Your account has been created! You can now access your dashboard to track your application, upload required documents, and complete the final approval process."
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

          {/* Go to Dashboard CTA */}
          <ScrollReveal>
            <div className="bg-white rounded-xl p-6 shadow-lg text-center">
              <h2 className="text-xl font-semibold mb-4">Ready to Continue?</h2>
              <p className="text-gray-600 mb-6">
                Go to your dashboard to track your application status, upload required documents, and complete the next steps.
              </p>
              <Link
                to="/dashboard"
                className="inline-block bg-[#3BAA75] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2D8259] transition-colors"
              >
                Go to My Dashboard
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};

export default LoanResults;