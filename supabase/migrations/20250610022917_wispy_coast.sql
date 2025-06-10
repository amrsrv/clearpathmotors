/*
  # Fix document_reviews RLS policy for admin access

  1. Security Updates
    - Drop existing admin policy that may be incorrectly checking metadata
    - Create new policy that properly checks admin status from JWT token
    - Ensure admins can insert, update, select, and delete document reviews

  2. Changes
    - Updated admin policy to use JWT token check for is_admin flag
    - This aligns with how other admin policies work in the system
*/

-- Drop the existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can manage document reviews" ON document_reviews;

-- Create a new comprehensive admin policy that checks JWT metadata
CREATE POLICY "Admins can manage all document reviews"
  ON document_reviews
  FOR ALL
  TO authenticated
  USING (
    ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin')::boolean = true
  );