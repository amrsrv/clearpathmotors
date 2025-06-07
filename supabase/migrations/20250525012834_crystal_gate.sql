/*
  # Add email column to admin_users table

  1. Changes
    - Add email column to admin_users table
      - Required field
      - Must be unique
      - Matches user's email from auth.users
  
  2. Security
    - Maintain existing RLS policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN email text NOT NULL;
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_email_key UNIQUE (email);
  END IF;
END $$;