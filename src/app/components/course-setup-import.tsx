import * as React from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { loadClos, loadMappings, loadSections, loadThresholds, type CourseInfo } from "../lib/outcomes-data";
import {
  applySetupPlan,
  buildCredentialsWorkbook,
  buildSetupTemplate,
  parseSetupWorkbook,
  setupTemplateFileName,
  type ApplyOutcome,
  type SetupExisting,
  type SetupPlan,
} from "../lib/course-setup";

interface CourseSetupImportProps {
  course: CourseInfo;
  academicYear: string;
  locked: boolean;
  onApplied: () => void;
}

async function loadExisting(course: CourseInfo, academicYear: string): Promise<SetupExisting> {
  const [clos, thresholds, mappings, sections, ploRes] = await Promise.all([
    loadClos(course.id),
    loadThresholds(course.id, academicYear),
    loadMappings(course.id, academicYear),
    loadSections(course.id, academicYear),
    supabase.from("plos").select("id, code").eq("program_id", course.programId).order("code"),
  ]);
  if (ploRes.error) throw new Error(ploRes.error.message);
  const plos = (ploRes.data ?? []).map((p: any) => ({ id: String(p.id), code: String(p.code) }));
  return { clos, thresholds, mappings, sections, plos };
}

export function CourseSetupImport({ course, academicYear, locked, onApplied }: CourseSetupImportProps) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [fileName, setFileName] = React.useState("");
  const [plan, setPlan] = React.useState<SetupPlan | null>(null);
  const [outcome, setOutcome] = React.useState<ApplyOutcome | null>(null);

  React.useEffect(() => {
    setPlan(null);
    setFileName("");
  }, [course.id, academicYear]);

  const downloadTemplate = async () => {
    try {
      const existing = await loadExisting(course, academicYear);
      XLSX.writeFile(buildSetupTemplate(course, existing), setupTemplateFileName(course, academicYear));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const existing = await loadExisting(course, academicYear);
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      setPlan(parseSetupWorkbook(workbook, { plos: existing.plos, existingClos: existing.clos }));
      setFileName(file.name);
    } catch (e) {
      setPlan(null);
      toast.error(`Could not read the file: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!plan || plan.issues.length > 0) return;
    setBusy(true);
    try {
      const existing = await loadExisting(course, academicYear);
      const result = await applySetupPlan({ plan, course, academicYear, existing });
      setOutcome(result);
      setPlan(null);
      setFileName("");
      onApplied();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadCredentials = () => {
    if (outcome) XLSX.writeFile(buildCredentialsWorkbook(outcome.accounts), `${course.code}_new_instructor_accounts.xlsx`);
  };

  const counts = plan
    ? [
        plan.clos && `${plan.clos.length} CLO(s)`,
        plan.mappings && `${plan.mappings.length} mapping(s)`,
        plan.sections && `${plan.sections.length} section(s)`,
      ].filter(Boolean)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import course setup from Excel</CardTitle>
        <CardDescription>
          Add CLOs with thresholds, the assignment-to-CLO mapping, and sections with instructors in one file for{" "}
          {course.code} · {academicYear}. Existing items are updated and nothing is deleted; manual add, edit and
          delete stay available in the other tabs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadTemplate} disabled={busy}>
            <Download className="w-4 h-4 mr-2" />
            Download template (with current data)
          </Button>
          <Button onClick={() => fileRef.current?.click()} disabled={busy || locked}>
            <Upload className="w-4 h-4 mr-2" />
            Upload filled file
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
        </div>
        {locked && <p className="text-sm text-muted-foreground">This academic year is locked, so imports are disabled.</p>}

        {plan && (
          <div className="space-y-3 rounded border p-4">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="font-medium">{fileName}</span>
              {counts.length > 0 && <span className="text-muted-foreground">· {counts.join(", ")}</span>}
            </div>

            {plan.issues.length > 0 ? (
              <>
                <p className="text-sm text-red-600">
                  {plan.issues.length} problem(s) found. Fix the file and upload it again; nothing was saved.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sheet</TableHead>
                      <TableHead>Row</TableHead>
                      <TableHead>Problem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.issues.map((issue, i) => (
                      <TableRow key={i}>
                        <TableCell>{issue.sheet}</TableCell>
                        <TableCell>{issue.row || "-"}</TableCell>
                        <TableCell className="whitespace-normal">{issue.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : (
              <>
                {plan.clos && plan.clos.length > 0 && (
                  <PreviewTable
                    title="CLOs"
                    head={["CLO", "Description", "Weight", "Threshold %"]}
                    rows={plan.clos.map((c) => [c.code, c.description, c.weight, c.threshold ?? "default"])}
                  />
                )}
                {plan.mappings && plan.mappings.length > 0 && (
                  <PreviewTable
                    title="Assignment mapping"
                    head={["Assignment", "CLO", "Max score"]}
                    rows={plan.mappings.map((m) => [m.assignment, m.cloCode, m.maxScore])}
                  />
                )}
                {plan.sections && plan.sections.length > 0 && (
                  <PreviewTable
                    title="Sections & instructors"
                    head={["Section", "Instructor", "Email", "Phone"]}
                    rows={plan.sections.map((s) => [s.sectionCode, s.fullName || "-", s.email || "-", s.phone || "-"])}
                  />
                )}
                <div className="flex gap-3">
                  <Button onClick={apply} disabled={busy}>
                    {busy ? "Importing..." : "Confirm import"}
                  </Button>
                  <Button variant="outline" onClick={() => setPlan(null)} disabled={busy}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={!!outcome} onOpenChange={(open) => !open && setOutcome(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import finished</DialogTitle>
            <DialogDescription>Review the summary below.</DialogDescription>
          </DialogHeader>
          {outcome && (
            <div className="space-y-3 text-sm">
              <ul className="list-disc pl-5">
                <li>CLOs: {outcome.clos.added} added, {outcome.clos.updated} updated</li>
                <li>Mappings: {outcome.mappings.added} added, {outcome.mappings.updated} updated</li>
                <li>Sections: {outcome.sections.added} added, {outcome.sections.updated} updated</li>
                <li>New instructor accounts: {outcome.accounts.length}</li>
              </ul>
              {outcome.accounts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Temporary passwords are shown only once. Download them now and share them with the instructors;
                    they must change the password at first sign-in.
                  </p>
                  <Button variant="outline" onClick={downloadCredentials}>
                    <Download className="w-4 h-4 mr-2" />
                    Download new accounts
                  </Button>
                </div>
              )}
              {outcome.errors.length > 0 && (
                <div className="rounded border border-red-300 bg-red-50 p-2 text-red-700 max-h-40 overflow-y-auto">
                  <p className="font-medium">{outcome.errors.length} row(s) were not saved:</p>
                  {outcome.errors.map((message, i) => (
                    <div key={i}>{message}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setOutcome(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PreviewTable({ title, head, rows }: { title: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="space-y-1 overflow-x-auto">
      <p className="text-sm font-medium">{title}</p>
      <Table>
        <TableHeader>
          <TableRow>
            {head.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cells, i) => (
            <TableRow key={i}>
              {cells.map((cell, j) => (
                <TableCell key={j} className="whitespace-normal">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
