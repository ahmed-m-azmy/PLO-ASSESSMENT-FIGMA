import * as React from "react";
import * as XLSX from "xlsx";
import { Download, FileCheck2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { OutcomeResults } from "./outcome-results";
import {
  buildGradeTemplate,
  gradeTemplateFileName,
  parseGradeWorkbook,
  type MappingColumn,
  type ParsedGrades,
  type TemplateSection,
} from "../lib/grade-template";
import { loadClos, loadCourses, loadMappings, loadSessions, type CourseInfo, type SessionInfo } from "../lib/outcomes-data";

interface MySection {
  id: string;
  courseId: string;
  academicYear: string;
  sectionCode: string;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function InstructorWorkspace() {
  const [sections, setSections] = React.useState<MySection[]>([]);
  const [courses, setCourses] = React.useState<CourseInfo[]>([]);
  const [sessions, setSessions] = React.useState<SessionInfo[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [columns, setColumns] = React.useState<MappingColumn[]>([]);
  const [parsed, setParsed] = React.useState<ParsedGrades | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const fileInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const [{ data, error }, courseRows, sessionRows] = await Promise.all([
          supabase
            .from("course_sections")
            .select("id, course_id, academic_year, section_code")
            .order("academic_year", { ascending: false })
            .order("section_code"),
          loadCourses(),
          loadSessions(),
        ]);
        if (error) throw new Error(error.message);
        const rows = (data ?? []).map((s: any) => ({
          id: String(s.id),
          courseId: String(s.course_id),
          academicYear: s.academic_year,
          sectionCode: s.section_code,
        }));
        setSections(rows);
        setCourses(courseRows);
        setSessions(sessionRows);
        if (rows[0]) setSelectedId(rows[0].id);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const section = sections.find((s) => s.id === selectedId);
  const course = courses.find((c) => c.id === section?.courseId);
  const locked = Boolean(sessions.find((s) => s.name === section?.academicYear)?.isLocked);

  React.useEffect(() => {
    setParsed(null);
    setFileName("");
    setColumns([]);
    if (!section) return;
    let cancelled = false;
    Promise.all([loadMappings(section.courseId, section.academicYear), loadClos(section.courseId)])
      .then(([mappings, clos]) => {
        if (cancelled) return;
        setColumns(
          mappings.map((m) => ({
            id: m.id,
            assignmentName: m.assignmentName,
            cloCode: clos.find((c) => c.id === m.cloId)?.code ?? "CLO",
            maxScore: m.maxScore,
          })),
        );
      })
      .catch((e: Error) => !cancelled && toast.error(e.message));
    return () => {
      cancelled = true;
    };
  }, [section?.id, refreshKey]);

  const templateSection = (): TemplateSection | null =>
    section && course
      ? {
          sectionId: section.id,
          courseCode: course.code,
          courseName: course.name,
          sectionCode: section.sectionCode,
          academicYear: section.academicYear,
        }
      : null;

  const downloadTemplate = () => {
    const info = templateSection();
    if (!info) return;
    if (columns.length === 0) return toast.error("The course coordinator has not defined the Assignment-CLO mapping yet.");
    XLSX.writeFile(buildGradeTemplate(info, columns), gradeTemplateFileName(info));
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !section) return;
    if (file.size > MAX_FILE_BYTES) return toast.error("File is larger than 5 MB");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      setFileName(file.name);
      setParsed(parseGradeWorkbook(workbook, { sectionId: section.id }, columns));
    } catch {
      toast.error("Could not read the file. Upload the .xlsx template.");
    }
  };

  const upload = async () => {
    if (!section || !parsed || parsed.errors.length > 0) return;
    if (!window.confirm("Uploading replaces all grades previously uploaded for this section. Continue?")) return;
    setUploading(true);
    const { data, error } = await supabase.rpc("replace_section_grades", {
      p_section_id: section.id,
      p_rows: parsed.rows,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success(`${data} grade entries saved for ${parsed.students} students`);
    setParsed(null);
    setFileName("");
    setRefreshKey((k) => k + 1);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">No sections are assigned to you yet. Contact your course coordinator.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>My section</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => {
                const c = courses.find((x) => x.id === s.courseId);
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {c?.code ?? "Course"} · Section {s.sectionCode} · {s.academicYear}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        {locked && <Badge variant="secondary">Academic year locked: read only</Badge>}
      </div>

      {section && course && (
        <Tabs defaultValue="upload">
          <TabsList>
            <TabsTrigger value="upload">Upload grades</TabsTrigger>
            <TabsTrigger value="results">Section results</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>
                  {course.code} - {course.name} · Section {section.sectionCode}
                </CardTitle>
                <CardDescription>
                  1. Download the template (generated from the coordinator's Assignment-CLO mapping). 2. Fill in the scores. 3. Upload it and confirm.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {columns.length === 0 ? (
                  <p className="text-sm text-amber-700">
                    The course coordinator has not defined the Assignment-CLO mapping for {section.academicYear} yet.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{columns.length} graded column(s) in the template.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={downloadTemplate} disabled={columns.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Download template
                  </Button>
                  <Button onClick={() => fileInput.current?.click()} disabled={locked || columns.length === 0}>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose filled file
                  </Button>
                  <input ref={fileInput} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
                </div>

                {parsed && (
                  <div className="rounded border p-3 space-y-2">
                    <p className="text-sm font-medium">{fileName}</p>
                    {parsed.errors.length > 0 ? (
                      <ul className="text-sm text-red-600 list-disc pl-5 space-y-1">
                        {parsed.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-green-700">
                        {parsed.students} students and {parsed.rows.length} scores are ready to upload.
                      </p>
                    )}
                    {parsed.warnings.length > 0 && (
                      <ul className="text-sm text-amber-700 list-disc pl-5 space-y-1">
                        {parsed.warnings.slice(0, 10).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    )}
                    <Button onClick={upload} disabled={uploading || parsed.errors.length > 0}>
                      <FileCheck2 className="w-4 h-4 mr-2" />
                      {uploading ? "Uploading..." : "Confirm upload"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <OutcomeResults
              courseId={section.courseId}
              courseLabel={`${course.code}_S${section.sectionCode}`}
              academicYear={section.academicYear}
              sectionId={section.id}
              refreshKey={refreshKey}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
