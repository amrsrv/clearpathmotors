-- Create activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  is_admin_action boolean DEFAULT false,
  is_visible_to_user boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies for activity_log
CREATE POLICY "Users can view their own activity logs"
ON activity_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = activity_log.application_id
    AND applications.user_id = auth.uid()
  )
  AND is_visible_to_user = true
);

CREATE POLICY "Admins can view all activity logs"
ON activity_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

CREATE POLICY "Admins can insert activity logs"
ON activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

-- Create function to log application changes
CREATE OR REPLACE FUNCTION log_application_change()
RETURNS TRIGGER AS $$
DECLARE
  is_admin boolean;
  log_details jsonb;
  changed_fields jsonb := '{}'::jsonb;
  field_name text;
  old_val text;
  new_val text;
BEGIN
  -- Check if the current user is an admin
  SELECT (raw_app_meta_data->>'is_admin')::boolean INTO is_admin
  FROM auth.users
  WHERE id = auth.uid();

  -- Build changed fields JSON
  FOR field_name IN 
    SELECT key FROM jsonb_object_keys(to_jsonb(NEW)) AS key
    WHERE key NOT IN ('id', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('SELECT $1.%I::text, $2.%I::text', field_name, field_name)
    INTO old_val, new_val
    USING OLD, NEW;
    
    IF old_val IS DISTINCT FROM new_val THEN
      changed_fields := changed_fields || jsonb_build_object(field_name, jsonb_build_object('old', old_val, 'new', new_val));
    END IF;
  END LOOP;

  -- Create log details
  log_details := jsonb_build_object(
    'changed_fields', changed_fields,
    'application_id', NEW.id
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
    NEW.id,
    auth.uid(),
    'update_application',
    log_details,
    is_admin,
    -- Make status changes visible to users
    CASE WHEN changed_fields ? 'status' OR changed_fields ? 'current_stage' THEN true ELSE is_admin = false END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for application changes
DROP TRIGGER IF EXISTS log_application_changes ON applications;
CREATE TRIGGER log_application_changes
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION log_application_change();

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

-- Create triggers for document changes
DROP TRIGGER IF EXISTS log_document_insert ON documents;
CREATE TRIGGER log_document_insert
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_change();

DROP TRIGGER IF EXISTS log_document_update ON documents;
CREATE TRIGGER log_document_update
  AFTER UPDATE ON documents
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_document_change();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_application_id ON activity_log(application_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_is_visible_to_user ON activity_log(is_visible_to_user);