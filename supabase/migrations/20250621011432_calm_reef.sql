/*
  # Fix foreign key constraint for admin_messages

  1. Changes
    - Drop existing foreign key constraint on admin_messages.application_id
    - Add new foreign key constraint with ON DELETE CASCADE
    - This ensures that when an application is deleted, all associated admin messages are automatically deleted

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Drop the existing foreign key constraint
ALTER TABLE admin_messages 
DROP CONSTRAINT IF EXISTS admin_messages_application_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE admin_messages 
ADD CONSTRAINT admin_messages_application_id_fkey 
FOREIGN KEY (application_id) 
REFERENCES applications(id) 
ON DELETE CASCADE;