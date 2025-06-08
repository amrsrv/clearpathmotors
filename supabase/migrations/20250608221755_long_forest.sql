/*
  # Fix Chat Widget Database Schema

  1. Changes
    - Create chats table if it doesn't exist
    - Add unique constraint on user_id
    - Fix policy creation to avoid duplicates
    
  2. Security
    - Maintain RLS policies for proper access control
    - Ensure users can only access their own chats
*/

-- Create chats table if it doesn't exist
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamp without time zone DEFAULT now()
);

-- Add unique constraint on user_id to ensure one chat per user
ALTER TABLE chats 
ADD CONSTRAINT IF NOT EXISTS chats_user_id_unique UNIQUE (user_id);

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

-- Create index for better performance if it doesn't exist
DROP INDEX IF EXISTS idx_chats_user_id;
CREATE INDEX idx_chats_user_id ON chats(user_id);

-- Create unique index for user_id if it doesn't exist
DROP INDEX IF EXISTS chats_user_id_unique;
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