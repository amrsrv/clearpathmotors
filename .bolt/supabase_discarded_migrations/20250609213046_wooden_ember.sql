/*
  # Admin Dashboard Enhancement Migration

  1. New Tables
    - `application_flags` - For flagging applications that need attention
    - `admin_settings` - For storing admin configuration settings

  2. Security
    - Enable RLS on both new tables
    - Add admin-only policies for both tables

  3. Functions and Triggers
    - Auto-flagging function for applications based on risk criteria
    - Stage change logging function
    - Application status update based on stage progression
    - Admin message logging with notifications

  4. Default Settings
    - Insert default admin configuration settings
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

-- Create policies for application_flags
CREATE POLICY "Admins can manage flags"
  ON application_flags
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin' = 'true'
  );

-- Create policies for admin_settings
CREATE POLICY "Admins can manage settings"
  ON admin_settings
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin' = 'true'
  );

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

-- Create function to log admin message changes
CREATE OR REPLACE FUNCTION log_admin_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for user when admin sends a message
  IF NEW.is_admin = true AND NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      read
    ) VALUES (
      NEW.user_id,
      'New Message from Support',
      substring(NEW.message from 1 for 100) || CASE WHEN length(NEW.message) > 100 THEN '...' ELSE '' END,
      false
    );
  END IF;
  
  -- Log the message in activity log
  INSERT INTO activity_log (
    application_id,
    user_id,
    action,
    details,
    is_admin_action
  ) VALUES (
    NEW.application_id,
    CASE WHEN NEW.is_admin THEN NEW.admin_id ELSE NEW.user_id END,
    CASE WHEN NEW.is_admin THEN 'admin_message_sent' ELSE 'user_message_sent' END,
    jsonb_build_object(
      'message_id', NEW.id,
      'is_admin', NEW.is_admin
    ),
    NEW.is_admin
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin messages
DROP TRIGGER IF EXISTS log_admin_message_changes ON admin_messages;
CREATE TRIGGER log_admin_message_changes
AFTER INSERT ON admin_messages
FOR EACH ROW
EXECUTE FUNCTION log_admin_message();

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value, description)
VALUES 
  ('email_notifications', '{"enabled": true, "admin_emails": ["admin@clearpathmotors.com"]}', 'Email notification settings'),
  ('auto_approval', '{"enabled": false, "min_credit_score": 700, "max_loan_to_income": 0.4}', 'Auto-approval criteria'),
  ('document_retention', '{"days": 90}', 'Document retention period in days')
ON CONFLICT (setting_key) DO NOTHING;