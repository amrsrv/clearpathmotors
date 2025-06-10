/*
  # Chat Messages Migration

  1. New Tables
    - `chat_messages` - Stores individual chat messages
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key to chats)
      - `user_id` (uuid, foreign key to auth.users)
      - `role` (text, either 'user' or 'assistant')
      - `content` (text)
      - `created_at` (timestamptz)
      - `read` (boolean)

  2. Security
    - Enable RLS on `chat_messages` table
    - Add policies for admins and users

  3. Changes
    - Migrate existing chat messages from JSONB array to individual records
    - Create indexes for performance optimization
*/

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages (chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages (read);

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

  -- Users can insert their own messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' AND policyname = 'Users can insert own messages'
  ) THEN
    CREATE POLICY "Users can insert own messages"
      ON chat_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Users can read messages from their chats
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' AND policyname = 'Users can read own chat messages'
  ) THEN
    CREATE POLICY "Users can read own chat messages"
      ON chat_messages
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM chats
          WHERE chats.id = chat_messages.chat_id
          AND chats.user_id = auth.uid()
        )
      );
  END IF;

  -- Users can update their own messages (e.g., mark as read)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' AND policyname = 'Users can update own messages'
  ) THEN
    CREATE POLICY "Users can update own messages"
      ON chat_messages
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- Create function to migrate existing chat data to the new structure
CREATE OR REPLACE FUNCTION migrate_chat_messages()
RETURNS void AS $$
DECLARE
  chat_record RECORD;
  message JSONB;
BEGIN
  -- Loop through all chats
  FOR chat_record IN SELECT id, user_id, messages FROM chats WHERE jsonb_array_length(messages) > 0
  LOOP
    -- Loop through each message in the chat
    FOR message IN SELECT * FROM jsonb_array_elements(chat_record.messages)
    LOOP
      -- Insert the message into the new table
      INSERT INTO chat_messages (
        chat_id,
        user_id,
        role,
        content,
        created_at,
        read
      ) VALUES (
        chat_record.id,
        chat_record.user_id,
        message->>'role',
        message->>'content',
        (message->>'timestamp')::timestamptz,
        CASE 
          WHEN message->>'role' = 'assistant' THEN 
            COALESCE((message->>'status' = 'read')::boolean, false)
          ELSE true
        END
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_chat_messages();

-- Drop the migration function after use
DROP FUNCTION migrate_chat_messages();