/*
  # Fix Dashboard Loading Issues

  1. Schema Changes
    - Allow NULL user_id in notifications table
    - Add temp_user_id column to notifications table
    - Enable RLS on relevant tables
  
  2. Security
    - Update RLS policies for notifications
    - Fix chats table RLS policies
    - Fix applications table RLS policies
    - Fix chat_messages table RLS policies
*/

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

-- Fix chats table RLS policies
DROP POLICY IF EXISTS "Users can read own chats" ON public.chats;
CREATE POLICY "Users can read own chats" 
  ON public.chats
  FOR SELECT
  TO public
  USING (
    (user_id = auth.uid()) OR 
    (anonymous_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own chats" ON public.chats;
CREATE POLICY "Users can update own chats" 
  ON public.chats
  FOR UPDATE
  TO public
  USING (
    (user_id = auth.uid()) OR 
    (anonymous_id = auth.uid())
  )
  WITH CHECK (
    (user_id = auth.uid()) OR 
    (anonymous_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own chats" ON public.chats;
CREATE POLICY "Users can insert own chats" 
  ON public.chats
  FOR INSERT
  TO public
  WITH CHECK (
    ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR 
    ((auth.uid() IS NULL) AND (anonymous_id IS NOT NULL))
  );

-- Enable RLS on chats if not already enabled
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

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

-- Fix chat_messages table RLS policies
DROP POLICY IF EXISTS "Users can read own chat messages" ON public.chat_messages;
CREATE POLICY "Users can read own chat messages" 
  ON public.chat_messages
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id AND (
        (chats.user_id = auth.uid()) OR 
        (chats.anonymous_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert own chat messages" 
  ON public.chat_messages
  FOR INSERT
  TO public
  WITH CHECK (
    (user_id = auth.uid()) OR 
    (anonymous_id = auth.uid()) OR
    (anonymous_id IS NOT NULL AND auth.uid() IS NULL) OR
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id AND (
        (chats.user_id = auth.uid()) OR 
        (chats.anonymous_id = auth.uid())
      )
    )
  );

-- Enable RLS on chat_messages if not already enabled
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;