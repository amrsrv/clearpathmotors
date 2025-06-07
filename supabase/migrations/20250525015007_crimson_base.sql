/*
  # Add admin authentication fields

  1. Changes
    - Add `auth_id` column to `admin_users` table to link with auth.users
    - Remove `user_id` column as we'll use `auth_id` instead
    - Add unique constraint on auth_id
    - Update RLS policies to use auth_id

  2. Security
    - Maintain RLS enabled
    - Update policies to check auth_id
*/

-- Add auth_id column
ALTER TABLE admin_users 
ADD COLUMN auth_id uuid REFERENCES auth.users(id);

-- Make auth_id unique
ALTER TABLE admin_users
ADD CONSTRAINT admin_users_auth_id_key UNIQUE (auth_id);

-- Drop the old user_id foreign key constraint
ALTER TABLE admin_users
DROP CONSTRAINT admin_users_user_id_fkey;

-- Drop the user_id column
ALTER TABLE admin_users
DROP COLUMN user_id;

-- Update RLS policies
DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;

CREATE POLICY "Admins can read admin_users"
ON admin_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);