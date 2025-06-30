/*
  # Create sync_admin_status function

  1. New Functions
    - `sync_admin_status`: Synchronizes is_admin status between user_profiles and auth.users
  
  2. Triggers
    - Add trigger on user_profiles table to call sync_admin_status after is_admin updates
  
  3. Purpose
    - Ensures consistency between user_profiles.is_admin and auth.users.raw_app_meta_data
    - Maintains proper admin role assignment across the system
*/

-- Create function to sync is_admin status with auth.users.raw_app_meta_data
CREATE OR REPLACE FUNCTION sync_admin_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When is_admin changes in user_profiles, update auth.users.raw_app_meta_data
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    UPDATE auth.users
    SET raw_app_meta_data = 
      CASE 
        WHEN NEW.is_admin = true THEN 
          jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{is_admin}', 'true'::jsonb)
        ELSE
          jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{is_admin}', 'false'::jsonb)
      END
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for syncing admin status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'sync_admin_status_trigger' 
    AND tgrelid = 'public.user_profiles'::regclass
  ) THEN
    CREATE TRIGGER sync_admin_status_trigger
    AFTER UPDATE OF is_admin ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_admin_status();
  END IF;
END $$;

-- Create trigger for syncing admin status when is_admin is updated
DROP TRIGGER IF EXISTS after_update_is_admin ON public.user_profiles;
CREATE TRIGGER after_update_is_admin
AFTER UPDATE OF is_admin ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_admin_status();

-- Create trigger for syncing admin status when user_profiles is updated
DROP TRIGGER IF EXISTS update_admin_status ON public.user_profiles;
CREATE TRIGGER update_admin_status
AFTER UPDATE OF is_admin ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_admin_status();