/*
  # Fix dealer relationship in applications table

  1. Changes
    - Add foreign key relationship between applications.dealer_id and dealer_profiles.id
    - Create view for applications with dealer information
    - Add RLS policies for dealer access

  2. Security
    - Enable RLS on dealer_profiles table
    - Add policies for dealer access
*/

-- Create a view to join applications with dealer information
CREATE OR REPLACE VIEW applications_with_dealer AS
SELECT 
  a.*,
  d.name as dealer_name,
  d.email as dealer_email,
  d.public_slug as dealer_slug
FROM 
  applications a
LEFT JOIN 
  dealer_profiles d ON a.dealer_id = d.id;

-- Add RLS policy for dealers to view their assigned applications
CREATE POLICY "Dealers can view assigned applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    dealer_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND 
      (users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  );

-- Add RLS policy for dealers to update their assigned applications
CREATE POLICY "Dealers can update assigned applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    dealer_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND 
      (users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  )
  WITH CHECK (
    dealer_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND 
      (users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  );

-- Add index for dealer_id to improve query performance
CREATE INDEX IF NOT EXISTS idx_applications_dealer_id ON applications(dealer_id);