/*
  # Store Application Form Data and Prequalification Results

  1. New Columns
    - Add columns to store form data and prequalification results
    - Include financial information and preferences
    - Store loan calculation results

  2. Changes
    - Add columns to applications table
    - Add validation constraints
    - Update existing RLS policies
*/

-- Add new columns to applications table
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

-- Add constraints
ALTER TABLE applications ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE applications ADD CONSTRAINT valid_phone CHECK (phone ~* '^\+?1?\d{10,}$');
ALTER TABLE applications ADD CONSTRAINT valid_postal_code CHECK (postal_code ~* '^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$');
ALTER TABLE applications ADD CONSTRAINT valid_loan_term CHECK (loan_term IN (36, 48, 60, 72, 84));
ALTER TABLE applications ADD CONSTRAINT valid_interest_rate CHECK (interest_rate > 0 AND interest_rate <= 30);
ALTER TABLE applications ADD CONSTRAINT valid_loan_amounts CHECK (loan_amount_min <= loan_amount_max);