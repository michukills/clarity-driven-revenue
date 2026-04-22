import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection, LinkRow, StatTile, PhaseTwoNote } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";
import { stageLabel } from "@/lib/portal";
import { DX_STEPS, buildDxStatus, dxProgress, slugFromTitle, seedDiagnosticChecklist } from "@/lib/diagnostics/checklist";

const DX_ACTIVE = ["diagnostic_paid", "diagnostic_in_progress", "diagnostic_delivered", "decision_pending"] as const;
const DX_DELIVERED = ["diagnostic_complete", "follow_up_nurture"] as const;
const DX_ALL = [...DX_ACTIVE, ...DX_DELIVERED] as const;

export default function DiagnosticSystemDomain() {
  const [active, setActive] = useState<any[]>([]);
  const [delivered, setDelivered] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [a, d] = await Promise.all([
        supabase
          .from("customers")
          .select("id, full_name, business_name, stage, last_activity_at")
          .in("stage", DX_ACTIVE)
          .order("last_activity_at", { ascending: false }),
        supabase
          .from("customers")
          .select("id, full_name, business_name, stage, last_activity_at")
          .in("stage", DX_DELIVERED)
          .order("last_activity_at", { ascending: false })
          .limit(10),
      ]);
      if (a.data) setActive(a.data);
      if (d.data) setDelivered(d.data);

      const ids = [...(a.data || []), ...(d.data || [])].map((c) => c.id);
      if (ids.length === 0) return;

      // Idempotently seed checklists for any active diagnostics that haven't been seeded yet.
      await Promise.all(
        (a.data || []).map((c) => seedDiagnosticChecklist(c.id).catch(() => 0)),
      );

      const [chk, tr] = await Promise.all([
        supabase.from("checklist_items").select("id, customer_id, title, completed, completed_at").in("customer_id", ids),
        supabase.from("tool_runs").select("id, customer_id, tool_key, created_at").in("customer_id", ids),
      ]);
      if (chk.data) setChecklist(chk.data);
      if (tr.data) setRuns(tr.data);
    })();
  }, []);

  const deliverables = [
    ["Buyer Persona", "Who the offer is actually for"],
    ["Outreach Channels", "Where to find them, how to reach them"],
    ["Conversion Flow Map", "Awareness → close, drawn end-to-end"],
    ["Revenue Metrics", "Numbers that prove the system is working"],
    ["Strategy Plan", "What to fix, in what order"],
  ];

  const statusFor = (customerId: string) => {
    const cl = checklist.filter((r) => r.customer_id === customerId);
    const rn = runs.filter((r) => r.customer_id === customerId);
    const statuses = buildDxStatus(cl as any, rn as any);
    return { statuses, progress: dxProgress(statuses) };
  };

  const intakeMissing = (customerId: string) => {
    const cl = checklist.filter((r) => r.customer_id === customerId);
    const intake = cl.find((r) => slugFromTitle(r.title) === "intake");
    return !intake || !intake.completed;
  };
  const missingEngines = (customerId: string) => {
    const { statuses } = statusFor(customerId);
    return statuses.filter((s) => s.step.engine && !s.effectiveComplete).length;
  };
  const readyForReview = (customerId: string) => {
    const { statuses } = statusFor(customerId);
    const engines = statuses.filter((s) => s.step.engine);
    const reviewDone = statuses.find((s) => s.step.slug === "review")?.effectiveComplete;
    return engines.every((s) => s.effectiveComplete) && !reviewDone;
  };

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="RGS OS Domain"
        title="Diagnostic System"
        description="The $1,750 RGS Diagnostic. One offer, one product/service, five locked deliverables. Diagnose, design, document, hand off."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile label="Price" value="$1,750" hint="Fixed engagement" />
          <StatTile label="Active Diagnostics" value={active.length} />
          <StatTile label="Intake Missing" value={active.filter((c) => intakeMissing(c.id)).length} />
          <StatTile label="Ready for Review" value={active.filter((c) => readyForReview(c.id)).length} />
          <StatTile label="Delivered (recent)" value={delivered.length} />
        </div>

        <DomainSection title="Locked Deliverables" subtitle="Every diagnostic produces these five">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {deliverables.map(([label, hint]) => (
              <div key={label} className="p-3 rounded-md bg-muted/30 border border-border">
                <div className="text-sm text-foreground">{label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
              </div>
            ))}
          </div>
        </DomainSection>

        <DomainSection
          title="Diagnostics In Progress"
          subtitle="Per-client checklist progress, missing inputs, and engines remaining"
          action={<Link to="/admin/pipeline" className="text-xs text-muted-foreground hover:text-foreground">Open pipeline →</Link>}
        >
          {active.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">No active diagnostics.</div>
          ) : (
            <div className="space-y-2">
              {active.map((c) => {
                const { progress } = statusFor(c.id);
                const missing = missingEngines(c.id);
                const intake = intakeMissing(c.id);
                const ready = readyForReview(c.id);
                return (
                  <Link
                    key={c.id}
                    to={`/admin/customers/${c.id}`}
                    className="block p-3 rounded-md bg-muted/30 border border-border hover:border-primary/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground truncate">{c.business_name || c.full_name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                          {stageLabel(c.stage)} · {new Date(c.last_activity_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {progress.done}/{progress.total}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${progress.pct}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider">
                      {intake && (
                        <span className="px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/40">
                          Intake missing
                        </span>
                      )}
                      {missing > 0 && (
                        <span className="px-1.5 py-0.5 rounded border bg-muted/40 text-muted-foreground border-border">
                          {missing} engine{missing === 1 ? "" : "s"} remaining
                        </span>
                      )}
                      {ready && (
                        <span className="px-1.5 py-0.5 rounded border bg-secondary/15 text-secondary border-secondary/40">
                          Ready for review
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </DomainSection>

        <DomainSection title="Recently Delivered / In Decision" subtitle="Delivered diagnostics in nurture or decision">
          {delivered.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">Nothing in decision pipeline.</div>
          ) : (
            <div className="space-y-2">
              {delivered.map((c) => (
                <LinkRow
                  key={c.id}
                  to={`/admin/customers/${c.id}`}
                  label={c.business_name || c.full_name}
                  hint={stageLabel(c.stage)}
                />
              ))}
            </div>
          )}
        </DomainSection>

        <DomainSection title="Diagnostic Builder" subtitle="Per-client diagnostic record + deliverable tracking">
          <PhaseTwoNote text="Per-client diagnostic checklist + Diagnostic Engines™ run tracking is live. A dedicated diagnostics table with due dates and PDF export remains Phase 2." />
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}