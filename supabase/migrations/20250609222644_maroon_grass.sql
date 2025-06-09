/*
  # Application Updates Tracking

  1. New Functions
    - `log_application_change`: Logs changes to applications made by users
    - `log_document_change`: Logs document uploads and changes
    - `log_document_deletion`: Logs document deletions
  
  2. Triggers
    - Add triggers to track application changes
    - Add triggers to track document changes
    - Add triggers to track document deletions
  
  3. Improvements
    - Enhanced activity logging for better admin visibility
*/

-- Create or replace function to log application changes
CREATE OR REPLACE FUNCTION log_application_change()
RETURNS TRIGGER AS $$
DECLARE
  is_admin BOOLEAN;
  change_details JSONB;
BEGIN
  -- Check if the user making the change is an admin
  is_admin := (auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin' = 'true';
  
  -- Skip logging if it's an admin action (those are logged separately)
  IF is_admin THEN
    RETURN NEW;
  END IF;
  
  -- Create a JSON object with the old and new values
  change_details := jsonb_build_object(
    'old', to_jsonb(OLD),
    'new', to_jsonb(NEW)
  );
  
  -- Insert into activity_log
  INSERT INTO activity_log (
    application_id,
    user_id,
    action,
    details,
    is_admin_action,
    is_visible_to_user
  ) VALUES (
    NEW.id,
    auth.uid(),
    'update_application',
    change_details,
    false,
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to log document uploads and changes
CREATE OR REPLACE FUNCTION log_document_change()
RETURNS TRIGGER AS $$
DECLARE
  is_admin BOOLEAN;
  app_user_id UUID;
BEGIN
  -- Check if the user making the change is an admin
  is_admin := (auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin' = 'true';
  
  -- Skip logging if it's an admin action (those are logged separately)
  IF is_admin THEN
    RETURN NEW;
  END IF;
  
  -- Get the user_id from the application
  SELECT user_id INTO app_user_id
  FROM applications
  WHERE id = NEW.application_id;
  
  -- Insert into activity_log
  INSERT INTO activity_log (
    application_id,
    user_id,
    action,
    details,
    is_admin_action,
    is_visible_to_user
  ) VALUES (
    NEW.application_id,
    app_user_id,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'upload_document'
      WHEN TG_OP = 'UPDATE' THEN 'update_document'
      ELSE TG_OP || '_document'
    END,
    jsonb_build_object(
      'document_id', NEW.id,
      'category', NEW.category,
      'filename', NEW.filename,
      'status', NEW.status
    ),
    false,
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to log document deletions
CREATE OR REPLACE FUNCTION log_document_deletion()
RETURNS TRIGGER AS $$
DECLARE
  is_admin BOOLEAN;
  app_user_id UUID;
BEGIN
  -- Check if the user making the change is an admin
  is_admin := (auth.jwt() ->> 'app_metadata')::jsonb ->> 'is_admin' = 'true';
  
  -- Skip logging if it's an admin action (those are logged separately)
  IF is_admin THEN
    RETURN OLD;
  END IF;
  
  -- Get the user_id from the application
  SELECT user_id INTO app_user_id
  FROM applications
  WHERE id = OLD.application_id;
  
  -- Insert into activity_log
  INSERT INTO activity_log (
    application_id,
    user_id,
    action,
    details,
    is_admin_action,
    is_visible_to_user
  ) VALUES (
    OLD.application_id,
    app_user_id,
    'delete_document',
    jsonb_build_object(
      'document_id', OLD.id,
      'category', OLD.category,
      'filename', OLD.filename
    ),
    false,
    true
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS log_application_changes ON applications;
DROP TRIGGER IF EXISTS log_document_insert ON documents;
DROP TRIGGER IF EXISTS log_document_update ON documents;
DROP TRIGGER IF EXISTS log_document_delete ON documents;

-- Create trigger for application changes
CREATE TRIGGER log_application_changes
AFTER UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION log_application_change();

-- Create trigger for document uploads
CREATE TRIGGER log_document_insert
AFTER INSERT ON documents
FOR EACH ROW
EXECUTE FUNCTION log_document_change();

-- Create trigger for document updates
CREATE TRIGGER log_document_update
AFTER UPDATE ON documents
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_document_change();

-- Create trigger for document deletions
CREATE TRIGGER log_document_delete
AFTER DELETE ON documents
FOR EACH ROW
EXECUTE FUNCTION log_document_deletion();