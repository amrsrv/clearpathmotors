/*
  # Fix Dashboard Access Permissions

  1. Security
    - Enable RLS on all required tables
    - Add proper policies for users and admins
    - Fix permission issues with auth.users table

  2. Changes
    - Update application policies
    - Add document policies
    - Add notification policies
    - Add application_stages policies
*/

-- Enable RLS on all tables
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_stages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own applications" ON applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON applications;

DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can upload documents" ON documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

DROP POLICY IF EXISTS "Users can view own stages" ON application_stages;
DROP POLICY IF EXISTS "Users can insert own stages" ON application_stages;
DROP POLICY IF EXISTS "Admins can view all stages" ON application_stages;

-- Application Policies
CREATE POLICY "Users can view own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all applications"
  ON applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE auth_id = auth.uid()
    )
  );

-- Document Policies
CREATE POLICY "Users can view own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM applications
      WHERE applications.id = documents.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM applications
      WHERE applications.id = application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE auth_id = auth.uid()
    )
  );

-- Notification Policies
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE auth_id = auth.uid()
    )
  );

-- Application Stages Policies
CREATE POLICY "Users can view own stages"
  ON application_stages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM applications
      WHERE applications.id = application_stages.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own stages"
  ON application_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM applications
      WHERE applications.id = application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all stages"
  ON application_stages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE auth_id = auth.uid()
    )
  );