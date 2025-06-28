/*
  # Create dealers table

  1. New Tables
    - `dealers`
      - `id` (uuid, primary key, references auth.users)
      - `dealername` (text, not null)
      - `created_at` (timestamp with time zone)
  2. Security
    - Enable RLS on `dealers` table
    - Add policy for super admins to manage dealers
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS dealers;

-- Create dealers table without username field
CREATE TABLE IF NOT EXISTS dealers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dealername text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;

-- Create policy for super_admin access
CREATE POLICY "Super admins can manage dealers"
  ON dealers
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'super_admin'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_dealers_dealername ON dealers(dealername);