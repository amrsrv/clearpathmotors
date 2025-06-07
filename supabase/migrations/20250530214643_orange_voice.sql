/*
  # Fix applications table RLS policies

  1. Changes
    - Update RLS policies for applications table to properly handle unauthenticated submissions
    - Simplify policy conditions to avoid unnecessary user table queries
    - Add explicit policy for public (unauthenticated) inserts

  2. Security
    - Maintain data isolation between users
    - Allow anonymous submissions with temp_user_id
    - Ensure users can only access their own applications
    - Preserve admin access to all applications
*/

-- Drop existing policies to recreate them with proper conditions
DROP POLICY IF EXISTS "applications_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_select_policy" ON applications;
DROP POLICY IF EXISTS "applications_update_policy" ON applications;
DROP POLICY IF EXISTS "applications_delete_policy" ON applications;

-- Create new policies with proper handling of unauthenticated users
CREATE POLICY "applications_insert_policy" ON applications
FOR INSERT TO public
WITH CHECK (
  -- Allow unauthenticated users to insert with temp_user_id
  (temp_user_id IS NOT NULL AND user_id IS NULL) OR
  -- Allow authenticated users to insert with their user_id
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY "applications_select_policy" ON applications
FOR SELECT TO public
USING (
  -- Allow access to temp applications
  temp_user_id = auth.uid() OR
  -- Allow users to view their own applications
  user_id = auth.uid() OR
  -- Allow admins to view all applications
  (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
    )
  )
);

CREATE POLICY "applications_update_policy" ON applications
FOR UPDATE TO authenticated
USING (
  -- Users can update their own applications
  user_id = auth.uid() OR
  -- Admins can update any application
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
)
WITH CHECK (
  -- Same conditions as USING clause
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

CREATE POLICY "applications_delete_policy" ON applications
FOR DELETE TO authenticated
USING (
  -- Only admins can delete applications
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);