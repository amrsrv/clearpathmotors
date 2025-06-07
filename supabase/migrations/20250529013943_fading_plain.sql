-- Create users first
INSERT INTO auth.users (
  id,
  email,
  raw_app_meta_data,
  created_at
) VALUES 
  ('57a26166-0afb-4531-86aa-3079b780f4cb', 'john@example.com', '{"provider":"email"}', now()),
  ('58b36277-1bfc-4642-97ab-4170c890d7da', 'jane@example.com', '{"provider":"email"}', now()),
  ('59c47388-2cdd-4753-88ac-5281d9a1e8eb', 'ahmed.khan@example.com', '{"provider":"email"}', now()),
  ('60d58499-3dec-4864-99bd-6392eab2f9fc', 'maria.lopez@example.com', '{"provider":"email"}', now()),
  ('61e695aa-4efd-4975-a0ce-7403fbc3fafc', 'tyrese.hill@example.com', '{"provider":"email"}', now())
ON CONFLICT (id) DO NOTHING;

-- Insert sample applications
INSERT INTO applications (
  id,
  user_id,
  first_name,
  last_name,
  email,
  phone,
  postal_code,
  credit_score,
  employment_status,
  annual_income,
  monthly_income,
  created_at,
  status,
  current_stage
) VALUES 
  (
    'fe8768f5-ebfb-443e-a018-2bc0f25fbf57',
    '57a26166-0afb-4531-86aa-3079b780f4cb',
    'John',
    'Smith',
    'john@example.com',
    '5551234567',
    'M1A1A1',
    '680',
    'employed',
    55000,
    4583.33,
    '2025-07-03T10:15:00Z',
    'submitted',
    1
  ),
  (
    'fe8768f5-ebfb-443e-a018-2bc0f25fbf58',
    '58b36277-1bfc-4642-97ab-4170c890d7da',
    'Jane',
    'Doe',
    'jane@example.com',
    '5559876543',
    'L3C4B2',
    '720',
    'self_employed',
    75000,
    6250.00,
    '2025-07-03T10:17:30Z',
    'under_review',
    2
  ),
  (
    'fe8768f5-ebfb-443e-a018-2bc0f25fbf59',
    '59c47388-2cdd-4753-88ac-5281d9a1e8eb',
    'Ahmed',
    'Khan',
    'ahmed.khan@example.com',
    '4162223333',
    'K2P1G3',
    '640',
    'employed',
    48000,
    4000.00,
    '2025-07-03T10:20:45Z',
    'pending_documents',
    3
  ),
  (
    'fe8768f5-ebfb-443e-a018-2bc0f25fbf60',
    '60d58499-3dec-4864-99bd-6392eab2f9fc',
    'Maria',
    'Lopez',
    'maria.lopez@example.com',
    '6478889999',
    'N2L5K6',
    '700',
    'unemployed',
    0,
    0,
    '2025-07-03T10:22:10Z',
    'pre_approved',
    4
  ),
  (
    'fe8768f5-ebfb-443e-a018-2bc0f25fbf61',
    '61e695aa-4efd-4975-a0ce-7403fbc3fafc',
    'Tyrese',
    'Hill',
    'tyrese.hill@example.com',
    '9051112222',
    'T5A0A7',
    '660',
    'employed',
    61000,
    5083.33,
    '2025-07-03T10:25:00Z',
    'vehicle_selection',
    5
  )
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  postal_code = EXCLUDED.postal_code,
  credit_score = EXCLUDED.credit_score,
  employment_status = EXCLUDED.employment_status,
  annual_income = EXCLUDED.annual_income,
  monthly_income = EXCLUDED.monthly_income;