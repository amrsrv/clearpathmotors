/*
  # Create chat_messages table for chatbot functionality

  1. New Tables
    - `chat_messages` - Stores individual chat messages
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references chats)
      - `user_id` (uuid, references auth.users)
      - `anonymous_id` (uuid, for unauthenticated users)
      - `role` (text, either 'user' or 'assistant')
      - `content` (text, the message content)
      - `created_at` (timestamp)
      - `read` (boolean)
  
  2. Security
    - Enable RLS on chat_messages table
    - Add policies for user and admin access
    - Create indexes for efficient queries
*/

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id uuid,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_messages
CREATE POLICY "Users can read own chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own chat messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

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

-- Create indexes for better performance
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_anonymous_id ON chat_messages(anonymous_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_read ON chat_messages(read);

-- Modify chats table to support anonymous users
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS anonymous_id uuid;

-- Drop unique constraint on user_id if it exists
ALTER TABLE chats
  DROP CONSTRAINT IF EXISTS chats_user_id_unique;

-- Add unique constraint on user_id where user_id is not null
ALTER TABLE chats
  ADD CONSTRAINT chats_user_id_unique UNIQUE (user_id) 
  DEFERRABLE INITIALLY DEFERRED;

-- Add unique constraint on anonymous_id where anonymous_id is not null
ALTER TABLE chats
  ADD CONSTRAINT chats_anonymous_id_unique UNIQUE (anonymous_id) 
  DEFERRABLE INITIALLY DEFERRED;

-- Create index for anonymous_id
CREATE INDEX IF NOT EXISTS idx_chats_anonymous_id ON chats(anonymous_id);

-- Update RLS policies for chats to handle anonymous users
DROP POLICY IF EXISTS "Users can read own chats" ON chats;
CREATE POLICY "Users can read own chats"
  ON chats
  FOR SELECT
  TO public
  USING (
    user_id = auth.uid() OR
    anonymous_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
CREATE POLICY "Users can insert own chats"
  ON chats
  FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can update own chats" ON chats;
CREATE POLICY "Users can update own chats"
  ON chats
  FOR UPDATE
  TO public
  USING (
    user_id = auth.uid() OR
    anonymous_id = auth.uid()
  );