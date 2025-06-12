import { z } from 'zod';

export const applicationSchema = z.object({
  vehicle_type: z.string().min(1, 'Vehicle type is required'),
  loan_amount_min: z.number().min(0, 'Minimum loan amount must be positive'),
  loan_amount_max: z.number().min(0, 'Maximum loan amount must be positive'),
  credit_score: z.number().int().min(300).max(850), // Changed to number with range validation
  employment_status: z.enum(['employed', 'self_employed', 'unemployed', 'student', 'retired']),
  income_annual: z.number().min(0, 'Annual income must be positive'),
  down_payment: z.number().min(0, 'Down payment must be positive'),
  
  // New fields for government benefits
  collects_government_benefits: z.boolean().optional(),
  government_benefit_types: z.array(z.string()).optional(),
  government_benefit_other: z.string().optional(),
  government_benefit_amount: z.number().optional(),
  
  // New fields for debt discharge history
  has_debt_discharge_history: z.boolean().optional(),
  debt_discharge_type: z.enum(['bankruptcy', 'consumer_proposal', 'division_1_proposal', 'other']).optional(),
  debt_discharge_status: z.enum(['active', 'discharged']).optional(),
  debt_discharge_year: z.number().int().min(1980).max(new Date().getFullYear()).optional(),
  amount_owed: z.number().optional(),
  trustee_name: z.string().optional(),
  debt_discharge_comments: z.string().optional(),
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