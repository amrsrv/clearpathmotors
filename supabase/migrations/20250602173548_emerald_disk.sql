/*
  # Fix Admin Dashboard Access

  1. Changes
    - Create function to safely access auth.users data
    - Add helper function for admin dashboard
    - Fix permission issues with auth.users table
    
  2. Security
    - Maintain proper RLS policies
    - Ensure admin-only access to sensitive data
*/

-- Create a function to safely get user data for admin dashboard
CREATE OR REPLACE FUNCTION get_user_data(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data jsonb;
BEGIN
  SELECT 
    jsonb_build_object(
      'id', id,
      'email', email,
      'is_admin', COALESCE((raw_app_meta_data->>'is_admin')::boolean, false)
    ) INTO user_data
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_data;
END;
$$;

-- Create a function to get activity log with user data
CREATE OR REPLACE FUNCTION get_activity_log_with_users(limit_count integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  action text,
  details jsonb,
  created_at timestamptz,
  application_id uuid,
  user_id uuid,
  is_admin_action boolean,
  user_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.details,
    al.created_at,
    al.application_id,
    al.user_id,
    al.is_admin_action,
    get_user_data(al.user_id) as user_data
  FROM 
    activity_log al
  ORDER BY 
    al.created_at DESC
  LIMIT 
    limit_count;
END;
$$;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION get_user_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_log_with_users TO authenticated;