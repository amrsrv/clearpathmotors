import { useState, useEffect, useCallback } from 'react';
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
      console.log('useUserRole: updating role for user', userId, 'to', newRole);
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
      
      console.log('useUserRole: role updated successfully');
      return await response.json();
    } catch (error) {
      console.error('useUserRole: Error updating user role:', error);
      throw error;
    }
  };

  // Function to ensure user has a valid role
  const ensureUserRole = useCallback(async (currentUser: any) => {
    if (!currentUser) return;
    
    try {
      console.log('useUserRole: ensuring user has valid role');
      // Check if user has a valid role
      const userRole = currentUser.app_metadata?.role as UserRole;
      
      if (!userRole || !['super_admin', 'dealer', 'customer'].includes(userRole)) {
        console.log('useUserRole: User has no valid role, setting default role: customer');
        
        // First try to update role using client-side method
        try {
          const { error } = await supabase.auth.updateUser({
            data: { role: 'customer' }
          });
          
          if (error) throw error;
          
          // Don't call refreshUser here - the updateUser will trigger auth state change
          setRole('customer'); // Set role immediately for UI responsiveness
        } catch (clientError) {
          console.error('useUserRole: Client-side role update failed, trying Edge Function:', clientError);
          
          // If client-side update fails, try using the Edge Function
          await updateUserRole(currentUser.id, 'customer');
          
          // Refresh session to get updated metadata
          await supabase.auth.refreshSession();
          // Don't call refreshUser here - the session refresh will trigger auth state change
          setRole('customer'); // Set role immediately for UI responsiveness
        }
      } else {
        console.log('useUserRole: User has valid role:', userRole);
        setRole(userRole);
      }
    } catch (error) {
      console.error('useUserRole: Error ensuring user role:', error);
      toast.error('Error setting user role. Some features may be limited.');
      setRole('customer'); // Default fallback
    }
  }, []);

  useEffect(() => {
    console.log('useUserRole: effect triggered, loading =', loading, 'user =', user ? {
      id: user.id,
      email: user.email,
      app_metadata: user.app_metadata
    } : 'null');
    
    if (!loading) {
      if (!user) {
        console.log('useUserRole: No user, setting role to null');
        setRole(null);
        setIsLoading(false);
      } else {
        // Check if user has a valid role
        const userRole = user.app_metadata?.role as UserRole;
        
        if (!userRole || !['super_admin', 'dealer', 'customer'].includes(userRole)) {
          console.log('useUserRole: User has no valid role, ensuring they get one');
          // User has no valid role, ensure they get one
          ensureUserRole(user)
            .finally(() => {
              console.log('useUserRole: Finished ensuring user role, setting isLoading=false');
              setIsLoading(false);
            });
        } else {
          // User already has a valid role
          console.log('useUserRole: User already has valid role:', userRole);
          setRole(userRole);
          setIsLoading(false);
        }
      }
    }
  }, [user, loading, ensureUserRole]);

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