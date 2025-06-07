/*
  # Fix Admin Permission Checks

  1. Changes
    - Update all RLS policies to use auth.users.raw_app_meta_data for admin checks
    - Remove references to non-existent admin_users table
    - Ensure consistent admin permission checking across all tables
    
  2. Security
    - Maintain proper access control
    - Fix admin permission verification
    - Ensure admin users can properly access and manage all data
*/

-- Drop existing policies that reference admin_users table
DROP POLICY IF EXISTS "Admins can manage all applications" ON applications;
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage all stages" ON application_stages;

-- Create new policies using auth.users.raw_app_meta_data
CREATE POLICY "Admins can manage all applications"
ON applications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND ((auth.users.raw_app_meta_data->>'is_admin')::boolean = true)
  )
);

CREATE POLICY "Admins can manage all documents"
ON documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND ((auth.users.raw_app_meta_data->>'is_admin')::boolean = true)
  )
);

CREATE POLICY "Admins can manage all notifications"
ON notifications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND ((auth.users.raw_app_meta_data->>'is_admin')::boolean = true)
  )
);

CREATE POLICY "Admins can manage all stages"
ON application_stages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND ((auth.users.raw_app_meta_data->>'is_admin')::boolean = true)
  )
);

-- Update document reviews policy
DROP POLICY IF EXISTS "Admins can manage document reviews" ON document_reviews;
CREATE POLICY "Admins can manage document reviews"
ON document_reviews
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND ((auth.users.raw_app_meta_data->>'is_admin')::boolean = true)
  )
);

-- Update application flags policy
DROP POLICY IF EXISTS "Admins can manage flags" ON application_flags;
CREATE POLICY "Admins can manage flags"
ON application_flags
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND ((auth.users.raw_app_meta_data->>'is_admin')::boolean = true)
  )
);

-- Update audit logs policy
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
ON audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND ((auth.users.raw_app_meta_data->>'is_admin')::boolean = true)
  )
);

-- Update admin messages policies
DROP POLICY IF EXISTS "Admins can view all messages" ON admin_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON admin_messages;

CREATE POLICY "Admins can view all messages"
ON admin_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND ((auth.users.raw_app_meta_data->>'is_admin')::boolean = true)
  )
);

CREATE POLICY "Admins can insert messages"
ON admin_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND ((auth.users.raw_app_meta_data->>'is_admin')::boolean = true)
  )
);

-- Grant necessary permissions
GRANT SELECT ON auth.users TO authenticated;