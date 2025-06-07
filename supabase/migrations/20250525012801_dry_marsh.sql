/*
  # Add admin users table

  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `admin_users` table
    - Add policy for admins to read admin_users
*/

-- Create admin_users table
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to read admin_users
CREATE POLICY "Admins can read admin_users"
ON admin_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'is_admin' = 'true'
  )
);

-- Insert initial admin user (replace UUID with your admin user's auth.users.id)
INSERT INTO admin_users (username, user_id)
SELECT 'admin', id
FROM auth.users
WHERE raw_app_meta_data->>'is_admin' = 'true'
LIMIT 1;