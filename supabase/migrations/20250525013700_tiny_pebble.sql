/*
  # Add Admin User

  1. Changes
    - Adds admin user to admin_users table
    - Updates existing admin user if already exists
    - Ensures email and username are unique

  2. Security
    - Only adds user if they have admin privileges in auth.users
*/

-- Insert or update admin user
INSERT INTO admin_users (username, email, user_id)
SELECT 
  'AdminAmir',
  'admin@clearpathfinance.ca',
  id
FROM auth.users 
WHERE raw_app_meta_data->>'is_admin' = 'true'
ON CONFLICT (username) 
DO UPDATE SET
  email = EXCLUDED.email,
  user_id = EXCLUDED.user_id;