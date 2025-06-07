import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Document } from '../types/database';
import toast from 'react-hot-toast';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Constants for validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/heic'];

// Constants for retry configuration
const UPLOAD_CONSISTENCY_DELAY = 1000; // 1 second delay after upload
const MAX_URL_RETRIES = 5; // Increased from 3 to 5 retries
const INITIAL_RETRY_DELAY = 1000; // Start with 1 second delay

export const useDocumentUpload = (applicationId: string) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPG, PNG, PDF, or HEIC file.';
    }

    // Validate file size (10MB max)
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.';
    }

    return null;
  };

  const uploadDocument = async (file: File, category: string): Promise<Document | null> => {
    try {
      // Validate file before starting upload
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      setUploading(true);
      setError(null);

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      // Get file extension and create unique filename
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const timestamp = Date.now();
      const filename = `${user.id}/${category}_${timestamp}.${extension}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Add delay after successful upload to account for eventual consistency
      await sleep(UPLOAD_CONSISTENCY_DELAY);

      // Verify the file was uploaded successfully by attempting to get its URL
      const url = await getFileUrl(filename);
      if (!url) {
        throw new Error('Failed to verify file upload. Please try again.');
      }

      // Create document record only after verifying the file is accessible
      const { data: document, error: documentError } = await supabase
        .from('documents')
        .insert({
          application_id: applicationId,
          category,
          filename: filename,
          status: 'pending'
        })
        .select()
        .single();

      if (documentError) throw documentError;

      return document;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setError(error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      setError(null);

      // Get the document details first
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('filename, application_id')
        .eq('id', documentId)
        .single();

      if (fetchError) {
        console.error('Error fetching document details:', fetchError);
        throw new Error('Could not find document details. Please try again.');
      }

      if (!document) {
        throw new Error('Document not found');
      }

      // Verify the user has permission to delete this document
      const { data: application, error: appError } = await supabase
        .from('applications')
        .select('user_id')
        .eq('id', document.application_id)
        .single();

      if (appError) {
        console.error('Error verifying application ownership:', appError);
        throw new Error('Could not verify document ownership. Please try again.');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting current user:', userError);
        throw new Error('Authentication error. Please sign in again.');
      }

      if (!user) {
        throw new Error('You must be signed in to delete documents');
      }

      // Check if user is admin
      const isAdmin = user.app_metadata?.is_admin === true;

      // Verify ownership or admin status
      if (!isAdmin && application.user_id !== user.id) {
        throw new Error('You do not have permission to delete this document');
      }

      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('user-documents')
        .remove([document.filename]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
        // We'll log the error but not throw, as the database record is more important
        console.warn('Storage deletion failed, but proceeding with database record deletion');
      }

      // Delete the document record
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
        console.error('Error deleting document record:', deleteError);
        throw new Error('Failed to delete document record. Please try again.');
      }
      
      return true;
    } catch (error: any) {
      console.error('Error in deleteDocument:', error);
      setError(error.message);
      throw error; // Re-throw to allow the component to handle it
    }
  };

  const getFileUrl = async (filename: string, retries = MAX_URL_RETRIES): Promise<string | null> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Add exponential backoff delay between retries
        if (attempt > 0) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          await sleep(delay);
        }

        const { data, error } = await supabase.storage
          .from('user-documents')
          .createSignedUrl(filename, 3600); // 1 hour expiry

        if (error) throw error;
        if (data?.signedUrl) return data.signedUrl;
      } catch (error) {
        console.warn(`Attempt ${attempt + 1}/${retries} failed to get file URL:`, error);
        if (attempt === retries - 1) {
          console.error('Failed to get file URL after all retries:', error);
          return null;
        }
      }
    }
    return null;
  };

  const listUserDocuments = async (): Promise<string[]> => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      const { data, error } = await supabase.storage
        .from('user-documents')
        .list(user.id);

      if (error) throw error;
      return data.map(file => `${user.id}/${file.name}`);
    } catch (error) {
      console.error('Error listing documents:', error);
      return [];
    }
  };

  return {
    uploadDocument,
    deleteDocument,
    getFileUrl,
    listUserDocuments,
    uploading,
    error
  };
};