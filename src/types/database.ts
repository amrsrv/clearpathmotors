export type ApplicationStatus = 
  | 'submitted'
  | 'under_review'
  | 'pending_documents'
  | 'pre_approved'
  | 'vehicle_selection'
  | 'final_approval'
  | 'finalized';

export type EmploymentStatus = 
  | 'employed'
  | 'self_employed'
  | 'unemployed';

export type MaritalStatusEnum = 
  | 'single'
  | 'married'
  | 'divorced'
  | 'widowed'
  | 'separated'
  | 'other';

export type HousingStatusEnum = 
  | 'own'
  | 'rent'
  | 'live_with_parents'
  | 'other';

export type DebtDischargeTypeEnum = 
  | 'bankruptcy'
  | 'consumer_proposal'
  | 'informal_settlement'
  | 'other';

export type DebtDischargeStatusEnum = 
  | 'active'
  | 'discharged'
  | 'not_sure';

export type PreferredContactMethodEnum = 
  | 'email'
  | 'phone'
  | 'sms';

export interface Application {
  id: string;
  user_id: string | null;
  temp_user_id: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  current_stage: number;
  notes: string | null;
  employment_status: EmploymentStatus | null;
  consultation_time: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  annual_income: number | null;
  monthly_income: number | null;
  credit_score: number | null;
  vehicle_type: string | null;
  desired_monthly_payment: number | null;
  loan_amount_min: number | null;
  loan_amount_max: number | null;
  interest_rate: number | null;
  loan_term: number | null;
  down_payment: number | null;
  full_name: string | null;
  income: number | null;
  date_of_birth: string | null;
  marital_status: MaritalStatusEnum | null;
  dependents: number | null;
  employer_name: string | null;
  occupation: string | null;
  employment_duration: string | null;
  other_income: number | null;
  housing_status: HousingStatusEnum | null;
  housing_payment: number | null;
  residence_duration: string | null;
  desired_loan_amount: number | null;
  down_payment_amount: number | null;
  has_driver_license: boolean | null;
  collects_government_benefits: boolean | null;
  disability_programs: any | null;
  has_debt_discharge_history: boolean | null;
  debt_discharge_type: DebtDischargeTypeEnum | null;
  debt_discharge_year: number | null;
  debt_discharge_status: DebtDischargeStatusEnum | null;
  debt_discharge_comments: string | null;
  preferred_contact_method: PreferredContactMethodEnum | null;
  consent_soft_check: boolean | null;
  terms_accepted: boolean | null;
  internal_notes: string | null;
  assigned_to_admin_id: string | null;
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