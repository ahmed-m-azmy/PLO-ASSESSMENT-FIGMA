import * as XLSX from "xlsx";
import { supabase } from "../../supabase";
import { DEFAULT_CLO_THRESHOLD, invokeAdminUsers, type CreatedAccount } from "./roles";
import type { CloInfo, CourseInfo, MappingInfo, SectionInfo } from "./outcomes-data";

export interface SetupClo {
  row: number;
  code: string;
  description: string;
  ploId: string;
  weight: number;
  threshold: number | null;
}

export interface SetupMapping {
  row: number;
  assignment: string;
  cloCode: string;
  maxScore: number;
}

export interface SetupSection {
  row: number;
  sectionCode: string;
  fullName: string;
  email: string;
  phone: string;
}

export interface SetupIssue {
  sheet: string;
  row: number;
  message: string;
}

export interface SetupPlan {
  clos: SetupClo[] | null;
  mappings: SetupMapping[] | null;
  sections: SetupSection[] | null;
  issues: SetupIssue[];
}

export interface SetupContext {
  plos: { id: string; code: string }[];
  existingClos: CloInfo[];
}

export interface SetupExisting {
  clos: CloInfo[];
  thresholds: Map<string, number>;
  mappings: MappingInfo[];
  sections: SectionInfo[];
  plos: { id: string; code: string }[];
}

const SHEETS = { clos: "CLOs", mappings: "Mapping", sections: "Sections" } as const;
const CLO_HEADERS = ["CLO Code", "Description", "PLO Code", "Weight", "Threshold %"];
const MAPPING_HEADERS = ["Assignment", "CLO Code", "Max Score"];
const SECTION_HEADERS = ["Section", "Instructor Name", "Instructor Email", "Phone"];

const ALIASES = {
  cloCode: ["clocode", "clo", "code", "cloid"],
  description: ["description", "desc", "cloDescription"],
  ploCode: ["plocode", "plo"],
  weight: ["weight", "cloweight"],
  threshold: ["threshold", "threshold%", "thresholdpercent", "achievementthreshold"],
  assignment: ["assignment", "assignmentname", "assessment", "item"],
  maxScore: ["maxscore", "maxmark", "maxgrade", "max", "outof", "maximum"],
  section: ["section", "sectioncode", "sectionno", "sectionnumber"],
  name: ["instructorname", "name", "fullname", "instructor"],
  email: ["instructoremail", "email", "emailaddress", "mail"],
  phone: ["phone", "mobile", "phonenumber", "contact", "tel"],
} as const;

const norm = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9%]+/g, "");
const key = (value: string) => value.trim().toLowerCase();

function readSheet(workbook: XLSX.WorkBook, name: string): Record<string, unknown>[] | null {
  const sheetName = workbook.SheetNames.find((n) => norm(n) === norm(name));
  if (!sheetName) return null;
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "", raw: false });
}

function field(record: Record<string, unknown>, aliases: readonly string[]): string {
  const wanted = aliases.map(norm);
  const found = Object.keys(record).find((k) => wanted.includes(norm(k)));
  return found ? String(record[found] ?? "").trim() : "";
}

