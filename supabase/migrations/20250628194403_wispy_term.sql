/*
  # Remove username field from dealers table

  1. Changes
    - Drop existing dealers table if it exists
    - Create dealers table with only id, dealername, and created_at fields
    - Enable RLS on the table
    - Create policy for super_admin access
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
  USING (role() = 'super_admin');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_dealers_dealername ON dealers(dealername);