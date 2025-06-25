import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUserRole } from '../hooks/useUserRole';
import toast from 'react-hot-toast';
import type { UserRole } from '../hooks/useUserRole';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [] 
}) => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserRole();

  // Show a more detailed loading state
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent mb-4" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If allowedRoles is empty, allow any authenticated user
  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has one of the allowed roles
  if (role && allowedRoles.includes(role)) {
    console.log(`User has allowed role: ${role}`);
    return <>{children}</>;
  }

  // Log the unauthorized access attempt
  console.log(`Unauthorized access attempt: User with role ${role} tried to access a route restricted to ${allowedRoles.join(', ')}`);
  toast.error(`You don't have permission to access this page`);

  // Redirect based on role if not authorized
  if (role === 'super_admin') {
    return <Navigate to="/admin" replace />;
  } else if (role === 'dealer') {
    return <Navigate to="/dealer" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
};

export default ProtectedRoute;