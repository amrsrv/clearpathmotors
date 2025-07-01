/*
  # Add Anonymous User Support to Admin Messages

  1. New Features
     - Add temp_user_id column to admin_messages table
     - Update RLS policies to allow anonymous users to access their messages
  
  2. Security
     - Ensure proper access control for both authenticated and anonymous users
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