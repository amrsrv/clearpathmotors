-- First, drop potentially conflicting policies
DROP POLICY IF EXISTS "Admins can insert stages" ON application_stages;
DROP POLICY IF EXISTS "Users can insert own stages" ON application_stages;
DROP POLICY IF EXISTS "Users can insert stages for own applications" ON application_stages;

-- Create consolidated policies for both admins and users
CREATE POLICY "Allow admin and user stage management"
ON application_stages
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is admin
  (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND ((auth.users.raw_app_meta_data ->> 'is_admin'::text))::boolean = true
  ))
  OR
  -- Allow if user owns the application
  (EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = application_stages.application_id
    AND applications.user_id = auth.uid()
  ))
);