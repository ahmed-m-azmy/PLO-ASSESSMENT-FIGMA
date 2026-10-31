-- Role-based access control (admin / coordinator / instructor), section-level grades,
-- CLO achievement calculation and audit logging.
--
-- Run order:
--   1. Run this file in the Supabase SQL editor.
--   2. Create the first admin (see the BOOTSTRAP block at the bottom) BEFORE users try to sign in:
--      this migration replaces the previously open RLS policies on the core tables.
--   3. Deploy the Edge Function `admin-users` (supabase/functions/admin-users).
--
-- Notes:
--   * Identity is Supabase Auth (email + password). `profiles` holds role + department.
--   * Every rule below is enforced by Row Level Security, not by the UI.
--   * Ids of courses/CLOs are stored as TEXT in the new tables so no assumption is made about their type.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coordinator', 'instructor')),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles (department_id, role);

CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, name)
);

CREATE TABLE IF NOT EXISTS course_coordinators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_course_coordinators_profile ON course_coordinators (profile_id);

CREATE TABLE IF NOT EXISTS course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  section_code TEXT NOT NULL CHECK (btrim(section_code) <> ''),
  instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, academic_year, section_code)
);
CREATE INDEX IF NOT EXISTS idx_course_sections_instructor ON course_sections (instructor_id, academic_year);

-- One row = one gradeable column (an assignment, or part of it, that assesses one CLO).
CREATE TABLE IF NOT EXISTS assignment_clo_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  assignment_name TEXT NOT NULL CHECK (btrim(assignment_name) <> ''),
  clo_id TEXT NOT NULL,
  max_score NUMERIC(8, 2) NOT NULL CHECK (max_score > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, academic_year, assignment_name, clo_id)
);
CREATE INDEX IF NOT EXISTS idx_mappings_course_year ON assignment_clo_mappings (course_id, academic_year);

