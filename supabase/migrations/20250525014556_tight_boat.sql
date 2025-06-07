/*
  # Add New Admin Account

  1. Changes
    - Grants admin privileges to a new user
    - Creates admin_users record for the new user

  2. Security
    - Uses existing RLS policies
    - Maintains admin role consistency
*/

-- Update user metadata to grant admin privileges
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'
)
WHERE email = 'admin@clearpathmotors.com';

-- Insert admin user record
INSERT INTO admin_users (username, email, user_id)
SELECT 
  'admin',
  'admin@clearpathmotors.com',
  id
FROM auth.users 
WHERE email = 'admin@clearpathmotors.com'
ON CONFLICT (username) 
DO UPDATE SET
  email = EXCLUDED.email,
  user_id = EXCLUDED.user_id;