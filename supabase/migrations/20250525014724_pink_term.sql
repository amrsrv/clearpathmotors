/*
  # Add Admin User Account

  1. Changes
    - Update user metadata to grant admin privileges
    - Create admin user record in admin_users table

  2. Security
    - Ensures proper admin privileges are set
    - Links user account to admin_users table
*/

-- Update user metadata to grant admin privileges
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'
)
WHERE email = 'info@clearpathmotors.com';

-- Insert admin user record
INSERT INTO admin_users (username, email, user_id)
SELECT 
  'admin',
  'info@clearpathmotors.com',
  id
FROM auth.users 
WHERE email = 'info@clearpathmotors.com'
ON CONFLICT (email) 
DO UPDATE SET
  username = EXCLUDED.username,
  user_id = EXCLUDED.user_id;