const isBlank = (record: Record<string, unknown>) => Object.values(record).every((v) => String(v ?? "").trim() === "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function buildSetupTemplate(course: CourseInfo, existing: SetupExisting | null): XLSX.WorkBook {
  const cloById = new Map(existing?.clos.map((c) => [c.id, c.code]));
  const ploById = new Map(existing?.plos.map((p) => [p.id, p.code]));
  const hasData = existing && (existing.clos.length || existing.mappings.length || existing.sections.length);

  const cloRows: (string | number)[][] = hasData
    ? existing.clos.map((c) => [
        c.code,
        c.description,
        (c.ploId && ploById.get(c.ploId)) || "",
        c.weight,
        existing.thresholds.get(c.id) ?? DEFAULT_CLO_THRESHOLD,
      ])
    : [
        ["CLO-1", "Explain the core concepts of the course", existing?.plos[0]?.code ?? "PLO-1", 1, 60],
        ["CLO-2", "Apply the concepts to a design problem", existing?.plos[0]?.code ?? "PLO-1", 1, 70],
      ];
  const mappingRows: (string | number)[][] = hasData
    ? existing.mappings.map((m) => [m.assignmentName, cloById.get(m.cloId) ?? "", m.maxScore])
    : [
        ["Midterm", "CLO-1", 20],
        ["Project", "CLO-2", 30],
        ["Final Exam", "CLO-1", 50],
      ];
  const sectionRows: string[][] = hasData
    ? existing.sections.map((s) => [s.sectionCode, s.instructorName ?? "", s.instructorEmail ?? "", s.instructorPhone ?? ""])
    : [
        ["A1", "Dr. Sample Instructor", "instructor@example.edu", "+966500000000"],
        ["B1", "", "", ""],
      ];

  const guide = XLSX.utils.aoa_to_sheet([
    [`Course setup file for ${course.code} - ${course.name}`],
    [""],
    ["Fill the three sheets (CLOs, Mapping, Sections), then upload the file. Any sheet you leave out is skipped."],
    ["CLOs: CLO Code is the key. Existing codes are updated, new codes are added. PLO Code must match a PLO of this program."],
    [`Threshold % is the minimum CLO score a student needs to count as achieving it (blank = ${DEFAULT_CLO_THRESHOLD}). Weight defaults to 1.`],
    ["Mapping: every row links an assignment to a CLO Code (from the CLOs sheet or an existing CLO) with its maximum score."],
    ["Sections: Section is the key. Instructor name and email are optional; an email creates the instructor account if it is new."],
    ["Nothing is deleted by an import. Remove items manually from the screens if needed."],
  ]);
  guide["!cols"] = [{ wch: 120 }];

  const sheetOf = (headers: string[], rows: (string | number)[][]) => {
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    sheet["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 6, 24) }));
    return sheet;
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetOf(CLO_HEADERS, cloRows), SHEETS.clos);
  XLSX.utils.book_append_sheet(workbook, sheetOf(MAPPING_HEADERS, mappingRows), SHEETS.mappings);
  XLSX.utils.book_append_sheet(workbook, sheetOf(SECTION_HEADERS, sectionRows), SHEETS.sections);
  XLSX.utils.book_append_sheet(workbook, guide, "Guide");
  return workbook;
}

export function setupTemplateFileName(course: CourseInfo, year: string) {
  return `${course.code}_${year}_course_setup.xlsx`.replace(/[^\w.-]+/g, "_");
}

/** Reads and validates the workbook. Nothing is written to the database here. */
export function parseSetupWorkbook(workbook: XLSX.WorkBook, context: SetupContext): SetupPlan {
  const issues: SetupIssue[] = [];
  const add = (sheet: string, row: number, message: string) => issues.push({ sheet, row, message });

  const cloSheet = readSheet(workbook, SHEETS.clos);
  const mappingSheet = readSheet(workbook, SHEETS.mappings);
  const sectionSheet = readSheet(workbook, SHEETS.sections);
  if (!cloSheet && !mappingSheet && !sectionSheet) {
    add("File", 0, "No sheet named CLOs, Mapping or Sections was found. Download the template and fill it.");
    return { clos: null, mappings: null, sections: null, issues };
  }

  const ploByCode = new Map(context.plos.map((p) => [key(p.code), p.id]));
  let clos: SetupClo[] | null = null;
  if (cloSheet) {
    clos = [];
    const seen = new Set<string>();
    cloSheet.forEach((record, index) => {
      if (isBlank(record)) return;
      const row = index + 2;
      const code = field(record, ALIASES.cloCode);
      const ploCode = field(record, ALIASES.ploCode);
      const weightText = field(record, ALIASES.weight);
      const thresholdText = field(record, ALIASES.threshold).replace("%", "");
      const weight = weightText === "" ? 1 : Number(weightText);
      const threshold = thresholdText === "" ? null : Number(thresholdText);
      if (!code) return add(SHEETS.clos, row, "CLO Code is required");
      if (seen.has(key(code))) return add(SHEETS.clos, row, `CLO ${code} appears more than once`);
      seen.add(key(code));
      const existing = context.existingClos.find((c) => key(c.code) === key(code));
      const ploId = ploByCode.get(key(ploCode)) ?? (!ploCode && existing?.ploId ? existing.ploId : undefined);
      if (!ploId) return add(SHEETS.clos, row, ploCode ? `PLO ${ploCode} does not exist in this program` : "PLO Code is required");
      if (!Number.isFinite(weight) || weight <= 0) return add(SHEETS.clos, row, "Weight must be a positive number");
      if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0 || threshold > 100)) {
        return add(SHEETS.clos, row, "Threshold % must be between 0 and 100");
      }
      clos!.push({
        row,
        code,
        description: field(record, ALIASES.description) || existing?.description || "",
        ploId,
        weight,
        threshold,
      });
    });
  }

  const knownCloCodes = new Set([...context.existingClos.map((c) => key(c.code)), ...(clos ?? []).map((c) => key(c.code))]);
  let mappings: SetupMapping[] | null = null;
  if (mappingSheet) {
    mappings = [];
    const seen = new Set<string>();
    mappingSheet.forEach((record, index) => {
      if (isBlank(record)) return;
      const row = index + 2;
      const assignment = field(record, ALIASES.assignment);
      const cloCode = field(record, ALIASES.cloCode);
      const maxScore = Number(field(record, ALIASES.maxScore));
      if (!assignment) return add(SHEETS.mappings, row, "Assignment is required");
      if (!cloCode) return add(SHEETS.mappings, row, "CLO Code is required");
      if (!knownCloCodes.has(key(cloCode))) return add(SHEETS.mappings, row, `CLO ${cloCode} is not defined (add it to the CLOs sheet)`);
      if (!Number.isFinite(maxScore) || maxScore <= 0) return add(SHEETS.mappings, row, "Max Score must be greater than 0");
      const id = `${key(assignment)}|${key(cloCode)}`;
      if (seen.has(id)) return add(SHEETS.mappings, row, `${assignment} -> ${cloCode} appears more than once`);
      seen.add(id);
      mappings!.push({ row, assignment, cloCode, maxScore });
    });
  }

  let sections: SetupSection[] | null = null;
  if (sectionSheet) {
    sections = [];
    const seen = new Set<string>();
    const emailNames = new Map<string, string>();
    sectionSheet.forEach((record, index) => {
      if (isBlank(record)) return;
      const row = index + 2;
      const sectionCode = field(record, ALIASES.section);
      const fullName = field(record, ALIASES.name);
      const email = field(record, ALIASES.email).toLowerCase();
      if (!sectionCode) return add(SHEETS.sections, row, "Section is required");
      if (seen.has(key(sectionCode))) return add(SHEETS.sections, row, `Section ${sectionCode} appears more than once`);
      seen.add(key(sectionCode));
      if (email && !EMAIL_RE.test(email)) return add(SHEETS.sections, row, `Invalid email: ${email}`);
      if (email && !fullName && !emailNames.has(email)) return add(SHEETS.sections, row, "Instructor name is required when an email is given");
      if (!email && fullName) return add(SHEETS.sections, row, "Instructor email is required when a name is given");
      if (email && fullName) emailNames.set(email, fullName);
      sections!.push({ row, sectionCode, fullName: fullName || emailNames.get(email) || "", email, phone: field(record, ALIASES.phone) });
    });
  }

  return { clos, mappings, sections, issues };
}

