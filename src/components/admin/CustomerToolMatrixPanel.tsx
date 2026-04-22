// P6.2 — Per-client tool usage panel for CustomerDetail
// Shows: assigned + required tools for the customer's stage, last activity,
// next due / overdue flag, and a launch action when applicable.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TOOL_MATRIX,
  GROUP_ORDER,
  PHASE_LABEL,
  requiredToolKeysForStage,
  overdueLabel,
  overdueTone,
  type ToolMatrixEntry,
} from "@/lib/toolMatrix";
import { loadToolActivity, type ActivityIndex } from "@/lib/toolMatrixActivity";
import { formatRelativeTime, coreKeyForTitle, canonicalToolDisplayTitle } from "@/lib/portal";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, AlertTriangle, CheckCircle2, Circle, Lock } from "lucide-react";

const TONE_CLS: Record<"ok" | "warn" | "critical" | "muted", string> = {
  ok: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  warn: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  muted: "text-muted-foreground border-border bg-muted/40",
};

type Props = {
  customerId: string;
  stage: string | null | undefined;
};

export function CustomerToolMatrixPanel({ customerId, stage }: Props) {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityIndex>(new Map());
  const [assignedKeys, setAssignedKeys] = useState<Set<string>>(new Set());
  const [hasRccAddon, setHasRccAddon] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [a, assignmentsRes] = await Promise.all([
        loadToolActivity([customerId]),
        supabase
          .from("resource_assignments")
          .select("resources(title, tool_category)")
          .eq("customer_id", customerId),
      ]);
      if (cancelled) return;
      setActivity(a);

      const keys = new Set<string>();
      let rccAddon = false;
      for (const row of (assignmentsRes.data as any[]) || []) {
        const r = row.resources;
        if (!r?.title) continue;
        const ck = coreKeyForTitle(r.title);
        if (ck) keys.add(ck);
        const display = canonicalToolDisplayTitle(r.title);
        const match = TOOL_MATRIX.find((t) => t.name === display);
        if (match) keys.add(match.key);
        if (r.tool_category === "addon") rccAddon = true;
      }
      setAssignedKeys(keys);
      setHasRccAddon(rccAddon);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const requiredKeys = useMemo(() => new Set(requiredToolKeysForStage(stage)), [stage]);
  const customerActivity = activity.get(customerId) || new Map();

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/40 p-6 text-sm text-muted-foreground">
        Loading tool usage…
      </div>
    );
  }

  const grouped: Record<string, ToolMatrixEntry[]> = {};
  for (const g of GROUP_ORDER) grouped[g] = [];
  for (const t of TOOL_MATRIX) grouped[t.group].push(t);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/40 p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">
          Tool Operating Matrix · per-client view
        </div>
        <h3 className="text-lg font-light text-foreground">
          What this client should be running
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Assigned tools are tracked. Required tools are based on the current stage.
          Revenue Control Center™ only counts when the add-on is active.
        </p>
      </div>

      {GROUP_ORDER.map((group) => (
        <section key={group}>
          <h4 className="text-sm font-medium text-foreground mb-2">{group}</h4>
          <div className="space-y-2">
            {grouped[group].map((tool) => {
              const isAssigned = assignedKeys.has(tool.key);
              const isRequired = requiredKeys.has(tool.key);
              const requiresRcc = !!tool.requiresRccAccess;
              const rccLocked = requiresRcc && !hasRccAddon;
              const a = customerActivity.get(tool.key);
              const overdue = rccLocked ? "n/a" : a?.overdue ?? "not_started";
              const tone = overdueTone[overdue];
              const lastIso = a?.lastActivityAt ?? null;

              return (
                <div
                  key={tool.key}
                  className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card/30 p-4"
                >
                  <div className="mt-0.5">
                    {rccLocked ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : isAssigned ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : isRequired ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-sm">{tool.name}</span>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {PHASE_LABEL[tool.phase]}
                      </span>
                      {isRequired && (
                        <span className="text-[10px] uppercase tracking-[0.16em] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 bg-amber-500/10">
                          Required for stage
                        </span>
                      )}
                      {isAssigned && !rccLocked && (
                        <span className="text-[10px] uppercase tracking-[0.16em] px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                          Assigned
                        </span>
                      )}
                      {rccLocked && (
                        <span className="text-[10px] uppercase tracking-[0.16em] px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-muted/40">
                          Add-on not active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tool.frequencyLabel} · {tool.completion}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Last activity:{" "}
                      <span className="text-foreground">
                        {lastIso ? formatRelativeTime(lastIso) : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-[11px] uppercase tracking-[0.16em] px-2 py-0.5 rounded border ${TONE_CLS[tone]}`}
                    >
                      {overdueLabel[overdue]}
                    </span>
                    {tool.route && !rccLocked && (
                      <button
                        type="button"
                        onClick={() => navigate(tool.route!)}
                        className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-primary hover:text-primary/80"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
