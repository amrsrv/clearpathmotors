import React, { useLayoutEffect, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import Calculator from './pages/Calculator';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import GetApproved from './pages/GetApproved';
import Blog from './pages/Blog';
import QualificationResults from './pages/QualificationResults';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CreateAccount from './pages/CreateAccount';
import ResetPassword from './pages/ResetPassword';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard';
import AuthCallback from './pages/AuthCallback';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/admin/Dashboard';
import AdminApplications from './pages/admin/Applications';
import AdminUsers from './pages/admin/Users';
import AdminSettings from './pages/admin/Settings';
import ApplicationView from './pages/admin/ApplicationView';
import AdminLayout from './components/admin/AdminLayout';

declare global {
  interface Window {
    fbq: any;
  }
}

interface PrivateRouteProps {
  children: React.ReactNode;
  requiresAdmin?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiresAdmin }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check for admin role if required
  if (requiresAdmin && !user.app_metadata?.is_admin) {
    return <Navigate to="/dashboard\" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const location = useLocation();
  const { user } = useAuth();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-secondary-50 text-gray-900 font-sans">
      {!location.pathname.startsWith('/admin') && <Navbar />}
      <main className={location.pathname.startsWith('/admin') ? '' : 'pt-16 md:pt-24'}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/get-approved" element={<GetApproved />} />
            <Route path="/create-account" element={<CreateAccount />} />
            <Route path="/qualification-results" element={<QualificationResults />} />
            <Route path="/blog/:slug" element={<Blog />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute requiresAdmin>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/applications"
              element={
                <PrivateRoute requiresAdmin>
                  <AdminLayout>
                    <AdminApplications />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/applications/:id"
              element={
                <PrivateRoute requiresAdmin>
                  <AdminLayout>
                    <ApplicationView />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <PrivateRoute requiresAdmin>
                  <AdminLayout>
                    <AdminUsers />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <PrivateRoute requiresAdmin>
                  <AdminLayout>
                    <AdminSettings />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
          </Routes>
        </AnimatePresence>
      </main>
      {!location.pathname.startsWith('/admin') && <Footer />}
    </div>
  );
};

export default App;