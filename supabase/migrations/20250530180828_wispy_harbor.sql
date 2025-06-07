-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies
DROP POLICY IF EXISTS "applications_select_policy" ON applications;
DROP POLICY IF EXISTS "applications_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_admin_policy" ON applications;

-- Create new policies
CREATE POLICY "applications_select_policy"
ON applications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

CREATE POLICY "applications_insert_policy"
ON applications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "applications_admin_policy"
ON applications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

-- Grant necessary permissions
GRANT SELECT ON auth.users TO authenticated;
GRANT ALL ON applications TO authenticated;