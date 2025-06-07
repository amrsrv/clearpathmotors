/*
  # Optimize RLS Performance

  1. Changes
    - Replace auth.uid() with subquery in RLS policies for better performance
    - Update all application-related policies to use optimized queries
  
  2. Security
    - Maintains same security rules and access controls
    - Only improves query performance
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own applications" ON applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON applications;

-- Create optimized policies
CREATE POLICY "Users can view own applications"
ON applications
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

CREATE POLICY "Users can insert own applications"
ON applications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
);

CREATE POLICY "Admins can view all applications"
ON applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = (SELECT auth.uid())
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
  OR user_id = (SELECT auth.uid())
);

CREATE POLICY "Admins can update all applications"
ON applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = (SELECT auth.uid())
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
  OR user_id = (SELECT auth.uid())
);