/*
  # Fix Email Validation Constraint

  1. Changes
    - Modify the valid_email constraint to allow NULL values
    - This allows applications to be created without an email initially
    - Maintains validation for non-NULL email values
  
  2. Security
    - Maintains data integrity by still validating non-NULL emails
    - Allows anonymous users to create applications without email
*/

-- Drop the existing constraint
ALTER TABLE applications DROP CONSTRAINT IF EXISTS valid_email;

-- Add the constraint back with NULL handling
ALTER TABLE applications 
ADD CONSTRAINT valid_email 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create a view for activity log with user and application details
CREATE OR REPLACE VIEW activity_log_with_email AS
SELECT 
  al.*,
  a.first_name AS application_first_name,
  a.last_name AS application_last_name,
  a.email AS application_email,
  u.email AS user_email
FROM 
  activity_log al
LEFT JOIN 
  applications a ON al.application_id = a.id
LEFT JOIN 
  auth.users u ON al.user_id = u.id;