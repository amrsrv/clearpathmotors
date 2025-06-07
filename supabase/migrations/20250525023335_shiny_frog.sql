/*
  # User Access Policies

  1. Security
    - Enable RLS on applications table
    - Add policies for user and admin access
    - Ensure proper data access control
*/

-- Enable RLS on applications table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own applications" ON applications;
    DROP POLICY IF EXISTS "Admins can view all applications" ON applications;
    DROP POLICY IF EXISTS "Users can insert own applications" ON applications;
    DROP POLICY IF EXISTS "Admins can update applications" ON applications;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Create policies for applications table
CREATE POLICY "Users can view own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = auth.uid()
      AND raw_app_meta_data->>'is_admin' = 'true'
    )
  );

CREATE POLICY "Users can insert own applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = auth.uid()
      AND raw_app_meta_data->>'is_admin' = 'true'
    )
  );