import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { verifyAuth } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status on load
  useEffect(() => {
    const checkAuth = async () => {
      console.log('Login: Checking authentication status');
      const { user: currentUser, error } = await verifyAuth();
      
      if (error) {
        console.error('Login: Error verifying auth:', error);
      }
      
      setAuthChecked(true);
      
      // If user is logged in, redirect
      if (currentUser) {
        console.log('Login: User already logged in, redirecting');
        redirectBasedOnRole(currentUser);
      }
    };
    
    checkAuth();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    console.log('Login: Component mounted, user =', user ? {
      id: user.id,
      email: user.email,
      app_metadata: user.app_metadata
    } : 'null', 'loading =', loading, 'authChecked =', authChecked);
    
    if (user && !loading && authChecked) {
      redirectBasedOnRole(user);
    }
  }, [user, loading, authChecked]);

  const redirectBasedOnRole = (user) => {
    console.log('Login: Redirecting based on role:', user?.app_metadata?.role);
    
    // Redirect based on user role
    const role = user.app_metadata?.role;
    if (role === 'super_admin') {
      navigate('/admin');
    } else if (role === 'dealer') {
      navigate('/dealer');
    } else {
      // Get the intended destination, or default to dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    console.log('Login: Form submitted with email:', formData.email);

    try {
      const { error: signInError } = await signIn(formData.email, formData.password);
      
      if (signInError) {
        console.error('Login: Error during sign in:', signInError);
        throw signInError;
      }

      // Navigation will be handled by the useEffect hook when user state updates
      console.log('Login: Sign in successful, waiting for redirect');
    } catch (error: any) {
      console.error('Login: Error handling sign in result:', error);
      setError(error.message || 'An error occurred while signing in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading && !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent mb-4" />
          <p className="text-gray-600">Checking authentication status...</p>
        </motion.div>
      </div>
    );
  }

  // Don't render the login form if already logged in and we've checked auth status
  if (user && authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent mb-4" />
          <p className="text-gray-600">You're already signed in. Redirecting...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Column - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="absolute inset-0 animated-gradient opacity-30" />
        <div className="absolute inset-0 animated-dots opacity-20" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6">
              <img 
                src="https://xndiuangipdcwmyacalj.supabase.co/storage/v1/object/public/marketingmedia//clearpathlogo.png" 
                alt="Clearpath Motors Logo" 
                className="h-16 mx-auto"
              />
            </Link>
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-gray-600">
              Sign in to access your account
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg mb-6"
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-[#3BAA75] transition-all duration-200 sm:text-sm bg-white/50 backdrop-blur-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  to="/reset-password"
                  className="text-sm font-medium text-[#3BAA75] hover:text-[#2D8259] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#3BAA75] transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#3BAA75] focus:border-[#3BAA75] transition-all duration-200 sm:text-sm bg-white/50 backdrop-blur-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
            >
              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full flex items-center justify-center py-3 px-4 rounded-lg text-white bg-gradient-to-r from-[#3BAA75] to-[#2D8259] hover:from-[#2D8259] hover:to-[#1F5F3F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3BAA75] disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden shadow-lg hover:shadow-xl"
              >
                <span className="relative z-10 flex items-center font-medium">
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className={`ml-2 h-5 w-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                    </>
                  )}
                </span>
                {isHovered && (
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    style={{ filter: "blur(8px)" }}
                  />
                )}
              </button>
            </motion.div>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <GoogleSignInButton redirectTo={location.state?.from?.pathname} />
            </div>

            <p className="mt-8 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-[#3BAA75] hover:text-[#2D8259] transition-colors"
              >
                Sign up
              </Link>
            </p>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <div className="space-x-4 text-sm text-gray-600">
              <Link to="/privacy" className="hover:text-[#3BAA75] transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-[#3BAA75] transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-[#3BAA75] transition-colors">Contact</Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Column - Image */}
      <div className="hidden lg:block w-1/2 bg-cover bg-center" style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80)'
      }}>
        <div className="h-full w-full bg-gradient-to-br from-[#3BAA75]/90 to-[#2D8259]/90 backdrop-blur-sm flex items-center justify-center p-12">
          <div className="max-w-md text-white">
            <h2 className="text-4xl font-bold mb-6">Welcome to Clearpath Motors</h2>
            <p className="text-lg mb-8">Your journey to hassle-free auto financing starts here. Get pre-approved in minutes with rates from 4.99%.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span>95% approval rate</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span>No impact on your credit score</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <span>Instant decision</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;