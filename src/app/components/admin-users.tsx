import * as React from "react";
import * as XLSX from "xlsx";
import { Download, KeyRound, Plus, Trash2, Upload, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  invokeAdminUsers,
  mapProfile,
  PROFILE_COLUMNS,
  ROLE_LABELS,
  type CreatedAccount,
  type ImportResultRow,
  type Profile,
  type Role,
} from "../lib/roles";
import { buildStaffTemplate, parseStaffRows } from "../lib/staff-list";
import { loadCourses, type CourseInfo } from "../lib/outcomes-data";

interface AdminUsersProps {
  currentUserId: string;
  academicYear: string;
}

interface Assignment {
  id: string;
  courseId: string;
  profileId: string;
}

const csvEscape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function downloadCredentials(rows: Array<{ email: string; password: string }>) {
  const csv = ["Email,Temporary password", ...rows.map((r) => `${csvEscape(r.email)},${csvEscape(r.password)}`)].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "temporary_credentials.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminUsers({ currentUserId, academicYear }: AdminUsersProps) {
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [courses, setCourses] = React.useState<CourseInfo[]>([]);
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [form, setForm] = React.useState<{ fullName: string; email: string; phone: string; role: Role } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [credentials, setCredentials] = React.useState<Array<{ email: string; password: string }> | null>(null);
  const [importResults, setImportResults] = React.useState<ImportResultRow[] | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [assignCoordinator, setAssignCoordinator] = React.useState("");
  const [assignCourse, setAssignCourse] = React.useState("");
  const fileInput = React.useRef<HTMLInputElement>(null);

  const reload = React.useCallback(async () => {
    try {
      const [profileRes, assignmentRes, courseRows] = await Promise.all([
        supabase.from("profiles").select(PROFILE_COLUMNS).order("full_name"),
        supabase.from("course_coordinators").select("id, course_id, profile_id"),
        loadCourses(),
      ]);
      if (profileRes.error) throw new Error(profileRes.error.message);
      if (assignmentRes.error) throw new Error(assignmentRes.error.message);
      setUsers((profileRes.data ?? []).map(mapProfile));
      setAssignments(
        (assignmentRes.data ?? []).map((a: any) => ({
          id: String(a.id),
          courseId: String(a.course_id),
          profileId: String(a.profile_id),
        })),
      );
      setCourses(courseRows);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const coordinators = users.filter((u) => u.role === "coordinator" && u.isActive);
  const courseLabel = (id: string) => courses.find((c) => c.id === id)?.code ?? id;
  const userName = (id: string) => users.find((u) => u.id === id)?.fullName ?? id;

  const createUser = async () => {
    if (!form) return;
    if (!form.fullName.trim() || !form.email.trim()) return toast.error("Name and email are required");
    setSaving(true);
    try {
      const account = await invokeAdminUsers<CreatedAccount>({
        action: "create_user",
        email: form.email,
        full_name: form.fullName,
        phone: form.phone,
        role: form.role,
      });
      setForm(null);
      if (account.temp_password) setCredentials([{ email: form.email.trim().toLowerCase(), password: account.temp_password }]);
      else toast.info("This account already exists");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (user: Profile, active: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success(active ? "Account activated" : "Account deactivated");
    reload();
  };

  const resetPassword = async (user: Profile) => {
    if (!window.confirm(`Reset the password of ${user.fullName}?`)) return;
    try {
      const res = await invokeAdminUsers<{ temp_password: string }>({ action: "reset_password", user_id: user.id });
      setCredentials([{ email: user.email, password: res.temp_password }]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const addAssignment = async () => {
    if (!assignCoordinator || !assignCourse) return toast.error("Select a coordinator and a course");
    const { error } = await supabase
      .from("course_coordinators")
      .insert({ course_id: assignCourse, profile_id: assignCoordinator });
    if (error) return toast.error(/duplicate/i.test(error.message) ? "Already assigned" : error.message);
    reload();
  };

  const removeAssignment = async (a: Assignment) => {
    const { error } = await supabase.from("course_coordinators").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    reload();
  };

  const onStaffFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = parseStaffRows(XLSX.utils.sheet_to_json(sheet, { defval: "" }));
      if (rows.length === 0) throw new Error("No staff rows found in the file");
      const res = await invokeAdminUsers<{ results: ImportResultRow[] }>({
        action: "import_staff",
        academic_year: academicYear,
        rows,
      });
      setImportResults(res.results);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const importCredentials = (importResults ?? [])
    .filter((r) => r.temp_password)
    .map((r) => ({ email: r.email, password: r.temp_password as string }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>Accounts, roles and access for your department.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => XLSX.writeFile(buildStaffTemplate(), "staff_list_template.xlsx")}>
              <Download className="w-4 h-4 mr-2" />
              Staff template
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={importing}>
              <Upload className="w-4 h-4 mr-2" />
              {importing ? "Importing..." : `Import staff (${academicYear})`}
            </Button>
            <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onStaffFile} />
            <Button size="sm" onClick={() => setForm({ fullName: "", email: "", phone: "", role: "coordinator" })}>
              <Plus className="w-4 h-4 mr-2" />
              Add user
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.fullName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone ?? "-"}</TableCell>
                    <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" title="Reset password" onClick={() => resetPassword(u)}>
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      {u.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={u.isActive ? "Deactivate" : "Activate"}
                          onClick={() => setActive(u, !u.isActive)}
                        >
                          {u.isActive ? <UserX className="w-4 h-4 text-red-600" /> : <UserCheck className="w-4 h-4 text-green-600" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Course coordinators</CardTitle>
          <CardDescription>Assign each course to the coordinator who manages its CLOs, mapping and sections.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={assignCoordinator} onValueChange={setAssignCoordinator}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Coordinator" />
              </SelectTrigger>
              <SelectContent>
                {coordinators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignCourse} onValueChange={setAssignCourse}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addAssignment}>Assign</Button>
          </div>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Coordinator</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{courseLabel(a.courseId)}</TableCell>
                    <TableCell>{userName(a.profileId)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeAssignment(a)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={(open) => !open && !saving && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>A temporary password is generated and shown once.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={createUser} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary credentials</DialogTitle>
            <DialogDescription>Shown only once. The user must change the password at first sign-in.</DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-muted p-3 font-mono text-sm space-y-1">
            {credentials?.map((c) => (
              <div key={c.email}>
                {c.email} / {c.password}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => credentials && downloadCredentials(credentials)}>
              Download CSV
            </Button>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!importResults} onOpenChange={(open) => !open && setImportResults(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import result</DialogTitle>
            <DialogDescription>
              {importResults?.filter((r) => r.status !== "error").length} succeeded,{" "}
              {importResults?.filter((r) => r.status === "error").length} failed. Passwords are shown only once: download them now.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importResults?.map((r) => (
                  <TableRow key={r.row}>
                    <TableCell>{r.row}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "error" ? "destructive" : "default"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal">{r.message ?? r.assignment}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            {importCredentials.length > 0 && (
              <Button variant="outline" onClick={() => downloadCredentials(importCredentials)}>
                Download credentials CSV
              </Button>
            )}
            <Button onClick={() => setImportResults(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
