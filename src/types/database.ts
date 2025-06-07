export type ApplicationStatus = 
  | 'submitted'
  | 'under_review'
  | 'pending_documents'
  | 'pre_approved'
  | 'vehicle_selection'
  | 'final_approval'
  | 'finalized';

export interface Application {
  id: string;
  user_id: string | null;
  temp_user_id: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  current_stage: number;
  notes: string | null;
  employment_status: 'employed' | 'self_employed' | 'unemployed';
  consultation_time: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  annual_income: number;
  monthly_income: number;
  credit_score: number; // Changed from string to number
  vehicle_type: string;
  desired_monthly_payment: number;
  loan_amount_min: number;
  loan_amount_max: number;
  interest_rate: number;
  loan_term: number;
  down_payment: number;
}

export interface ApplicationStage {
  id: string;
  application_id: string;
  stage_number: number;
  status: string;
  timestamp: string;
  notes: string | null;
}

export interface Document {
  id: string;
  application_id: string;
  category: string;
  filename: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}