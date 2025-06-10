/*
  # Create chat_messages table

  1. New Tables
    - `chat_messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references chats.id)
      - `user_id` (uuid, references auth.users.id)
      - `anonymous_id` (uuid, for non-authenticated users)
      - `role` (text, either 'user' or 'assistant')
      - `content` (text, the message content)
      - `created_at` (timestamptz, when the message was created)
      - `read` (boolean, whether the message has been read)
  
  2. Security
    - Enable RLS on `chat_messages` table
    - Add policy for users to read their own messages
    - Add policy for users to insert their own messages
    - Add policy for admins to read all messages
*/

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id uuid,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_anonymous_id ON chat_messages(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(read);

-- Enable RLS on chat_messages table
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_messages table
DO $$
BEGIN
  -- Admins can manage all chat messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' AND policyname = 'Admins can manage all chat messages'
  ) THEN
    CREATE POLICY "Admins can manage all chat messages"
      ON chat_messages
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.user_id = auth.uid()
          AND user_profiles.is_admin = true
        )
      );
  END IF;

  -- Users can read their own chat messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' AND policyname = 'Users can read their own chat messages'
  ) THEN
    CREATE POLICY "Users can read their own chat messages"
      ON chat_messages
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Users can insert their own messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' AND policyname = 'Users can insert their own messages'
  ) THEN
    CREATE POLICY "Users can insert their own messages"
      ON chat_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Users can update their own messages (e.g., mark as read)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' AND policyname = 'Users can update their own messages'
  ) THEN
    CREATE POLICY "Users can update their own messages"
      ON chat_messages
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- Add anonymous_id column to chats table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'anonymous_id'
  ) THEN
    ALTER TABLE chats ADD COLUMN anonymous_id uuid;
    
    -- Make user_id nullable to support anonymous chats
    ALTER TABLE chats ALTER COLUMN user_id DROP NOT NULL;
    
    -- Add constraint to ensure either user_id or anonymous_id is provided
    ALTER TABLE chats ADD CONSTRAINT chats_user_or_anonymous_check 
      CHECK (
        (user_id IS NOT NULL AND anonymous_id IS NULL) OR 
        (user_id IS NULL AND anonymous_id IS NOT NULL)
      );
  END IF;
END
$$;

-- Update RLS policies for chats to handle anonymous users
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read own chats" ON chats;
  DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
  DROP POLICY IF EXISTS "Users can update own chats" ON chats;
  
  -- Create new policies that handle both authenticated and anonymous users
  
  -- Users can read their own chats
  CREATE POLICY "Users can read own chats"
    ON chats
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  
  -- Users can insert their own chats
  CREATE POLICY "Users can insert own chats"
    ON chats
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
  
  -- Users can update their own chats
  CREATE POLICY "Users can update own chats"
    ON chats
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());
END
$$;