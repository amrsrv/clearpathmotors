-- Alter credit_score column type
ALTER TABLE applications
ALTER COLUMN credit_score TYPE integer USING credit_score::integer;

-- Add constraint for valid credit score range
ALTER TABLE applications
ADD CONSTRAINT valid_credit_score 
CHECK (credit_score >= 300 AND credit_score <= 900);