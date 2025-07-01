/*
  # Fix RLS Policies for Anonymous Users

  1. Changes
    - Remove problematic RLS policies that use current_setting() function
    - Create new policies that properly handle UUID comparisons
    - Fix policies for admin_messages, notifications, and other tables
    - Ensure proper handling of anonymous users with temp_user_id
  
  2. Security
    - Maintain proper access control
    - Fix type mismatch errors in RLS policies
*/

-- Fix admin_messages RLS policies
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
    (auth.uid() IS NULL AND temp_user_id IS NOT NULL)
  );

-- Fix notifications RLS policies
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

-- Fix chats RLS policies
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
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

-- Fix chat_messages RLS policies
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
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL) OR
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id AND (
        (chats.user_id = auth.uid()) OR 
        (chats.anonymous_id = auth.uid())
      )
    )
  );

-- Fix applications RLS policies
DROP POLICY IF EXISTS "applications_select_policy" ON public.applications;
CREATE POLICY "applications_select_policy" 
  ON public.applications
  FOR SELECT
  TO public
  USING (
    (temp_user_id = auth.uid()) OR 
    (user_id = auth.uid()) OR 
    (auth.uid() IS NOT NULL AND dealer_id = auth.uid() AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_app_meta_data->>'role') = 'dealer'
    )) OR 
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_app_meta_data->>'role') = 'super_admin'
    ))
  );

-- Fix documents RLS policies
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

-- Fix application_stages RLS policies
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