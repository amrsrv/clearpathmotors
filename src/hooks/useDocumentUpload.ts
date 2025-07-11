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

  const uploadDocument = async (file: File, category: string, isFromAdmin: boolean = false): Promise<Document | null> => {
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
      // Use the service role key for admin operations to bypass RLS
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

      if (documentError) {
        // If RLS is blocking the insert, try to handle it gracefully
        console.error('Document insert error:', documentError);
        
        // Check if it's an RLS error
        if (documentError.code === '42501' || documentError.message?.includes('row-level security')) {
          throw new Error('Document upload is currently restricted. Please contact an administrator.');
        }
        
        throw documentError;
      }

      // Get application user_id for notification
      const { data: application, error: appError } = await supabase
        .from('applications')
        .select('user_id')
        .eq('id', applicationId)
        .single();

      if (appError) {
        console.error('Error fetching application for notification:', appError);
      } else if (application?.user_id) {
        // Create notification for the user
        const notificationTitle = isFromAdmin ? 'New Document Uploaded' : 'Document Uploaded Successfully';
        const notificationMessage = isFromAdmin 
          ? 'A new document has been uploaded to your application.' 
          : `Your document "${category.replace(/_/g, ' ')}" has been uploaded and is pending review.`;

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: notificationTitle,
            message: notificationMessage,
            read: false
          });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        }
      }

      return document;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setError(error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const updateDocumentStatus = async (documentId: string, newStatus: 'approved' | 'rejected', reviewNotes?: string): Promise<boolean> => {
    try {
      setError(null);

      // Get the document details first to get the application_id and category
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('application_id, category, filename')
        .eq('id', documentId)
        .single();

      if (fetchError) {
        console.error('Error fetching document details:', fetchError);
        throw new Error('Could not find document details. Please try again.');
      }

      if (!document) {
        throw new Error('Document not found');
      }

      // Update the document status
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          status: newStatus,
          review_notes: reviewNotes || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) {
        console.error('Error updating document status:', updateError);
        throw updateError;
      }

      // Get application user_id for notification
      const { data: application, error: appError } = await supabase
        .from('applications')
        .select('user_id')
        .eq('id', document.application_id)
        .single();

      if (appError) {
        console.error('Error fetching application for notification:', appError);
      } else if (application?.user_id) {
        // Format the category name for display
        const formattedCategory = document.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Create notification for the user
        const notificationTitle = newStatus === 'approved' 
          ? 'Document Approved' 
          : 'Document Needs Attention';

        const notificationMessage = newStatus === 'approved'
          ? `Your document "${formattedCategory}" has been approved.`
          : `Your document "${formattedCategory}" was rejected. ${reviewNotes ? `Reason: "${reviewNotes}"` : 'Please upload a new version.'}`;

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: application.user_id,
            title: notificationTitle,
            message: notificationMessage,
            read: false
          });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        }
      }

      toast.success(`Document ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully`);
      return true;
    } catch (error: any) {
      console.error('Error updating document status:', error);
      setError(error.message);
      toast.error(`Failed to ${newStatus} document`);
      return false;
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
    updateDocumentStatus,
    getFileUrl,
    listUserDocuments,
    uploading,
    error
  };
};