import * as XLSX from "xlsx";

export interface MappingColumn {
  id: string;
  assignmentName: string;
  cloCode: string;
  maxScore: number;
}

export interface TemplateSection {
  sectionId: string;
  courseCode: string;
  courseName: string;
  sectionCode: string;
  academicYear: string;
}

export interface ParsedGradeRow {
  mapping_id: string;
  student_id: string;
  score: number;
}

export interface ParsedGrades {
  rows: ParsedGradeRow[];
  students: number;
  errors: string[];
  warnings: string[];
}

export const STUDENT_ID_HEADER = "Student ID";
export const GRADES_SHEET = "Grades";
export const INFO_SHEET = "Info";

const MAX_REPORTED_ERRORS = 25;

export const columnLabel = (column: MappingColumn) =>
  `${column.assignmentName} -> ${column.cloCode} (max ${column.maxScore})`;

/** Builds the section grade template from the coordinator's Assignment-CLO mapping. */
export function buildGradeTemplate(section: TemplateSection, mappings: MappingColumn[]): XLSX.WorkBook {
  const header = [STUDENT_ID_HEADER, ...mappings.map(columnLabel)];
  const grades = XLSX.utils.aoa_to_sheet([header]);
  grades["!cols"] = header.map((label, index) => ({ wch: index === 0 ? 16 : Math.max(18, label.length + 2) }));

  const info = XLSX.utils.aoa_to_sheet([
    ["Section ID", section.sectionId],
    ["Course", `${section.courseCode} - ${section.courseName}`],
    ["Section", section.sectionCode],
    ["Academic Year", section.academicYear],
    ["Generated", new Date().toISOString()],
    [],
    ["Instructions"],
    [`1. Enter one student per row in the "${GRADES_SHEET}" sheet: Student ID, then the score for each column.`],
    ["2. Each score must be between 0 and the maximum shown in the column header. Leave a cell empty if not assessed."],
    ["3. Do not rename or reorder the columns and do not change this sheet."],
    ["4. Uploading replaces all grades previously uploaded for this section."],
  ]);
  info["!cols"] = [{ wch: 16 }, { wch: 60 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, grades, GRADES_SHEET);
  XLSX.utils.book_append_sheet(workbook, info, INFO_SHEET);
  return workbook;
}

export const gradeTemplateFileName = (section: TemplateSection) =>
  `grades_${section.courseCode}_${section.sectionCode}_${section.academicYear}.xlsx`.replace(/[^A-Za-z0-9._-]+/g, "_");

const normalizeHeader = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

function parseScore(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : "invalid";
  const text = String(value).trim();
  if (text === "") return null;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : "invalid";
}

/** Validates an uploaded workbook against the section and its current mapping. */
export function parseGradeWorkbook(
  workbook: XLSX.WorkBook,
  section: Pick<TemplateSection, "sectionId">,
  mappings: MappingColumn[],
): ParsedGrades {
  const result: ParsedGrades = { rows: [], students: 0, errors: [], warnings: [] };
  const addError = (message: string) => {
    if (result.errors.length < MAX_REPORTED_ERRORS) result.errors.push(message);
    else if (result.errors.length === MAX_REPORTED_ERRORS) result.errors.push("More errors were found; fix the above first.");
  };

  if (mappings.length === 0) {
    addError("The coordinator has not defined any Assignment-CLO mapping for this course and year.");
    return result;
  }

  const infoSheet = workbook.Sheets[INFO_SHEET];
  const infoRows: unknown[][] = infoSheet ? XLSX.utils.sheet_to_json(infoSheet, { header: 1, defval: null }) : [];
  const templateSectionId = infoRows.find((r) => normalizeHeader(r?.[0]) === "section id")?.[1];
  if (!templateSectionId) {
    addError(`The "${INFO_SHEET}" sheet is missing. Download a fresh template for this section.`);
    return result;
  }
  if (String(templateSectionId).trim() !== section.sectionId) {
    addError("This file was generated for a different section. Download the template for this section.");
    return result;
  }

  const sheet = workbook.Sheets[GRADES_SHEET];
  if (!sheet) {
    addError(`The "${GRADES_SHEET}" sheet is missing.`);
    return result;
  }
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const header = rows[0] ?? [];
  const headerIndex = new Map<string, number>();
  header.forEach((cell, index) => headerIndex.set(normalizeHeader(cell), index));

  const idColumn = headerIndex.get(normalizeHeader(STUDENT_ID_HEADER));
  if (idColumn === undefined) {
    addError(`Column "${STUDENT_ID_HEADER}" was not found.`);
    return result;
  }

  const columns: Array<{ mapping: MappingColumn; index: number }> = [];
  mappings.forEach((mapping) => {
    const index = headerIndex.get(normalizeHeader(columnLabel(mapping)));
    if (index === undefined) {
      addError(`Column "${columnLabel(mapping)}" is missing. The mapping changed: download a new template.`);
    } else {
      columns.push({ mapping, index });
    }
  });
  if (result.errors.length > 0) return result;

  const known = new Set([idColumn, ...columns.map((c) => c.index)]);
  header.forEach((cell, index) => {
    if (!known.has(index) && normalizeHeader(cell)) result.warnings.push(`Column "${String(cell)}" is not part of the mapping and was ignored.`);
  });

  const seenStudents = new Set<string>();
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] ?? [];
    const sheetRow = rowIndex + 1;
    const studentId = String(row[idColumn] ?? "").trim();
    const hasAnyScore = columns.some((c) => String(row[c.index] ?? "").trim() !== "");
    if (!studentId) {
      if (hasAnyScore) addError(`Row ${sheetRow}: scores found without a Student ID.`);
      continue;
    }
    if (seenStudents.has(studentId)) {
      addError(`Row ${sheetRow}: Student ID ${studentId} appears more than once.`);
      continue;
    }
    seenStudents.add(studentId);

    let graded = 0;
    for (const { mapping, index } of columns) {
      const score = parseScore(row[index]);
      if (score === null) continue;
      if (score === "invalid") {
        addError(`Row ${sheetRow}: "${String(row[index])}" is not a valid number for ${columnLabel(mapping)}.`);
        continue;
      }
      if (score < 0 || score > mapping.maxScore) {
        addError(`Row ${sheetRow}: ${score} is outside 0-${mapping.maxScore} for ${columnLabel(mapping)}.`);
        continue;
      }
      result.rows.push({ mapping_id: mapping.id, student_id: studentId, score: Math.round(score * 100) / 100 });
      graded += 1;
    }
    if (graded === 0) result.warnings.push(`Student ${studentId} has no scores and was skipped.`);
    else result.students += 1;
  }

  if (result.errors.length === 0 && result.students === 0) addError("No student grades were found in the file.");
  return result;
}
