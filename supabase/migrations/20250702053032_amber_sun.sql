/*
  # Update documents RLS policy for admin access

  1. Security
    - Drop existing admin policy on documents table
    - Create new policy that checks for super_admin role directly from auth.users metadata
    - This ensures admins can always view and manage all documents
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.documents;

-- Create a new policy that grants full access to super_admins based on app_metadata
CREATE POLICY "Admins can manage all documents"
  ON public.documents
  FOR ALL -- This policy applies to SELECT, INSERT, UPDATE, and DELETE operations
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL) AND (
      (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
    )
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL) AND (
      (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
    )
  );