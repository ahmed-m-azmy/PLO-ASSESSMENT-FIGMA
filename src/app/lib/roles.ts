import { supabase } from "../../supabase";

export type Role = "admin" | "coordinator" | "instructor";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  departmentId: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  coordinator: "Course Coordinator",
  instructor: "Section Instructor",
};

export const DEFAULT_CLO_THRESHOLD = 60;

export function mapProfile(row: any): Profile {
  return {
    id: String(row.id),
    fullName: row.full_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? null,
    role: row.role as Role,
    departmentId: String(row.department_id),
    isActive: Boolean(row.is_active),
    mustChangePassword: Boolean(row.must_change_password),
  };
}

export const PROFILE_COLUMNS = "id, full_name, email, phone, role, department_id, is_active, must_change_password";

export interface CreatedAccount {
  profile_id: string;
  created: boolean;
  temp_password: string | null;
}

export interface ImportResultRow {
  row: number;
  email: string;
  status: "created" | "existing" | "error";
  assignment?: string;
  message?: string;
  temp_password?: string | null;
}

/** Calls the `admin-users` Edge Function and surfaces its error message. */
export async function invokeAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) {
    let message = error.message;
    const response = (error as { context?: Response }).context;
    if (response && typeof response.json === "function") {
      try {
        const payload = await response.json();
        if (payload?.error) message = String(payload.error);
      } catch {
        // keep the generic message
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}
