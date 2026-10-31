import * as React from "react";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import {
  loadClos,
  loadCourseResults,
  loadSectionResults,
  loadSections,
  type CloInfo,
  type CloResult,
  type SectionInfo,
} from "../lib/outcomes-data";

interface OutcomeResultsProps {
  courseId: string;
  courseLabel: string;
  academicYear: string;
  /** When set, only that section is shown (section instructors). */
  sectionId?: string;
  refreshKey?: number;
}

const pct = (value: number | null) => (value === null ? "-" : `${value.toFixed(1)}%`);

function AchievementBadge({ value, threshold }: { value: number | null; threshold: number }) {
  if (value === null) return <span className="text-muted-foreground">-</span>;
  return <Badge variant={value >= threshold ? "default" : "destructive"}>{pct(value)}</Badge>;
}

export function OutcomeResults({ courseId, courseLabel, academicYear, sectionId, refreshKey }: OutcomeResultsProps) {
  const [clos, setClos] = React.useState<CloInfo[]>([]);
  const [sections, setSections] = React.useState<SectionInfo[]>([]);
  const [sectionResults, setSectionResults] = React.useState<CloResult[]>([]);
  const [courseResults, setCourseResults] = React.useState<CloResult[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      loadClos(courseId),
      loadSections(courseId, academicYear),
      loadSectionResults(courseId, academicYear, sectionId),
      sectionId ? Promise.resolve([] as CloResult[]) : loadCourseResults(academicYear, courseId),
    ])
      .then(([c, s, sr, cr]) => {
        if (cancelled) return;
        setClos(c);
        setSections(sectionId ? s.filter((x) => x.id === sectionId) : s);
        setSectionResults(sr);
        setCourseResults(cr);
      })
      .catch((e: Error) => !cancelled && toast.error(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [courseId, academicYear, sectionId, refreshKey]);

  const resultFor = (list: CloResult[], cloId: string, section?: string) =>
    list.find((r) => r.cloId === cloId && (section === undefined || r.sectionId === section));

  const exportExcel = () => {
    const rows: Array<Record<string, string | number>> = [];
    clos.forEach((clo) => {
      sections.forEach((section) => {
        const r = resultFor(sectionResults, clo.id, section.id);
        rows.push({
          Level: "Section",
          Section: section.sectionCode,
          CLO: clo.code,
          "Threshold %": r?.threshold ?? "",
          "Students assessed": r?.studentsAssessed ?? 0,
          "Students met": r?.studentsMet ?? 0,
          "Achievement %": r?.achievement ?? "",
        });
      });
      if (!sectionId) {
        const r = resultFor(courseResults, clo.id);
        rows.push({
          Level: "Course",
          Section: "All",
          CLO: clo.code,
          "Threshold %": r?.threshold ?? "",
          "Students assessed": r?.studentsAssessed ?? 0,
          "Students met": r?.studentsMet ?? 0,
          "Achievement %": r?.achievement ?? "",
        });
      }
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "CLO Results");
    XLSX.writeFile(workbook, `clo_results_${courseLabel}_${academicYear}.xlsx`.replace(/[^A-Za-z0-9._-]+/g, "_"));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading results...</p>;
  if (clos.length === 0) return <p className="text-sm text-muted-foreground">No CLOs defined for this course.</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{sectionId ? "Section CLO results" : "CLO achievement"}</CardTitle>
          <CardDescription>
            Percentage of students at or above the CLO threshold · {courseLabel} · {academicYear}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download className="w-4 h-4 mr-2" />
          Excel
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CLO</TableHead>
              <TableHead>Threshold</TableHead>
              {sections.map((s) => (
                <TableHead key={s.id}>Section {s.sectionCode}</TableHead>
              ))}
              {!sectionId && <TableHead>Course (all sections)</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {clos.map((clo) => {
              const courseRow = resultFor(courseResults, clo.id);
              const anySection = sectionResults.find((r) => r.cloId === clo.id);
              const threshold = courseRow?.threshold ?? anySection?.threshold ?? 60;
              return (
                <TableRow key={clo.id}>
                  <TableCell title={clo.description}>{clo.code}</TableCell>
                  <TableCell>{threshold}%</TableCell>
                  {sections.map((s) => {
                    const r = resultFor(sectionResults, clo.id, s.id);
                    return (
                      <TableCell key={s.id}>
                        <AchievementBadge value={r?.achievement ?? null} threshold={threshold} />
                        {r && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {r.studentsMet}/{r.studentsAssessed}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  {!sectionId && (
                    <TableCell>
                      <AchievementBadge value={courseRow?.achievement ?? null} threshold={threshold} />
                      {courseRow && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {courseRow.studentsMet}/{courseRow.studentsAssessed}
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