export interface ApplyOutcome {
  clos: { added: number; updated: number };
  mappings: { added: number; updated: number };
  sections: { added: number; updated: number };
  accounts: { email: string; fullName: string; password: string }[];
  errors: string[];
}

interface ApplyArgs {
  plan: SetupPlan;
  course: CourseInfo;
  academicYear: string;
  existing: SetupExisting;
}

/** Writes the plan with the caller's session, so RLS and audit triggers apply exactly as for manual edits. */
export async function applySetupPlan({ plan, course, academicYear, existing }: ApplyArgs): Promise<ApplyOutcome> {
  const outcome: ApplyOutcome = {
    clos: { added: 0, updated: 0 },
    mappings: { added: 0, updated: 0 },
    sections: { added: 0, updated: 0 },
    accounts: [],
    errors: [],
  };
  const cloIdByCode = new Map(existing.clos.map((c) => [key(c.code), c.id]));

  for (const clo of plan.clos ?? []) {
    const fields = { code: clo.code, description: clo.description, plo_id: clo.ploId, weight: clo.weight };
    const current = existing.clos.find((c) => key(c.code) === key(clo.code));
    if (current) {
      const { error } = await supabase.from("clos").update(fields).eq("id", current.id);
      if (error) {
        outcome.errors.push(`CLOs row ${clo.row}: ${error.message}`);
        continue;
      }
      outcome.clos.updated += 1;
    } else {
      const { data, error } = await supabase
        .from("clos")
        .insert({ ...fields, course_id: course.id, achievement: 0, target_value: 75 })
        .select("id")
        .single();
      if (error || !data) {
        outcome.errors.push(`CLOs row ${clo.row}: ${error?.message ?? "insert failed"}`);
        continue;
      }
      cloIdByCode.set(key(clo.code), String(data.id));
      outcome.clos.added += 1;
    }
    if (clo.threshold !== null) {
      const { error } = await supabase.from("clo_thresholds").upsert(
        { course_id: course.id, clo_id: cloIdByCode.get(key(clo.code)), academic_year: academicYear, threshold: clo.threshold },
        { onConflict: "clo_id,academic_year" },
      );
      if (error) outcome.errors.push(`CLOs row ${clo.row} threshold: ${error.message}`);
    }
  }

  let nextOrder = existing.mappings.reduce((max, m) => Math.max(max, m.sortOrder), 0);
  for (const mapping of plan.mappings ?? []) {
    const cloId = cloIdByCode.get(key(mapping.cloCode));
    if (!cloId) {
      outcome.errors.push(`Mapping row ${mapping.row}: CLO ${mapping.cloCode} could not be resolved`);
      continue;
    }
    const current = existing.mappings.find(
      (m) => key(m.assignmentName) === key(mapping.assignment) && m.cloId === cloId,
    );
    const { error } = current
      ? await supabase.from("assignment_clo_mappings").update({ max_score: mapping.maxScore }).eq("id", current.id)
      : await supabase.from("assignment_clo_mappings").insert({
          course_id: course.id,
          academic_year: academicYear,
          assignment_name: mapping.assignment,
          clo_id: cloId,
          max_score: mapping.maxScore,
          sort_order: (nextOrder += 1),
        });
    if (error) outcome.errors.push(`Mapping row ${mapping.row}: ${error.message}`);
    else if (current) outcome.mappings.updated += 1;
    else outcome.mappings.added += 1;
  }

  const instructorIds = new Map<string, string>();
  for (const section of plan.sections ?? []) {
    let instructorId: string | null = null;
    if (section.email) {
      instructorId = instructorIds.get(section.email) ?? null;
      if (!instructorId) {
        try {
          const account = await invokeAdminUsers<CreatedAccount>({
            action: "create_user",
            email: section.email,
            full_name: section.fullName,
            phone: section.phone,
            role: "instructor",
          });
          instructorId = account.profile_id;
          instructorIds.set(section.email, instructorId);
          if (account.temp_password) {
            outcome.accounts.push({ email: section.email, fullName: section.fullName, password: account.temp_password });
          }
        } catch (e) {
          outcome.errors.push(`Sections row ${section.row}: ${(e as Error).message}`);
          continue;
        }
      }
    }
    const current = existing.sections.find((s) => key(s.sectionCode) === key(section.sectionCode));
    const { error } = current
      ? await supabase.from("course_sections").update({ instructor_id: instructorId ?? current.instructorId }).eq("id", current.id)
      : await supabase.from("course_sections").insert({
          course_id: course.id,
          academic_year: academicYear,
          section_code: section.sectionCode,
          instructor_id: instructorId,
        });
    if (error) outcome.errors.push(`Sections row ${section.row}: ${error.message}`);
    else if (current) outcome.sections.updated += 1;
    else outcome.sections.added += 1;
  }

  return outcome;
}

export function buildCredentialsWorkbook(accounts: ApplyOutcome["accounts"]): XLSX.WorkBook {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Full Name", "Email", "Temporary Password"],
    ...accounts.map((a) => [a.fullName, a.email, a.password]),
  ]);
  sheet["!cols"] = [{ wch: 30 }, { wch: 34 }, { wch: 24 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Accounts");
  return workbook;
}
