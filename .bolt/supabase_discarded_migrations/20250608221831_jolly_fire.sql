/*
  # Create chats table for user support chat widget

  1. New Tables
    - `chats` - Stores chat history between users and support
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null)
      - `messages` (jsonb array)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on chats table
    - Add policies for user and admin access
    - Create unique index on user_id
    - Add update timestamp trigger
*/

-- Create chats table if it doesn't exist
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamp without time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own chats" ON chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
DROP POLICY IF EXISTS "Users can update own chats" ON chats;
DROP POLICY IF EXISTS "Users can read own chats" ON chats;
DROP POLICY IF EXISTS "Admins can manage all chats" ON chats;

-- Create policies
CREATE POLICY "Users can read own chats"
  ON chats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chats"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chats"
  ON chats FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all chats"
  ON chats FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
    )
  );

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_chats_user_id;
DROP INDEX IF EXISTS chats_user_id_unique;

-- Create index for better performance
CREATE INDEX idx_chats_user_id ON chats(user_id);

-- Create unique index for user_id to ensure one chat per user
CREATE UNIQUE INDEX chats_user_id_unique ON chats(user_id);

-- Create function to update timestamp on chat update
CREATE OR REPLACE FUNCTION update_chats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_chats_timestamp ON chats;

-- Create trigger to update timestamp
CREATE TRIGGER update_chats_timestamp
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_chats_timestamp();