-- Create admin_messages table
CREATE TABLE IF NOT EXISTS admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  user_id uuid REFERENCES auth.users(id),
  application_id uuid REFERENCES applications(id),
  message text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for admin messages
CREATE POLICY "Users can view their own messages"
ON admin_messages
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all messages"
ON admin_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

CREATE POLICY "Users can insert messages"
ON admin_messages
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can insert messages"
ON admin_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

-- Create indexes for better performance
CREATE INDEX idx_admin_messages_user_id ON admin_messages(user_id);
CREATE INDEX idx_admin_messages_admin_id ON admin_messages(admin_id);
CREATE INDEX idx_admin_messages_application_id ON admin_messages(application_id);
CREATE INDEX idx_admin_messages_read ON admin_messages(read);