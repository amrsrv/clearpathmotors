// pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

const FORM_STORAGE_KEY = 'clearpath_prequalification_form_data';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signIn, authChecked } = useAuth();

  const [formData, setFormData] = useState({
    email: location.state?.email || new URLSearchParams(location.search).get('email') || '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasSavedFormData, setHasSavedFormData] = useState(false);

  const returnUrl = new URLSearchParams(location.search).get('returnUrl') || location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    const savedFormData = sessionStorage.getItem(FORM_STORAGE_KEY);
    if (savedFormData) setHasSavedFormData(true);
  }, []);

  useEffect(() => {
    if (user && authChecked) {
      if (hasSavedFormData && returnUrl.includes('/get-prequalified')) {
        navigate('/get-prequalified');
      } else {
        navigate(returnUrl);
      }
    }
  }, [user, authChecked, navigate, returnUrl, hasSavedFormData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const { error: signInError } = await signIn(formData.email, formData.password);
      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-[#3BAA75] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication status...</p>
        </motion.div>
      </div>
    );
  }

  if (user && authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-[#3BAA75] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">You're already signed in. Redirecting...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Sign in to Clearpath Motors</h2>

        {hasSavedFormData && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm">You have saved form data. Sign in to continue.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg mb-4">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Email</label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                required
                className="w-full pl-10 py-2 border rounded-md"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label>Password</label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                className="w-full pl-10 pr-10 py-2 border rounded-md"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="animate-spin h-5 w-5" /> Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign In <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </form>

        <div className="my-6 text-center">
          <span className="text-gray-400 text-sm">or</span>
        </div>

        <GoogleSignInButton redirectTo={returnUrl} />

        <p className="text-center text-sm mt-6">
          Don’t have an account?{' '}
          <Link to="/signup" className="text-green-600 hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;