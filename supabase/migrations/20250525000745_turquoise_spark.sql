DO $$ 
BEGIN
  -- Create employment_status enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status') THEN
    CREATE TYPE employment_status AS ENUM (
      'employed',
      'self_employed',
      'unemployed'
    );
  END IF;
END $$;

-- Add employment_status and consultation_time to applications table if they don't exist
ALTER TABLE applications 
  ADD COLUMN IF NOT EXISTS employment_status employment_status,
  ADD COLUMN IF NOT EXISTS consultation_time timestamptz;

-- Update documents table to add employment-specific document types
ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS documents_category_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_category_check 
  CHECK (category IN (
    'drivers_license',
    'pay_stubs',
    'notice_of_assessment',
    'bank_statements',
    'proof_of_residence',
    'insurance'
  ));

-- Add indexes for new columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_applications_employment_status') THEN
    CREATE INDEX idx_applications_employment_status ON applications(employment_status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_applications_consultation_time') THEN
    CREATE INDEX idx_applications_consultation_time ON applications(consultation_time);
  END IF;
END $$;