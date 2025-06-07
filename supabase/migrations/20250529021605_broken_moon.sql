-- Create application_flags table
CREATE TABLE IF NOT EXISTS application_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id),
  flag_type text NOT NULL,
  severity text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

-- Enable RLS
ALTER TABLE application_flags ENABLE ROW LEVEL SECURITY;

-- Create policies for application flags
CREATE POLICY "Admins can view all flags"
ON application_flags
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

CREATE POLICY "Admins can manage flags"
ON application_flags
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

-- Create function to automatically flag applications
CREATE OR REPLACE FUNCTION auto_flag_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag high loan amounts relative to income
  IF NEW.loan_amount_max > (NEW.annual_income * 1.2) THEN
    INSERT INTO application_flags (
      application_id,
      flag_type,
      severity,
      description
    ) VALUES (
      NEW.id,
      'high_loan_amount',
      'high',
      'Loan amount exceeds 120% of annual income'
    );
  END IF;

  -- Flag low credit scores
  IF NEW.credit_score::int < 600 THEN
    INSERT INTO application_flags (
      application_id,
      flag_type,
      severity,
      description
    ) VALUES (
      NEW.id,
      'low_credit_score',
      'medium',
      'Credit score below 600'
    );
  END IF;

  -- Flag unemployed applicants
  IF NEW.employment_status = 'unemployed' THEN
    INSERT INTO application_flags (
      application_id,
      flag_type,
      severity,
      description
    ) VALUES (
      NEW.id,
      'unemployed',
      'high',
      'Applicant is currently unemployed'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for auto-flagging
CREATE TRIGGER auto_flag_application_trigger
  AFTER INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_application();