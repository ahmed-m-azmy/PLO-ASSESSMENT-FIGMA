import * as XLSX from "xlsx";

export interface StaffListRow {
  role: string;
  full_name: string;
  email: string;
  phone: string;
  course_code: string;
  section_code: string;
}

const HEADERS = ["Role", "Full Name", "Email", "Phone", "Course Code", "Section"];

const ALIASES: Record<keyof StaffListRow, string[]> = {
  role: ["role", "type"],
  full_name: ["fullname", "name", "staffname"],
  email: ["email", "emailaddress", "mail"],
  phone: ["phone", "mobile", "phonenumber", "contact", "tel"],
  course_code: ["coursecode", "course", "code"],
  section_code: ["section", "sectioncode", "sectionno", "sectionnumber"],
};

const normalizeKey = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

export function buildStaffTemplate(): XLSX.WorkBook {
  const sheet = XLSX.utils.aoa_to_sheet([
    HEADERS,
    ["coordinator", "Dr. Sample Coordinator", "coordinator@example.edu", "+966500000001", "ARCH101", ""],
    ["instructor", "Dr. Sample Instructor", "instructor@example.edu", "+966500000002", "ARCH101", "A1"],
  ]);
  sheet["!cols"] = HEADERS.map(() => ({ wch: 26 }));
  const guide = XLSX.utils.aoa_to_sheet([
    ["Role must be coordinator or instructor."],
    ["Course Code must match an existing course code. Section is required for instructors that are assigned to a course."],
    ["Rows with an existing e-mail reuse the account; new accounts receive a one-time temporary password."],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Staff");
  XLSX.utils.book_append_sheet(workbook, guide, "Guide");
  return workbook;
}

export function parseStaffRows(records: Record<string, unknown>[]): StaffListRow[] {
  return records
    .map((record) => {
      const keys = Object.keys(record);
      const read = (field: keyof StaffListRow) => {
        const key = keys.find((k) => ALIASES[field].includes(normalizeKey(k)));
        return key ? String(record[key] ?? "").trim() : "";
      };
      return {
        role: read("role").toLowerCase(),
        full_name: read("full_name"),
        email: read("email"),
        phone: read("phone"),
        course_code: read("course_code"),
        section_code: read("section_code"),
      };
    })
    .filter((row) => row.email || row.full_name);
}
