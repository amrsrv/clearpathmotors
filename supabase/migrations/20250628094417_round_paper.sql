/*
  # Fix dealer relationship and add dealer access policies

  1. New Views
    - `applications_with_dealer` - Joins applications with dealer information
  
  2. Security
    - Add policies for dealers to view and update their assigned applications
    - Uses auth.uid() and app_metadata for role checking
  
  3. Performance
    - Add index on dealer_id for better query performance
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
    (auth.jwt() ->> 'role')::text = 'dealer'
  );

-- Add RLS policy for dealers to update their assigned applications
CREATE POLICY "Dealers can update assigned applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    dealer_id = auth.uid() AND 
    (auth.jwt() ->> 'role')::text = 'dealer'
  )
  WITH CHECK (
    dealer_id = auth.uid() AND 
    (auth.jwt() ->> 'role')::text = 'dealer'
  );

-- Add index for dealer_id to improve query performance
CREATE INDEX IF NOT EXISTS idx_applications_dealer_id ON applications(dealer_id);