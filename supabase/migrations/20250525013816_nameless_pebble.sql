/*
  # Add admin user

  1. Changes
    - Adds a new admin user with the provided email and username
    - Updates user metadata to grant admin privileges
    - Ensures admin_users table entry exists

  2. Security
    - Only adds user if they don't exist
    - Updates metadata safely
*/

-- Update user metadata to grant admin privileges
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'
)
WHERE email = 'Info@clearpathmotors.com';

-- Insert or update admin user record
INSERT INTO admin_users (username, email, user_id)
SELECT 
  'AdminClearpath',
  'Info@clearpathmotors.com',
  id
FROM auth.users 
WHERE email = 'Info@clearpathmotors.com'
ON CONFLICT (email) 
DO UPDATE SET
  username = EXCLUDED.username,
  user_id = EXCLUDED.user_id;