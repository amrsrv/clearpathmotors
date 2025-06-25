import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

export type UserRole = 'super_admin' | 'dealer' | 'customer' | null;

export const useUserRole = () => {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to update user role via Edge Function
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            targetUserId: userId,
            newRole,
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user role');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  // Function to ensure user has a valid role
  const ensureUserRole = async (user: any) => {
    if (!user) return;
    
    try {
      // Check if user has a valid role
      const userRole = user.app_metadata?.role as UserRole;
      
      if (!userRole || !['super_admin', 'dealer', 'customer'].includes(userRole)) {
        console.log('User has no valid role, setting default role: customer');
        
        // First try to update role using client-side method
        try {
          const { error } = await supabase.auth.updateUser({
            data: { role: 'customer' }
          });
          
          if (error) throw error;
          
          // Refresh session to get updated metadata
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Session refresh failed');
          
          setRole('customer');
        } catch (clientError) {
          console.error('Client-side role update failed, trying Edge Function:', clientError);
          
          // If client-side update fails, try using the Edge Function
          await updateUserRole(user.id, 'customer');
          
          // Refresh session to get updated metadata
          await supabase.auth.refreshSession();
          const { data: { user: refreshedUser } } = await supabase.auth.getUser();
          
          if (refreshedUser?.app_metadata?.role) {
            setRole(refreshedUser.app_metadata.role as UserRole);
          } else {
            setRole('customer'); // Default fallback
          }
        }
      } else {
        setRole(userRole);
      }
    } catch (error) {
      console.error('Error ensuring user role:', error);
      toast.error('Error setting user role. Some features may be limited.');
      setRole('customer'); // Default fallback
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setRole(null);
        setIsLoading(false);
      } else {
        // Check if user has a valid role
        const userRole = user.app_metadata?.role as UserRole;
        
        if (!userRole || !['super_admin', 'dealer', 'customer'].includes(userRole)) {
          // User has no valid role, ensure they get one
          ensureUserRole(user)
            .finally(() => setIsLoading(false));
        } else {
          // User already has a valid role
          setRole(userRole);
          setIsLoading(false);
        }
      }
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
    isLoading,
    updateUserRole
  };
};