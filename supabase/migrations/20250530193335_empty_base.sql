-- Drop existing policies
DROP POLICY IF EXISTS "applications_admin_policy" ON applications;
DROP POLICY IF EXISTS "applications_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_select_policy" ON applications;
DROP POLICY IF EXISTS "applications_update_policy" ON applications;
DROP POLICY IF EXISTS "applications_public_insert_policy" ON applications;
DROP POLICY IF EXISTS "applications_delete_policy" ON applications;

-- Add temp_user_id column if it doesn't exist
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS temp_user_id uuid;

-- Create index for temp_user_id
CREATE INDEX IF NOT EXISTS idx_applications_temp_user_id 
ON applications(temp_user_id);

-- Create new policies

-- Allow public users to insert applications (with temp_user_id)
CREATE POLICY "applications_public_insert_policy" ON applications
FOR INSERT TO public
WITH CHECK (
  (temp_user_id IS NOT NULL AND user_id IS NULL) OR
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- Allow users to view their own applications
CREATE POLICY "applications_select_policy" ON applications
FOR SELECT TO public
USING (
  temp_user_id = auth.uid() OR
  user_id = auth.uid() OR
  (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
    )
  )
);

-- Allow users to update their own applications
CREATE POLICY "applications_update_policy" ON applications
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR
  (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
    )
  )
)
WITH CHECK (
  user_id = auth.uid() OR
  (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
    )
  )
);

-- Allow admins to delete applications
CREATE POLICY "applications_delete_policy" ON applications
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);