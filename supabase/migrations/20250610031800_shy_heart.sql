/*
  # Add is_admin column and update RLS policies

  1. New Columns
    - Add `is_admin` column to user_profiles table
  
  2. Functions
    - Create sync_admin_status function to keep metadata in sync
    - Update log_admin_action and log_admin_message functions
    - Create is_admin helper function
  
  3. Policies
    - Update all RLS policies to use user_profiles.is_admin instead of JWT metadata
*/

-- Add is_admin column to user_profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Populate is_admin column from JWT app_metadata
UPDATE user_profiles
SET is_admin = ((
  SELECT raw_app_meta_data ->> 'is_admin'
  FROM auth.users
  WHERE id = user_profiles.user_id
)::boolean)
WHERE is_admin IS NULL;

-- Create function to sync is_admin with JWT metadata for backward compatibility
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

-- Create trigger for syncing admin status
DROP TRIGGER IF EXISTS sync_admin_status_trigger ON user_profiles;
CREATE TRIGGER sync_admin_status_trigger
AFTER UPDATE OF is_admin ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_admin_status();

-- Update RLS policies to use user_profiles.is_admin instead of JWT metadata

-- 1. Update policy for activity_log
DROP POLICY IF EXISTS "Admins can insert activity logs" ON activity_log;
CREATE POLICY "Admins can insert activity logs"
  ON activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_log;
CREATE POLICY "Admins can view all activity logs"
  ON activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 2. Update policy for application_flags
DROP POLICY IF EXISTS "Admins can manage flags" ON application_flags;
CREATE POLICY "Admins can manage flags"
  ON application_flags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 3. Update policy for admin_settings
DROP POLICY IF EXISTS "Admins can manage settings" ON admin_settings;
CREATE POLICY "Admins can manage settings"
  ON admin_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 4. Update policy for document_reviews
DROP POLICY IF EXISTS "Admins can manage all document reviews" ON document_reviews;
CREATE POLICY "Admins can manage all document reviews"
  ON document_reviews
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 5. Update policy for audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 6. Update policy for applications
DROP POLICY IF EXISTS "Admins can manage all applications" ON applications;
CREATE POLICY "Admins can manage all applications"
  ON applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 7. Update policy for admin_messages
DROP POLICY IF EXISTS "Admins can insert messages" ON admin_messages;
CREATE POLICY "Admins can insert messages"
  ON admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can view all messages" ON admin_messages;
CREATE POLICY "Admins can view all messages"
  ON admin_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Update database functions to use user_profiles.is_admin

-- 1. Update log_admin_action function - FIX: Remove parameter and use TG_ARGV instead
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
  is_admin_user BOOLEAN;
  current_user_id UUID;
  action_type TEXT;
BEGIN
  -- Get action type from TG_ARGV[0]
  action_type := TG_ARGV[0];
  
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if current user is admin
  SELECT is_admin INTO is_admin_user
  FROM user_profiles
  WHERE user_id = current_user_id;
  
  -- Only log if user is admin
  IF is_admin_user = true THEN
    INSERT INTO activity_log (
      application_id,
      user_id,
      action,
      details,
      is_admin_action
    ) VALUES (
      NEW.id,
      current_user_id,
      action_type || '_application',
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      ),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing triggers to pass the action type as an argument
DROP TRIGGER IF EXISTS applications_audit_insert ON applications;
CREATE TRIGGER applications_audit_insert
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION log_admin_action('insert');

DROP TRIGGER IF EXISTS applications_audit_update ON applications;
CREATE TRIGGER applications_audit_update
AFTER UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION log_admin_action('update');

-- 2. Update log_admin_message function
CREATE OR REPLACE FUNCTION log_admin_message()
RETURNS TRIGGER AS $$
DECLARE
  is_admin_user BOOLEAN;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if current user is admin
  SELECT is_admin INTO is_admin_user
  FROM user_profiles
  WHERE user_id = current_user_id;
  
  -- Create notification for user when admin sends a message
  IF NEW.is_admin = true AND NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      read
    ) VALUES (
      NEW.user_id,
      'New Message from Support',
      substring(NEW.message from 1 for 100) || CASE WHEN length(NEW.message) > 100 THEN '...' ELSE '' END,
      false
    );
  END IF;
  
  -- Log the message in activity log
  INSERT INTO activity_log (
    application_id,
    user_id,
    action,
    details,
    is_admin_action
  ) VALUES (
    NEW.application_id,
    CASE WHEN NEW.is_admin THEN NEW.admin_id ELSE NEW.user_id END,
    CASE WHEN NEW.is_admin THEN 'admin_message_sent' ELSE 'user_message_sent' END,
    jsonb_build_object(
      'message_id', NEW.id,
      'is_admin', NEW.is_admin
    ),
    NEW.is_admin
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM user_profiles
  WHERE user_id = $1;
  
  RETURN COALESCE(admin_status, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;