/*
  # Fix Application Permissions

  1. Changes
    - Add RLS policies for applications table
    - Grant proper permissions for authenticated users
    - Fix policy for admin access

  2. Security
    - Enable RLS on applications table
    - Add policies for user and admin access
    - Ensure users can only access their own data
*/

-- Enable RLS on applications table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own applications" ON applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON applications;
DROP POLICY IF EXISTS "Admins can update applications" ON applications;

-- Create policies for applications table
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

CREATE POLICY "Admins can view all applications"
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