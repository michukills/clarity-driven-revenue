import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection, LinkRow, StatTile, PhaseTwoNote } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";
import { stageLabel } from "@/lib/portal";

const DX_ACTIVE = ["diagnostic_paid", "diagnostic_in_progress", "diagnostic_delivered", "decision_pending"] as const;

export default function DiagnosticSystemDomain() {
  const [active, setActive] = useState<any[]>([]);
  const [delivered, setDelivered] = useState<any[]>([]);

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
          .in("stage", ["diagnostic_complete", "follow_up_nurture"])
          .order("last_activity_at", { ascending: false })
          .limit(10),
      ]);
      if (a.data) setActive(a.data);
      if (d.data) setDelivered(d.data);
    })();
  }, []);

  const deliverables = [
    ["Buyer Persona", "Who the offer is actually for"],
    ["Outreach Channels", "Where to find them, how to reach them"],
    ["Conversion Flow Map", "Awareness → close, drawn end-to-end"],
    ["Revenue Metrics", "Numbers that prove the system is working"],
    ["Strategy Plan", "What to fix, in what order"],
  ];

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="RGS OS Domain"
        title="Diagnostic System"
        description="The $1,750 RGS Diagnostic. One offer, one product/service, five locked deliverables. Diagnose, design, document, hand off."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile label="Price" value="$1,750" hint="Fixed engagement" />
          <StatTile label="Scope" value="1 offer" hint="One product / service" />
          <StatTile label="Active Diagnostics" value={active.length} />
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
          subtitle="Clients currently in a diagnostic stage"
          action={<Link to="/admin/pipeline" className="text-xs text-muted-foreground hover:text-foreground">Open pipeline →</Link>}
        >
          {active.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">No active diagnostics.</div>
          ) : (
            <div className="space-y-2">
              {active.map((c) => (
                <LinkRow
                  key={c.id}
                  to={`/admin/customers/${c.id}`}
                  label={c.business_name || c.full_name}
                  hint={`${stageLabel(c.stage)} · ${new Date(c.last_activity_at).toLocaleDateString()}`}
                />
              ))}
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
          <PhaseTwoNote text="A dedicated diagnostics table with per-deliverable status, due date, and PDF export. Today, diagnostics are tracked via pipeline stage + tool runs." />
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}