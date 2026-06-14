-- Add four survey detail columns to indirect_plo_assessments table
-- Run this SQL in your Supabase dashboard (SQL Editor)

ALTER TABLE indirect_plo_assessments
  ADD COLUMN IF NOT EXISTS faculty_survey DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS alumni_survey DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS employers_survey DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS exit_interviews_survey DECIMAL(5, 2);
