// Supabase Edge Function: admin-users
//
// Creates login accounts and resets passwords. This is the only code that uses the service-role key.
// Every database write that is not an auth operation runs as the CALLER (their JWT), so Row Level
// Security and the audit triggers apply exactly as they do for the browser.
//
// Actions (POST JSON { action, ... }):
//   create_user    { email, full_name, phone?, role }       admin: any role / coordinator: instructors only
//   reset_password { user_id }                               admin only
//   import_staff   { academic_year, rows: [...] }            admin only

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type Role = "admin" | "coordinator" | "instructor";

interface Caller {
  id: string;
  role: Role;
  department_id: string;
}

interface StaffRow {
  role?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  course_code?: string;
  section_code?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_IMPORT_ROWS = 300;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function generateTempPassword(): string {
  const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%*?"];
  const all = groups.join("");
  const pick = (chars: string) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  const chars = groups.map(pick);
  while (chars.length < 14) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function requireRole(value: unknown): Role {
  if (value === "admin" || value === "coordinator" || value === "instructor") return value;
  throw new HttpError(400, "Role must be admin, coordinator or instructor");
}

interface Context {
  caller: Caller;
  asCaller: SupabaseClient;
  asService: SupabaseClient;
}

async function createAccount(
  ctx: Context,
  input: { email: unknown; full_name: unknown; phone?: unknown; role: unknown },
): Promise<{ profile_id: string; created: boolean; temp_password: string | null }> {
  const email = cleanText(input.email, 254).toLowerCase();
  const fullName = cleanText(input.full_name, 120);
  const phone = cleanText(input.phone, 40) || null;
  const role = requireRole(input.role);

  if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, `Invalid e-mail address: ${email || "(empty)"}`);
  if (!fullName) throw new HttpError(400, "Full name is required");
  if (ctx.caller.role === "coordinator" && role !== "instructor") {
    throw new HttpError(403, "Coordinators can only create section instructors");
  }
  if (ctx.caller.role === "instructor") throw new HttpError(403, "Instructors cannot create accounts");

  const { data: existing, error: lookupError } = await ctx.asService
    .from("profiles")
    .select("id, role, department_id")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) throw new HttpError(500, lookupError.message);

  if (existing) {
    if (existing.department_id !== ctx.caller.department_id || existing.role !== role) {
      throw new HttpError(409, `${email} is already registered with a different role or department`);
    }
    return { profile_id: existing.id, created: false, temp_password: null };
  }

  const tempPassword = generateTempPassword();
  const { data: authData, error: authError } = await ctx.asService.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (authError || !authData.user) {
    const message = authError?.message ?? "Could not create the login account";
    throw new HttpError(/already|registered|exists/i.test(message) ? 409 : 500, message);
  }

  const { error: profileError } = await ctx.asCaller.from("profiles").insert({
    id: authData.user.id,
    full_name: fullName,
    email,
    phone,
    role,
    department_id: ctx.caller.department_id,
    must_change_password: true,
  });
  if (profileError) {
    await ctx.asService.auth.admin.deleteUser(authData.user.id);
    throw new HttpError(403, profileError.message);
  }

  return { profile_id: authData.user.id, created: true, temp_password: tempPassword };
}

async function resetPassword(ctx: Context, userId: unknown) {
  if (ctx.caller.role !== "admin") throw new HttpError(403, "Only admins can reset passwords");
  const id = cleanText(userId, 64);
  if (!id) throw new HttpError(400, "user_id is required");

  const { data: target, error } = await ctx.asCaller.from("profiles").select("id, email").eq("id", id).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!target) throw new HttpError(404, "User not found in your department");

  const tempPassword = generateTempPassword();
  const { error: updateError } = await ctx.asService.auth.admin.updateUserById(id, { password: tempPassword });
  if (updateError) throw new HttpError(500, updateError.message);

  const { error: flagError } = await ctx.asCaller.from("profiles").update({ must_change_password: true }).eq("id", id);
  if (flagError) throw new HttpError(500, flagError.message);
  await ctx.asCaller.rpc("log_audit_event", {
    p_action: "PASSWORD_RESET",
    p_entity: "profiles",
    p_entity_id: id,
    p_details: { email: target.email },
  });

  return { user_id: id, email: target.email, temp_password: tempPassword };
}

