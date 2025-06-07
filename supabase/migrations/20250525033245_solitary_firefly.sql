/*
  # Fix Applications RLS Policies

  1. Changes
    - Add RLS policy for authenticated users to insert their own applications
    - Ensure user_id matches the authenticated user's ID

  2. Security
    - Enable RLS on applications table (if not already enabled)
    - Add policy for authenticated users to insert applications
*/

-- Enable RLS if not already enabled
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert own applications" ON applications;

-- Create new insert policy
CREATE POLICY "Users can insert own applications"
ON applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);