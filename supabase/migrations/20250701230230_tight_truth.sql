/*
  # Fix RLS Policies for User Access Issues

  This migration fixes the infinite recursion and permission denied errors by:
  1. Dropping problematic policies that cause recursion
  2. Creating simplified, secure policies for user_profiles
  3. Ensuring proper access to applications table for both authenticated and anonymous users
  4. Adding necessary policies for notifications table
  5. Creating a safe user role checking function

  ## Changes Made:
  1. **User Profiles Table**: Simplified policies to prevent recursion
  2. **Applications Table**: Fixed policies for proper user and temp user access
  3. **Notifications Table**: Ensured proper access for both user types
  4. **Helper Function**: Created safe role checking function
*/

-- First, let's create a safe function to check user roles without causing recursion
CREATE OR REPLACE FUNCTION get_user_role_safe(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return the role from user metadata, defaulting to 'customer'
  RETURN COALESCE(
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = user_uuid),
    'customer'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'customer';
END;
$$;

-- Drop existing problematic policies on user_profiles
DROP POLICY IF EXISTS "Admins can manage user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- Create simplified, safe policies for user_profiles
CREATE POLICY "Users can manage own profile"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can manage all profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (get_user_role_safe(auth.uid()) = 'super_admin')
  WITH CHECK (get_user_role_safe(auth.uid()) = 'super_admin');

-- Fix applications table policies to prevent user table access issues
DROP POLICY IF EXISTS "applications_select_policy" ON applications;
DROP POLICY IF EXISTS "applications_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_update_policy" ON applications;
DROP POLICY IF EXISTS "applications_delete_policy" ON applications;

-- Create new, simplified policies for applications
CREATE POLICY "Users can view own applications"
  ON applications
  FOR SELECT
  TO public
  USING (
    (temp_user_id = auth.uid()) OR 
    (user_id = auth.uid()) OR 
    (get_user_role_safe(auth.uid()) IN ('super_admin', 'dealer'))
  );

CREATE POLICY "Users can insert applications"
  ON applications
  FOR INSERT
  TO public
  WITH CHECK (
    ((temp_user_id IS NOT NULL) AND (user_id IS NULL)) OR 
    ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR
    (get_user_role_safe(auth.uid()) IN ('super_admin', 'dealer'))
  );

CREATE POLICY "Users can update own applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid()) OR 
    (get_user_role_safe(auth.uid()) IN ('super_admin', 'dealer'))
  )
  WITH CHECK (
    (user_id = auth.uid()) OR 
    (get_user_role_safe(auth.uid()) IN ('super_admin', 'dealer'))
  );

CREATE POLICY "Super admins can delete applications"
  ON applications
  FOR DELETE
  TO authenticated
  USING (get_user_role_safe(auth.uid()) = 'super_admin');

-- Fix notifications table policies
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can mark notifications as read" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

-- Create simplified notification policies
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO public
  USING (
    (user_id = auth.uid()) OR 
    (temp_user_id = auth.uid()) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

CREATE POLICY "Users can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid()) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO public
  USING (
    (user_id = auth.uid()) OR 
    (temp_user_id = auth.uid()) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  )
  WITH CHECK (
    (user_id = auth.uid()) OR 
    (temp_user_id = auth.uid()) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

CREATE POLICY "Admins can manage all notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (get_user_role_safe(auth.uid()) = 'super_admin')
  WITH CHECK (get_user_role_safe(auth.uid()) = 'super_admin');

-- Fix application_stages policies to prevent recursion
DROP POLICY IF EXISTS "Admins can manage all stages" ON application_stages;
DROP POLICY IF EXISTS "Allow admin and user stage management" ON application_stages;
DROP POLICY IF EXISTS "Users can view stages of own applications" ON application_stages;

-- Create simplified application_stages policies
CREATE POLICY "Users can view own application stages"
  ON application_stages
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM applications 
      WHERE applications.id = application_stages.application_id 
      AND (
        applications.user_id = auth.uid() OR 
        applications.temp_user_id = auth.uid()
      )
    ) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

CREATE POLICY "Admins can manage application stages"
  ON application_stages
  FOR ALL
  TO authenticated
  USING (get_user_role_safe(auth.uid()) = 'super_admin')
  WITH CHECK (get_user_role_safe(auth.uid()) = 'super_admin');

CREATE POLICY "Users can insert stages for own applications"
  ON application_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications 
      WHERE applications.id = application_stages.application_id 
      AND applications.user_id = auth.uid()
    ) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

-- Ensure RLS is enabled on all necessary tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_stages ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated and anon roles
GRANT SELECT, INSERT, UPDATE ON applications TO anon;
GRANT SELECT, UPDATE ON notifications TO anon;
GRANT SELECT ON application_stages TO anon;

GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON applications TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON application_stages TO authenticated;

-- Create a view for safe user access (if needed)
CREATE OR REPLACE VIEW safe_user_info AS
SELECT 
  id,
  email,
  created_at,
  raw_app_meta_data->>'role' as role
FROM auth.users;

-- Grant access to the safe view
GRANT SELECT ON safe_user_info TO authenticated;
GRANT SELECT ON safe_user_info TO anon;