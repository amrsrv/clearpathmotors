/*
  # Vehicle Selection Module

  1. New Tables
    - `vehicle_selections` - Stores vehicle and financing details for applications
      - `id` (uuid, primary key)
      - `application_id` (uuid, foreign key to applications)
      - Vehicle details: make, model, year, trim, vin, mileage
      - Pricing details: vehicle_price, admin_fee, hst, rebate, warranty_cost, delivery_fee, licensing_fee
      - Financing details: down_payment, term_length, interest_rate, monthly_payment, balloon_payment
      - `final_total` (calculated field)
      - `status` (enum: pending, confirmed, invoiced)
      - Audit fields: created_at, updated_at, created_by, updated_by
      - `admin_comments` (text)
  
  2. Security
    - Enable RLS on `vehicle_selections` table
    - Add policies for admins, customers, and dealers
  
  3. Automation
    - Add triggers for timestamp updates
    - Add triggers for activity logging
    - Add trigger for notification on status change
    - Add trigger to update application status when vehicle is confirmed
*/

-- First, create the enum type for vehicle selection status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_selection_status') THEN
    CREATE TYPE public.vehicle_selection_status AS ENUM ('pending', 'confirmed', 'invoiced');
  END IF;
END $$;

-- Create the vehicle_selections table
CREATE TABLE IF NOT EXISTS public.vehicle_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
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
  status public.vehicle_selection_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_comments TEXT
);

