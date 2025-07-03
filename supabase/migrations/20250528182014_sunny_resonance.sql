-- Drop admin_users table if it exists
DROP TABLE IF EXISTS admin_users CASCADE;

-- Update user metadata to grant admin privileges
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'
),
email_confirmed_at = NOW()
WHERE email = 'info@clearpathmotors.com';