-- Percentage a student must reach on a CLO for the CLO to count as satisfied (default 60 when unset).
CREATE TABLE IF NOT EXISTS clo_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  clo_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  threshold NUMERIC(5, 2) NOT NULL CHECK (threshold >= 0 AND threshold <= 100),
  updated_by UUID DEFAULT auth.uid(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clo_id, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_clo_thresholds_course ON clo_thresholds (course_id, academic_year);

CREATE TABLE IF NOT EXISTS section_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE RESTRICT,
  mapping_id UUID NOT NULL REFERENCES assignment_clo_mappings(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL CHECK (btrim(student_id) <> ''),
  score NUMERIC(8, 2) NOT NULL CHECK (score >= 0),
  uploaded_by UUID DEFAULT auth.uid(),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (section_id, mapping_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_section_grades_section ON section_grades (section_id);
CREATE INDEX IF NOT EXISTS idx_section_grades_mapping ON section_grades (mapping_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id UUID,
  actor_id UUID,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_department_time ON audit_log (department_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can read profiles/courses without recursing into RLS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active
$$;

CREATE OR REPLACE FUNCTION app_department_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid() AND is_active
$$;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(app_role() = 'admin', FALSE)
$$;

CREATE OR REPLACE FUNCTION program_in_my_department(p_program_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM programs p
    WHERE p.id::text = p_program_id
      AND p.department_id::text = app_department_id()::text
  )
$$;

CREATE OR REPLACE FUNCTION course_in_my_department(p_course_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM courses c
    JOIN programs p ON p.id = c.program_id
    WHERE c.id::text = p_course_id
      AND p.department_id::text = app_department_id()::text
  )
$$;

CREATE OR REPLACE FUNCTION is_course_coordinator(p_course_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_role() = 'coordinator' AND EXISTS (
    SELECT 1 FROM course_coordinators cc
    WHERE cc.course_id = p_course_id AND cc.profile_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION is_course_instructor(p_course_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_role() = 'instructor' AND EXISTS (
    SELECT 1 FROM course_sections s
    WHERE s.course_id = p_course_id AND s.instructor_id = auth.uid()
  )
$$;

-- Admin of the course's department, or the course coordinator.
CREATE OR REPLACE FUNCTION can_manage_course(p_course_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (is_admin() AND course_in_my_department(p_course_id)) OR is_course_coordinator(p_course_id)
$$;

-- Read access: managers plus instructors teaching a section of the course.
CREATE OR REPLACE FUNCTION can_access_course(p_course_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT can_manage_course(p_course_id) OR is_course_instructor(p_course_id)
$$;

CREATE OR REPLACE FUNCTION can_access_program(p_program_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (is_admin() AND program_in_my_department(p_program_id))
      OR EXISTS (
        SELECT 1 FROM courses c
        WHERE c.program_id::text = p_program_id AND can_access_course(c.id::text)
      )
$$;

CREATE OR REPLACE FUNCTION clo_course_id(p_clo_id TEXT) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT course_id::text FROM clos WHERE id::text = p_clo_id
$$;

CREATE OR REPLACE FUNCTION clo_belongs_to_course(p_clo_id TEXT, p_course_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM clos WHERE id::text = p_clo_id AND course_id::text = p_course_id)
$$;

CREATE OR REPLACE FUNCTION is_year_locked(p_year TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT s.is_locked FROM academic_sessions s
    WHERE s.department_id = app_department_id() AND s.name = p_year
  ), FALSE)
$$;

CREATE OR REPLACE FUNCTION profile_has_role_in_my_department(p_profile_id UUID, p_role TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_profile_id AND role = p_role AND department_id = app_department_id()
  )
$$;

CREATE OR REPLACE FUNCTION coordinates_instructor(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_role() = 'coordinator' AND EXISTS (
    SELECT 1 FROM course_sections s
    WHERE s.instructor_id = p_profile_id AND is_course_coordinator(s.course_id)
  )
$$;

CREATE OR REPLACE FUNCTION can_read_section(p_section_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_sections s
    WHERE s.id = p_section_id
      AND (can_manage_course(s.course_id) OR s.instructor_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION is_my_open_section(p_section_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_role() = 'instructor' AND EXISTS (
    SELECT 1 FROM course_sections s
    WHERE s.id = p_section_id
      AND s.instructor_id = auth.uid()
      AND NOT is_year_locked(s.academic_year)
  )
$$;

-- ---------------------------------------------------------------------------
-- Audit logging
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_entity TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  INSERT INTO audit_log (department_id, actor_id, actor_role, action, entity, entity_id, details)
  VALUES (app_department_id(), auth.uid(), COALESCE(app_role(), 'unknown'), p_action, p_entity, p_entity_id, p_details);
END;
$$;

CREATE OR REPLACE FUNCTION log_row_audit() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_rec JSONB;
  old_rec JSONB;
  rec JSONB;
  v_details JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec := to_jsonb(OLD);
    v_details := rec;
  ELSIF TG_OP = 'INSERT' THEN
    rec := to_jsonb(NEW);
    v_details := rec;
  ELSE
    rec := to_jsonb(NEW);
    new_rec := rec;
    old_rec := to_jsonb(OLD);
    SELECT COALESCE(jsonb_object_agg(k, jsonb_build_object('old', old_rec -> k, 'new', new_rec -> k)), '{}'::jsonb)
      INTO v_details
      FROM jsonb_object_keys(new_rec) AS k
      WHERE (new_rec -> k) IS DISTINCT FROM (old_rec -> k) AND k NOT IN ('updated_at');
    IF v_details = '{}'::jsonb THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO audit_log (department_id, actor_id, actor_role, action, entity, entity_id, details)
  VALUES (app_department_id(), auth.uid(), COALESCE(app_role(), 'system'), TG_OP, TG_TABLE_NAME, rec ->> 'id', v_details);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;
CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

-- Applies to API callers only (auth.uid() is NULL for the SQL editor / service role).
-- Non-admins can never change role, department or e-mail; nobody can lock themselves out.
CREATE OR REPLACE FUNCTION profiles_guard() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := NOW();
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF app_role() IS DISTINCT FROM 'admin'
     AND (NEW.role <> OLD.role OR NEW.department_id <> OLD.department_id OR lower(NEW.email) <> lower(OLD.email)) THEN
    RAISE EXCEPTION 'Only an admin can change role, department or e-mail';
  END IF;
  IF auth.uid() = OLD.id AND (NEW.role <> OLD.role OR NEW.is_active <> OLD.is_active OR NEW.department_id <> OLD.department_id) THEN
    RAISE EXCEPTION 'You cannot change your own role, status or department';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard ON profiles;
CREATE TRIGGER trg_profiles_guard
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_guard();

CREATE OR REPLACE FUNCTION section_grades_guard() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max NUMERIC;
  v_ok BOOLEAN;
BEGIN
  SELECT m.max_score,
         (m.course_id = s.course_id AND m.academic_year = s.academic_year)
    INTO v_max, v_ok
    FROM assignment_clo_mappings m, course_sections s
   WHERE m.id = NEW.mapping_id AND s.id = NEW.section_id;

  IF v_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Mapping does not belong to the course and academic year of this section';
  END IF;
  IF NEW.score > v_max THEN
    RAISE EXCEPTION 'Score % exceeds the maximum score % of this assessment item', NEW.score, v_max;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_section_grades_guard ON section_grades;
CREATE TRIGGER trg_section_grades_guard
  BEFORE INSERT OR UPDATE ON section_grades
  FOR EACH ROW EXECUTE FUNCTION section_grades_guard();

CREATE OR REPLACE FUNCTION course_sections_touch() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_sections_touch ON course_sections;
CREATE TRIGGER trg_course_sections_touch
  BEFORE UPDATE ON course_sections
  FOR EACH ROW EXECUTE FUNCTION course_sections_touch();

-- Remove dependent role data when a course or CLO is deleted from the existing admin screens.
CREATE OR REPLACE FUNCTION cleanup_course_data() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM section_grades WHERE section_id IN (SELECT id FROM course_sections WHERE course_id = OLD.id::text);
  DELETE FROM course_sections WHERE course_id = OLD.id::text;
  DELETE FROM assignment_clo_mappings WHERE course_id = OLD.id::text;
  DELETE FROM clo_thresholds WHERE course_id = OLD.id::text;
  DELETE FROM course_coordinators WHERE course_id = OLD.id::text;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_course_data ON courses;
CREATE TRIGGER trg_cleanup_course_data
  AFTER DELETE ON courses
  FOR EACH ROW EXECUTE FUNCTION cleanup_course_data();

CREATE OR REPLACE FUNCTION cleanup_clo_data() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM assignment_clo_mappings WHERE clo_id = OLD.id::text;
  DELETE FROM clo_thresholds WHERE clo_id = OLD.id::text;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_clo_data ON clos;
CREATE TRIGGER trg_cleanup_clo_data
  AFTER DELETE ON clos
  FOR EACH ROW EXECUTE FUNCTION cleanup_clo_data();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Replaces all grades of one section atomically. SECURITY INVOKER: RLS and the section lock apply.
CREATE OR REPLACE FUNCTION replace_section_grades(p_section_id UUID, p_rows JSONB) RETURNS INTEGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_section course_sections%ROWTYPE;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_section FROM course_sections WHERE id = p_section_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Section not found or access denied';
  END IF;
  IF v_section.instructor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned section instructor can upload grades';
  END IF;
  IF is_year_locked(v_section.academic_year) THEN
    RAISE EXCEPTION 'Academic year % is locked', v_section.academic_year;
  END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Grades payload must be a JSON array';
  END IF;

  DELETE FROM section_grades WHERE section_id = p_section_id;

  INSERT INTO section_grades (section_id, mapping_id, student_id, score)
  SELECT p_section_id, r.mapping_id, btrim(r.student_id), r.score
    FROM jsonb_to_recordset(p_rows) AS r(mapping_id UUID, student_id TEXT, score NUMERIC);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM log_audit_event(
    'GRADES_UPLOADED', 'section_grades', p_section_id::text,
    jsonb_build_object('rows', v_count, 'course_id', v_section.course_id,
                       'section', v_section.section_code, 'academic_year', v_section.academic_year)
  );
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION clear_must_change_password() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE profiles SET must_change_password = FALSE, updated_at = NOW() WHERE id = auth.uid();
  PERFORM log_audit_event('PASSWORD_CHANGED', 'profiles', auth.uid()::text, NULL);
END;
$$;

REVOKE EXECUTE ON FUNCTION replace_section_grades(UUID, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION clear_must_change_password() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION replace_section_grades(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_must_change_password() TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- Results (views run with the caller's RLS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW section_student_clo_scores WITH (security_invoker = true) AS
SELECT
  g.section_id,
  s.course_id,
  s.academic_year,
  m.clo_id,
  g.student_id,
  SUM(g.score) AS score,
  SUM(m.max_score) AS max_score
FROM section_grades g
JOIN assignment_clo_mappings m ON m.id = g.mapping_id
JOIN course_sections s ON s.id = g.section_id
GROUP BY g.section_id, s.course_id, s.academic_year, m.clo_id, g.student_id;

-- Share of students whose CLO percentage meets or exceeds the coordinator's threshold.
CREATE OR REPLACE VIEW section_clo_results WITH (security_invoker = true) AS
SELECT
  ss.section_id,
  ss.course_id,
  ss.academic_year,
  ss.clo_id,
  COALESCE(t.threshold, 60) AS threshold,
  COUNT(*) AS students_assessed,
  COUNT(*) FILTER (WHERE ss.max_score > 0 AND ss.score * 100 / ss.max_score >= COALESCE(t.threshold, 60)) AS students_met,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE ss.max_score > 0 AND ss.score * 100 / ss.max_score >= COALESCE(t.threshold, 60))
    / NULLIF(COUNT(*), 0), 2
  ) AS achievement
FROM section_student_clo_scores ss
LEFT JOIN clo_thresholds t ON t.clo_id = ss.clo_id AND t.academic_year = ss.academic_year
GROUP BY ss.section_id, ss.course_id, ss.academic_year, ss.clo_id, t.threshold;

-- Course-level CLO achievement: all students of all sections pooled (student-weighted).
CREATE OR REPLACE VIEW course_clo_results WITH (security_invoker = true) AS
SELECT
  course_id,
  academic_year,
  clo_id,
  MAX(threshold) AS threshold,
  COUNT(DISTINCT section_id) AS sections_count,
  SUM(students_assessed)::BIGINT AS students_assessed,
  SUM(students_met)::BIGINT AS students_met,
  ROUND(100.0 * SUM(students_met) / NULLIF(SUM(students_assessed), 0), 2) AS achievement
FROM section_clo_results
GROUP BY course_id, academic_year, clo_id;

-- ---------------------------------------------------------------------------
-- Row Level Security: reset policies on core tables, then apply role-aware ones
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'departments', 'programs', 'courses', 'clos', 'plos', 'assessments',
    'indirect_plo_assessments', 'plo_targets', 'clo_targets',
    'profiles', 'academic_sessions', 'course_coordinators', 'course_sections',
    'assignment_clo_mappings', 'clo_thresholds', 'section_grades', 'audit_log'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
        EXECUTE format('DROP POLICY %I ON %I', pol.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- departments
CREATE POLICY departments_select ON departments FOR SELECT TO authenticated
  USING (id::text = app_department_id()::text);

-- programs
CREATE POLICY programs_select ON programs FOR SELECT TO authenticated
  USING (can_access_program(id::text));
CREATE POLICY programs_insert ON programs FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND department_id::text = app_department_id()::text);
CREATE POLICY programs_update ON programs FOR UPDATE TO authenticated
  USING (is_admin() AND department_id::text = app_department_id()::text)
  WITH CHECK (is_admin() AND department_id::text = app_department_id()::text);
CREATE POLICY programs_delete ON programs FOR DELETE TO authenticated
  USING (is_admin() AND department_id::text = app_department_id()::text);

-- courses
CREATE POLICY courses_select ON courses FOR SELECT TO authenticated
  USING (can_access_course(id::text));
CREATE POLICY courses_insert ON courses FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND program_in_my_department(program_id::text));
CREATE POLICY courses_update ON courses FOR UPDATE TO authenticated
  USING (is_admin() AND course_in_my_department(id::text))
  WITH CHECK (is_admin() AND program_in_my_department(program_id::text));
CREATE POLICY courses_delete ON courses FOR DELETE TO authenticated
  USING (is_admin() AND course_in_my_department(id::text));

-- clos: coordinators manage the CLOs of their courses; admins keep their existing access
CREATE POLICY clos_select ON clos FOR SELECT TO authenticated
  USING (can_access_course(course_id::text));
CREATE POLICY clos_insert ON clos FOR INSERT TO authenticated
  WITH CHECK (can_manage_course(course_id::text));
CREATE POLICY clos_update ON clos FOR UPDATE TO authenticated
  USING (can_manage_course(course_id::text))
  WITH CHECK (can_manage_course(course_id::text));
CREATE POLICY clos_delete ON clos FOR DELETE TO authenticated
  USING (can_manage_course(course_id::text));

-- plos: read for anyone working in the program, write for admin
CREATE POLICY plos_select ON plos FOR SELECT TO authenticated
  USING (can_access_program(program_id::text));
CREATE POLICY plos_insert ON plos FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND program_in_my_department(program_id::text));
CREATE POLICY plos_update ON plos FOR UPDATE TO authenticated
  USING (is_admin() AND program_in_my_department(program_id::text))
  WITH CHECK (is_admin() AND program_in_my_department(program_id::text));
CREATE POLICY plos_delete ON plos FOR DELETE TO authenticated
  USING (is_admin() AND program_in_my_department(program_id::text));

-- plo_targets / assessments / indirect_plo_assessments: program-level assessment is admin only
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['plo_targets', 'assessments', 'indirect_plo_assessments'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (is_admin() AND program_in_my_department(program_id::text))',
        t || '_select', t);
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (is_admin() AND program_in_my_department(program_id::text)) WITH CHECK (is_admin() AND program_in_my_department(program_id::text))',
        t || '_write', t);
    END IF;
  END LOOP;
END $$;

-- clo_targets: readable by anyone with access to the course, written by admin
CREATE POLICY clo_targets_select ON clo_targets FOR SELECT TO authenticated
  USING (can_access_course(clo_course_id(clo_id::text)));
CREATE POLICY clo_targets_write ON clo_targets FOR ALL TO authenticated
  USING (is_admin() AND program_in_my_department(program_id::text))
  WITH CHECK (is_admin() AND program_in_my_department(program_id::text));

-- profiles
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (is_admin() AND department_id = app_department_id())
    OR (role = 'instructor' AND coordinates_instructor(id))
  );
CREATE POLICY profiles_insert ON profiles FOR INSERT TO authenticated
  WITH CHECK (
    department_id = app_department_id()
    AND (is_admin() OR (app_role() = 'coordinator' AND role = 'instructor'))
  );
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated
  USING (
    (is_admin() AND department_id = app_department_id())
    OR (role = 'instructor' AND coordinates_instructor(id))
  )
  WITH CHECK (
    department_id = app_department_id()
    AND (is_admin() OR role = 'instructor')
  );

-- academic_sessions
CREATE POLICY academic_sessions_select ON academic_sessions FOR SELECT TO authenticated
  USING (department_id = app_department_id());
CREATE POLICY academic_sessions_write ON academic_sessions FOR ALL TO authenticated
  USING (is_admin() AND department_id = app_department_id())
  WITH CHECK (is_admin() AND department_id = app_department_id());

-- course_coordinators
CREATE POLICY course_coordinators_select ON course_coordinators FOR SELECT TO authenticated
  USING ((is_admin() AND course_in_my_department(course_id)) OR profile_id = auth.uid());
CREATE POLICY course_coordinators_write ON course_coordinators FOR ALL TO authenticated
  USING (is_admin() AND course_in_my_department(course_id))
  WITH CHECK (
    is_admin() AND course_in_my_department(course_id)
    AND profile_has_role_in_my_department(profile_id, 'coordinator')
  );

-- course_sections: coordinators/admins manage, instructors only see their own
CREATE POLICY course_sections_select ON course_sections FOR SELECT TO authenticated
  USING (can_manage_course(course_id) OR instructor_id = auth.uid());
CREATE POLICY course_sections_insert ON course_sections FOR INSERT TO authenticated
  WITH CHECK (
    can_manage_course(course_id) AND NOT is_year_locked(academic_year)
    AND (instructor_id IS NULL OR profile_has_role_in_my_department(instructor_id, 'instructor'))
  );
CREATE POLICY course_sections_update ON course_sections FOR UPDATE TO authenticated
  USING (can_manage_course(course_id) AND NOT is_year_locked(academic_year))
  WITH CHECK (
    can_manage_course(course_id) AND NOT is_year_locked(academic_year)
    AND (instructor_id IS NULL OR profile_has_role_in_my_department(instructor_id, 'instructor'))
  );
CREATE POLICY course_sections_delete ON course_sections FOR DELETE TO authenticated
  USING (can_manage_course(course_id) AND NOT is_year_locked(academic_year));

-- assignment_clo_mappings and clo_thresholds
CREATE POLICY mappings_select ON assignment_clo_mappings FOR SELECT TO authenticated
  USING (can_access_course(course_id));
CREATE POLICY mappings_write ON assignment_clo_mappings FOR ALL TO authenticated
  USING (can_manage_course(course_id) AND NOT is_year_locked(academic_year))
  WITH CHECK (
    can_manage_course(course_id) AND NOT is_year_locked(academic_year)
    AND clo_belongs_to_course(clo_id, course_id)
  );

CREATE POLICY clo_thresholds_select ON clo_thresholds FOR SELECT TO authenticated
  USING (can_access_course(course_id));
CREATE POLICY clo_thresholds_write ON clo_thresholds FOR ALL TO authenticated
  USING (can_manage_course(course_id) AND NOT is_year_locked(academic_year))
  WITH CHECK (
    can_manage_course(course_id) AND NOT is_year_locked(academic_year)
    AND clo_belongs_to_course(clo_id, course_id)
  );

-- section_grades: only the assigned instructor writes; managers read
CREATE POLICY section_grades_select ON section_grades FOR SELECT TO authenticated
  USING (can_read_section(section_id));
CREATE POLICY section_grades_insert ON section_grades FOR INSERT TO authenticated
  WITH CHECK (is_my_open_section(section_id));
CREATE POLICY section_grades_update ON section_grades FOR UPDATE TO authenticated
  USING (is_my_open_section(section_id))
  WITH CHECK (is_my_open_section(section_id));
CREATE POLICY section_grades_delete ON section_grades FOR DELETE TO authenticated
  USING (is_my_open_section(section_id));

-- audit_log: admins read their department's trail; writes only through SECURITY DEFINER functions
CREATE POLICY audit_log_select ON audit_log FOR SELECT TO authenticated
  USING (is_admin() AND department_id = app_department_id());

-- ---------------------------------------------------------------------------
-- Audit triggers on every table that carries business data
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'programs', 'courses', 'clos', 'plos', 'assessments', 'indirect_plo_assessments',
    'plo_targets', 'clo_targets', 'profiles', 'academic_sessions', 'course_coordinators',
    'course_sections', 'assignment_clo_mappings', 'clo_thresholds'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON %I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION log_row_audit()',
        t, t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Seed: default academic sessions for every department (same years the app already offers)
-- ---------------------------------------------------------------------------

INSERT INTO academic_sessions (department_id, name)
SELECT d.id, y.name
FROM departments d
CROSS JOIN (VALUES ('2022-2023'), ('2023-2024'), ('2024-2025'), ('2025-2026')) AS y(name)
ON CONFLICT (department_id, name) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- BOOTSTRAP (run once, after creating the user in Supabase Dashboard > Authentication > Users):
--
-- INSERT INTO profiles (id, full_name, email, role, department_id)
-- SELECT id, 'Architecture Admin', email, 'admin', '2c326074-9095-4f66-8998-bb06d8fd66c4'
-- FROM auth.users WHERE email = 'admin@example.edu';
-- ---------------------------------------------------------------------------
