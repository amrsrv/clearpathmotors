/*
  # Add admin user

  1. Changes
    - Updates the user with email 'AmirAdmin' to have admin privileges
    - Sets the is_admin flag in raw_app_meta_data
*/

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'
)
WHERE email = 'AmirAdmin';