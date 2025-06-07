import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, DollarSign, CreditCard, Briefcase, Calculator, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp } = useAuth();
  const { formData: prefillData, applicationId, tempUserId } = location.state || {};
  
  const [formData, setFormData] = useState({
    firstName: prefillData?.firstName || '',
    lastName: prefillData?.lastName || '',
    email: prefillData?.email || '',
    phone: prefillData?.phone || '',
    employmentStatus: prefillData?.employmentStatus || '',
    annualIncome: prefillData?.annualIncome || '',
    creditScore: prefillData?.creditScore || '',
    desiredMonthlyPayment: prefillData?.desiredMonthlyPayment || '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
    setEmailExists(false);
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName) return 'Full name is required';
    if (!formData.email) return 'Email is required';
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      return 'Invalid email address';
    }
    if (!formData.phone) return 'Phone number is required';
    if (!/^\+?1?\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
      return 'Invalid phone number';
    }
    if (!formData.employmentStatus) return 'Employment status is required';
    if (!formData.annualIncome) return 'Annual income is required';
    if (!formData.creditScore) return 'Credit score is required';
    if (!formData.desiredMonthlyPayment) return 'Desired monthly payment is required';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await signUp(formData.email, formData.password);
      
      if (signUpError) {
        if (signUpError.message === 'User already registered' || 
            signUpError.message.includes('user_already_exists')) {
          setEmailExists(true);
          setError('An account with this email already exists. Please sign in instead.');
          setLoading(false);
          return;
        }
        throw signUpError;
      }

      if (data?.user) {
        // If we have an applicationId and tempUserId, update the application
        if (applicationId && tempUserId) {
          const { error: updateError } = await supabase
            .from('applications')
            .update({
              user_id: data.user.id,
              temp_user_id: null
            })
            .eq('id', applicationId)
            .eq('temp_user_id', tempUserId);

          if (updateError) throw updateError;
        } else {
          // Create new application if no existing one
          const { error: applicationError } = await supabase
            .from('applications')
            .insert({
              user_id: data.user.id,
              first_name: formData.firstName,
              last_name: formData.lastName,
              email: formData.email,
              phone: formData.phone,
              employment_status: formData.employmentStatus,
              annual_income: parseFloat(formData.annualIncome),
              credit_score: formData.creditScore,
              desired_monthly_payment: parseFloat(formData.desiredMonthlyPayment),
              status: 'submitted',
              current_stage: 1
            });

          if (applicationError) throw applicationError;
        }

        setSuccess(true);
        setTimeout(() => {
          navigate('/login', {
            state: { email: formData.email }
          });
        }, 3000);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-4 flex justify-center">
                <div className="h-12 w-12 text-[#3BAA75]">✓</div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Account Created Successfully
              </h2>
              <p className="text-gray-600 mb-6">
                Please check your email to verify your account. You will be redirected to the login page.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <Link to="/">
          <img
            src="https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//clearpathlogo.png"
            alt="Clearpath Motors Logo"
            className="mx-auto h-16"
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-[#3BAA75] hover:text-[#2D8259]"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 ${emailExists ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50'} p-3 rounded-lg`}
              >
                <AlertCircle className="h-5 w-5" />
                <div className="text-sm">
                  {error}
                  {emailExists && (
                    <span className="ml-1">
                      <Link to="/login" className="underline font-medium">
                        Click here to sign in
                      </Link>
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                    required
                    minLength={8}
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#3BAA75] hover:bg-[#2D8259] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3BAA75] disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <GoogleSignInButton />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;