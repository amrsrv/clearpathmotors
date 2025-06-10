/*
  # Remove unique constraint on user_id in applications table

  1. Changes
    - Removes the unique constraint on user_id in the applications table
    - This allows a single user to have multiple applications

  2. Reasoning
    - Users should be able to submit multiple applications over time
    - Each application can represent a different vehicle financing request
*/

-- Drop the unique constraint on user_id
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS unique_user_application;

-- Create an index on user_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_applications_user_id_created_at ON public.applications(user_id, created_at DESC);