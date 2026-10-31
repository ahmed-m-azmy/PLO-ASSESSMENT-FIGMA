# Role-based access: setup

Roles: **Admin** (full department control + program PLO assessment), **Course Coordinator** (CLOs, thresholds, Assignment-CLO mapping, section instructors, results), **Section Instructor** (assigned sections only: grade upload + section results).

All permissions are enforced by Postgres Row Level Security, not by the UI. Every change is written to `audit_log` (append-only, admin-readable).

## Setup order

1. **Create the first admin first.** The migration replaces the old open RLS policies, so nobody can sign in afterwards without a profile.
   In Supabase Dashboard > Authentication > Users, create the admin user (email + password).
2. Run `supabase/migrations/create_role_based_access.sql` in the SQL editor, then run the BOOTSTRAP block at the bottom of the file (adjust name, email, department id).
3. Deploy the Edge Function (needed to create accounts and reset passwords):
   `supabase functions deploy admin-users`
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are provided automatically; the service key never reaches the browser.)
4. In Authentication > Providers > Email, **disable public sign-ups** so only admin-created accounts exist.
5. `.env` keeps `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (anon key). Run `npm run build`.

## Workflow

1. **Admin**: Users tab > add coordinators, or import the staff list (template download included; contact info included). Assign each course to its coordinator.
2. **Coordinator**: defines CLOs (with the PLO each supports), the per-year threshold of each CLO, the Assignment-CLO mapping, and the sections/instructors.
3. **Instructor**: downloads the grade template (generated from the mapping), fills it, uploads. Upload is validated (section, columns, scores 0..max, duplicate IDs) and replaces the section's previous grades.
4. **Results**: section achievement = % of students whose CLO score is >= the CLO threshold. Course achievement = all students of all sections pooled. These course values feed the existing PLO calculation (CLOs tab, PLO Results, Analytics and reports are unchanged).

## Notes and assumptions

- Login is now email + password (Supabase Auth). The old department-password screen remains in code only for use without auth props.
- Temporary passwords are shown once (with CSV download) and must be changed at first sign-in.
- Default CLO threshold is 60% when none is set. Thresholds and mappings are per academic year (mappings can be copied from another year).
- Locking an academic year (admin) is stored in the database and blocks coordinator/instructor writes for that year.
- Course CLO achievement is computed for the selected year only where grades exist; otherwise the stored manual value is used.
- Student grades store only the student ID (no names).
- Removing an instructor who already uploaded grades un-assigns them (grades kept); a section without grades can be deleted.
