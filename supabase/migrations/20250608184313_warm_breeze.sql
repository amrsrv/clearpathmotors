/*
  # Create Chats Table for Chat Widget

  1. New Table
    - `chats` - Stores chat conversations between users and the system
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null)
      - `messages` (jsonb, default empty array)
      - `created_at` (timestamp, default now)
  
  2. Security
    - Enable RLS on chats table
    - Add policies for users to manage their own chats
    - Add policy for admins to manage all chats
*/

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamp without time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own chats" ON chats;
  DROP POLICY IF EXISTS "Users can insert own chats" ON chats;
  DROP POLICY IF EXISTS "Users can update own chats" ON chats;
  DROP POLICY IF EXISTS "Admins can manage all chats" ON chats;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Users can view own chats"
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

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_chats_user_id;

-- Create index for better performance
CREATE INDEX idx_chats_user_id ON chats(user_id);

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS update_chats_timestamp ON chats;
DROP FUNCTION IF EXISTS update_chats_timestamp();

-- Create function to update timestamp on chat update
CREATE OR REPLACE FUNCTION update_chats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp
CREATE TRIGGER update_chats_timestamp
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_chats_timestamp();