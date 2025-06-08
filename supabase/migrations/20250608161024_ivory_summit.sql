/*
  # Add Pre-qualification Form Fields
  
  1. New Types
    - marital_status_enum: For marital status options
    - housing_status_enum: For housing situation options
    - debt_discharge_type_enum: For debt discharge types
    - debt_discharge_status_enum: For debt discharge statuses
    - preferred_contact_method_enum: For contact preferences
  
  2. Changes
    - Add new columns to applications table for comprehensive pre-qualification form
    - Update default application status to 'pending_documents'
    - Update existing applications with 'submitted' or 'under_review' status to 'pending_documents'
    
  3. Security
    - Maintain existing RLS policies
*/

-- Create new ENUM types
DO $$ BEGIN
  CREATE TYPE marital_status_enum AS ENUM ('single', 'married', 'divorced', 'widowed', 'separated', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE housing_status_enum AS ENUM ('own', 'rent', 'live_with_parents', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE debt_discharge_type_enum AS ENUM ('bankruptcy', 'consumer_proposal', 'informal_settlement', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE debt_discharge_status_enum AS ENUM ('active', 'discharged', 'not_sure');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE preferred_contact_method_enum AS ENUM ('email', 'phone', 'sms');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Alter applications table to add new columns
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS marital_status marital_status_enum,
  ADD COLUMN IF NOT EXISTS dependents INTEGER,
  ADD COLUMN IF NOT EXISTS employer_name TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS employment_duration TEXT,
  ADD COLUMN IF NOT EXISTS other_income NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS housing_status housing_status_enum,
  ADD COLUMN IF NOT EXISTS housing_payment NUMERIC,
  ADD COLUMN IF NOT EXISTS residence_duration TEXT,
  ADD COLUMN IF NOT EXISTS desired_loan_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS down_payment_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_driver_license BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS collects_government_benefits BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disability_programs JSONB,
  ADD COLUMN IF NOT EXISTS has_debt_discharge_history BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS debt_discharge_type debt_discharge_type_enum,
  ADD COLUMN IF NOT EXISTS debt_discharge_year INTEGER,
  ADD COLUMN IF NOT EXISTS debt_discharge_status debt_discharge_status_enum,
  ADD COLUMN IF NOT EXISTS debt_discharge_comments TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact_method preferred_contact_method_enum,
  ADD COLUMN IF NOT EXISTS consent_soft_check BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to_admin_id UUID REFERENCES auth.users(id);

-- Update default status for new applications to 'pending_documents'
ALTER TABLE applications
ALTER COLUMN status SET DEFAULT 'pending_documents'::application_status;

-- Update existing applications to 'pending_documents' if they are 'submitted' or 'under_review'
UPDATE applications
SET status = 'pending_documents'
WHERE status IN ('submitted', 'under_review');

-- Create indexes for new columns to improve query performance
CREATE INDEX IF NOT EXISTS idx_applications_date_of_birth ON applications(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_applications_marital_status ON applications(marital_status);
CREATE INDEX IF NOT EXISTS idx_applications_housing_status ON applications(housing_status);
CREATE INDEX IF NOT EXISTS idx_applications_collects_government_benefits ON applications(collects_government_benefits);
CREATE INDEX IF NOT EXISTS idx_applications_has_debt_discharge_history ON applications(has_debt_discharge_history);
CREATE INDEX IF NOT EXISTS idx_applications_assigned_to_admin_id ON applications(assigned_to_admin_id);

-- Create function to calculate financial metrics
CREATE OR REPLACE FUNCTION calculate_financial_metrics(app_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app applications;
  total_income numeric;
  total_debt numeric;
  net_disposable numeric;
  dti numeric;
BEGIN
  -- Get application data
  SELECT * INTO app FROM applications WHERE id = app_id;
  
  -- Calculate total monthly income
  total_income := COALESCE(app.monthly_income, 0) + COALESCE(app.other_income, 0);
  
  -- Calculate total debt obligations (housing payment for now)
  total_debt := COALESCE(app.housing_payment, 0);
  
  -- Calculate net disposable income
  net_disposable := total_income - total_debt;
  
  -- Calculate debt-to-income ratio
  IF total_income > 0 THEN
    dti := (total_debt / total_income) * 100;
  ELSE
    dti := 0;
  END IF;
  
  -- Return metrics as JSON
  RETURN jsonb_build_object(
    'total_monthly_income', total_income,
    'total_debt_obligations', total_debt,
    'net_disposable_income', net_disposable,
    'debt_to_income_ratio', dti
  );
END;
$$;

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION calculate_financial_metrics TO authenticated;