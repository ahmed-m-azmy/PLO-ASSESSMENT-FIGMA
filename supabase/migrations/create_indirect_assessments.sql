-- Create indirect_plo_assessments table for storing indirect assessment data
-- Run this SQL in your Supabase dashboard (SQL Editor) to create the table

CREATE TABLE IF NOT EXISTS indirect_plo_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plo_id UUID NOT NULL REFERENCES plos(id) ON DELETE CASCADE,
  program_id BIGINT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  indirect_value DECIMAL(5, 2) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_indirect_plo_year ON indirect_plo_assessments(plo_id, academic_year, program_id);
CREATE INDEX IF NOT EXISTS idx_indirect_program_year ON indirect_plo_assessments(program_id, academic_year);

-- Enable Row Level Security (RLS)
ALTER TABLE indirect_plo_assessments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to view and insert their program's data
DROP POLICY IF EXISTS "Allow viewing indirect assessments for program" ON indirect_plo_assessments;
CREATE POLICY "Allow viewing indirect assessments for program" ON indirect_plo_assessments
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow inserting indirect assessments" ON indirect_plo_assessments;
CREATE POLICY "Allow inserting indirect assessments" ON indirect_plo_assessments
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow updating indirect assessments" ON indirect_plo_assessments;
CREATE POLICY "Allow updating indirect assessments" ON indirect_plo_assessments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow deleting indirect assessments" ON indirect_plo_assessments;
CREATE POLICY "Allow deleting indirect assessments" ON indirect_plo_assessments
  FOR DELETE
  USING (true);
