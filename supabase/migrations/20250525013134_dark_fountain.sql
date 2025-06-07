/*
  # Update admin_users table

  1. Changes
    - Add email column to admin_users table
    - Add user_id column to admin_users table
    - Add foreign key constraint to auth.users
  
  2. Security
    - Update RLS policy for admin access
*/

-- Add email column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'email'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN email text UNIQUE;
  END IF;
END $$;

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_users_user_id_fkey'
  ) THEN
    ALTER TABLE admin_users 
    ADD CONSTRAINT admin_users_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;

-- Create updated policy for admins
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

-- Update admin user if they exist, otherwise insert
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM admin_users WHERE username = 'admin'
  ) THEN
    UPDATE admin_users 
    SET user_id = auth.users.id,
        email = auth.users.email
    FROM auth.users 
    WHERE auth.users.email = 'AmirAdmin'
    AND admin_users.username = 'admin';
  ELSE
    INSERT INTO admin_users (username, user_id, email)
    SELECT 'admin', id, email
    FROM auth.users
    WHERE email = 'AmirAdmin'
    LIMIT 1;
  END IF;
END $$;