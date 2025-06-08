/*
  # Create chats table for chatbot functionality

  1. New Tables
    - `chats`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `messages` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `chats` table
    - Add policies for user access
    - Create indexes for performance
*/

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Create policies for chats
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

-- Create policy for admins
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

-- Create indexes
CREATE INDEX idx_chats_user_id ON chats(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_chats_timestamp
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_chats_timestamp();