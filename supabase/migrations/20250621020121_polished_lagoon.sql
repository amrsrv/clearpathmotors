/*
  # Fix application flags foreign key constraint

  1. Changes
    - Drop existing foreign key constraint on application_flags.application_id
    - Re-add the constraint with ON DELETE CASCADE option
    - This ensures that when an application is deleted, all associated flags are automatically removed

  2. Security
    - No changes to RLS policies
    - Maintains existing access controls
*/

-- Drop the existing foreign key constraint
ALTER TABLE application_flags 
DROP CONSTRAINT IF EXISTS application_flags_application_id_fkey;

-- Re-add the foreign key constraint with CASCADE delete
ALTER TABLE application_flags 
ADD CONSTRAINT application_flags_application_id_fkey 
FOREIGN KEY (application_id) 
REFERENCES applications(id) 
ON DELETE CASCADE;