import React, { useLayoutEffect, useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import Calculator from './pages/Calculator';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import GetApproved from './pages/GetApproved';
import GetPrequalified from './pages/GetPrequalified';
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
import HelpCenter from './pages/HelpCenter';
import AdminDashboard from './pages/admin/Dashboard';
import AdminApplications from './pages/admin/Applications';
import AdminUsers from './pages/admin/Users';
import AdminSettings from './pages/admin/Settings';
import DealerDashboard from './pages/dealer/Dashboard';
import ApplicationView from './pages/admin/ApplicationView';
import AdminLayout from './components/admin/AdminLayout';
import { MobileNavBar } from './components/MobileNavBar'; // Import MobileNavBar

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
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [activeDashboardSection, setActiveDashboardSection] = useState('overview'); // New state for dashboard sections

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [location.pathname]);

  const handleMobileNav = (section: string) => {
    setActiveDashboardSection(section);
    // Optionally navigate to dashboard if not already there
    if (location.pathname !== '/dashboard') {
      // This might need more sophisticated handling if sections are truly separate routes
      // For now, assuming sections are within the dashboard page
      // navigate('/dashboard'); 
    }
  };

  // Check if we should show the footer (hide on dashboard and admin pages)
  const shouldShowFooter = !location.pathname.startsWith('/admin') && location.pathname !== '/dashboard';

  return (
    <div className="min-h-screen bg-secondary-50 text-gray-900 font-sans">
      {!location.pathname.startsWith('/admin') && <Navbar />}
      <main className={location.pathname.startsWith('/admin') ? '' : 'pt-16 md:pt-24 pb-16 sm:pb-0'}> {/* Add pb-16 for mobile nav bar */}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/get-approved" element={<Navigate to="/get-prequalified" replace />} />
            <Route path="/get-prequalified" element={<GetPrequalified />} />
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
                  <Dashboard activeSection={activeDashboardSection} setActiveSection={setActiveDashboardSection} /> {/* Pass activeSection state */}
                </PrivateRoute>
              }
            />
            <Route
              path="/help"
              element={
                <Navigate to="/dashboard" state={{ section: 'help' }} replace />
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/applications"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminLayout>
                    <AdminApplications />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/applications/:id"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminLayout>
                    <ApplicationView />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminLayout>
                    <AdminUsers />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminLayout>
                    <AdminSettings />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            {/* Dealer Routes */}
            <Route
              path="/dealer"
              element={
                <ProtectedRoute allowedRoles={['dealer', 'super_admin']}>
                  <DealerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dealer/applications/:id"
              element={
                <ProtectedRoute allowedRoles={['dealer', 'super_admin']}>
                  <ApplicationView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dealer/applications/new"
              element={
                <ProtectedRoute allowedRoles={['dealer', 'super_admin']}>
                  <div>New Application Form</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/apply/:dealerSlug"
              element={<div>Public Application Form</div>}
            />
          </Routes>
        </AnimatePresence>
      </main>
      {shouldShowFooter && <Footer />}
      {!location.pathname.startsWith('/admin') && user && location.pathname === '/dashboard' && (
        <MobileNavBar onNavigate={handleMobileNav} activeSection={activeDashboardSection} />
      )}
      <Toaster position="top-right" />
    </div>
  );
};

export default App;