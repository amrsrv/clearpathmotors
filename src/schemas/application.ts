import { z } from 'zod';

export const applicationSchema = z.object({
  vehicle_type: z.string().min(1, 'Vehicle type is required'),
  loan_amount_min: z.number().min(0, 'Minimum loan amount must be positive'),
  loan_amount_max: z.number().min(0, 'Maximum loan amount must be positive'),
  credit_score: z.number().int().min(300).max(900), // Updated max to 900
  employment_status: z.enum(['employed', 'self_employed', 'unemployed', 'student', 'retired']),
  income_annual: z.number().min(0, 'Annual income must be positive'),
  down_payment: z.number().min(0, 'Down payment must be positive'),
  
  // Personal information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  
  // Address information
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postal_code: z.string().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, 'Valid postal code is required'),
  
  // Housing information
  housing_status: z.enum(['own', 'rent', 'live_with_parents', 'other']),
  housing_payment: z.number().min(0, 'Housing payment must be positive').optional(),
  residence_duration_years: z.number().int().min(0).optional(),
  residence_duration_months: z.number().int().min(0).max(11).optional(),
  
  // Employment information
  employer_name: z.string().optional(),
  occupation: z.string().optional(),
  employment_duration_years: z.number().int().min(0).optional(),
  employment_duration_months: z.number().int().min(0).max(11).optional(),
  
  // Government benefits
  collects_government_benefits: z.boolean().optional(),
  government_benefit_types: z.array(z.string()).optional(),
  government_benefit_other: z.string().optional(),
  government_benefit_amount: z.number().optional(),
  
  // Debt discharge history
  has_debt_discharge_history: z.boolean().optional(),
  debt_discharge_type: z.enum(['bankruptcy', 'consumer_proposal', 'division_1_proposal', 'informal_settlement', 'other']).optional(),
  debt_discharge_status: z.enum(['active', 'discharged', 'not_sure']).optional(),
  debt_discharge_year: z.number().int().min(1980).max(new Date().getFullYear()).optional(),
  amount_owed: z.number().optional(),
  trustee_name: z.string().optional(),
  debt_discharge_comments: z.string().optional(),
  
  // Driver's license
  has_driver_license: z.boolean().default(true),
  
  // Consent
  consent_soft_check: z.boolean(),
  terms_accepted: z.boolean(),
});

export const documentSchema = z.object({
  file: z.instanceof(File),
  application_id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum(['id', 'income', 'residence', 'insurance']),
});

export const adminNoteSchema = z.object({
  application_id: z.string().uuid(),
  note: z.string().min(1, 'Note is required'),
  admin_id: z.string().uuid(),
});

export type Application = z.infer<typeof applicationSchema>;
export type Document = z.infer<typeof documentSchema>;
export type AdminNote = z.infer<typeof adminNoteSchema>;