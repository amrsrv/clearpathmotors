/*
  # Pre-qualification Form Schema Updates

  1. New Types
    - marital_status_enum: For marital status options
    - housing_status_enum: For housing situation options
    - debt_discharge_type_enum: For debt discharge types
    - debt_discharge_status_enum: For debt discharge statuses
    - preferred_contact_method_enum: For contact preferences
    - government_benefit_type_enum: For government benefit types
  
  2. New Columns
    - Add columns to applications table for comprehensive pre-qualification form
    - Add fields for employment duration
    - Add fields for government benefits
    - Add fields for debt discharge history
    - Add fields for residence duration
  
  3. Security
    - Maintain existing RLS policies
*/

-- Create new ENUM types if they don't exist
DO $$ BEGIN
  CREATE TYPE marital_status_enum AS ENUM (
    'single', 'married', 'divorced', 'widowed', 'separated', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE housing_status_enum AS ENUM (
    'own', 'rent', 'live_with_parents', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE debt_discharge_type_enum AS ENUM (
    'bankruptcy', 'consumer_proposal', 'division_1_proposal', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE debt_discharge_status_enum AS ENUM (
    'active', 'discharged'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE preferred_contact_method_enum AS ENUM (
    'email', 'phone', 'sms'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE government_benefit_type_enum AS ENUM (
    'ontario_works', 'odsp', 'cpp', 'ei', 'child_tax_benefit', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update employment_status enum to include student and retired
DO $$ BEGIN
  ALTER TYPE employment_status ADD VALUE IF NOT EXISTS 'student';
  ALTER TYPE employment_status ADD VALUE IF NOT EXISTS 'retired';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to applications table
ALTER TABLE applications
  -- Employment details
  ADD COLUMN IF NOT EXISTS employment_duration_years INTEGER,
  ADD COLUMN IF NOT EXISTS employment_duration_months INTEGER,
  
  -- Residence details
  ADD COLUMN IF NOT EXISTS residence_duration_years INTEGER,
  ADD COLUMN IF NOT EXISTS residence_duration_months INTEGER,
  
  -- Marital status
  ADD COLUMN IF NOT EXISTS marital_status marital_status_enum,
  
  -- Government benefits
  ADD COLUMN IF NOT EXISTS collects_government_benefits BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS government_benefit_types JSONB,
  ADD COLUMN IF NOT EXISTS government_benefit_other TEXT,
  
  -- Debt discharge history (bankruptcy/consumer proposal)
  ADD COLUMN IF NOT EXISTS has_debt_discharge_history BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS debt_discharge_type debt_discharge_type_enum,
  ADD COLUMN IF NOT EXISTS debt_discharge_status debt_discharge_status_enum,
  ADD COLUMN IF NOT EXISTS debt_discharge_year INTEGER,
  ADD COLUMN IF NOT EXISTS amount_owed NUMERIC,
  ADD COLUMN IF NOT EXISTS trustee_name TEXT,
  ADD COLUMN IF NOT EXISTS debt_discharge_comments TEXT,
  
  -- Contact preferences
  ADD COLUMN IF NOT EXISTS preferred_contact_method preferred_contact_method_enum;

-- Create indexes for new columns to improve query performance
CREATE INDEX IF NOT EXISTS idx_applications_employment_duration ON applications(employment_duration_years, employment_duration_months);
CREATE INDEX IF NOT EXISTS idx_applications_residence_duration ON applications(residence_duration_years, residence_duration_months);
CREATE INDEX IF NOT EXISTS idx_applications_marital_status ON applications(marital_status);
CREATE INDEX IF NOT EXISTS idx_applications_collects_government_benefits ON applications(collects_government_benefits);
CREATE INDEX IF NOT EXISTS idx_applications_has_debt_discharge_history ON applications(has_debt_discharge_history);
CREATE INDEX IF NOT EXISTS idx_applications_debt_discharge_type ON applications(debt_discharge_type);
CREATE INDEX IF NOT EXISTS idx_applications_debt_discharge_status ON applications(debt_discharge_status);
CREATE INDEX IF NOT EXISTS idx_applications_preferred_contact_method ON applications(preferred_contact_method);

-- Update auto_flag_application function to consider new fields
CREATE OR REPLACE FUNCTION auto_flag_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag applications with very low credit scores
  IF (NEW.credit_score IS NOT NULL AND NEW.credit_score < 500) THEN
    INSERT INTO application_flags (
      application_id, 
      flag_type, 
      severity, 
      description
    ) VALUES (
      NEW.id, 
      'low_credit_score', 
      CASE 
        WHEN NEW.credit_score < 400 THEN 'high'
        WHEN NEW.credit_score < 450 THEN 'medium'
        ELSE 'low'
      END,
      'Credit score below 500: ' || NEW.credit_score
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Flag applications with very high loan amounts relative to income
  IF (NEW.annual_income IS NOT NULL AND NEW.desired_loan_amount IS NOT NULL 
      AND NEW.annual_income > 0 
      AND NEW.desired_loan_amount > NEW.annual_income * 0.8) THEN
    INSERT INTO application_flags (
      application_id, 
      flag_type, 
      severity, 
      description
    ) VALUES (
      NEW.id, 
      'high_loan_to_income', 
      'medium',
      'Loan amount exceeds 80% of annual income'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Flag applications with bankruptcy history
  IF (NEW.has_debt_discharge_history = true AND NEW.debt_discharge_type = 'bankruptcy') THEN
    INSERT INTO application_flags (
      application_id, 
      flag_type, 
      severity, 
      description
    ) VALUES (
      NEW.id, 
      'bankruptcy_history', 
      CASE 
        WHEN NEW.debt_discharge_status = 'active' THEN 'high'
        ELSE 'medium'
      END,
      'Bankruptcy history detected: ' || NEW.debt_discharge_status
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Flag applications with active consumer proposals
  IF (NEW.has_debt_discharge_history = true AND 
      NEW.debt_discharge_type = 'consumer_proposal' AND 
      NEW.debt_discharge_status = 'active') THEN
    INSERT INTO application_flags (
      application_id, 
      flag_type, 
      severity, 
      description
    ) VALUES (
      NEW.id, 
      'active_consumer_proposal', 
      'medium',
      'Active consumer proposal detected'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a view for activity log with user and application details
CREATE OR REPLACE VIEW activity_log_with_email AS
SELECT 
  al.*,
  a.first_name AS application_first_name,
  a.last_name AS application_last_name,
  a.email AS application_email,
  u.email AS user_email
FROM 
  activity_log al
LEFT JOIN 
  applications a ON al.application_id = a.id
LEFT JOIN 
  auth.users u ON al.user_id = u.id;