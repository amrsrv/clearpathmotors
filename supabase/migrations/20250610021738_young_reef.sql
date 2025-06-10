/*
  # Fix Application Flags and Admin Settings

  1. New Tables
    - Create application_flags table for flagging applications
    - Create admin_settings table for system configuration
  
  2. Security
    - Enable RLS on both tables
    - Add policies for admin access
  
  3. Functions
    - Create auto_flag_application function
    - Create log_stage_change function
    - Create update_application_status_on_stage function
    - Create log_admin_message function
*/

-- Create application_flags table if it doesn't exist
CREATE TABLE IF NOT EXISTS application_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Create admin_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Enable RLS on application_flags
ALTER TABLE application_flags ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admin_settings
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for application_flags (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'application_flags' 
    AND policyname = 'Admins can manage flags'
  ) THEN
    CREATE POLICY "Admins can manage flags"
      ON application_flags
      FOR ALL
      TO authenticated
      USING (
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin' = 'true'
      );
  END IF;
END
$$;

-- Create policies for admin_settings (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_settings' 
    AND policyname = 'Admins can manage settings'
  ) THEN
    CREATE POLICY "Admins can manage settings"
      ON admin_settings
      FOR ALL
      TO authenticated
      USING (
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin' = 'true'
      );
  END IF;
END
$$;

-- Create function to auto-flag applications based on criteria
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-flagging applications
DROP TRIGGER IF EXISTS auto_flag_application_trigger ON applications;
CREATE TRIGGER auto_flag_application_trigger
AFTER INSERT OR UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION auto_flag_application();

-- Create function to log application stage changes
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (
    application_id,
    user_id,
    action,
    details,
    is_admin_action
  ) VALUES (
    NEW.application_id,
    auth.uid(),
    'stage_update',
    jsonb_build_object(
      'stage_number', NEW.stage_number,
      'status', NEW.status,
      'notes', NEW.notes
    ),
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin' = 'true'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for application stage changes
DROP TRIGGER IF EXISTS log_stage_changes ON application_stages;
CREATE TRIGGER log_stage_changes
AFTER INSERT ON application_stages
FOR EACH ROW
EXECUTE FUNCTION log_stage_change();

-- Create function to update application status based on stage
CREATE OR REPLACE FUNCTION update_application_status_on_stage()
RETURNS TRIGGER AS $$
DECLARE
  new_status TEXT;
BEGIN
  -- Map stage number to status
  CASE NEW.stage_number
    WHEN 1 THEN new_status := 'submitted';
    WHEN 2 THEN new_status := 'under_review';
    WHEN 3 THEN new_status := 'pending_documents';
    WHEN 4 THEN new_status := 'pre_approved';
    WHEN 5 THEN new_status := 'vehicle_selection';
    WHEN 6 THEN new_status := 'final_approval';
    WHEN 7 THEN new_status := 'finalized';
    ELSE new_status := NULL;
  END CASE;
  
  -- Only update if we have a valid status
  IF new_status IS NOT NULL THEN
    UPDATE applications
    SET 
      status = new_status::application_status,
      current_stage = NEW.stage_number,
      updated_at = now()
    WHERE id = NEW.application_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating application status based on stage
DROP TRIGGER IF EXISTS update_application_status ON application_stages;
CREATE TRIGGER update_application_status
AFTER INSERT ON application_stages
FOR EACH ROW
EXECUTE FUNCTION update_application_status_on_stage();

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value, description)
VALUES 
  ('email_notifications', '{"enabled": true, "admin_emails": ["admin@clearpathmotors.com"]}', 'Email notification settings'),
  ('auto_approval', '{"enabled": false, "min_credit_score": 700, "max_loan_to_income": 0.4}', 'Auto-approval criteria'),
  ('document_retention', '{"days": 90}', 'Document retention period in days')
ON CONFLICT (setting_key) DO NOTHING;