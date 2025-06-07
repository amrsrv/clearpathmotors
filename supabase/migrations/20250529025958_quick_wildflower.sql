-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  city text,
  province text,
  postal_code text,
  employment_status employment_status,
  annual_income numeric,
  monthly_income numeric,
  credit_score text,
  vehicle_type text,
  desired_monthly_payment numeric,
  loan_amount_min numeric,
  loan_amount_max numeric,
  interest_rate numeric,
  loan_term integer,
  down_payment numeric,
  status application_status DEFAULT 'submitted',
  current_stage integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text,
  CONSTRAINT valid_stage CHECK (current_stage BETWEEN 1 AND 7),
  CONSTRAINT valid_loan_amounts CHECK (loan_amount_min <= loan_amount_max),
  CONSTRAINT valid_loan_term CHECK (loan_term IN (36, 48, 60, 72, 84)),
  CONSTRAINT valid_interest_rate CHECK (interest_rate > 0 AND interest_rate <= 30)
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own applications" ON applications;
  DROP POLICY IF EXISTS "Users can insert own applications" ON applications;
  DROP POLICY IF EXISTS "Admins can view all applications" ON applications;
  DROP POLICY IF EXISTS "Users and admins can view applications" ON applications;
  DROP POLICY IF EXISTS "Admins can manage all applications" ON applications;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies with unique names
CREATE POLICY "applications_select_policy"
ON applications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

CREATE POLICY "applications_insert_policy"
ON applications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "applications_admin_policy"
ON applications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

-- Grant necessary permissions
GRANT SELECT ON auth.users TO authenticated;
GRANT ALL ON applications TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);