# Figma Make prompt: PLOAS (Program Learning Outcomes Assessment System)

Paste everything below the line into Figma Make. Keep the SQL files (`supabase/migrations/*.sql`) to run in the Supabase SQL editor; Figma Make does not run them.

---

Build a production-style web app called **PLOAS - Program Learning Outcomes Assessment System** for a College of Architecture and Planning. Stack: React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui components, recharts, lucide-react, sonner toasts, `xlsx` (Excel import/export), `docx` and `jspdf` (report export), and `@supabase/supabase-js` for auth and data. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (anon key), optional `VITE_ENABLE_DEMO_LOGIN`.

## 1. Visual style
- Warm architectural theme: background `bg-gradient-to-br from-stone-50 to-amber-50`; primary actions amber/orange (`#b45309` to `#d97706` gradients); cards with rounded corners and soft shadows; KPI cards with a colored top border (`border-t-4 border-t-amber-700`).
- Login and main header use the background image `https://images.unsplash.com/photo-1554793000-245d3a3c2a51?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920` with a dark amber overlay (`from-amber-900/60 via-orange-900/50 to-amber-950/60`), white text and drop shadows.
- Main header (admin): title "PLOAS" (large, bold), subtitle "Program Learning Outcomes Assessment System", text "College of Architecture and Planning", a translucent pill with the department name, Logout and Password buttons (translucent white), program select, academic-year select, Report Export button and a Lock/Unlock Year toggle (green when open, red when locked). When the year is locked show a red banner: "Academic Year X is Locked - all modifications are disabled".

## 2. Authentication and roles
Email + password via Supabase Auth (session persisted, auto refresh). After sign-in load the user's row from table `profiles` (id, full_name, email, phone, role, department_id, is_active, must_change_password).
- No profile -> sign out and show "This account has no access to the system. Contact your administrator."
- `is_active = false` -> sign out and show "This account is deactivated."
- `must_change_password = true` -> a non-dismissable "Set a new password" dialog (min 10 chars + confirm). On success call `supabase.auth.updateUser({password})` then RPC `clear_must_change_password`.
- Wrong credentials show the Supabase error message.
- Login screen: centered card "Sign in - Admins, course coordinators and section instructors", Email, Password, Sign in button. If `VITE_ENABLE_DEMO_LOGIN === "true"` show below it three outlined buttons that sign in with one click: Demo Admin (`demo.admin@plo-demo.local`), Demo Course Coordinator (`demo.coordinator@plo-demo.local`), Demo Section Instructor (`demo.instructor@plo-demo.local`), password `Demo#Pass2026`.

Routing by role after login:
- **admin** -> the full PLOAS dashboard (section 3).
- **coordinator** -> "Course Coordinator Workspace" (section 4) inside a simple shell (header with name, email, role badge, Password and Sign out buttons).
- **instructor** -> "Section Instructor Workspace" (section 5) in the same shell.

All permissions are enforced in Postgres by Row Level Security (already written, do not re-implement them in the UI). The UI only hides what the role cannot use. Everything is scoped to the user's department.

## 3. Admin dashboard (department-scoped)
Tabs: **Overview, Programs, Courses, CLOs, PLOs, PLO Results, Analytics, Course Results, Users, Audit Log** (10 tabs in a grid).

Data tables (Supabase): `departments`, `programs` (id bigint, name, department_id), `courses` (id, code, name, program_id), `clos` (id, code, description, course_id, plo_id, achievement, weight, target_value), `plos` (id uuid, code, description, target_value, program_id), `assessments` and `indirect_plo_assessments` (indirect assessments: alumni survey, employer feedback, exit interviews with weights/values per program and year), `plo_targets` and `clo_targets` (target per program/year), `academic_sessions` (department_id, name, is_locked).

- **Overview:** KPI cards (Total PLOs, Total CLOs, Courses, average PLO achievement, PLOs meeting target) and summary charts.
- **Programs / Courses:** list, add, edit, delete; Excel import for courses.
- **CLOs:** table filtered by course/PLO, add CLO dialog (course, PLO, description, achievement %, weight), edit, delete, Excel import, "Manage CLO targets" dialog per year.
- **PLOs:** list, add, edit (code, description, target), delete, "Manage PLO targets" per year.
- **PLO Results:** per-PLO score and status badges (met / not met vs target). Score formula (keep exactly): `PLO score = round(0.6 x weighted_average(clo.achievement weighted by clo.weight, for CLOs whose plo_id = the PLO) + 0.4 x average of indirect assessments for the selected program and year)`. If a PLO has no indirect assessments use only the direct part; if no CLOs use only the indirect part.
- **Analytics:** recharts bar, line, radar and pie charts; year-over-year comparison with multi-year selection; progress bars.
- **Report Export button (header):** generates Word (docx) and PDF (jspdf) reports for the selected program and year with PLO results, CLO tables, indirect survey details and charts.
- **Academic years:** default 2022-2023 to 2025-2026, add/delete years; locking a year is saved in `academic_sessions` and blocks coordinator and instructor writes for that year.
- **CLO achievement overlay (important):** when loading CLOs for the selected program and year, read view `course_clo_results` (clo_id, achievement) filtered by `academic_year`; where a value exists it replaces the stored `clo.achievement`. The PLO formula above stays unchanged and the reports/analytics use the overlaid values automatically.
- **Course Results tab:** the course tools described in section 4 (the admin can manage any course of the department).
- **Users tab (admin only):**
  - Users table (name, email, phone, role, Active/Inactive badge) with actions: reset password, activate/deactivate (not for self).
  - "Add user" dialog (full name, email, phone, role). Calls Edge Function `admin-users` action `create_user`; show the returned temporary password once in a dialog with "Download CSV".
  - "Staff template" download and "Import staff (year)" Excel upload (columns: Role, Full Name, Email, Phone, Course Code, Section; role is coordinator or instructor; max 300 rows). Calls `import_staff` and shows a per-row result table (created / existing / error) with a credentials CSV download.
  - "Course coordinators" card: select coordinator + course, Assign button, assignments table with delete (table `course_coordinators`).
