/**
 * P85.1 — Admin-only Source-of-Truth Conflict Flags panel.
 *
 * Lists Amber Evidence Conflicts™ for a customer. Admin can resolve or
 * dismiss with a required text note. Does not appear on client surfaces.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listAllConflicts,
  resolveConflict,
  type SourceConflictFlagRow,
} from "@/lib/sourceConflicts";
import { getAuthoritySource, type EvidenceAuthoritySourceKey } from "@/config/evidenceAuthorityLadder";

function authorityLabel(key: string): string {
  try {
    return getAuthoritySource(key as EvidenceAuthoritySourceKey).admin_label;
  } catch {
    return key;
  }
}

export function SourceConflictFlagsPanel({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<SourceConflictFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const reload = async () => {
    setLoading(true);
    setRows(await listAllConflicts(customerId));
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const act = async (id: string, action: "resolved" | "dismissed") => {
    const note = (notes[id] ?? "").trim();
    if (!note) {
      toast.error("Add a resolution note before resolving or dismissing.");
      return;
    }
    setBusyId(id);
    const { ok, error } = await resolveConflict({ flagId: id, note, action });
    setBusyId(null);
    if (!ok) {
      toast.error(error ?? "Could not update conflict.");
      return;
    }
    toast.success(action === "resolved" ? "Conflict resolved." : "Conflict dismissed.");
    setNotes((n) => ({ ...n, [id]: "" }));
    reload();
  };

  const open = rows.filter((r) => r.conflict_status === "amber" || r.conflict_status === "open");
  const closed = rows.filter((r) => r.conflict_status === "resolved" || r.conflict_status === "dismissed");

  return (
    <section
      className="bg-card border border-border rounded-xl p-5 space-y-4"
      data-testid="source-conflict-flags-panel"
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-medium text-foreground">Source-of-Truth Conflict Flags™</h3>
            <Badge variant="outline" className="text-[10px]">Admin only</Badge>
            <Badge variant="secondary" className="text-[10px]">P85.1</Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Open Amber Evidence Conflicts™ block diagnostic completion. RGS uses
            the highest-authority value for scoring. Resolve each conflict with
            a written note before closing the diagnostic.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={reload} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </header>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading conflicts…</p>
      ) : rows.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-4 text-xs text-muted-foreground">
          No source-of-truth conflicts detected. Diagnostic completion is not
          gated by this panel.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {open.length === 0 ? (
              <p className="text-xs text-emerald-400">No open Amber Evidence Conflicts™.</p>
            ) : (
              open.map((r) => (
                <div
                  key={r.id}
                  className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 space-y-2"
                  data-testid={`conflict-row-${r.id}`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-sm text-foreground">
                          {r.data_point_label || r.data_point_key}
                        </span>
                        {r.gear_key && (
                          <Badge variant="outline" className="text-[10px]">
                            {r.gear_key}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Difference:{" "}
                        <span className="text-amber-300 tabular-nums">
                          {r.difference_percent != null
                            ? `${r.difference_percent.toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-amber-500/50 text-amber-300"
                    >
                      {r.conflict_status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded border border-border bg-background/40 p-2">
                      <div className="text-muted-foreground uppercase tracking-wider text-[10px]">
                        Higher authority
                      </div>
                      <div className="text-foreground">
                        {authorityLabel(r.higher_authority_source_type)}
                      </div>
                      <div className="text-foreground tabular-nums mt-1">
                        {r.higher_authority_value ?? "—"}
                      </div>
                    </div>
                    <div className="rounded border border-border bg-background/40 p-2">
                      <div className="text-muted-foreground uppercase tracking-wider text-[10px]">
                        Lower authority
                      </div>
                      <div className="text-foreground">
                        {authorityLabel(r.lower_authority_source_type)}
                      </div>
                      <div className="text-foreground tabular-nums mt-1">
                        {r.lower_authority_value ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    Scoring uses:{" "}
                    <span className="text-foreground tabular-nums">
                      {r.scoring_value_used ?? r.higher_authority_value ?? "—"}
                    </span>{" "}
                    (highest-authority value).
                  </div>

                  <Textarea
                    value={notes[r.id] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                    }
                    placeholder="Resolution note (required) — what was confirmed, which value is correct, why."
                    className="text-xs bg-background/60"
                    rows={2}
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => act(r.id, "dismissed")}
                      disabled={busyId === r.id}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => act(r.id, "resolved")}
                      disabled={busyId === r.id}
                      className="bg-primary hover:bg-secondary"
                    >
                      {busyId === r.id ? "Saving…" : "Mark resolved"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {closed.length > 0 && (
            <details className="border border-border rounded-md bg-muted/20 p-3">
              <summary className="text-xs text-foreground cursor-pointer">
                Closed conflicts ({closed.length})
              </summary>
              <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                {closed.map((r) => (
                  <li key={r.id} className="flex justify-between gap-2">
                    <span>
                      {r.data_point_label || r.data_point_key} —{" "}
                      <span className="text-foreground">{r.conflict_status}</span>
                    </span>
                    <span>{new Date(r.resolved_at ?? r.updated_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <p className="text-[10px] text-muted-foreground">
        Admin notes on this panel are never exposed to the client. Clients see
        only approved client-safe explanations.
      </p>
    </section>
  );
}

export default SourceConflictFlagsPanel;