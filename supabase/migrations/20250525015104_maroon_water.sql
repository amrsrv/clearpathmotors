/*
  # Add admin user

  1. Changes
    - Add admin user to admin_users table
    - Set admin privileges in auth.users metadata

  2. Security
    - Ensures admin user has proper permissions
*/

-- Insert admin user into admin_users table
INSERT INTO admin_users (username, email)
VALUES ('admin', 'info@clearpathmotors.com')
ON CONFLICT (email) DO UPDATE
SET username = EXCLUDED.username;

-- Update user metadata to grant admin privileges
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'
)
WHERE email = 'info@clearpathmotors.com';