/*
  # Fix Anonymous Authentication Support

  1. Updates
    - Modify RLS policies to properly handle anonymous users
    - Add support for temp_user_id in admin_messages
    - Fix application access for anonymous users
    - Update document and application_stage policies

  2. Security
    - Ensure proper access controls for both authenticated and anonymous users
    - Maintain data isolation between users
*/

-- Allow NULL user_id in admin_messages table
ALTER TABLE IF EXISTS public.admin_messages 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add temp_user_id to admin_messages table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_messages' 
    AND column_name = 'temp_user_id'
  ) THEN
    ALTER TABLE public.admin_messages 
      ADD COLUMN temp_user_id UUID;
  END IF;
END $$;

-- Update RLS policies for admin_messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.admin_messages;
CREATE POLICY "Users can view their own messages" 
  ON public.admin_messages
  FOR SELECT
  TO public
  USING (
    (user_id = auth.uid()) OR 
    (temp_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert messages" ON public.admin_messages;
CREATE POLICY "Users can insert messages" 
  ON public.admin_messages
  FOR INSERT
  TO public
  WITH CHECK (
    (user_id = auth.uid()) OR 
    (temp_user_id = auth.uid()) OR
    ((auth.uid() IS NULL) AND (temp_user_id IS NOT NULL))
  );

-- Enable RLS on admin_messages if not already enabled
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Allow NULL user_id in notifications table
ALTER TABLE IF EXISTS public.notifications 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add temp_user_id to notifications table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'temp_user_id'
  ) THEN
    ALTER TABLE public.notifications 
      ADD COLUMN temp_user_id UUID;
  END IF;
END $$;

-- Update RLS policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" 
  ON public.notifications
  FOR SELECT
  TO public
  USING (
    (user_id = auth.uid()) OR 
    (temp_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can mark notifications as read" ON public.notifications;
CREATE POLICY "Users can mark notifications as read" 
  ON public.notifications
  FOR UPDATE
  TO public
  USING (
    (user_id = auth.uid()) OR 
    (temp_user_id = auth.uid())
  )
  WITH CHECK (
    (user_id = auth.uid()) OR 
    (temp_user_id = auth.uid())
  );

-- Enable RLS on notifications if not already enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Fix applications table RLS policies
DROP POLICY IF EXISTS "applications_select_policy" ON public.applications;
CREATE POLICY "applications_select_policy" 
  ON public.applications
  FOR SELECT
  TO public
  USING (
    (temp_user_id = auth.uid()) OR 
    (user_id = auth.uid()) OR 
    ((auth.uid() IS NOT NULL) AND (dealer_id = auth.uid()) AND EXISTS (
      SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND ((auth.users.raw_app_meta_data->>'role') = 'dealer')
    )) OR 
    ((auth.uid() IS NOT NULL) AND EXISTS (
      SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND ((auth.users.raw_app_meta_data->>'role') = 'super_admin')
    ))
  );

-- Add RLS policy for documents to allow anonymous users
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" 
  ON public.documents
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = documents.application_id AND (
        (applications.user_id = auth.uid()) OR
        (applications.temp_user_id = auth.uid())
      )
    )
  );

-- Add RLS policy for application_stages to allow anonymous users
DROP POLICY IF EXISTS "Users can view stages of own applications" ON public.application_stages;
CREATE POLICY "Users can view stages of own applications" 
  ON public.application_stages
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_stages.application_id AND (
        (applications.user_id = auth.uid()) OR
        (applications.temp_user_id = auth.uid())
      )
    )
  );