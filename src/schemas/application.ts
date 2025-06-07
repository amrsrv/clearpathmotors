import { z } from 'zod';

export const applicationSchema = z.object({
  vehicle_type: z.string().min(1, 'Vehicle type is required'),
  loan_amount_min: z.number().min(0, 'Minimum loan amount must be positive'),
  loan_amount_max: z.number().min(0, 'Maximum loan amount must be positive'),
  credit_score: z.number().int().min(300).max(850), // Changed to number with range validation
  employment_status: z.enum(['employed', 'self_employed', 'unemployed']),
  income_annual: z.number().min(0, 'Annual income must be positive'),
  down_payment: z.number().min(0, 'Down payment must be positive'),
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