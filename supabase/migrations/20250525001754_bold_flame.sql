/*
  # Add insert policy for application_stages table

  1. Security
    - Add RLS policy to allow authenticated users to insert records into application_stages table
    - Users can only insert stages for applications they own
*/

CREATE POLICY "Users can insert stages for own applications"
  ON application_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM applications
      WHERE applications.id = application_stages.application_id
      AND applications.user_id = auth.uid()
    )
  );