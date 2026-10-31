import * as React from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { loadClos, loadMappings, type CloInfo, type CourseInfo, type MappingInfo } from "../lib/outcomes-data";

interface MappingManagerProps {
  course: CourseInfo;
  academicYear: string;
  years: string[];
  locked: boolean;
  refreshKey?: number;
}

export function MappingManager({ course, academicYear, years, locked, refreshKey }: MappingManagerProps) {
  const [clos, setClos] = React.useState<CloInfo[]>([]);
  const [mappings, setMappings] = React.useState<MappingInfo[]>([]);
  const [name, setName] = React.useState("");
  const [cloId, setCloId] = React.useState("");
  const [maxScore, setMaxScore] = React.useState("10");
  const [copyFrom, setCopyFrom] = React.useState("");

  const reload = React.useCallback(async () => {
    try {
      const [c, m] = await Promise.all([loadClos(course.id), loadMappings(course.id, academicYear)]);
      setClos(c);
      setMappings(m);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [course.id, academicYear]);

  React.useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  const cloCode = (id: string) => clos.find((c) => c.id === id)?.code ?? "?";

  const add = async () => {
    const score = Number(maxScore);
    if (!name.trim()) return toast.error("Assignment name is required");
    if (!cloId) return toast.error("Select a CLO");
    if (!Number.isFinite(score) || score <= 0) return toast.error("Maximum score must be greater than 0");
    const nextOrder = mappings.reduce((max, m) => Math.max(max, m.sortOrder), 0) + 1;
    const { error } = await supabase.from("assignment_clo_mappings").insert({
      course_id: course.id,
      academic_year: academicYear,
      assignment_name: name.trim(),
      clo_id: cloId,
      max_score: score,
      sort_order: nextOrder,
    });
    if (error) return toast.error(/duplicate/i.test(error.message) ? "This assignment is already mapped to that CLO" : error.message);
    setName("");
    reload();
  };

  const remove = async (m: MappingInfo) => {
    if (!window.confirm(`Remove ${m.assignmentName} -> ${cloCode(m.cloId)}? Grades already uploaded for it are deleted.`)) return;
    const { error } = await supabase.from("assignment_clo_mappings").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    reload();
  };

  const updateMax = async (m: MappingInfo, value: string) => {
    const score = Number(value);
    if (!Number.isFinite(score) || score <= 0 || score === m.maxScore) return reload();
    const { error } = await supabase.from("assignment_clo_mappings").update({ max_score: score }).eq("id", m.id);
    if (error) toast.error(error.message);
    reload();
  };

  const copyMappings = async () => {
    if (!copyFrom) return;
    if (mappings.length > 0 && !window.confirm("This year already has mappings. Copy will add the missing ones. Continue?")) return;
    try {
      const source = await loadMappings(course.id, copyFrom);
      const existing = new Set(mappings.map((m) => `${m.assignmentName}|${m.cloId}`));
      const rows = source
        .filter((m) => !existing.has(`${m.assignmentName}|${m.cloId}`))
        .map((m, index) => ({
          course_id: course.id,
          academic_year: academicYear,
          assignment_name: m.assignmentName,
          clo_id: m.cloId,
          max_score: m.maxScore,
          sort_order: m.sortOrder || index + 1,
        }));
      if (rows.length === 0) return toast.info("Nothing to copy");
      const { error } = await supabase.from("assignment_clo_mappings").insert(rows);
      if (error) throw new Error(error.message);
      toast.success(`${rows.length} mapping(s) copied`);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const otherYears = years.filter((y) => y !== academicYear);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment to CLO mapping</CardTitle>
        <CardDescription>
          Each row becomes one grade column in the instructors' upload template. Map an assignment to several CLOs with one row per CLO.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <Input className="w-56" placeholder="Assignment (e.g. Midterm Q1)" value={name} disabled={locked} onChange={(e) => setName(e.target.value)} />
          <Select value={cloId} onValueChange={setCloId} disabled={locked}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="CLO" />
            </SelectTrigger>
            <SelectContent>
              {clos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="w-28" type="number" min={0} placeholder="Max score" value={maxScore} disabled={locked} onChange={(e) => setMaxScore(e.target.value)} />
          <Button onClick={add} disabled={locked}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
          {otherYears.length > 0 && (
            <div className="flex gap-2 ml-auto">
              <Select value={copyFrom} onValueChange={setCopyFrom} disabled={locked}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Copy from year" />
                </SelectTrigger>
                <SelectContent>
                  {otherYears.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={copyMappings} disabled={locked || !copyFrom}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          )}
        </div>

        {mappings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No mappings for {academicYear} yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead>CLO</TableHead>
                <TableHead>Max score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.assignmentName}</TableCell>
                  <TableCell>{cloCode(m.cloId)}</TableCell>
                  <TableCell>
                    <Input
                      key={`${m.id}-${m.maxScore}`}
                      className="w-24"
                      type="number"
                      min={0}
                      defaultValue={m.maxScore}
                      disabled={locked}
                      onBlur={(e) => updateMax(m, e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled={locked} onClick={() => remove(m)}>
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
  );
}
