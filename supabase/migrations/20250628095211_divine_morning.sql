/*
  # Add applications_with_dealer view
  
  1. New Views
    - `applications_with_dealer` - Joins applications with dealer profiles for easier queries
  
  2. Indexes
    - Added index on applications.dealer_id for faster joins
*/

-- Create a view that joins applications with dealer information
CREATE OR REPLACE VIEW applications_with_dealer AS
SELECT 
  a.*,
  dp.name as dealer_name,
  dp.email as dealer_email,
  dp.public_slug as dealer_slug
FROM 
  applications a
LEFT JOIN 
  dealer_profiles dp ON a.dealer_id = dp.id;

-- Create index to speed up dealer lookups
CREATE INDEX IF NOT EXISTS idx_applications_dealer_id ON applications(dealer_id);