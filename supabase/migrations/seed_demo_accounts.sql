-- Demo accounts + sample data in an ISOLATED "Demo Department".
-- Run in the Supabase SQL editor AFTER create_role_based_access.sql. Safe to re-run.
-- Accounts (password for all: Demo#Pass2026):
--   demo.admin@plo-demo.local, demo.coordinator@plo-demo.local, demo.instructor@plo-demo.local
-- Because every permission is department-scoped, these accounts cannot see or change real departments.
-- To remove the demo later: DELETE FROM auth.users WHERE email LIKE '%@plo-demo.local'; then delete the demo department.

DO $$
DECLARE
  v_dept UUID := 'de000000-0000-4000-8000-000000000001';
  v_admin UUID := 'de000000-0000-4000-8000-0000000000a1';
  v_coord UUID := 'de000000-0000-4000-8000-0000000000c1';
  v_inst UUID := 'de000000-0000-4000-8000-0000000000d1';
  v_pw TEXT := 'Demo#Pass2026';
  v_prog TEXT;
  v_course TEXT;
  v_plo UUID;
  v_clo1 UUID;
  v_clo2 UUID;
  v_sec UUID;
  v_m1 UUID;
  v_m2 UUID;
  v_m3 UUID;
  v_email TEXT;
  v_id UUID;
  i INTEGER;
BEGIN
  INSERT INTO departments (id, name) VALUES (v_dept, 'Demo Department') ON CONFLICT (id) DO NOTHING;

  FOR v_id, v_email IN VALUES
    (v_admin, 'demo.admin@plo-demo.local'),
    (v_coord, 'demo.coordinator@plo-demo.local'),
    (v_inst, 'demo.instructor@plo-demo.local')
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
        extensions.crypt(v_pw, extensions.gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '', '', '', '', ''
      );
      INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_id, v_id::text,
        jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
        'email', NOW(), NOW(), NOW()
      );
    END IF;
  END LOOP;

  -- Accounts created from the Dashboard have their own ids: always resolve ids by email.
  SELECT id INTO v_admin FROM auth.users WHERE email = 'demo.admin@plo-demo.local';
  SELECT id INTO v_coord FROM auth.users WHERE email = 'demo.coordinator@plo-demo.local';
  SELECT id INTO v_inst FROM auth.users WHERE email = 'demo.instructor@plo-demo.local';

  INSERT INTO profiles (id, full_name, email, role, department_id, phone) VALUES
    (v_admin, 'Demo Admin', 'demo.admin@plo-demo.local', 'admin', v_dept, '+966500000100'),
    (v_coord, 'Demo Coordinator', 'demo.coordinator@plo-demo.local', 'coordinator', v_dept, '+966500000101'),
    (v_inst, 'Demo Instructor', 'demo.instructor@plo-demo.local', 'instructor', v_dept, '+966500000102')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO academic_sessions (department_id, name, is_locked)
  SELECT v_dept, y, FALSE FROM unnest(ARRAY['2023-2024', '2024-2025', '2025-2026']) AS y
  ON CONFLICT (department_id, name) DO NOTHING;

  SELECT id::text INTO v_prog FROM programs WHERE department_id = v_dept AND name = 'Demo Program' LIMIT 1;
  IF v_prog IS NULL THEN
    INSERT INTO programs (name, department_id) VALUES ('Demo Program', v_dept) RETURNING id::text INTO v_prog;
    INSERT INTO courses (program_id, code, name) SELECT id, 'DEMO101', 'Introduction to Design' FROM programs WHERE id::text = v_prog RETURNING id::text INTO v_course;
    INSERT INTO plos (program_id, code, description, target_value) SELECT id, 'PLO-1', 'Apply design principles', 75 FROM programs WHERE id::text = v_prog RETURNING id INTO v_plo;
    INSERT INTO clos (course_id, plo_id, code, description, achievement, weight, target_value)
      SELECT id, v_plo, 'CLO-1', 'Explain core design concepts', 0, 1, 75 FROM courses WHERE id::text = v_course RETURNING id INTO v_clo1;
    INSERT INTO clos (course_id, plo_id, code, description, achievement, weight, target_value)
      SELECT id, v_plo, 'CLO-2', 'Produce a design solution', 0, 1, 75 FROM courses WHERE id::text = v_course RETURNING id INTO v_clo2;

    INSERT INTO course_coordinators (course_id, profile_id) VALUES (v_course, v_coord);

    INSERT INTO clo_thresholds (course_id, clo_id, academic_year, threshold) VALUES
      (v_course, v_clo1::text, '2024-2025', 60), (v_course, v_clo2::text, '2024-2025', 70);

    INSERT INTO assignment_clo_mappings (course_id, academic_year, assignment_name, clo_id, max_score, sort_order)
      VALUES (v_course, '2024-2025', 'Midterm', v_clo1::text, 20, 1) RETURNING id INTO v_m1;
    INSERT INTO assignment_clo_mappings (course_id, academic_year, assignment_name, clo_id, max_score, sort_order)
      VALUES (v_course, '2024-2025', 'Project', v_clo2::text, 30, 2) RETURNING id INTO v_m2;
    INSERT INTO assignment_clo_mappings (course_id, academic_year, assignment_name, clo_id, max_score, sort_order)
      VALUES (v_course, '2024-2025', 'Final', v_clo1::text, 50, 3) RETURNING id INTO v_m3;

    INSERT INTO course_sections (course_id, academic_year, section_code, instructor_id)
      VALUES (v_course, '2024-2025', 'A1', v_inst) RETURNING id INTO v_sec;

    FOR i IN 1..10 LOOP
      INSERT INTO section_grades (section_id, mapping_id, student_id, score) VALUES
        (v_sec, v_m1, 'S' || i, LEAST(20, 6 + i * 1.4)),
        (v_sec, v_m2, 'S' || i, LEAST(30, 8 + i * 2.2)),
        (v_sec, v_m3, 'S' || i, LEAST(50, 15 + i * 3.5));
    END LOOP;
  END IF;
END $$;
