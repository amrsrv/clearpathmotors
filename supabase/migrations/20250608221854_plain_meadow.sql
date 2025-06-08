/*
  # Fix Chat Table and Policies

  1. Changes
    - Create chats table if it doesn't exist
    - Set up proper RLS policies for user access
    - Add unique constraint for one chat per user
    - Create update timestamp trigger
    
  2. Security
    - Enable RLS on chats table
    - Add policies for user and admin access
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

-- Drop existing index if it exists (but not the unique constraint)
DROP INDEX IF EXISTS idx_chats_user_id;

-- Create index for better performance
CREATE INDEX idx_chats_user_id ON chats(user_id);

-- Add unique constraint if it doesn't exist (using DO block to check)
DO $$ 
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chats_user_id_unique' AND conrelid = 'chats'::regclass
  ) THEN
    -- If no constraint exists, check if we need to drop the index first
    IF EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'chats_user_id_unique' AND tablename = 'chats'
    ) THEN
      -- Drop the index if it exists without a constraint
      EXECUTE 'DROP INDEX chats_user_id_unique;';
    END IF;
    
    -- Add the constraint
    ALTER TABLE chats ADD CONSTRAINT chats_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

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