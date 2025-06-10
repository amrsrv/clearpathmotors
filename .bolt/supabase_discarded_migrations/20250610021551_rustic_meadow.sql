/*
  # Fix Admin Messages and Notifications

  1. New Indexes
    - Add indexes to improve query performance for admin_messages table
    - Add indexes for notifications table
  
  2. Updates
    - Fix admin_messages policies to ensure proper access
    - Update notification triggers for admin messages
    - Add missing foreign key constraints
*/

-- Add missing indexes for admin_messages
CREATE INDEX IF NOT EXISTS idx_admin_messages_admin_id ON public.admin_messages(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_application_id ON public.admin_messages(application_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_user_id ON public.admin_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_read ON public.admin_messages(read);

-- Add missing indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Drop existing policies on admin_messages to recreate them
DROP POLICY IF EXISTS "Admins can insert messages" ON public.admin_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.admin_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.admin_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.admin_messages;

-- Create improved policies for admin_messages
CREATE POLICY "Admins can insert messages"
  ON public.admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ((users.raw_app_meta_data ->> 'is_admin')::boolean = true)
    )
  );

CREATE POLICY "Admins can view all messages"
  ON public.admin_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND ((users.raw_app_meta_data ->> 'is_admin')::boolean = true)
    )
  );

CREATE POLICY "Users can insert messages"
  ON public.admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own messages"
  ON public.admin_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Ensure RLS is enabled on admin_messages
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Update or create the log_admin_message function to ensure it works correctly
CREATE OR REPLACE FUNCTION public.log_admin_message()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql;

-- Recreate the trigger for admin messages
DROP TRIGGER IF EXISTS log_admin_message_changes ON public.admin_messages;
CREATE TRIGGER log_admin_message_changes
AFTER INSERT ON public.admin_messages
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_message();

-- Add missing foreign key constraints if needed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_messages_admin_id_fkey'
  ) THEN
    ALTER TABLE public.admin_messages
    ADD CONSTRAINT admin_messages_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_messages_user_id_fkey'
  ) THEN
    ALTER TABLE public.admin_messages
    ADD CONSTRAINT admin_messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_messages_application_id_fkey'
  ) THEN
    ALTER TABLE public.admin_messages
    ADD CONSTRAINT admin_messages_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES applications(id);
  END IF;
END $$;