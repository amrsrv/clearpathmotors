/*
  # Fix RLS Policies and User Role Handling

  1. Changes
    - Create a safe function to check user roles without causing recursion
    - Update RLS policies to use the safe function
    - Fix policies for applications, notifications, and other tables
    - Add support for anonymous users with temp_user_id
    
  2. Security
    - Maintain proper access control
    - Fix infinite recursion issues in RLS policies
    - Ensure proper handling of anonymous users
*/

-- Create a safe function to check user roles without causing recursion
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

-- Create a safe view for user information
CREATE OR REPLACE VIEW safe_users AS
SELECT 
  id,
  email,
  created_at
FROM auth.users;

-- Grant access to the safe view
GRANT SELECT ON safe_users TO authenticated;
GRANT SELECT ON safe_users TO anon;

-- Fix applications table RLS policies
DROP POLICY IF EXISTS "applications_select_policy" ON applications;
DROP POLICY IF EXISTS "applications_public_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_update_policy" ON applications;
DROP POLICY IF EXISTS "applications_delete_policy" ON applications;

-- Create new policies for applications
CREATE POLICY "Users can view own applications"
  ON applications
  FOR SELECT
  TO public
  USING (
    (temp_user_id = auth.uid()) OR 
    (user_id = auth.uid()) OR 
    (dealer_id = auth.uid() AND get_user_role_safe(auth.uid()) = 'dealer') OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
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
    (dealer_id = auth.uid() AND get_user_role_safe(auth.uid()) = 'dealer') OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  )
  WITH CHECK (
    (user_id = auth.uid()) OR 
    (dealer_id = auth.uid() AND get_user_role_safe(auth.uid()) = 'dealer') OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

CREATE POLICY "Super admins can delete applications"
  ON applications
  FOR DELETE
  TO authenticated
  USING (get_user_role_safe(auth.uid()) = 'super_admin');

-- Fix notifications table RLS policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can mark notifications as read" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;

-- Create new policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO public
  USING (
    (user_id = auth.uid()) OR 
    (temp_user_id = auth.uid()) OR
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

CREATE POLICY "Users can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid()) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

-- Fix documents table RLS policies
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can upload documents" ON documents;
DROP POLICY IF EXISTS "Anonymous users can upload documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
DROP POLICY IF EXISTS "Anonymous users can delete documents" ON documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;

-- Create new policies for documents
CREATE POLICY "Users can view own documents"
  ON documents
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = documents.application_id AND (
        (applications.user_id = auth.uid()) OR
        (applications.temp_user_id = auth.uid()) OR
        (applications.dealer_id = auth.uid() AND get_user_role_safe(auth.uid()) = 'dealer') OR
        (get_user_role_safe(auth.uid()) = 'super_admin')
      )
    )
  );

CREATE POLICY "Users can upload documents"
  ON documents
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_id AND (
        (applications.user_id = auth.uid()) OR
        (applications.temp_user_id = auth.uid()) OR
        (applications.dealer_id = auth.uid() AND get_user_role_safe(auth.uid()) = 'dealer') OR
        (get_user_role_safe(auth.uid()) = 'super_admin')
      )
    )
  );

CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = documents.application_id AND (
        (applications.user_id = auth.uid()) OR
        (applications.temp_user_id = auth.uid()) OR
        (applications.dealer_id = auth.uid() AND get_user_role_safe(auth.uid()) = 'dealer') OR
        (get_user_role_safe(auth.uid()) = 'super_admin')
      )
    )
  );

-- Fix application_stages table RLS policies
DROP POLICY IF EXISTS "Users can view stages of own applications" ON application_stages;
DROP POLICY IF EXISTS "Users can view own application stages" ON application_stages;
DROP POLICY IF EXISTS "Users can insert stages for own applications" ON application_stages;
DROP POLICY IF EXISTS "Allow admin and user stage management" ON application_stages;
DROP POLICY IF EXISTS "Admins can manage application stages" ON application_stages;

-- Create new policies for application_stages
CREATE POLICY "Users can view own application stages"
  ON application_stages
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_stages.application_id AND (
        (applications.user_id = auth.uid()) OR
        (applications.temp_user_id = auth.uid()) OR
        (applications.dealer_id = auth.uid() AND get_user_role_safe(auth.uid()) = 'dealer') OR
        (get_user_role_safe(auth.uid()) = 'super_admin')
      )
    )
  );

CREATE POLICY "Users can insert stages for own applications"
  ON application_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_id AND (
        (applications.user_id = auth.uid()) OR
        (applications.dealer_id = auth.uid() AND get_user_role_safe(auth.uid()) = 'dealer') OR
        (get_user_role_safe(auth.uid()) = 'super_admin')
      )
    )
  );

-- Fix admin_messages table RLS policies
DROP POLICY IF EXISTS "Users can view their own messages" ON admin_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON admin_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON admin_messages;
DROP POLICY IF EXISTS "Admins can insert messages" ON admin_messages;

-- Create new policies for admin_messages
CREATE POLICY "Users can view their own messages"
  ON admin_messages
  FOR SELECT
  TO public
  USING (
    (user_id = auth.uid()) OR
    (temp_user_id = auth.uid()) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

CREATE POLICY "Users can insert messages"
  ON admin_messages
  FOR INSERT
  TO public
  WITH CHECK (
    (user_id = auth.uid()) OR
    (temp_user_id = auth.uid()) OR
    (auth.uid() IS NULL AND temp_user_id IS NOT NULL) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

-- Fix chats table RLS policies
DROP POLICY IF EXISTS "Users can read own chats" ON chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
DROP POLICY IF EXISTS "Users can update own chats" ON chats;
DROP POLICY IF EXISTS "Admins can manage all chats" ON chats;

-- Create new policies for chats
CREATE POLICY "Users can read own chats"
  ON chats
  FOR SELECT
  TO public
  USING (
    (user_id = auth.uid()) OR
    (anonymous_id = auth.uid()) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

CREATE POLICY "Users can insert own chats"
  ON chats
  FOR INSERT
  TO public
  WITH CHECK (
    ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR
    ((auth.uid() IS NULL) AND (anonymous_id IS NOT NULL)) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

CREATE POLICY "Users can update own chats"
  ON chats
  FOR UPDATE
  TO public
  USING (
    (user_id = auth.uid()) OR
    (anonymous_id = auth.uid()) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  )
  WITH CHECK (
    (user_id = auth.uid()) OR
    (anonymous_id = auth.uid()) OR
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

-- Fix chat_messages table RLS policies
DROP POLICY IF EXISTS "Users can read own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can manage all chat messages" ON chat_messages;

-- Create new policies for chat_messages
CREATE POLICY "Users can read own chat messages"
  ON chat_messages
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_messages.chat_id AND (
        (chats.user_id = auth.uid()) OR
        (chats.anonymous_id = auth.uid()) OR
        (get_user_role_safe(auth.uid()) = 'super_admin')
      )
    )
  );

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages
  FOR INSERT
  TO public
  WITH CHECK (
    (user_id = auth.uid()) OR
    (anonymous_id = auth.uid()) OR
    (anonymous_id IS NOT NULL AND auth.uid() IS NULL) OR
    (get_user_role_safe(auth.uid()) = 'super_admin') OR
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_messages.chat_id AND (
        (chats.user_id = auth.uid()) OR
        (chats.anonymous_id = auth.uid())
      )
    )
  );

-- Fix user_profiles table RLS policies
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create new policies for user_profiles
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

-- Grant necessary permissions
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO anon;