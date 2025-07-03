-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all applications" ON applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON applications;

-- Create new admin policy for viewing all applications
CREATE POLICY "Admins can view all applications"
ON applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
  OR user_id = auth.uid()
);

-- Create new admin policy for updating all applications
CREATE POLICY "Admins can update all applications"
ON applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
  OR user_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
  OR user_id = auth.uid()
);

-- Grant necessary permissions
GRANT SELECT ON auth.users TO authenticated;
GRANT UPDATE ON applications TO authenticated;