import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';
import toast from 'react-hot-toast';

// Constants for validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

export const useVehicleImageUpload = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPG, PNG, or WebP image.';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 5MB.';
    }
    
    return null;
  };

  const uploadVehicleImage = async (file: File, vehicleId: string): Promise<string | null> => {
    if (!user) {
      setError('You must be logged in to upload images');
      return null;
    }

    if (role !== 'dealer' && role !== 'super_admin') {
      setError('Only dealers and admins can upload vehicle images');
      return null;
    }

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return null;
    }

    try {
      setUploading(true);
      setError(null);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      // Path includes dealer_id (or user_id for super_admin) to enforce RLS
      const filePath = `${user.id}/${vehicleId}/${fileName}`;
      
      // Upload to vehicle-photos bucket
      const { data, error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data: urlData } = await supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(filePath);
        
      return urlData?.publicUrl || null;
    } catch (error: any) {
      console.error('Error uploading vehicle image:', error);
      setError(error.message || 'Failed to upload image');
      toast.error('Failed to upload vehicle image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteVehicleImage = async (filePath: string): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to delete images');
      return false;
    }

    if (role !== 'dealer' && role !== 'super_admin') {
      setError('Only dealers and admins can delete vehicle images');
      return false;
    }

    try {
      setUploading(true);
      setError(null);
      
      // Ensure the path starts with the user's ID to enforce RLS
      if (!filePath.startsWith(`${user.id}/`)) {
        throw new Error('You do not have permission to delete this image');
      }
      
      const { error: deleteError } = await supabase.storage
        .from('vehicle-photos')
        .remove([filePath]);
        
      if (deleteError) {
        throw deleteError;
      }
      
      return true;
    } catch (error: any) {
      console.error('Error deleting vehicle image:', error);
      setError(error.message || 'Failed to delete image');
      toast.error('Failed to delete vehicle image');
      return false;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadVehicleImage,
    deleteVehicleImage,
    uploading,
    error
  };
};