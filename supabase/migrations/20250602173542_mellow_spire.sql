/*
  # Clean up sample data

  1. Changes
    - Remove all sample applications with @example.com email addresses
    - Clean up related records in all dependent tables
    - Ensure no orphaned records remain
    
  2. Security
    - Maintain referential integrity
    - Preserve real user data
*/

-- First, remove activity logs for sample applications
DELETE FROM activity_log
WHERE application_id IN (
  SELECT id FROM applications 
  WHERE email LIKE '%@example.com'
);

-- Remove document reviews for sample applications
DELETE FROM document_reviews
WHERE document_id IN (
  SELECT d.id FROM documents d
  JOIN applications a ON d.application_id = a.id
  WHERE a.email LIKE '%@example.com'
);

-- Remove documents for sample applications
DELETE FROM documents
WHERE application_id IN (
  SELECT id FROM applications 
  WHERE email LIKE '%@example.com'
);

-- Remove application stages for sample applications
DELETE FROM application_stages
WHERE application_id IN (
  SELECT id FROM applications 
  WHERE email LIKE '%@example.com'
);

-- Remove application flags for sample applications
DELETE FROM application_flags
WHERE application_id IN (
  SELECT id FROM applications 
  WHERE email LIKE '%@example.com'
);

-- Remove admin messages for sample applications
DELETE FROM admin_messages
WHERE application_id IN (
  SELECT id FROM applications 
  WHERE email LIKE '%@example.com'
);

-- Finally, remove the sample applications themselves
DELETE FROM applications 
WHERE email LIKE '%@example.com';