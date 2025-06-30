/*
  # Fix User Profile Creation

  1. Changes
    - Drop existing trigger on user_profiles table
    - Create or replace function to create user profiles
    - Add trigger on auth.users table to create profiles on signup
    - Ensure proper RLS policies for user_profiles table
  
  2. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Policies ensure users can only access their own profiles
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS "Create_profile_on_signup" ON public.user_profiles;

-- Create or replace function to create user profiles
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'Create_profile_on_auth_user_signup' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER "Create_profile_on_auth_user_signup"
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_profile_for_new_user();
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- If auth.users is not accessible, we'll need to handle this differently
    RAISE NOTICE 'Could not create trigger on auth.users table. Manual profile creation will be required.';
END $$;

-- Ensure user_profiles table exists
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  google_calendar_refresh_token text,
  google_calendar_connected boolean DEFAULT false,
  google_calendar_email text,
  google_calendar_sync_enabled boolean DEFAULT true,
  is_admin boolean DEFAULT false
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create policies for user_profiles
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);