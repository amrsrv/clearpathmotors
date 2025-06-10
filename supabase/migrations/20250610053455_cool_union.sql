/*
  # Chatbot Anonymous Users Support

  1. Changes
     - Modify chat_messages table to support anonymous users
     - Drop foreign key constraint on user_id
     - Add anonymous_id column for tracking non-authenticated users
     - Update RLS policies to handle anonymous users

  2. Security
     - Maintain RLS policies for authenticated users
     - Add policies for anonymous users with their anonymous_id
*/

-- First, drop the foreign key constraint on user_id
ALTER TABLE IF EXISTS chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

-- Add anonymous_id column to track non-authenticated users
ALTER TABLE IF EXISTS chat_messages
  ADD COLUMN IF NOT EXISTS anonymous_id uuid;

-- Update RLS policies for chat_messages to handle anonymous users
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read own chat messages" ON chat_messages;
  DROP POLICY IF EXISTS "Users can insert own messages" ON chat_messages;
  DROP POLICY IF EXISTS "Users can update own messages" ON chat_messages;
  
  -- Create new policies that handle both authenticated and anonymous users
  
  -- Users can read messages from their chats (authenticated or anonymous)
  CREATE POLICY "Users can read chat messages"
    ON chat_messages
    FOR SELECT
    USING (
      (user_id = auth.uid() AND auth.uid() IS NOT NULL) OR
      (anonymous_id = chat_messages.anonymous_id AND anonymous_id IS NOT NULL)
    );
  
  -- Users can insert their own messages (authenticated or anonymous)
  CREATE POLICY "Users can insert messages"
    ON chat_messages
    FOR INSERT
    WITH CHECK (
      (user_id = auth.uid() AND auth.uid() IS NOT NULL) OR
      (anonymous_id IS NOT NULL)
    );
  
  -- Users can update their own messages (authenticated or anonymous)
  CREATE POLICY "Users can update messages"
    ON chat_messages
    FOR UPDATE
    USING (
      (user_id = auth.uid() AND auth.uid() IS NOT NULL) OR
      (anonymous_id = chat_messages.anonymous_id AND anonymous_id IS NOT NULL)
    );
END
$$;

-- Add similar changes to the chats table to support anonymous users
ALTER TABLE IF EXISTS chats
  ADD COLUMN IF NOT EXISTS anonymous_id uuid;

-- Update RLS policies for chats to handle anonymous users
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read own chats" ON chats;
  DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
  DROP POLICY IF EXISTS "Users can update own chats" ON chats;
  
  -- Create new policies that handle both authenticated and anonymous users
  
  -- Users can read their own chats (authenticated or anonymous)
  CREATE POLICY "Users can read chats"
    ON chats
    FOR SELECT
    USING (
      (user_id = auth.uid() AND auth.uid() IS NOT NULL) OR
      (anonymous_id = chats.anonymous_id AND anonymous_id IS NOT NULL)
    );
  
  -- Users can insert their own chats (authenticated or anonymous)
  CREATE POLICY "Users can insert chats"
    ON chats
    FOR INSERT
    WITH CHECK (
      (user_id = auth.uid() AND auth.uid() IS NOT NULL) OR
      (anonymous_id IS NOT NULL)
    );
  
  -- Users can update their own chats (authenticated or anonymous)
  CREATE POLICY "Users can update chats"
    ON chats
    FOR UPDATE
    USING (
      (user_id = auth.uid() AND auth.uid() IS NOT NULL) OR
      (anonymous_id = chats.anonymous_id AND anonymous_id IS NOT NULL)
    );
END
$$;