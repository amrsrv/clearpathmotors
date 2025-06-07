/*
  # Fix duplicate applications and add unique constraint

  1. Changes
    - Remove duplicate applications, keeping only the most recent one per user
    - Add unique constraint on user_id to prevent future duplicates
    
  2. Data Cleanup
    - Uses a CTE to identify and keep only the most recent application per user
    - Deletes all other applications for users with duplicates
    
  3. Constraints
    - Adds UNIQUE constraint on user_id column
*/

-- First, clean up existing duplicate applications
WITH ranked_applications AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM applications
)
DELETE FROM applications 
WHERE id IN (
  SELECT id 
  FROM ranked_applications 
  WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE applications 
ADD CONSTRAINT unique_user_application UNIQUE (user_id);