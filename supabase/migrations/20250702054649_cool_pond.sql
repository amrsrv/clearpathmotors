/*
  # Remove Dealer-Related Functionality

  1. Changes
     - Safely drop dealer-related views, columns, and tables
     - Update RLS policies to remove dealer-specific access
     - Update user roles to convert 'dealer' to 'customer'
     - Drop dealer-related functions and triggers
     - Clean up related indexes

  2. Security
     - Updates RLS policies to maintain proper access control
*/

-- First check if the view exists before dropping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'applications_with_dealer'
  ) THEN
    DROP VIEW applications_with_dealer;
  END IF;
END
$$;

-- Check if dealer_id column exists in applications table before dropping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'dealer_id'
  ) THEN
    -- Now we can safely drop the dealer_id column from applications table
    ALTER TABLE applications DROP COLUMN dealer_id;
  END IF;
END
$$;

-- Check if dealer_profiles table exists before dropping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'dealer_profiles'
  ) THEN
    -- Drop the dealer_profiles table if it exists
    DROP TABLE dealer_profiles CASCADE;
  END IF;
END
$$;

-- Check if dealers table exists before dropping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'dealers'
  ) THEN
    -- Drop the dealers table if it exists
    DROP TABLE dealers CASCADE;
  END IF;
END
$$;

-- Update RLS policies for applications to remove dealer-specific access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'applications_select_policy'
  ) THEN
    DROP POLICY "applications_select_policy" ON applications;
  END IF;
END
$$;

CREATE POLICY "applications_select_policy" 
  ON applications
  FOR SELECT
  TO public
  USING (
    (temp_user_id = auth.uid()) OR 
    (user_id = auth.uid()) OR 
    ((auth.uid() IS NOT NULL) AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND ((auth.users.raw_app_meta_data->>'role')::text = 'super_admin')
    ))
  );

-- Update applications update policy to remove dealer-specific access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'applications_update_policy'
  ) THEN
    DROP POLICY "applications_update_policy" ON applications;
  END IF;
END
$$;

CREATE POLICY "applications_update_policy" 
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid()) OR 
    (get_user_role_safe(auth.uid()) = 'super_admin')
  )
  WITH CHECK (
    (user_id = auth.uid()) OR 
    (get_user_role_safe(auth.uid()) = 'super_admin')
  );

-- Update the get_user_role_safe function to handle the new enum
CREATE OR REPLACE FUNCTION get_user_role_safe(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return the role from user metadata, defaulting to 'customer'
  RETURN COALESCE(
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = user_uuid),
    'customer'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'customer';
END;
$$;

-- Remove any dealer role assignments from users
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  raw_app_meta_data,
  '{role}',
  '"customer"'
)
WHERE raw_app_meta_data->>'role' = 'dealer';

-- Check if the function exists before dropping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'assign_dealer_role'
  ) THEN
    -- Drop the assign_dealer_role function if it exists
    DROP FUNCTION assign_dealer_role() CASCADE;
  END IF;
END
$$;

-- Remove any indexes related to dealer_id if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_applications_dealer_id'
  ) THEN
    DROP INDEX idx_applications_dealer_id;
  END IF;
END
$$;

-- Create a new enum type without 'dealer' if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
    -- Create a new enum type without 'dealer'
    CREATE TYPE user_role_enum_new AS ENUM ('super_admin', 'customer');
    
    -- Note: We're not actually replacing the enum type in this migration
    -- as that would require updating all columns using it, which is complex
    -- and might require additional migrations
  END IF;
END
$$;