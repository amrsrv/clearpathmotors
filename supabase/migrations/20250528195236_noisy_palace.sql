/*
  # Grant users table permissions

  1. Security Changes
    - Grant SELECT permission on auth.users to authenticated role
    - This allows RLS policies to verify admin status
    
  2. Notes
    - Required for admin functionality to work properly
    - Enables RLS policies to check user roles and permissions
*/

-- Grant SELECT permission on auth.users to authenticated role
GRANT SELECT ON auth.users TO authenticated;