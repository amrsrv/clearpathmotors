/*
  # Add admin role to user

  1. Updates
    - Sets admin role for AmirAdmin user
  2. Security
    - Uses raw_app_meta_data to store admin status
*/

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{isAdmin}',
  'true'
)
WHERE email = 'AmirAdmin';