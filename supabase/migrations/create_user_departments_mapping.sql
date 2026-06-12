-- Supabase Auth mapping: each auth user belongs to one department

CREATE TABLE IF NOT EXISTS user_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_departments_department_id
  ON user_departments(department_id);

ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own department mapping" ON user_departments;
CREATE POLICY "Users can read own department mapping"
  ON user_departments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Service role manages user_departments" ON user_departments;
CREATE POLICY "Service role manages user_departments"
  ON user_departments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Optional helper RPC for onboarding/debugging
CREATE OR REPLACE FUNCTION get_my_department_id()
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT department_id
  FROM user_departments
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_my_department_id() TO authenticated;
