import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUserRole } from '../hooks/useUserRole';
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

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If allowedRoles is empty, allow any authenticated user
  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has one of the allowed roles
  if (role && allowedRoles.includes(role)) {
    return <>{children}</>;
  }

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