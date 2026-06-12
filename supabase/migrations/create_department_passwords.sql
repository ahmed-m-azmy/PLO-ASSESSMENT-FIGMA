-- Department selection + password verification (without Supabase Auth users)
-- Store one hashed password per department.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS department_passwords (
  department_id UUID PRIMARY KEY REFERENCES departments(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE department_passwords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct read department_passwords" ON department_passwords;
CREATE POLICY "No direct read department_passwords"
  ON department_passwords
  FOR SELECT
  USING (false);

DROP POLICY IF EXISTS "No direct write department_passwords" ON department_passwords;
CREATE POLICY "No direct write department_passwords"
  ON department_passwords
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION authenticate_department_password(
  p_department_id UUID,
  p_password TEXT
)
RETURNS TABLE (authenticated BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM department_passwords dp
    WHERE dp.department_id = p_department_id
      AND dp.password_hash = extensions.crypt(btrim(p_password), dp.password_hash)
  ) AS authenticated;
$$;

GRANT EXECUTE ON FUNCTION authenticate_department_password(UUID, TEXT) TO anon, authenticated;

-- Ensure PostgREST picks up new/updated RPC signatures immediately.
NOTIFY pgrst, 'reload schema';

-- Optional seed passwords (edit as needed)
-- INSERT INTO department_passwords (department_id, password_hash)
-- VALUES
--   ('2c326074-9095-4f66-8998-bb06d8fd66c4', extensions.crypt('Arch#2026!Cap', extensions.gen_salt('bf'))),
--   ('a16d7d12-1cf5-4600-a5ba-6b26ed1c1b44', extensions.crypt('Plan#2026!Cap', extensions.gen_salt('bf')))
-- ON CONFLICT (department_id)
-- DO UPDATE SET
--   password_hash = EXCLUDED.password_hash,
--   updated_at = NOW();
