/*
  # Add Application Form Data Columns

  1. Changes
    - Add columns to store form data
    - Add validation constraints if they don't exist
    - Update RLS policies
  
  2. Security
    - Maintain RLS enabled
    - Update insert policy
*/

-- Add form data columns if they don't exist
DO $$ 
BEGIN
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS first_name text;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS last_name text;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS email text;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS phone text;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS address text;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS city text;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS province text;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS postal_code text;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS annual_income numeric;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS monthly_income numeric;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS credit_score text;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS vehicle_type text;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS desired_monthly_payment numeric;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS loan_amount_min numeric;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS loan_amount_max numeric;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS interest_rate numeric;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS loan_term integer;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS down_payment numeric;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add validation constraints if they don't exist
DO $$ 
BEGIN
  ALTER TABLE applications 
    ADD CONSTRAINT valid_email 
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE applications 
    ADD CONSTRAINT valid_phone 
      CHECK (phone ~* '^\+?1?\d{10,}$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE applications 
    ADD CONSTRAINT valid_postal_code 
      CHECK (postal_code ~* '^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE applications 
    ADD CONSTRAINT valid_loan_term 
      CHECK (loan_term IN (36, 48, 60, 72, 84));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE applications 
    ADD CONSTRAINT valid_interest_rate 
      CHECK (interest_rate > 0 AND interest_rate <= 30);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE applications 
    ADD CONSTRAINT valid_loan_amounts 
      CHECK (loan_amount_min <= loan_amount_max);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert own applications" ON applications;

-- Create new insert policy
CREATE POLICY "Users can insert own applications"
ON applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);