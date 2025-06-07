/*
  # Fix applications table RLS policies

  1. Changes
    - Remove existing applications insert policy that's causing permission issues
    - Add new policy to allow anonymous inserts with temp_user_id
    - Add policy to allow authenticated users to insert with user_id
    
  2. Security
    - Maintains RLS on applications table
    - Ensures proper separation between anonymous and authenticated submissions
    - Prevents unauthorized access while allowing legitimate submissions
*/

-- Drop existing problematic insert policy
DROP POLICY IF EXISTS "applications_insert_policy" ON applications;

-- Create policy for anonymous submissions
CREATE POLICY "Allow anonymous submissions"
ON applications
FOR INSERT
WITH CHECK (
  auth.uid() IS NULL 
  AND temp_user_id IS NOT NULL
  AND user_id IS NULL
);

-- Create policy for authenticated user submissions
CREATE POLICY "Allow authenticated user submissions"
ON applications
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
  AND temp_user_id IS NULL
);