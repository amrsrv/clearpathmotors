-- Drop existing policies
DROP POLICY IF EXISTS "applications_admin_policy" ON applications;
DROP POLICY IF EXISTS "applications_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_select_policy" ON applications;
DROP POLICY IF EXISTS "Users can update own applications" ON applications;

-- Re-create policies with correct permissions
-- Admin full access policy
CREATE POLICY "applications_admin_policy" ON applications
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

-- Allow public submissions
CREATE POLICY "applications_insert_policy" ON applications
FOR INSERT
TO public
WITH CHECK (true);

-- Users can view their own applications
CREATE POLICY "applications_select_policy" ON applications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

-- Users can update their own applications
CREATE POLICY "applications_update_policy" ON applications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());