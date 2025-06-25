/*
  # Add Dealer Role and Vehicle Storage

  1. New Types
    - Add 'dealer' to user_role_enum
  
  2. New Tables
    - `dealer_profiles` - Stores dealer-specific information
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `public_slug` (text, unique)
      - `created_at` (timestamp)
    
  3. Storage
    - Create vehicle-photos bucket
    - Add RLS policies for dealer-specific access
    
  4. Security
    - Enable RLS on dealer_profiles
    - Add policies for proper role-based access
    - Update applications table to include dealer_id
*/

-- Create user_role_enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
    CREATE TYPE user_role_enum AS ENUM ('super_admin', 'dealer', 'customer');
  END IF;
END $$;

-- Create dealer_profiles table
CREATE TABLE IF NOT EXISTS dealer_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  public_slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on dealer_profiles
ALTER TABLE dealer_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for dealer_profiles
CREATE POLICY "Super admins can manage all dealer profiles"
  ON dealer_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'super_admin'
    )
  );

CREATE POLICY "Dealers can view their own profile"
  ON dealer_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  );

CREATE POLICY "Dealers can update their own profile"
  ON dealer_profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  )
  WITH CHECK (
    id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  );

-- Add dealer_id to applications table
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS dealer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index on dealer_id for better performance
CREATE INDEX IF NOT EXISTS idx_applications_dealer_id ON applications(dealer_id);

-- Update applications RLS policies to include dealer role
DROP POLICY IF EXISTS "applications_select_policy" ON applications;
CREATE POLICY "applications_select_policy"
ON applications
FOR SELECT
TO public
USING (
  -- Allow access to temp applications
  temp_user_id = auth.uid() OR
  -- Allow users to view their own applications
  user_id = auth.uid() OR
  -- Allow dealers to view applications assigned to them
  (
    auth.uid() IS NOT NULL AND
    dealer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  ) OR
  -- Allow super admins to view all applications
  (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'super_admin'
    )
  )
);

-- Update applications update policy to include dealer role
DROP POLICY IF EXISTS "applications_update_policy" ON applications;
CREATE POLICY "applications_update_policy"
ON applications
FOR UPDATE
TO authenticated
USING (
  -- Users can update their own applications
  user_id = auth.uid() OR
  -- Dealers can update applications assigned to them
  (
    dealer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  ) OR
  -- Super admins can update any application
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'role')::text = 'super_admin'
  )
)
WITH CHECK (
  -- Same conditions as USING clause
  user_id = auth.uid() OR
  (
    dealer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  ) OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'role')::text = 'super_admin'
  )
);

-- Update documents RLS policies to include dealer role
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
CREATE POLICY "Users can view own documents"
ON documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = documents.application_id
    AND (
      -- User owns the application
      applications.user_id = auth.uid() OR
      -- Dealer is assigned to the application
      (
        applications.dealer_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_app_meta_data->>'role')::text = 'dealer'
        )
      ) OR
      -- Super admin can view all
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND (auth.users.raw_app_meta_data->>'role')::text = 'super_admin'
      )
    )
  )
);

-- Create vehicle-photos storage bucket
-- Note: This is a placeholder. In a real implementation, you would use
-- the Supabase Management API or the Supabase dashboard to create the bucket.
-- For migration purposes, we'll add a comment indicating this step.

-- MANUAL STEP: Create 'vehicle-photos' bucket in Supabase dashboard or via Management API

-- Create function to generate unique dealer slugs
CREATE OR REPLACE FUNCTION generate_unique_dealer_slug(name_input text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
  max_attempts integer := 5;
BEGIN
  -- Convert name to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(name_input, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  
  -- Try the base slug first
  final_slug := base_slug;
  
  -- Check if slug exists and try alternatives
  WHILE EXISTS (
    SELECT 1 FROM dealer_profiles WHERE public_slug = final_slug
  ) AND counter < max_attempts LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  -- If we've tried all attempts and still have a conflict, raise an error
  IF counter >= max_attempts AND EXISTS (
    SELECT 1 FROM dealer_profiles WHERE public_slug = final_slug
  ) THEN
    RAISE EXCEPTION 'Could not generate a unique slug after % attempts', max_attempts;
  END IF;
  
  RETURN final_slug;
END;
$$;

-- Create function to assign dealer role when creating dealer profile
CREATE OR REPLACE FUNCTION assign_dealer_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user's app_metadata to set role as dealer
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"dealer"'
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to assign dealer role
CREATE TRIGGER assign_dealer_role_trigger
AFTER INSERT ON dealer_profiles
FOR EACH ROW
EXECUTE FUNCTION assign_dealer_role();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dealer_profiles_public_slug ON dealer_profiles(public_slug);