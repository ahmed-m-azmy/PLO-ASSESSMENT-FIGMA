import * as React from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

interface AuditEntry {
  id: number;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  createdAt: string;
}

const PAGE_SIZE = 100;

export function AuditLogPanel() {
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  const [names, setNames] = React.useState<Map<string, string>>(new Map());
  const [filter, setFilter] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, actor_id, actor_role, action, entity, entity_id, details, created_at")
      .order("id", { ascending: false })
      .limit(PAGE_SIZE);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const rows: AuditEntry[] = (data ?? []).map((r: any) => ({
      id: Number(r.id),
      actorId: r.actor_id ? String(r.actor_id) : null,
      actorRole: r.actor_role,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      details: r.details,
      createdAt: r.created_at,
    }));
    const actorIds = Array.from(new Set(rows.map((r) => r.actorId).filter(Boolean))) as string[];
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", actorIds);
      setNames(new Map((profiles ?? []).map((p: any) => [String(p.id), p.full_name])));
    }
    setEntries(rows);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const term = filter.trim().toLowerCase();
  const visible = term
    ? entries.filter((e) =>
        [e.action, e.entity, e.actorRole, e.actorId ? names.get(e.actorId) : "", JSON.stringify(e.details ?? "")]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : entries;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>The latest {PAGE_SIZE} recorded actions. Entries cannot be edited or deleted.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Input className="w-56" placeholder="Filter..." value={filter} onChange={(e) => setFilter(e.target.value)} />
          <Button variant="outline" size="icon" title="Refresh" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  {e.actorId ? names.get(e.actorId) ?? e.actorId.slice(0, 8) : "system"}
                  {e.actorRole && <span className="text-xs text-muted-foreground"> ({e.actorRole})</span>}
                </TableCell>
                <TableCell>{e.action}</TableCell>
                <TableCell>{e.entity}</TableCell>
                <TableCell className="max-w-md truncate font-mono text-xs" title={JSON.stringify(e.details)}>
                  {e.details ? JSON.stringify(e.details) : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!loading && visible.length === 0 && <p className="text-sm text-muted-foreground mt-3">No entries.</p>}
      </CardContent>
    </Card>
  );
}
