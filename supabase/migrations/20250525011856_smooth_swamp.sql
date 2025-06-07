/*
  # Admin Policy Updates
  
  1. Security Changes
    - Enable RLS on notifications table
    - Create policies for notifications management
    - Add admin-level policies for applications, documents, and stages
    
  2. Policies Added
    - Notification management policies
    - Admin view/update policies for applications
    - Admin view/update policies for documents
    - Admin view/insert policies for application stages
*/

-- Enable RLS on notifications if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
  DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
  DROP POLICY IF EXISTS "Users can mark notifications as read" ON notifications;
  DROP POLICY IF EXISTS "Admins can view all applications" ON applications;
  DROP POLICY IF EXISTS "Admins can update all applications" ON applications;
  DROP POLICY IF EXISTS "Admins can view all documents" ON documents;
  DROP POLICY IF EXISTS "Admins can update all documents" ON documents;
  DROP POLICY IF EXISTS "Admins can view all stages" ON application_stages;
  DROP POLICY IF EXISTS "Admins can insert stages" ON application_stages;
END $$;

-- Create new policies for notifications
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark notifications as read"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create admin policies for applications
CREATE POLICY "Admins can view all applications"
ON applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'is_admin' = 'true'
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Admins can update all applications"
ON applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'is_admin' = 'true'
  )
  OR user_id = auth.uid()
);

-- Create admin policies for documents
CREATE POLICY "Admins can view all documents"
ON documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'is_admin' = 'true'
  )
  OR EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = documents.application_id
    AND applications.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update all documents"
ON documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'is_admin' = 'true'
  )
  OR EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = documents.application_id
    AND applications.user_id = auth.uid()
  )
);

-- Create admin policies for application stages
CREATE POLICY "Admins can view all stages"
ON application_stages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'is_admin' = 'true'
  )
  OR EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = application_stages.application_id
    AND applications.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can insert stages"
ON application_stages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'is_admin' = 'true'
  )
  OR EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = application_stages.application_id
    AND applications.user_id = auth.uid()
  )
);