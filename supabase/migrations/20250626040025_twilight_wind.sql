/*
  # Add dealers table for dealer login

  1. New Tables
    - `dealers` - Stores dealer login credentials
      - `id` (uuid, primary key)
      - `dealer_name` (text, not null)
      - `username` (text, not null, unique)
      - `password` (text, not null)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on dealers table
    - Add policy for super_admin access
*/

-- Create dealers table
CREATE TABLE IF NOT EXISTS dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_name text NOT NULL,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;

-- Create policy for super_admin access
CREATE POLICY "Super admins can manage dealers"
  ON dealers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'super_admin'
    )
  );

-- Create index for better performance
CREATE INDEX idx_dealers_username ON dealers(username);