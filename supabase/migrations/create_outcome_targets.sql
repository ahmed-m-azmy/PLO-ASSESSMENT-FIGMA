-- Create tables to persist CLO/PLO targets by program and academic year

CREATE TABLE IF NOT EXISTS plo_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plo_id TEXT NOT NULL,
  program_id BIGINT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  target_value DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (plo_id, program_id, academic_year)
);

CREATE TABLE IF NOT EXISTS clo_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clo_id TEXT NOT NULL,
  program_id BIGINT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  target_value DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (clo_id, program_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_plo_targets_lookup
  ON plo_targets(program_id, academic_year, plo_id);

CREATE INDEX IF NOT EXISTS idx_clo_targets_lookup
  ON clo_targets(program_id, academic_year, clo_id);

ALTER TABLE plo_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE clo_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow viewing plo targets" ON plo_targets;
CREATE POLICY "Allow viewing plo targets" ON plo_targets
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow inserting plo targets" ON plo_targets;
CREATE POLICY "Allow inserting plo targets" ON plo_targets
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow updating plo targets" ON plo_targets;
CREATE POLICY "Allow updating plo targets" ON plo_targets
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow deleting plo targets" ON plo_targets;
CREATE POLICY "Allow deleting plo targets" ON plo_targets
  FOR DELETE
  USING (true);

DROP POLICY IF EXISTS "Allow viewing clo targets" ON clo_targets;
CREATE POLICY "Allow viewing clo targets" ON clo_targets
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow inserting clo targets" ON clo_targets;
CREATE POLICY "Allow inserting clo targets" ON clo_targets
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow updating clo targets" ON clo_targets;
CREATE POLICY "Allow updating clo targets" ON clo_targets
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow deleting clo targets" ON clo_targets;
CREATE POLICY "Allow deleting clo targets" ON clo_targets
  FOR DELETE
  USING (true);
