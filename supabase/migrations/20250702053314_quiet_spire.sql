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