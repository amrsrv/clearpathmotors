/*
  # Fix Admin Messages RLS Policies

  1. Changes
     - Add temp_user_id column to admin_messages table if it doesn't exist
     - Update RLS policies for admin_messages to support anonymous users
     - Fix existing policies to properly handle temp_user_id

  2. Security
     - Enable RLS on admin_messages table
     - Add policies for authenticated and anonymous users
*/

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

-- Fix insert policy for admin_messages
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