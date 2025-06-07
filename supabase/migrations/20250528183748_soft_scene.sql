-- Drop admin_users table if it exists
DROP TABLE IF EXISTS admin_users CASCADE;

-- Update user metadata to grant admin privileges
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'
),
email_confirmed_at = now()
WHERE email = 'info@clearpathmotors.com';

-- If the admin user doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'info@clearpathmotors.com'
  ) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      confirmation_token,
      email_change_token_new,
      email_change,
      recovery_token,
      confirmation_sent_at,
      recovery_sent_at,
      email_change_sent_at,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'info@clearpathmotors.com',
      crypt('Admin123', gen_salt('bf')),
      now(),
      now(),
      '{"is_admin": true}'::jsonb,
      '{}'::jsonb,
      false,
      now(),
      now(),
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      false,
      NULL
    );
  END IF;
END
$$;