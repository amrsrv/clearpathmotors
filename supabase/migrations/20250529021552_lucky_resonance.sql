-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view logs
CREATE POLICY "Admins can view audit logs"
ON audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT (auth.jwt() ->> 'role') = 'authenticated') THEN
    INSERT INTO audit_logs (
      admin_id,
      action,
      target_type,
      target_id,
      details
    ) VALUES (
      auth.uid(),
      TG_ARGV[0],
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object(
        'old_data', row_to_json(OLD),
        'new_data', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for applications table
CREATE TRIGGER applications_audit_insert
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_action('insert');

CREATE TRIGGER applications_audit_update
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_action('update');

-- Add triggers for documents table
CREATE TRIGGER documents_audit_update
  AFTER UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_action('update');