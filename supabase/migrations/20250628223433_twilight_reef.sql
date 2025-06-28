/*
  # Create vehicle_selections table

  1. New Tables
    - `vehicle_selections`
      - `id` (uuid, primary key)
      - `application_id` (uuid, foreign key to applications)
      - `make` (text)
      - `model` (text)
      - `year` (integer)
      - `trim` (text)
      - `vin` (text)
      - `mileage` (integer)
      - `vehicle_price` (numeric)
      - `admin_fee` (numeric)
      - `hst` (numeric)
      - `rebate` (numeric)
      - `warranty_cost` (numeric)
      - `delivery_fee` (numeric)
      - `licensing_fee` (numeric)
      - `down_payment` (numeric)
      - `term_length` (integer)
      - `interest_rate` (numeric)
      - `monthly_payment` (numeric)
      - `balloon_payment` (numeric)
      - `final_total` (numeric)
      - `status` (enum: pending, confirmed, invoiced)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
      - `created_by` (uuid, foreign key to users)
      - `updated_by` (uuid, foreign key to users)
      - `admin_comments` (text)
  
  2. Security
    - Enable RLS on `vehicle_selections` table
    - Add policies for admins to manage all vehicle selections
    - Add policies for users to view their own vehicle selections
    - Add policies for dealers to view assigned vehicle selections
*/

-- Create vehicle_selection_status enum type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_selection_status') THEN
    CREATE TYPE vehicle_selection_status AS ENUM ('pending', 'confirmed', 'invoiced');
  END IF;
END $$;

-- Create vehicle_selections table
CREATE TABLE IF NOT EXISTS vehicle_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  make TEXT,
  model TEXT,
  year INTEGER,
  trim TEXT,
  vin TEXT,
  mileage INTEGER,
  vehicle_price NUMERIC,
  admin_fee NUMERIC DEFAULT 0,
  hst NUMERIC DEFAULT 0,
  rebate NUMERIC DEFAULT 0,
  warranty_cost NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  licensing_fee NUMERIC DEFAULT 0,
  down_payment NUMERIC DEFAULT 0,
  term_length INTEGER,
  interest_rate NUMERIC,
  monthly_payment NUMERIC,
  balloon_payment NUMERIC DEFAULT 0,
  final_total NUMERIC,
  status vehicle_selection_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  admin_comments TEXT
);

-- Create index on application_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_vehicle_selections_application_id ON vehicle_selections(application_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_vehicle_selections_status ON vehicle_selections(status);

-- Enable Row Level Security
ALTER TABLE vehicle_selections ENABLE ROW LEVEL SECURITY;

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_vehicle_selection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicle_selection_timestamp
BEFORE UPDATE ON vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION update_vehicle_selection_timestamp();

-- Create trigger to log vehicle selection changes
CREATE OR REPLACE FUNCTION log_vehicle_selection_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (
    application_id,
    user_id,
    action,
    details,
    is_admin_action,
    is_visible_to_user
  ) VALUES (
    NEW.application_id,
    auth.uid(),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'vehicle_selection_created'
      WHEN TG_OP = 'UPDATE' THEN 'vehicle_selection_updated'
      ELSE TG_OP || '_vehicle_selection'
    END,
    jsonb_build_object(
      'vehicle_selection_id', NEW.id,
      'make', NEW.make,
      'model', NEW.model,
      'year', NEW.year,
      'status', NEW.status
    ),
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND is_admin = true),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_vehicle_selection_changes
AFTER INSERT OR UPDATE ON vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION log_vehicle_selection_change();

-- Create notification trigger for status changes
CREATE OR REPLACE FUNCTION notify_on_vehicle_selection_status_change()
RETURNS TRIGGER AS $$
DECLARE
  app_user_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get the user_id from the application
    SELECT user_id INTO app_user_id
    FROM applications
    WHERE id = NEW.application_id;
    
    IF app_user_id IS NOT NULL THEN
      -- Create a notification for the user
      INSERT INTO notifications (
        user_id,
        title,
        message,
        read
      ) VALUES (
        app_user_id,
        'Vehicle Selection ' || 
          CASE 
            WHEN NEW.status = 'confirmed' THEN 'Confirmed'
            WHEN NEW.status = 'invoiced' THEN 'Invoiced'
            ELSE 'Updated'
          END,
        'Your vehicle selection for ' || COALESCE(NEW.make, '') || ' ' || 
        COALESCE(NEW.model, '') || ' has been ' || 
          CASE 
            WHEN NEW.status = 'confirmed' THEN 'confirmed'
            WHEN NEW.status = 'invoiced' THEN 'invoiced'
            ELSE 'updated'
          END || '.',
        false
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_vehicle_selection_status_change
AFTER UPDATE OF status ON vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION notify_on_vehicle_selection_status_change();

-- RLS Policies

-- Admins can manage all vehicle selections
CREATE POLICY "Admins can manage all vehicle selections"
ON vehicle_selections
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
);

-- Users can view their own vehicle selections
CREATE POLICY "Users can view their own vehicle selections"
ON vehicle_selections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = vehicle_selections.application_id
    AND applications.user_id = auth.uid()
  )
);

-- Dealers can view vehicle selections for their assigned applications
CREATE POLICY "Dealers can view assigned vehicle selections"
ON vehicle_selections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = vehicle_selections.application_id
    AND applications.dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  )
);

-- Dealers can update vehicle selections for their assigned applications
CREATE POLICY "Dealers can update assigned vehicle selections"
ON vehicle_selections
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = vehicle_selections.application_id
    AND applications.dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = vehicle_selections.application_id
    AND applications.dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  )
);

-- Dealers can insert vehicle selections for their assigned applications
CREATE POLICY "Dealers can insert vehicle selections"
ON vehicle_selections
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = vehicle_selections.application_id
    AND applications.dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  )
);