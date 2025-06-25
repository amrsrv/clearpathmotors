import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export type UserRole = 'super_admin' | 'dealer' | 'customer' | null;

export const useUserRole = () => {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setRole(null);
      } else {
        // Get role from app_metadata
        const userRole = user.app_metadata?.role as UserRole;
        setRole(userRole || 'customer'); // Default to customer if no role is set
      }
      setIsLoading(false);
    }
  }, [user, loading]);

  const isSuperAdmin = role === 'super_admin';
  const isDealer = role === 'dealer';
  const isCustomer = role === 'customer';

  return {
    role,
    isSuperAdmin,
    isDealer,
    isCustomer,
    isLoading
  };
};