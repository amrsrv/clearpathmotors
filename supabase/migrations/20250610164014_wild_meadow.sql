/*
  # Remove unique constraint on user_id in applications table

  1. Changes
    - Drop the unique constraint on user_id in applications table
    - Add an index on user_id and created_at for efficient queries
  
  2. Purpose
    - Allow users to have multiple applications
    - Ensure efficient querying of applications by user_id
*/

-- Drop the unique constraint on user_id
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS unique_user_application;

-- Create an index on user_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_applications_user_id_created_at ON public.applications(user_id, created_at DESC);