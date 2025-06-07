-- Drop existing policies to recreate them with updated logic
DROP POLICY IF EXISTS "applications_public_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_select_policy" ON applications;

-- Create new insert policy for both authenticated and unauthenticated users
CREATE POLICY "applications_insert_policy" ON applications
FOR INSERT TO public
WITH CHECK (
  -- Allow unauthenticated submissions with temp_user_id
  (temp_user_id IS NOT NULL AND user_id IS NULL) OR
  -- Allow authenticated users to submit with their user_id
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- Create new select policy that includes temp_user_id access
CREATE POLICY "applications_select_policy" ON applications
FOR SELECT TO public
USING (
  -- Allow access via temp_user_id for unauthenticated submissions
  temp_user_id = auth.uid() OR
  -- Allow authenticated users to view their own applications
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