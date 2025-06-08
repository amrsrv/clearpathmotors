/*
  # Add missing fields for admin dashboard

  1. New Columns
    - Add columns to store additional application data
    - Add fields for government benefits and debt discharge
    - Add fields for admin management
  
  2. Security
    - Maintain existing RLS policies
    - Ensure proper data access control
*/

-- Add missing fields to applications table if they don't exist
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS marital_status marital_status_enum,
ADD COLUMN IF NOT EXISTS dependents integer,
ADD COLUMN IF NOT EXISTS employer_name text,
ADD COLUMN IF NOT EXISTS occupation text,
ADD COLUMN IF NOT EXISTS employment_duration text,
ADD COLUMN IF NOT EXISTS other_income numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS housing_status housing_status_enum,
ADD COLUMN IF NOT EXISTS housing_payment numeric,
ADD COLUMN IF NOT EXISTS residence_duration text,
ADD COLUMN IF NOT EXISTS desired_loan_amount numeric,
ADD COLUMN IF NOT EXISTS down_payment_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_driver_license boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS collects_government_benefits boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS disability_programs jsonb,
ADD COLUMN IF NOT EXISTS has_debt_discharge_history boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS debt_discharge_type debt_discharge_type_enum,
ADD COLUMN IF NOT EXISTS debt_discharge_year integer,
ADD COLUMN IF NOT EXISTS debt_discharge_status debt_discharge_status_enum,
ADD COLUMN IF NOT EXISTS debt_discharge_comments text,
ADD COLUMN IF NOT EXISTS preferred_contact_method preferred_contact_method_enum,
ADD COLUMN IF NOT EXISTS consent_soft_check boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS internal_notes text,
ADD COLUMN IF NOT EXISTS assigned_to_admin_id uuid REFERENCES auth.users(id);

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_applications_marital_status ON applications(marital_status);
CREATE INDEX IF NOT EXISTS idx_applications_housing_status ON applications(housing_status);
CREATE INDEX IF NOT EXISTS idx_applications_has_debt_discharge_history ON applications(has_debt_discharge_history);
CREATE INDEX IF NOT EXISTS idx_applications_collects_government_benefits ON applications(collects_government_benefits);
CREATE INDEX IF NOT EXISTS idx_applications_assigned_to_admin_id ON applications(assigned_to_admin_id);
CREATE INDEX IF NOT EXISTS idx_applications_date_of_birth ON applications(date_of_birth);

-- Create function to log document changes
CREATE OR REPLACE FUNCTION log_document_change()
RETURNS TRIGGER AS $$
DECLARE
  is_admin boolean;
  log_details jsonb;
  application_id uuid;
BEGIN
  -- Get application_id
  application_id := NEW.application_id;

  -- Check if the current user is an admin
  SELECT (raw_app_meta_data->>'is_admin')::boolean INTO is_admin
  FROM auth.users
  WHERE id = auth.uid();

  -- Create log details
  log_details := jsonb_build_object(
    'document_id', NEW.id,
    'category', NEW.category,
    'filename', NEW.filename,
    'status', NEW.status,
    'application_id', application_id
  );

  -- Insert activity log
  INSERT INTO activity_log (
    application_id,
    user_id,
    action,
    details,
    is_admin_action,
    is_visible_to_user
  ) VALUES (
    application_id,
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'upload_document'
      WHEN TG_OP = 'UPDATE' THEN 'update_document'
      ELSE TG_OP || '_document'
    END,
    log_details,
    is_admin,
    true -- Document changes are always visible to users
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for document changes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'log_document_insert') THEN
    CREATE TRIGGER log_document_insert
      AFTER INSERT ON documents
      FOR EACH ROW
      EXECUTE FUNCTION log_document_change();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'log_document_update') THEN
    CREATE TRIGGER log_document_update
      AFTER UPDATE ON documents
      FOR EACH ROW
      WHEN (OLD.status IS DISTINCT FROM NEW.status)
      EXECUTE FUNCTION log_document_change();
  END IF;
END $$;