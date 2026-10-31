import * as React from "react";
import { Pencil, Plus, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { invokeAdminUsers, type CreatedAccount } from "../lib/roles";
import { loadSections, type SectionInfo } from "../lib/outcomes-data";

interface SectionsManagerProps {
  courseId: string;
  courseLabel: string;
  academicYear: string;
  locked: boolean;
}

interface FormState {
  id: string | null;
  sectionCode: string;
  fullName: string;
  email: string;
  phone: string;
  originalEmail: string;
  instructorId: string | null;
}

const emptyForm: FormState = {
  id: null,
  sectionCode: "",
  fullName: "",
  email: "",
  phone: "",
  originalEmail: "",
  instructorId: null,
};

export function SectionsManager({ courseId, courseLabel, academicYear, locked }: SectionsManagerProps) {
  const [sections, setSections] = React.useState<SectionInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<FormState | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [credentials, setCredentials] = React.useState<{ email: string; password: string } | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      setSections(await loadSections(courseId, academicYear));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [courseId, academicYear]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const openEdit = (s: SectionInfo) =>
    setForm({
      id: s.id,
      sectionCode: s.sectionCode,
      fullName: s.instructorName ?? "",
      email: s.instructorEmail ?? "",
      phone: s.instructorPhone ?? "",
      originalEmail: s.instructorEmail ?? "",
      instructorId: s.instructorId,
    });

  const save = async () => {
    if (!form) return;
    const sectionCode = form.sectionCode.trim();
    const email = form.email.trim().toLowerCase();
    if (!sectionCode) return toast.error("Section code is required");
    if (email && !form.fullName.trim()) return toast.error("Instructor name is required");

    setSaving(true);
    try {
      let instructorId: string | null = form.instructorId;
      if (!email) {
        instructorId = null;
      } else if (email !== form.originalEmail.toLowerCase() || !instructorId) {
        const account = await invokeAdminUsers<CreatedAccount>({
          action: "create_user",
          email,
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          role: "instructor",
        });
        instructorId = account.profile_id;
        if (account.temp_password) setCredentials({ email, password: account.temp_password });
      } else {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: form.fullName.trim(), phone: form.phone.trim() || null })
          .eq("id", instructorId);
        if (error) throw new Error(error.message);
      }

      const payload = { section_code: sectionCode, instructor_id: instructorId };
      const { error } = form.id
        ? await supabase.from("course_sections").update(payload).eq("id", form.id)
        : await supabase
            .from("course_sections")
            .insert({ ...payload, course_id: courseId, academic_year: academicYear });
      if (error) throw new Error(error.message.includes("duplicate") ? "This section already exists" : error.message);

      toast.success("Section saved");
      setForm(null);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const unassign = async (s: SectionInfo) => {
    if (!window.confirm(`Remove ${s.instructorName} from section ${s.sectionCode}?`)) return;
    const { error } = await supabase.from("course_sections").update({ instructor_id: null }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Instructor removed from the section");
    reload();
  };

  const removeSection = async (s: SectionInfo) => {
    if (!window.confirm(`Delete section ${s.sectionCode}? This is only possible when it has no uploaded grades.`)) return;
    const { error } = await supabase.from("course_sections").delete().eq("id", s.id);
    if (error) {
      return toast.error(
        /foreign key|violates/i.test(error.message)
          ? "This section has uploaded grades. Remove the instructor instead."
          : error.message,
      );
    }
    toast.success("Section deleted");
    reload();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Sections & instructors</CardTitle>
          <CardDescription>
            {courseLabel} · {academicYear}
            {locked && " · year is locked"}
          </CardDescription>
        </div>
        <Button size="sm" disabled={locked} onClick={() => setForm({ ...emptyForm })}>
          <Plus className="w-4 h-4 mr-2" />
          Add section
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sections yet for this year.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.sectionCode}</TableCell>
                  <TableCell>{s.instructorName ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                  <TableCell>{s.instructorEmail ?? "-"}</TableCell>
                  <TableCell>{s.instructorPhone ?? "-"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" title="Edit" disabled={locked} onClick={() => openEdit(s)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {s.instructorId && (
                      <Button variant="ghost" size="icon" title="Remove instructor" disabled={locked} onClick={() => unassign(s)}>
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Delete section" disabled={locked} onClick={() => removeSection(s)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!form} onOpenChange={(open) => !open && !saving && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit section" : "Add section"}</DialogTitle>
            <DialogDescription>Leave the instructor fields empty to create a section without an instructor.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Section code</Label>
                <Input value={form.sectionCode} onChange={(e) => setForm({ ...form, sectionCode: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Instructor name</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Instructor email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account created</DialogTitle>
            <DialogDescription>
              Share these credentials with the instructor. The password is shown only once and must be changed at first sign-in.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="rounded border bg-muted p-3 font-mono text-sm space-y-1">
              <div>Email: {credentials.email}</div>
              <div>Temporary password: {credentials.password}</div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
