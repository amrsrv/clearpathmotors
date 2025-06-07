-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all applications" ON applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON applications;

-- Create new admin policies for applications
CREATE POLICY "Admins can view all applications"
ON applications
FOR ALL
TO authenticated
USING (
  (SELECT raw_app_meta_data->>'is_admin' = 'true'
   FROM auth.users
   WHERE auth.users.id = auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Admins can update all applications"
ON applications
FOR UPDATE
TO authenticated
USING (
  (SELECT raw_app_meta_data->>'is_admin' = 'true'
   FROM auth.users
   WHERE auth.users.id = auth.uid())
  OR user_id = auth.uid()
)
WITH CHECK (
  (SELECT raw_app_meta_data->>'is_admin' = 'true'
   FROM auth.users
   WHERE auth.users.id = auth.uid())
  OR user_id = auth.uid()
);

-- Grant necessary permissions
GRANT SELECT ON auth.users TO authenticated;
GRANT UPDATE ON applications TO authenticated;