-- Add comments to the table and columns for better documentation
COMMENT ON TABLE public.vehicle_selections IS 'Stores details of vehicle selections for loan applications.';
COMMENT ON COLUMN public.vehicle_selections.application_id IS 'Foreign key to the applications table.';
COMMENT ON COLUMN public.vehicle_selections.vin IS 'Vehicle Identification Number.';
COMMENT ON COLUMN public.vehicle_selections.status IS 'Current status of the vehicle selection (pending, confirmed, invoiced).';
COMMENT ON COLUMN public.vehicle_selections.created_by IS 'User who created this record.';
COMMENT ON COLUMN public.vehicle_selections.updated_by IS 'Last user who updated this record.';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_selections_application_id ON public.vehicle_selections(application_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_selections_status ON public.vehicle_selections(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.vehicle_selections ENABLE ROW LEVEL SECURITY;

-- Create trigger function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_vehicle_selection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at and updated_by before update
CREATE TRIGGER update_vehicle_selection_timestamp
BEFORE UPDATE ON public.vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION public.update_vehicle_selection_timestamp();

-- Create trigger function to log vehicle selection changes
CREATE OR REPLACE FUNCTION public.log_vehicle_selection_change()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  details_json JSONB;
  is_admin BOOLEAN;
BEGIN
  -- Determine action type based on operation
  IF TG_OP = 'INSERT' THEN
    action_type := 'vehicle_selection_created';
    details_json := jsonb_build_object(
      'vehicle_selection_id', NEW.id,
      'make', NEW.make,
      'model', NEW.model,
      'year', NEW.year,
      'status', NEW.status
    );
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'vehicle_selection_updated';
    details_json := jsonb_build_object(
      'vehicle_selection_id', NEW.id,
      'make', NEW.make,
      'model', NEW.model,
      'year', NEW.year,
      'status', NEW.status,
      'changes', jsonb_build_object(
        'old', jsonb_build_object(
          'status', OLD.status,
          'vehicle_price', OLD.vehicle_price,
          'monthly_payment', OLD.monthly_payment
        ),
        'new', jsonb_build_object(
          'status', NEW.status,
          'vehicle_price', NEW.vehicle_price,
          'monthly_payment', NEW.monthly_payment
        )
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'vehicle_selection_deleted';
    details_json := jsonb_build_object(
      'vehicle_selection_id', OLD.id,
      'make', OLD.make,
      'model', OLD.model,
      'year', OLD.year
    );
  END IF;

  -- Check if current user is admin
  SELECT is_admin INTO is_admin FROM public.user_profiles WHERE user_id = auth.uid();

  -- Insert into activity_log
  INSERT INTO public.activity_log (
    application_id,
    user_id,
    action,
    details,
    is_admin_action,
    is_visible_to_user
  ) VALUES (
    COALESCE(NEW.application_id, OLD.application_id),
    auth.uid(),
    action_type,
    details_json,
    COALESCE(is_admin, false),
    true
  );

  RETURN NULL; -- For AFTER triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to log vehicle selection changes
CREATE TRIGGER log_vehicle_selection_insert
AFTER INSERT ON public.vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION public.log_vehicle_selection_change();

CREATE TRIGGER log_vehicle_selection_update
AFTER UPDATE ON public.vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION public.log_vehicle_selection_change();

CREATE TRIGGER log_vehicle_selection_delete
AFTER DELETE ON public.vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION public.log_vehicle_selection_change();

-- Create function to notify users of status changes
CREATE OR REPLACE FUNCTION public.notify_on_vehicle_selection_status_change()
RETURNS TRIGGER AS $$
DECLARE
  app_user_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get the user_id from the application
    SELECT user_id INTO app_user_id
    FROM public.applications
    WHERE id = NEW.application_id;
    
    IF app_user_id IS NOT NULL THEN
      -- Create a notification for the user
      INSERT INTO public.notifications (
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

-- Create trigger for notifications on status change
CREATE TRIGGER notify_vehicle_selection_status_change
AFTER UPDATE OF status ON public.vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_vehicle_selection_status_change();

-- Create function to calculate the final total
CREATE OR REPLACE FUNCTION public.calculate_vehicle_selection_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate the final total based on all components
  NEW.final_total := (
    COALESCE(NEW.vehicle_price, 0) +
    COALESCE(NEW.admin_fee, 0) +
    COALESCE(NEW.hst, 0) +
    COALESCE(NEW.warranty_cost, 0) +
    COALESCE(NEW.delivery_fee, 0) +
    COALESCE(NEW.licensing_fee, 0) -
    COALESCE(NEW.rebate, 0) -
    COALESCE(NEW.down_payment, 0)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate the final total
CREATE TRIGGER calculate_vehicle_selection_total_trigger
BEFORE INSERT OR UPDATE ON public.vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION public.calculate_vehicle_selection_total();

-- Create function to update application status when vehicle selection is confirmed
CREATE OR REPLACE FUNCTION public.update_application_on_vehicle_selection()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to 'confirmed', update the application status to the next stage
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    -- Update the application status to 'final_approval'
    UPDATE public.applications
    SET status = 'final_approval',
        current_stage = 6,
        updated_at = now()
    WHERE id = NEW.application_id;
    
    -- Create a new application stage entry
    INSERT INTO public.application_stages (
      application_id,
      stage_number,
      status,
      notes
    ) VALUES (
      NEW.application_id,
      6,
      'completed',
      'Vehicle selection confirmed. Moving to final approval.'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update application status
CREATE TRIGGER update_application_on_vehicle_selection_trigger
AFTER INSERT OR UPDATE ON public.vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION public.update_application_on_vehicle_selection();

-- RLS Policies

-- Super admins can manage all vehicle selections
CREATE POLICY "Super admins can manage all vehicle selections"
ON public.vehicle_selections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
);

-- Customers can view their own vehicle selections
CREATE POLICY "Customers can view their own vehicle selections"
ON public.vehicle_selections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = vehicle_selections.application_id
    AND applications.user_id = auth.uid()
  )
);

-- Dealers can view vehicle selections for their assigned applications
CREATE POLICY "Dealers can view assigned vehicle selections"
ON public.vehicle_selections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = vehicle_selections.application_id
    AND applications.dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  )
);

-- Dealers can update vehicle selections for their assigned applications
CREATE POLICY "Dealers can update assigned vehicle selections"
ON public.vehicle_selections
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = vehicle_selections.application_id
    AND applications.dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = vehicle_selections.application_id
    AND applications.dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  )
);

-- Dealers can insert vehicle selections for their assigned applications
CREATE POLICY "Dealers can insert vehicle selections"
ON public.vehicle_selections
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.applications
    WHERE applications.id = vehicle_selections.application_id
    AND applications.dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'dealer'
    )
  )
);

-- Add admin_comments column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicle_selections' 
    AND column_name = 'admin_comments'
  ) THEN
    ALTER TABLE public.vehicle_selections ADD COLUMN admin_comments TEXT;
  END IF;
END $$;