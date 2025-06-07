/*
  # Add Initial Admin User

  1. Changes
    - Insert initial admin user into admin_users table
      - Username: AdminAmir
      - Email: admin@clearpathfinance.ca
      - User ID will be linked to an existing admin user in auth.users

  2. Security
    - No changes to RLS policies
    - Maintains existing table security
*/

-- Insert the admin user
INSERT INTO admin_users (username, email, user_id)
SELECT 
  'AdminAmir',
  'admin@clearpathfinance.ca',
  id
FROM auth.users 
WHERE raw_app_meta_data->>'is_admin' = 'true'
ON CONFLICT (username) DO NOTHING;