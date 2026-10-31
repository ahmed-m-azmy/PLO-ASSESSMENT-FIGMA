import * as React from "react";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { DEFAULT_CLO_THRESHOLD } from "../lib/roles";
import { loadClos, loadThresholds, type CloInfo, type CourseInfo } from "../lib/outcomes-data";

interface CloManagerProps {
  course: CourseInfo;
  academicYear: string;
  locked: boolean;
  onChanged?: () => void;
}

interface PloOption {
  id: string;
  code: string;
}

interface CloForm {
  id: string | null;
  code: string;
  description: string;
  ploId: string;
  weight: string;
}

export function CloManager({ course, academicYear, locked, onChanged }: CloManagerProps) {
  const [clos, setClos] = React.useState<CloInfo[]>([]);
  const [plos, setPlos] = React.useState<PloOption[]>([]);
  const [thresholds, setThresholds] = React.useState<Map<string, number>>(new Map());
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState<CloForm | null>(null);
  const [saving, setSaving] = React.useState(false);

  const reload = React.useCallback(async () => {
    try {
      const [cloRows, thresholdMap, ploRes] = await Promise.all([
        loadClos(course.id),
        loadThresholds(course.id, academicYear),
        supabase.from("plos").select("id, code").eq("program_id", course.programId).order("code"),
      ]);
      if (ploRes.error) throw new Error(ploRes.error.message);
      setClos(cloRows);
      setThresholds(thresholdMap);
      setDrafts({});
      setPlos((ploRes.data ?? []).map((p: any) => ({ id: String(p.id), code: p.code })));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [course.id, course.programId, academicYear]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const ploCode = (id: string | null) => plos.find((p) => p.id === id)?.code ?? "-";

  const saveClo = async () => {
    if (!form) return;
    const code = form.code.trim();
    const weight = Number(form.weight);
    if (!code) return toast.error("CLO code is required");
    if (!form.ploId) return toast.error("Select the PLO this CLO supports");
    if (!Number.isFinite(weight) || weight <= 0) return toast.error("Weight must be a positive number");

    setSaving(true);
    const fields = { code, description: form.description.trim(), plo_id: form.ploId, weight };
    const { error } = form.id
      ? await supabase.from("clos").update(fields).eq("id", form.id)
      : await supabase.from("clos").insert({ ...fields, course_id: course.id, achievement: 0, target_value: 75 });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("CLO saved");
    setForm(null);
    await reload();
    onChanged?.();
  };

  const removeClo = async (clo: CloInfo) => {
    if (!window.confirm(`Delete ${clo.code}? Its mappings and thresholds are removed too.`)) return;
    const { error } = await supabase.from("clos").delete().eq("id", clo.id);
    if (error) return toast.error(error.message);
    toast.success("CLO deleted");
    await reload();
    onChanged?.();
  };

  const saveThreshold = async (clo: CloInfo) => {
    const value = Number(drafts[clo.id]);
    if (!Number.isFinite(value) || value < 0 || value > 100) return toast.error("Threshold must be between 0 and 100");
    const { error } = await supabase
      .from("clo_thresholds")
      .upsert(
        { course_id: course.id, clo_id: clo.id, academic_year: academicYear, threshold: value },
        { onConflict: "clo_id,academic_year" },
      );
    if (error) return toast.error(error.message);
    toast.success(`Threshold for ${clo.code} saved`);
    await reload();
    onChanged?.();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Course Learning Outcomes</CardTitle>
          <CardDescription>
            The threshold is the minimum CLO score (%) a student needs to count as achieving the CLO. Default:{" "}
            {DEFAULT_CLO_THRESHOLD}%.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setForm({ id: null, code: "", description: "", ploId: "", weight: "1" })}>
          <Plus className="w-4 h-4 mr-2" />
          Add CLO
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {clos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No CLOs yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CLO</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>PLO</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Threshold % ({academicYear})</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clos.map((clo) => {
                const current = thresholds.get(clo.id) ?? DEFAULT_CLO_THRESHOLD;
                const draft = drafts[clo.id] ?? String(current);
                const dirty = draft !== String(current);
                return (
                  <TableRow key={clo.id}>
                    <TableCell>{clo.code}</TableCell>
                    <TableCell className="max-w-xs whitespace-normal">{clo.description}</TableCell>
                    <TableCell>{ploCode(clo.ploId)}</TableCell>
                    <TableCell>{clo.weight}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-24"
                          value={draft}
                          disabled={locked}
                          onChange={(e) => setDrafts({ ...drafts, [clo.id]: e.target.value })}
                        />
                        {dirty && (
                          <Button size="icon" variant="outline" title="Save threshold" onClick={() => saveThreshold(clo)}>
                            <Save className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() =>
                          setForm({
                            id: clo.id,
                            code: clo.code,
                            description: clo.description,
                            ploId: clo.ploId ?? "",
                            weight: String(clo.weight),
                          })
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => removeClo(clo)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!form} onOpenChange={(open) => !open && !saving && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit CLO" : "Add CLO"}</DialogTitle>
            <DialogDescription>{course.code} - {course.name}</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Supported PLO</Label>
                <Select value={form.ploId} onValueChange={(v) => setForm({ ...form, ploId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select PLO" />
                  </SelectTrigger>
                  <SelectContent>
                    {plos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Weight</Label>
                <Input type="number" min={0} step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveClo} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
