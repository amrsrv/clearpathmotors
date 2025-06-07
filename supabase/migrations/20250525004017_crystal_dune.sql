/*
  # Add notifications table RLS policies

  1. Security Changes
    - Enable RLS on notifications table (if not already enabled)
    - Add policy for authenticated users to insert their own notifications
    - Add policy for authenticated users to update their own notifications
    - Add policy for authenticated users to read their own notifications

  Note: This migration ensures users can only interact with their own notifications
*/

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy for inserting notifications
CREATE POLICY "Users can insert own notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for updating notifications
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for reading notifications
CREATE POLICY "Users can read own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);