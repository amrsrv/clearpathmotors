/*
  # Application Tracking System Schema

  1. New Tables
    - `applications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `status` (enum)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `current_stage` (int)
      - `notes` (text)
    
    - `application_stages`
      - `id` (uuid, primary key)
      - `application_id` (uuid, references applications)
      - `stage_number` (int)
      - `status` (text)
      - `timestamp` (timestamp)
      - `notes` (text)
    
    - `documents`
      - `id` (uuid, primary key)
      - `application_id` (uuid, references applications)
      - `category` (text)
      - `filename` (text)
      - `status` (text)
      - `review_notes` (text)
      - `uploaded_at` (timestamp)
      - `reviewed_at` (timestamp)
    
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `message` (text)
      - `read` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user and admin access
*/

-- Create enum for application status
CREATE TYPE application_status AS ENUM (
  'submitted',
  'under_review',
  'pending_documents',
  'pre_approved',
  'vehicle_selection',
  'final_approval',
  'finalized'
);

-- Applications table
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  status application_status DEFAULT 'submitted',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  current_stage int DEFAULT 1,
  notes text,
  CONSTRAINT valid_stage CHECK (current_stage BETWEEN 1 AND 7)
);

-- Application stages table
CREATE TABLE application_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications ON DELETE CASCADE,
  stage_number int NOT NULL,
  status text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  notes text,
  CONSTRAINT valid_stage_number CHECK (stage_number BETWEEN 1 AND 7)
);

-- Documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications ON DELETE CASCADE,
  category text NOT NULL,
  filename text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes text,
  uploaded_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- Notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for applications
CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for application stages
CREATE POLICY "Users can view stages of own applications"
  ON application_stages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_stages.application_id
      AND applications.user_id = auth.uid()
    )
  );

-- Policies for documents
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = documents.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = documents.application_id
      AND applications.user_id = auth.uid()
    )
  );

-- Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark notifications as read"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_application_stages_application_id ON application_stages(application_id);
CREATE INDEX idx_documents_application_id ON documents(application_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Function to update application updated_at timestamp
CREATE OR REPLACE FUNCTION update_application_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
CREATE TRIGGER update_application_timestamp
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_application_timestamp();