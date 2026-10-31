import * as React from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { CloManager } from "./clo-manager";
import { MappingManager } from "./mapping-manager";
import { SectionsManager } from "./sections-manager";
import { CourseSetupImport } from "./course-setup-import";
import { OutcomeResults } from "./outcome-results";
import { loadCourses, loadSessions, type CourseInfo, type SessionInfo } from "../lib/outcomes-data";

/** Course picker + CLO / mapping / sections / results tabs. Access is limited by RLS (coordinators see their courses). */
export function CourseTools() {
  const [courses, setCourses] = React.useState<CourseInfo[]>([]);
  const [sessions, setSessions] = React.useState<SessionInfo[]>([]);
  const [courseId, setCourseId] = React.useState("");
  const [year, setYear] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [importKey, setImportKey] = React.useState(0);

  React.useEffect(() => {
    Promise.all([loadCourses(), loadSessions()])
      .then(([c, s]) => {
        setCourses(c);
        setSessions(s);
        if (c[0]) setCourseId(c[0].id);
        if (s.length) setYear(s[s.length - 1].name);
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const course = courses.find((c) => c.id === courseId);
  const session = sessions.find((s) => s.name === year);
  const locked = Boolean(session?.isLocked);
  const bump = () => setRefreshKey((k) => k + 1);
  const bumpAll = () => {
    bump();
    setImportKey((k) => k + 1);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (courses.length === 0) {
    return <p className="text-sm text-muted-foreground">No courses are assigned to you yet. Ask the program admin.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label>Course</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Academic year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name}
                  {s.isLocked ? " (locked)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {locked && <Badge variant="secondary">Locked: read only</Badge>}
      </div>

      {course && year && (
        <Tabs defaultValue="clos">
          <TabsList>
            <TabsTrigger value="clos">CLOs & thresholds</TabsTrigger>
            <TabsTrigger value="mapping">Assignment mapping</TabsTrigger>
            <TabsTrigger value="sections">Sections & instructors</TabsTrigger>
            <TabsTrigger value="import">Import from Excel</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          <TabsContent value="clos">
            <CourseSetupImport course={course} academicYear={year} locked={locked} onApplied={bumpAll} scope="clos" />
            <div className="h-4" />
            <CloManager key={`clo-${importKey}`} course={course} academicYear={year} locked={locked} onChanged={bump} />
          </TabsContent>
          <TabsContent value="mapping">
            <CourseSetupImport course={course} academicYear={year} locked={locked} onApplied={bumpAll} scope="mappings" />
            <div className="h-4" />
            <MappingManager
              key={`map-${importKey}`}
              course={course}
              academicYear={year}
              years={sessions.map((s) => s.name)}
              locked={locked}
              refreshKey={refreshKey}
            />
          </TabsContent>
          <TabsContent value="sections">
            <CourseSetupImport course={course} academicYear={year} locked={locked} onApplied={bumpAll} scope="sections" />
            <div className="h-4" />
            <SectionsManager key={`sec-${importKey}`} courseId={course.id} courseLabel={course.code} academicYear={year} locked={locked} />
          </TabsContent>
          <TabsContent value="import">
            <CourseSetupImport course={course} academicYear={year} locked={locked} onApplied={bumpAll} />
          </TabsContent>
          <TabsContent value="results">
            <OutcomeResults
              courseId={course.id}
              courseLabel={course.code}
              academicYear={year}
              refreshKey={refreshKey}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
