-- Create document_reviews table
CREATE TABLE IF NOT EXISTS document_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id),
  reviewer_id uuid REFERENCES auth.users(id),
  status text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('approved', 'rejected', 'needs_clarification'))
);

-- Enable RLS
ALTER TABLE document_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can manage document reviews" ON document_reviews;

-- Create policies for document reviews
CREATE POLICY "Admins can manage document reviews"
ON document_reviews
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
  )
);

-- Create function to update document status on review
CREATE OR REPLACE FUNCTION update_document_on_review()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE documents
  SET 
    status = NEW.status,
    review_notes = NEW.notes,
    reviewed_at = NEW.created_at
  WHERE id = NEW.document_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_document_status ON document_reviews;

-- Add trigger for document status updates
CREATE TRIGGER update_document_status
  AFTER INSERT ON document_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_document_on_review();

-- Create indexes
DROP INDEX IF EXISTS idx_document_reviews_document_id;
DROP INDEX IF EXISTS idx_document_reviews_reviewer_id;
DROP INDEX IF EXISTS idx_document_reviews_status;

CREATE INDEX idx_document_reviews_document_id ON document_reviews(document_id);
CREATE INDEX idx_document_reviews_reviewer_id ON document_reviews(reviewer_id);
CREATE INDEX idx_document_reviews_status ON document_reviews(status);