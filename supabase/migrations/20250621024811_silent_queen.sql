/*
  # Add support_tickets table

  1. New Tables
    - `support_tickets` - Stores user support requests
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `subject` (text)
      - `category` (text)
      - `message` (text)
      - `file_url` (text, optional)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `resolved_at` (timestamp, optional)
      - `resolved_by` (uuid, optional)
      - `notes` (text, optional)
  
  2. Security
    - Enable RLS on support_tickets table
    - Add policies for user and admin access
    - Create indexes for efficient queries
*/

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  file_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  notes text
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for support_tickets
CREATE POLICY "Users can view own support tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own support tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all support tickets"
  ON support_tickets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Create function to update timestamp on support ticket update
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp
CREATE TRIGGER update_support_ticket_timestamp
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_timestamp();

-- Create function to create notification when support ticket is updated
CREATE OR REPLACE FUNCTION notify_on_support_ticket_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed, create a notification for the user
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      read
    ) VALUES (
      NEW.user_id,
      'Support Ticket Updated',
      'Your support ticket "' || NEW.subject || '" has been updated to ' || NEW.status || '.',
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notifications
CREATE TRIGGER notify_on_support_ticket_update
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_on_support_ticket_update();

-- Create indexes for better performance
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);