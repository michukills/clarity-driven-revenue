/**
 * Gear restoration progress — Implementation Workspace.
 *
 * Aggregates gear-linked work across customer_tasks and resources so admins
 * can see, per gear, how much of the restoration has actually been completed.
 *
 * Demo accounts are excluded so portfolio signals stay clean.
 * Empty gears are shown as "No gear-linked items yet" — never 0% failure.
 *
 * Hardening (P13.ValueLayer.1):
 *   - Tool-assignment gear is resolved via assignment override first, then
 *     the underlying resource gear: `assignment.target_gear ?? resource.target_gear`.
 *     This prevents under-counting when a tool was tagged at the library level
 *     but no per-assignment override exists.
 *   - `checklist_items.target_gear` is schema-ready (column exists) but is
 *     intentionally NOT included in restoration progress yet. Checklist items
 *     are onboarding-stage artifacts; surfacing them here would inflate
 *     progress before tasks/SOPs are tagged. Deferred to a later phase.
 *   - Untagged records are never inferred or back-filled — they simply
 *     don't count toward any gear.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TARGET_GEARS, type TargetGear, GEAR_SUGGESTIONS } from "@/lib/gears/targetGear";
import { Wrench } from "lucide-react";

interface GearStats {
  total: number;
  completed: number;
  toolsAssigned: number;
}

const EMPTY: GearStats = { total: 0, completed: 0, toolsAssigned: 0 };

export function GearRestorationProgress() {
  const [stats, setStats] = useState<Record<TargetGear, GearStats>>({
    1: EMPTY, 2: EMPTY, 3: EMPTY, 4: EMPTY, 5: EMPTY,
  });
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState<TargetGear | null>(null);

  useEffect(() => {
    void (async () => {
      // Demo customers: exclude from portfolio signals.
      const { data: customers } = await supabase
        .from("customers")
        .select("id, is_demo_account")
        .is("archived_at", null);
      const realIds = new Set(
        (customers ?? []).filter((c: any) => !c.is_demo_account).map((c: any) => c.id),
      );

      const [tasksRes, assignRes] = await Promise.all([
        supabase
          .from("customer_tasks")
          .select("id, status, target_gear, customer_id")
          .not("target_gear", "is", null),
        supabase
          .from("resource_assignments")
          .select("id, target_gear, customer_id, resource_id"),
      ]);

      // Resolve resource-level gear so we can fall back when an assignment
      // has no per-client override.
      const assignmentRows = (assignRes.data ?? []) as any[];
      const resourceIds = Array.from(
        new Set(assignmentRows.map((a) => a.resource_id).filter(Boolean)),
      );
      let resourceGearById = new Map<string, number | null>();
      if (resourceIds.length > 0) {
        const { data: resources } = await supabase
          .from("resources")
          .select("id, target_gear")
          .in("id", resourceIds);
        for (const r of (resources ?? []) as any[]) {
          resourceGearById.set(r.id, r.target_gear ?? null);
        }
      }

      const next: Record<TargetGear, GearStats> = {
        1: { total: 0, completed: 0, toolsAssigned: 0 },
        2: { total: 0, completed: 0, toolsAssigned: 0 },
        3: { total: 0, completed: 0, toolsAssigned: 0 },
        4: { total: 0, completed: 0, toolsAssigned: 0 },
        5: { total: 0, completed: 0, toolsAssigned: 0 },
      };
      for (const t of (tasksRes.data ?? []) as any[]) {
        if (t.customer_id && !realIds.has(t.customer_id)) continue;
        const g = t.target_gear as TargetGear;
        if (g < 1 || g > 5) continue;
        next[g].total += 1;
        if (t.status === "done" || t.status === "completed") next[g].completed += 1;
      }
      for (const a of assignmentRows) {
        if (a.customer_id && !realIds.has(a.customer_id)) continue;
        // Assignment override wins; fall back to resource-level gear.
        const resolved =
          (a.target_gear as number | null) ??
          (a.resource_id ? resourceGearById.get(a.resource_id) ?? null : null);
        if (!resolved || resolved < 1 || resolved > 5) continue;
        next[resolved as TargetGear].toolsAssigned += 1;
      }
      setStats(next);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-muted-foreground">
        Restoration progress is calculated from gear-linked tasks and tool assignments across real (non-demo) clients.
        Empty gears mean nothing has been tagged yet — not a failure.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TARGET_GEARS.map((g) => {
          const s = stats[g.gear];
          const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
          const empty = s.total === 0;
          const open = showSuggestions === g.gear;
          return (
            <div
              key={g.gear}
              className={`rounded-xl border ${g.accentClass} bg-card p-4 min-w-0`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${g.chipClass}`}
                    >
                      G{g.gear}
                    </span>
                    <h4 className="text-sm text-foreground font-medium truncate">
                      {g.restorationLabel}
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {g.metaphor} · {g.purpose}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    to={`/admin/tasks?gear=${g.gear}`}
                    className="text-[11px] text-primary hover:underline whitespace-nowrap"
                    title={`Filter Tasks to G${g.gear}`}
                  >
                    Tasks →
                  </Link>
                  <Link
                    to={`/admin/tools`}
                    className="text-[11px] text-muted-foreground hover:text-foreground whitespace-nowrap"
                    title="Open the Tools library"
                  >
                    Tools
                  </Link>
                </div>
              </div>

              {loading ? (
                <div className="text-[11px] text-muted-foreground">Loading…</div>
              ) : empty ? (
                <div className="text-[11px] text-muted-foreground italic">
                  No gear-linked items yet
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>
                      {s.completed} / {s.total} restored
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
                    <Wrench className="h-3 w-3" /> {s.toolsAssigned} client control tool
                    {s.toolsAssigned === 1 ? "" : "s"} assigned
                  </div>
                </>
              )}

              <button
                onClick={() => setShowSuggestions(open ? null : g.gear)}
                className="mt-3 text-[11px] text-primary hover:underline"
              >
                {open ? "Hide" : "Show"} typical {g.short.toLowerCase()} items
              </button>
              {open && (
                <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                  {GEAR_SUGGESTIONS[g.gear].map((sug) => (
                    <li key={sug}>{sug}</li>
                  ))}
                  <li className="italic text-[10px]">
                    Suggestions only — not auto-created. An admin must explicitly seed them.
                  </li>
                  <li className="list-none mt-2">
                    <Link
                      to={`/admin/tasks?gear=${g.gear}`}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Seed manually in Tasks (filtered to G{g.gear}) →
                    </Link>
                  </li>
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}