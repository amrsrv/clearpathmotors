/*
  # Fix Admin Login Setup

  1. Changes
    - Add password column to admin_users table
    - Update admin user record with correct credentials
    - Ensure proper RLS policies

  2. Security
    - Enable RLS on admin_users table
    - Add policy for admin access
*/

-- Add password column if it doesn't exist
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS password text;

-- Update or insert admin user with correct credentials
INSERT INTO admin_users (username, email, password)
VALUES ('admin', 'info@clearpathmotors.com', 'Clearpath_1000!')
ON CONFLICT (email) DO UPDATE
SET username = EXCLUDED.username,
    password = EXCLUDED.password;

-- Update user metadata to grant admin privileges
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'
)
WHERE email = 'info@clearpathmotors.com';

-- Ensure RLS is enabled
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Update RLS policies
DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;

CREATE POLICY "Admins can read admin_users"
ON admin_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);