async function importStaff(ctx: Context, academicYear: unknown, rows: unknown) {
  if (ctx.caller.role !== "admin") throw new HttpError(403, "Only admins can import staff lists");
  const year = cleanText(academicYear, 20);
  if (!year) throw new HttpError(400, "academic_year is required");
  if (!Array.isArray(rows) || rows.length === 0) throw new HttpError(400, "No rows to import");
  if (rows.length > MAX_IMPORT_ROWS) throw new HttpError(400, `Import at most ${MAX_IMPORT_ROWS} rows at a time`);

  const { data: courses, error: courseError } = await ctx.asCaller.from("courses").select("id, code");
  if (courseError) throw new HttpError(500, courseError.message);
  const courseByCode = new Map<string, string>(
    (courses ?? []).map((c: { id: unknown; code: string }) => [String(c.code).trim().toUpperCase(), String(c.id)]),
  );

  const results: Array<Record<string, unknown>> = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index] as StaffRow;
    const rowNumber = index + 1;
    const email = cleanText(row.email, 254).toLowerCase();
    try {
      const role = requireRole(String(row.role ?? "").trim().toLowerCase());
      if (role === "admin") throw new HttpError(400, "Admins cannot be imported from a staff list");

      const account = await createAccount(ctx, { ...row, role });
      let assignment = "account only";

      const courseCode = cleanText(row.course_code, 40).toUpperCase();
      if (courseCode) {
        const courseId = courseByCode.get(courseCode);
        if (!courseId) throw new HttpError(404, `Course ${courseCode} was not found in your department`);

        if (role === "coordinator") {
          const { error } = await ctx.asCaller
            .from("course_coordinators")
            .upsert({ course_id: courseId, profile_id: account.profile_id }, {
              onConflict: "course_id,profile_id",
              ignoreDuplicates: true,
            });
          if (error) throw new HttpError(403, error.message);
          assignment = `coordinator of ${courseCode}`;
        } else {
          const sectionCode = cleanText(row.section_code, 40);
          if (!sectionCode) throw new HttpError(400, "Section is required for instructors assigned to a course");
          const { error } = await ctx.asCaller
            .from("course_sections")
            .upsert(
              { course_id: courseId, academic_year: year, section_code: sectionCode, instructor_id: account.profile_id },
              { onConflict: "course_id,academic_year,section_code" },
            );
          if (error) throw new HttpError(403, error.message);
          assignment = `instructor of ${courseCode} section ${sectionCode}`;
        }
      }

      results.push({
        row: rowNumber,
        email,
        status: account.created ? "created" : "existing",
        assignment,
        temp_password: account.temp_password,
      });
    } catch (error) {
      results.push({
        row: rowNumber,
        email,
        status: "error",
        message: error instanceof Error ? error.message : "Unexpected error",
      });
    }
  }

  await ctx.asCaller.rpc("log_audit_event", {
    p_action: "STAFF_IMPORTED",
    p_entity: "profiles",
    p_entity_id: null,
    p_details: {
      academic_year: year,
      rows: rows.length,
      errors: results.filter((r) => r.status === "error").length,
    },
  });

  return { results };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new HttpError(401, "Missing authorization header");

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) throw new HttpError(500, "Function is not configured");

    const asCaller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const asService = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await asCaller.auth.getUser();
    if (userError || !userData.user) throw new HttpError(401, "Invalid or expired session");

    const { data: profile, error: profileError } = await asCaller
      .from("profiles")
      .select("id, role, department_id, is_active")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profileError) throw new HttpError(500, profileError.message);
    if (!profile || !profile.is_active) throw new HttpError(403, "Your account is not active");

    const ctx: Context = {
      caller: { id: profile.id, role: profile.role as Role, department_id: profile.department_id },
      asCaller,
      asService,
    };

    const body = await req.json().catch(() => {
      throw new HttpError(400, "Body must be valid JSON");
    });

    switch (body?.action) {
      case "create_user":
        return json({ ok: true, ...(await createAccount(ctx, body)) });
      case "reset_password":
        return json({ ok: true, ...(await resetPassword(ctx, body.user_id)) });
      case "import_staff":
        return json({ ok: true, ...(await importStaff(ctx, body.academic_year, body.rows)) });
      default:
        throw new HttpError(400, "Unknown action");
    }
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Unexpected server error" }, 500);
  }
});
