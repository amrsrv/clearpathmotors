/*
  # Fix Chat Widget Schema

  1. New Tables
    - Ensure chats table exists with proper structure
    - Add missing indexes for performance
  2. Security
    - Enable RLS on chats table
    - Add proper policies for user access
*/

-- Create chats table if it doesn't exist
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamp without time zone DEFAULT now()
);

-- Create unique index on user_id to ensure one chat per user
CREATE UNIQUE INDEX IF NOT EXISTS chats_user_id_unique ON chats (user_id);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats (user_id);

-- Enable RLS on chats table
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chats table
DO $$
BEGIN
  -- Admins can manage all chats
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chats' AND policyname = 'Admins can manage all chats'
  ) THEN
    CREATE POLICY "Admins can manage all chats"
      ON chats
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

  -- Users can insert own chats
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chats' AND policyname = 'Users can insert own chats'
  ) THEN
    CREATE POLICY "Users can insert own chats"
      ON chats
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Users can read own chats
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chats' AND policyname = 'Users can read own chats'
  ) THEN
    CREATE POLICY "Users can read own chats"
      ON chats
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Users can update own chats
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chats' AND policyname = 'Users can update own chats'
  ) THEN
    CREATE POLICY "Users can update own chats"
      ON chats
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- Create function to update timestamp on chat update
CREATE OR REPLACE FUNCTION update_chats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp on chat update
DROP TRIGGER IF EXISTS update_chats_timestamp ON chats;
CREATE TRIGGER update_chats_timestamp
BEFORE UPDATE ON chats
FOR EACH ROW
EXECUTE FUNCTION update_chats_timestamp();