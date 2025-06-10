/*
  # Update Application Constraints

  1. Changes
    - Remove unique constraint on user_id to allow multiple applications per user
    - Add index on user_id and created_at for efficient queries
  
  2. Reason
    - Users should be able to have multiple applications
    - Efficient sorting and filtering by creation date
*/

-- Drop the unique constraint on user_id if it exists
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS unique_user_application;

-- Create an index on user_id and created_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_applications_user_id_created_at ON public.applications(user_id, created_at DESC);