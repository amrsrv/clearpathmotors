import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

const CreateAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp } = useAuth();
  const { applicationId, tempUserId, formData } = location.state || {};
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if no application data
  useEffect(() => {
    if (!applicationId || !tempUserId || !formData) {
      navigate('/get-prequalified');
    }
  }, [applicationId, tempUserId, formData, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailExists(false);
    setLoading(true);

    try {
      // Validate passwords
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Sign up with Supabase Auth
      const { data, error: signUpError } = await signUp(formData.email, password);
      
      if (signUpError) {
        if (signUpError.message === 'User already registered' || 
            signUpError.message.includes('user_already_exists') ||
            signUpError.status === 400) {
          setEmailExists(true);
          setError('An account with this email already exists. Please sign in instead.');
          setLoading(false);
          return;
        }
        throw signUpError;
      }

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

        if (updateError) throw updateError;

        setSuccess(true);
        setTimeout(() => {
          navigate('/login', {
            state: { email: formData.email }
          });
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error creating account:', error);
      setError(error.message || 'An error occurred while creating your account');
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
                <CheckCircle className="h-12 w-12 text-[#3BAA75]" />
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/">
          <img
            src="https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//clearpathlogo.png"
            alt="Clearpath Motors Logo"
            className="mx-auto h-16"
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Claim This Loan 
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Set your password to continue
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
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
                  value={formData?.email || ''}
                  disabled
                  className="pl-10 block w-full rounded-lg border-gray-300 bg-gray-50 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75] disabled:opacity-75"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  placeholder="••••••••"
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
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

            <div className="text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link
                to="/login"
                className="font-medium text-[#3BAA75] hover:text-[#2D8259]"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;