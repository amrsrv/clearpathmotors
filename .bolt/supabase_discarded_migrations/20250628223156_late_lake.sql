/*
  # Vehicle Selections Table

  1. New Tables
    - `vehicle_selections`
      - `id` (uuid, primary key)
      - `application_id` (uuid, foreign key to applications)
      - `make` (text)
      - `model` (text)
      - `year` (integer)
      - `trim` (text)
      - `vin` (text, unique)
      - `mileage` (integer)
      - `vehicle_price` (numeric)
      - Various fee fields (admin_fee, hst, etc.)
      - Financing fields (term_length, interest_rate, etc.)
      - `status` (enum: pending, confirmed, invoiced)
      - Audit fields (created_at, updated_at, created_by, updated_by)
  
  2. Security
    - Enable RLS on `vehicle_selections` table
    - Add policies for admins, customers, and dealers
    - Create triggers for audit logging and timestamp management
*/

-- Create the enum for vehicle selection status
CREATE TYPE public.vehicle_selection_status AS ENUM (
    'pending',
    'confirmed',
    'invoiced'
);

-- Create the vehicle_selections table
CREATE TABLE public.vehicle_selections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
    make text,
    model text,
    year integer,
    trim text,
    vin text UNIQUE,
    mileage integer,
    vehicle_price numeric,
    admin_fee numeric DEFAULT 0,
    hst numeric DEFAULT 0,
    rebate numeric DEFAULT 0,
    warranty_cost numeric DEFAULT 0,
    delivery_fee numeric DEFAULT 0,
    licensing_fee numeric DEFAULT 0,
    down_payment numeric DEFAULT 0,
    term_length integer,
    interest_rate numeric,
    monthly_payment numeric,
    balloon_payment numeric DEFAULT 0,
    final_total numeric,
    status public.vehicle_selection_status DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add comments to the table and columns for better documentation
COMMENT ON TABLE public.vehicle_selections IS 'Stores details of vehicle selections for loan applications.';
COMMENT ON COLUMN public.vehicle_selections.application_id IS 'Foreign key to the applications table.';
COMMENT ON COLUMN public.vehicle_selections.vin IS 'Vehicle Identification Number, must be unique.';
COMMENT ON COLUMN public.vehicle_selections.status IS 'Current status of the vehicle selection (pending, confirmed, invoiced).';
COMMENT ON COLUMN public.vehicle_selections.created_by IS 'User who created this record.';
COMMENT ON COLUMN public.vehicle_selections.updated_by IS 'Last user who updated this record.';

-- Create indexes for performance
CREATE INDEX idx_vehicle_selections_application_id ON public.vehicle_selections USING btree (application_id);
CREATE INDEX idx_vehicle_selections_vin ON public.vehicle_selections USING btree (vin);
CREATE INDEX idx_vehicle_selections_status ON public.vehicle_selections USING btree (status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.vehicle_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policy for Super Admins (ALL access)
CREATE POLICY "Super admins can manage all vehicle selections"
ON public.vehicle_selections
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = true));

-- RLS Policy for Customers (SELECT access to their own applications' vehicle selections)
CREATE POLICY "Customers can view their own vehicle selections"
ON public.vehicle_selections
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.applications WHERE applications.id = vehicle_selections.application_id AND applications.user_id = auth.uid()));

-- RLS Policy for Dealers (SELECT and UPDATE access to applications assigned to them)
CREATE POLICY "Dealers can view and update assigned applications' vehicle selections"
ON public.vehicle_selections
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.applications WHERE applications.id = vehicle_selections.application_id AND applications.dealer_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.applications WHERE applications.id = vehicle_selections.application_id AND applications.dealer_id = auth.uid()));

-- Trigger function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.update_vehicle_selections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid(); -- Set updated_by to the current user
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update 'updated_at' and 'updated_by' before update
CREATE TRIGGER update_vehicle_selections_modtime
BEFORE UPDATE ON public.vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION public.update_vehicle_selections_timestamp();

-- Trigger function to log changes to activity_log
CREATE OR REPLACE FUNCTION public.log_vehicle_selection_change()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    details_json JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_type := 'vehicle_selection_created';
        details_json := jsonb_build_object(
            'new_selection', row_to_json(NEW)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'vehicle_selection_updated';
        details_json := jsonb_build_object(
            'old_selection', row_to_json(OLD),
            'new_selection', row_to_json(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'vehicle_selection_deleted';
        details_json := jsonb_build_object(
            'deleted_selection', row_to_json(OLD)
        );
    END IF;

    INSERT INTO public.activity_log (application_id, user_id, action, details, is_admin_action, is_visible_to_user)
    VALUES (
        COALESCE(NEW.application_id, OLD.application_id),
        auth.uid(),
        action_type,
        details_json,
        (SELECT is_admin FROM public.user_profiles WHERE user_id = auth.uid()), -- Check if current user is admin
        TRUE -- Visible to user by default
    );

    RETURN NULL; -- For AFTER triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to log vehicle selection changes
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

-- Create a function to calculate the final total
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

-- Trigger to automatically calculate the final total before insert or update
CREATE TRIGGER calculate_vehicle_selection_total_trigger
BEFORE INSERT OR UPDATE ON public.vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION public.calculate_vehicle_selection_total();

-- Create a function to update application status when vehicle selection is confirmed
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

-- Trigger to update application status when vehicle selection is confirmed
CREATE TRIGGER update_application_on_vehicle_selection_trigger
AFTER INSERT OR UPDATE ON public.vehicle_selections
FOR EACH ROW
EXECUTE FUNCTION public.update_application_on_vehicle_selection();