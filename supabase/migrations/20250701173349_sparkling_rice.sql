/*
  # Delete unused profiles table

  1. Changes
    - Drop the unused profiles table
    - Remove any associated indexes
  
  2. Reason
    - Table is not used in the application
    - Application uses user_profiles table instead
*/

-- Drop the profiles table if it exists
DROP TABLE IF EXISTS profiles;