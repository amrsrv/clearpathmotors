/*
  # Document Review Trigger

  1. New Functionality
    - Automatically updates document status when a review is created
    - Ensures document status is consistent with review status
    - Updates document review_notes and reviewed_at timestamp
  
  2. Security
    - Maintains data integrity between documents and reviews
*/

-- Create or replace the function to update document status on review
CREATE OR REPLACE FUNCTION update_document_on_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the document with the review status and notes
  UPDATE documents
  SET 
    status = NEW.status,
    review_notes = NEW.notes,
    reviewed_at = NEW.created_at
  WHERE id = NEW.document_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if the trigger already exists and drop it if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_document_status' 
    AND tgrelid = 'public.document_reviews'::regclass
  ) THEN
    DROP TRIGGER update_document_status ON public.document_reviews;
  END IF;
END $$;

-- Create the trigger
CREATE TRIGGER update_document_status
AFTER INSERT ON public.document_reviews
FOR EACH ROW
EXECUTE FUNCTION update_document_on_review();