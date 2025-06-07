-- Add temp_user_id column to applications table
ALTER TABLE applications
ADD COLUMN temp_user_id uuid;

-- Create index for temp_user_id
CREATE INDEX idx_applications_temp_user_id ON applications(temp_user_id);

-- Update RLS policies to handle temp_user_id
DROP POLICY IF EXISTS "applications_select_policy" ON applications;
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

-- Allow inserting with temp_user_id
DROP POLICY IF EXISTS "applications_insert_policy" ON applications;
CREATE POLICY "applications_insert_policy"
ON applications
FOR INSERT
TO public
WITH CHECK (true);