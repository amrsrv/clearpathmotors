/*
  # Fix Document Deletion Permissions

  1. Changes
    - Add explicit RLS policy for users to delete their own documents
    - Fix document management permissions
    - Ensure proper cascading deletion for document-related records
  
  2. Security
    - Maintain existing security model
    - Add missing DELETE permission for users
*/

-- Enable RLS on documents table (in case it's not already enabled)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;

-- Create policy for users to delete their own documents
CREATE POLICY "Users can delete own documents"
ON documents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = documents.application_id
    AND applications.user_id = auth.uid()
  )
);

-- Create policy for users to update their own documents
CREATE POLICY "Users can update own documents"
ON documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = documents.application_id
    AND applications.user_id = auth.uid()
  )
);

-- Create function to log document deletions
CREATE OR REPLACE FUNCTION log_document_deletion()
RETURNS TRIGGER AS $$
DECLARE
  is_admin boolean;
  log_details jsonb;
  application_id uuid;
BEGIN
  -- Get application_id
  application_id := OLD.application_id;

  -- Check if the current user is an admin
  SELECT (raw_app_meta_data->>'is_admin')::boolean INTO is_admin
  FROM auth.users
  WHERE id = auth.uid();

  -- Create log details
  log_details := jsonb_build_object(
    'document_id', OLD.id,
    'category', OLD.category,
    'filename', OLD.filename,
    'application_id', application_id
  );

  -- Insert activity log
  INSERT INTO activity_log (
    application_id,
    user_id,
    action,
    details,
    is_admin_action,
    is_visible_to_user
  ) VALUES (
    application_id,
    auth.uid(),
    'delete_document',
    log_details,
    is_admin,
    true -- Document deletions are always visible to users
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for document deletions
DROP TRIGGER IF EXISTS log_document_delete ON documents;
CREATE TRIGGER log_document_delete
  AFTER DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_deletion();