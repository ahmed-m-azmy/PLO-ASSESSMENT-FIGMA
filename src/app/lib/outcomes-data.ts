import { supabase } from "../../supabase";

export interface CourseInfo {
  id: string;
  code: string;
  name: string;
  programId: string;
}

export interface CloInfo {
  id: string;
  code: string;
  description: string;
  courseId: string;
  ploId: string | null;
  weight: number;
}

export interface SectionInfo {
  id: string;
  courseId: string;
  academicYear: string;
  sectionCode: string;
  instructorId: string | null;
  instructorName: string | null;
  instructorEmail: string | null;
  instructorPhone: string | null;
}

export interface MappingInfo {
  id: string;
  courseId: string;
  academicYear: string;
  assignmentName: string;
  cloId: string;
  maxScore: number;
  sortOrder: number;
}

export interface CloResult {
  sectionId?: string;
  courseId: string;
  academicYear: string;
  cloId: string;
  threshold: number;
  studentsAssessed: number;
  studentsMet: number;
  achievement: number | null;
  sectionsCount?: number;
}

export interface SessionInfo {
  name: string;
  isLocked: boolean;
}

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export async function loadCourses(courseIds?: string[]): Promise<CourseInfo[]> {
  let query = supabase.from("courses").select("id, code, name, program_id").order("code");
  if (courseIds) query = query.in("id", courseIds);
  const { data, error } = await query;
  fail(error);
  return (data ?? []).map((c: any) => ({
    id: String(c.id),
    code: c.code ?? "",
    name: c.name ?? "",
    programId: c.program_id ? String(c.program_id) : "",
  }));
}

export async function loadClos(courseId: string): Promise<CloInfo[]> {
  const { data, error } = await supabase.from("clos").select("*").eq("course_id", courseId).order("code");
  fail(error);
  return (data ?? []).map((c: any) => ({
    id: String(c.id),
    code: c.code ?? "",
    description: c.description ?? "",
    courseId: String(c.course_id),
    ploId: c.plo_id ? String(c.plo_id) : null,
    weight: Number(c.weight ?? 1),
  }));
}

export async function loadSessions(): Promise<SessionInfo[]> {
  const { data, error } = await supabase.from("academic_sessions").select("name, is_locked").order("name");
  fail(error);
  return (data ?? []).map((s: any) => ({ name: s.name, isLocked: Boolean(s.is_locked) }));
}

export async function loadSections(courseId: string, year: string): Promise<SectionInfo[]> {
  const { data, error } = await supabase
    .from("course_sections")
    .select("id, course_id, academic_year, section_code, instructor_id")
    .eq("course_id", courseId)
    .eq("academic_year", year)
    .order("section_code");
  fail(error);
  const rows = data ?? [];
  const instructorIds = Array.from(new Set(rows.map((r: any) => r.instructor_id).filter(Boolean)));
  const people = new Map<string, any>();
  if (instructorIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .in("id", instructorIds);
    fail(profileError);
    (profiles ?? []).forEach((p: any) => people.set(String(p.id), p));
  }
  return rows.map((r: any) => {
    const person = r.instructor_id ? people.get(String(r.instructor_id)) : null;
    return {
      id: String(r.id),
      courseId: String(r.course_id),
      academicYear: r.academic_year,
      sectionCode: r.section_code,
      instructorId: r.instructor_id ? String(r.instructor_id) : null,
      instructorName: person?.full_name ?? null,
      instructorEmail: person?.email ?? null,
      instructorPhone: person?.phone ?? null,
    };
  });
}

export async function loadMappings(courseId: string, year: string): Promise<MappingInfo[]> {
  const { data, error } = await supabase
    .from("assignment_clo_mappings")
    .select("id, course_id, academic_year, assignment_name, clo_id, max_score, sort_order, created_at")
    .eq("course_id", courseId)
    .eq("academic_year", year)
    .order("sort_order")
    .order("created_at");
  fail(error);
  return (data ?? []).map((m: any) => ({
    id: String(m.id),
    courseId: String(m.course_id),
    academicYear: m.academic_year,
    assignmentName: m.assignment_name,
    cloId: String(m.clo_id),
    maxScore: Number(m.max_score),
    sortOrder: Number(m.sort_order ?? 0),
  }));
}

const mapResult = (r: any): CloResult => ({
  sectionId: r.section_id ? String(r.section_id) : undefined,
  courseId: String(r.course_id),
  academicYear: r.academic_year,
  cloId: String(r.clo_id),
  threshold: Number(r.threshold),
  studentsAssessed: Number(r.students_assessed),
  studentsMet: Number(r.students_met),
  achievement: r.achievement === null || r.achievement === undefined ? null : Number(r.achievement),
  sectionsCount: r.sections_count === undefined ? undefined : Number(r.sections_count),
});

export async function loadSectionResults(courseId: string, year: string, sectionId?: string): Promise<CloResult[]> {
  let query = supabase.from("section_clo_results").select("*").eq("course_id", courseId).eq("academic_year", year);
  if (sectionId) query = query.eq("section_id", sectionId);
  const { data, error } = await query;
  fail(error);
  return (data ?? []).map(mapResult);
}

export async function loadCourseResults(year: string, courseId?: string): Promise<CloResult[]> {
  let query = supabase.from("course_clo_results").select("*").eq("academic_year", year);
  if (courseId) query = query.eq("course_id", courseId);
  const { data, error } = await query;
  fail(error);
  return (data ?? []).map(mapResult);
}

export async function loadThresholds(courseId: string, year: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("clo_thresholds")
    .select("clo_id, threshold")
    .eq("course_id", courseId)
    .eq("academic_year", year);
  fail(error);
  return new Map((data ?? []).map((t: any) => [String(t.clo_id), Number(t.threshold)]));
}
