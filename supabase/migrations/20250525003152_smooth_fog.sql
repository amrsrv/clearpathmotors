/*
  # Schema update for application tracking system

  1. New Types
    - application_status enum for tracking application progress
    - employment_status enum for employment types
  
  2. New Tables
    - applications: Main table for tracking financing applications
    - application_stages: Tracks individual stages of applications
    - documents: Stores document upload records
    - notifications: System messages for users
  
  3. Security
    - Enable RLS on all tables
    - Add policies for user data access
    - Create indexes for performance
*/

-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM (
    'submitted',
    'under_review',
    'pending_documents',
    'pre_approved',
    'vehicle_selection',
    'final_approval',
    'finalized'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE employment_status AS ENUM (
    'employed',
    'self_employed',
    'unemployed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  status application_status DEFAULT 'submitted',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  current_stage int DEFAULT 1,
  notes text,
  employment_status employment_status,
  consultation_time timestamptz,
  CONSTRAINT valid_stage CHECK (current_stage BETWEEN 1 AND 7)
);

-- Application stages table
CREATE TABLE IF NOT EXISTS application_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications ON DELETE CASCADE,
  stage_number int NOT NULL,
  status text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  notes text,
  CONSTRAINT valid_stage_number CHECK (stage_number BETWEEN 1 AND 7)
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications ON DELETE CASCADE,
  category text NOT NULL,
  filename text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes text,
  uploaded_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT documents_category_check CHECK (
    category IN (
      'drivers_license',
      'pay_stubs',
      'notice_of_assessment',
      'bank_statements',
      'proof_of_residence',
      'insurance'
    )
  )
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
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

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own applications" ON applications;
  DROP POLICY IF EXISTS "Users can insert own applications" ON applications;
  DROP POLICY IF EXISTS "Users can view stages of own applications" ON application_stages;
  DROP POLICY IF EXISTS "Users can insert stages for own applications" ON application_stages;
  DROP POLICY IF EXISTS "Users can view own documents" ON documents;
  DROP POLICY IF EXISTS "Users can upload documents" ON documents;
  DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
  DROP POLICY IF EXISTS "Users can mark notifications as read" ON notifications;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

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

CREATE POLICY "Users can insert stages for own applications"
  ON application_stages FOR INSERT
  TO authenticated
  WITH CHECK (
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
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_employment_status ON applications(employment_status);
CREATE INDEX IF NOT EXISTS idx_applications_consultation_time ON applications(consultation_time);
CREATE INDEX IF NOT EXISTS idx_application_stages_application_id ON application_stages(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Function to update application updated_at timestamp
CREATE OR REPLACE FUNCTION update_application_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_application_timestamp ON applications;

-- Create trigger
CREATE TRIGGER update_application_timestamp
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_application_timestamp();