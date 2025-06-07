/*
  # Fix applications table schema and RLS policies

  1. Changes
    - Ensure id column has proper default value constraint
    - Update RLS policies to properly handle anonymous submissions
    - Add explicit check for temp_user_id in anonymous submission policy

  2. Security
    - Modify RLS policies to allow anonymous submissions without requiring auth.users access
    - Maintain security by ensuring proper separation between anonymous and authenticated submissions
*/

-- First ensure the id column has the proper default
ALTER TABLE applications 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Allow anonymous submissions" ON applications;
DROP POLICY IF EXISTS "Allow authenticated user submissions" ON applications;

-- Create new policy for anonymous submissions
CREATE POLICY "Allow anonymous submissions"
ON applications
FOR INSERT
TO public
WITH CHECK (
  temp_user_id IS NOT NULL 
  AND user_id IS NULL
);

-- Create new policy for authenticated submissions
CREATE POLICY "Allow authenticated submissions"
ON applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND temp_user_id IS NULL
);