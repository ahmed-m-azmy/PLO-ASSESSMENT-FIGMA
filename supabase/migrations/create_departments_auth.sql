-- Department-level authentication with hashed passwords
-- Requires pgcrypto for crypt() password verification

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS departments_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_auth_department_id
  ON departments_auth(department_id);

ALTER TABLE departments_auth ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct read departments_auth" ON departments_auth;
CREATE POLICY "No direct read departments_auth"
  ON departments_auth
  FOR SELECT
  USING (false);

DROP POLICY IF EXISTS "No direct write departments_auth" ON departments_auth;
CREATE POLICY "No direct write departments_auth"
  ON departments_auth
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Helper function: verifies username (or department name/id) + plaintext password
-- Returns matching department context for session bootstrap.
CREATE OR REPLACE FUNCTION authenticate_department_login(
  p_username TEXT,
  p_password TEXT
)
RETURNS TABLE (
  department_id UUID,
  username TEXT,
  department_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    da.department_id,
    da.username,
    d.name AS department_name
  FROM departments_auth da
  JOIN departments d ON d.id = da.department_id
  WHERE (
    lower(da.username) = lower(trim(p_username))
    OR da.department_id::text = trim(p_username)
    OR lower(d.name) = lower(trim(p_username))
  )
  AND da.password_hash = extensions.crypt(p_password, da.password_hash)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION authenticate_department_login(TEXT, TEXT) TO anon, authenticated;

-- Seed department credentials (idempotent)
-- Architecture:
--   username: architecture_admin
--   password: Arch#2026!Cap
-- Planning:
--   username: planning_admin
--   password: Plan#2026!Cap
INSERT INTO departments_auth (department_id, username, password_hash)
VALUES
  (
    '2c326074-9095-4f66-8998-bb06d8fd66c4',
    'architecture_admin',
    extensions.crypt('Arch#2026!Cap', extensions.gen_salt('bf'))
  ),
  (
    'a16d7d12-1cf5-4600-a5ba-6b26ed1c1b44',
    'planning_admin',
    extensions.crypt('Plan#2026!Cap', extensions.gen_salt('bf'))
  )
ON CONFLICT (username)
DO UPDATE SET
  department_id = EXCLUDED.department_id,
  password_hash = EXCLUDED.password_hash;