- **Audit Log tab (admin only):** latest 100 rows of `audit_log` (time, user name + role, action, entity, details JSON truncated), filter input, refresh button. Read-only.

## 4. Course Coordinator workspace (`CourseTools`, also used inside the admin tab)
Top bar: Course select (only courses the user may access), Academic year select from `academic_sessions` (locked years marked "(locked)" and shown with a "Locked: read only" badge; all writes disabled). Four tabs:
1. **CLOs and thresholds:** table of the course's CLOs (code, description, PLO code, weight, per-year **threshold %** input with a save icon, default 60). Add/Edit CLO dialog (code, description, supported PLO select from the course's program, weight); delete with confirmation. Thresholds saved to `clo_thresholds (course_id, clo_id, academic_year, threshold)` with upsert on `(clo_id, academic_year)`.
2. **Assignment mapping:** form (assignment name, CLO select, max score, Add) and table (assignment, CLO, editable max score, delete). Each row is one gradable column for the instructors' template. Supports mapping one assignment to several CLOs (one row per CLO). "Copy from year" select + button to copy missing mappings from another year. Table `assignment_clo_mappings (course_id, academic_year, assignment_name, clo_id, max_score, sort_order)`.
3. **Sections and instructors:** table (section code, instructor name, email, phone) with Add/Edit section dialog (section code, instructor name, email, phone). New instructor emails create an account through Edge Function `create_user` (role instructor) and show the temporary password once. Actions: edit, remove instructor from the section (set instructor_id null), delete section (only possible if it has no grades). Table `course_sections (course_id, academic_year, section_code, instructor_id)`.
4. **Results:** shared results component (below).

**Results component (`OutcomeResults`)**: matrix of CLOs (rows) vs sections (columns) plus a "Course (all sections)" column. Each cell shows the achievement % badge (default if >= threshold else destructive) and `met/assessed` counts. Data from views `section_clo_results` and `course_clo_results`. "Excel" export button (level, section, CLO, threshold, students assessed, met, achievement).

## 5. Section Instructor workspace
- Section select (only assigned sections, label: `COURSECODE - Section X - Year`).
- Tabs: **Upload grades** and **Section results** (OutcomeResults restricted to the section).
- **Upload grades:** shows how many columns the template has; warns if the coordinator has not defined the mapping. Buttons: "Download template", "Choose filled file" (disabled when locked or no mapping), max file 5 MB.
  - Template (.xlsx), generated from the mapping: sheet **Grades** with header `Student ID` then one column per mapping row labeled `Assignment -> CLO (max N)`; sheet **Info** with Section ID, Course, Section, Academic Year, generated time and instructions. File name `grades_COURSE_SECTION_YEAR.xlsx`.
  - Parser validates: Info sheet and Section ID match this section; all mapping columns exist; student ID present; no duplicate student IDs; numeric scores between 0 and max; empty cells allowed; extra columns produce warnings; students without scores skipped with warnings. Shows up to 25 errors in red; if no errors show "N students and M scores are ready to upload" and a "Confirm upload" button.
  - Upload calls RPC `replace_section_grades(p_section_id, p_rows)` with rows `{mapping_id, student_id, score}`; it replaces all previous grades for the section atomically. Only student IDs are stored (no names).

## 6. Assessment logic (database views, already defined in SQL)
- Per student and CLO: score% = sum(scores) / sum(max scores) of that CLO's mapped assignments.
- **Section CLO achievement** = percentage of students with score% >= the CLO threshold (default 60 when none is set).
- **Course CLO achievement** = all students of all sections pooled (student-weighted): sum(students_met) / sum(students_assessed).
- The course CLO achievement feeds the PLO calculation through the overlay in section 3.

## 7. Backend contracts (already exist in Supabase)
- Tables: profiles, academic_sessions, course_coordinators, course_sections, assignment_clo_mappings, clo_thresholds, section_grades, audit_log (append-only; every insert/update/delete on business tables is logged).
- RPCs: `replace_section_grades`, `clear_must_change_password`, `log_audit_event`.
- Views: `section_student_clo_scores`, `section_clo_results`, `course_clo_results`.
- Edge Function `admin-users` (POST JSON `{action, ...}`): `create_user {email, full_name, phone, role}` (admin any role; coordinator instructors only), `reset_password {user_id}` (admin only), `import_staff {academic_year, rows}` (admin only). Returns `temp_password` only when an account is created. Call with `supabase.functions.invoke("admin-users", {body})` and surface the `error` field from the response.
- Do not store the service-role key in the front end.

## 8. Behaviour and quality rules
- Loading and empty states everywhere; toasts for success/failure (sonner); confirm dialogs for destructive actions.
- Never expose another department's data; the UI trusts RLS and shows Supabase error messages.
- Deactivated users cannot sign in; admins cannot deactivate themselves.
- Temporary passwords are shown once and never logged.
- Responsive layout; tables scroll horizontally on small screens.
- Keep the code modular: `lib/roles.ts`, `lib/grade-template.ts`, `lib/staff-list.ts`, `lib/outcomes-data.ts` and components `role-login`, `auth-gate`, `change-password-dialog`, `workspace-shell`, `course-tools`, `clo-manager`, `mapping-manager`, `sections-manager`, `outcome-results`, `instructor-workspace`, `admin-users`, `audit-log-panel`, plus the main admin app component.
