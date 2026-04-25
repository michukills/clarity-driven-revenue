import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection, LinkRow, PhaseTwoNote, StatTile } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";

export default function ScorecardSystemDomain() {
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tool_runs")
        .select("id, title, summary, customer_id, created_at, tool_key")
        .in("tool_key", ["rgs_stability_scorecard", "stability_scorecard"])
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setRuns(data);
    })();
  }, []);

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="RGS OS Domain"
        title="Scorecard System"
        description="The 0–1000 Business Stability Index™. The public scorecard captures a self-reported starting signal across the 5 RGS pillars and feeds qualified leads into CRM / Pipeline. The OS scorecard is the evidence-backed operating view that improves over time."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile label="Score Range" value="0–1000" hint="Higher = more stable" />
          <StatTile label="Pillars" value={5} hint="Revenue / Conversion / Ops / Finance / Owner" />
          <StatTile label="Recorded Runs" value={runs.length} hint="Stored as tool_runs" />
          <StatTile label="Lead Capture" value="Required" hint="Before result reveal" />
        </div>

        <DomainSection title="Scoring Categories" subtitle="Locked structure of the Business Stability Index™">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              ["Demand Generation", "How leads, attention, and inbound opportunities show up — and whether they are predictable"],
              ["Revenue Conversion", "How a lead becomes paid revenue — sales motion, follow-up discipline, close behavior"],
              ["Operational Efficiency", "Process clarity, hand-off integrity, and how reliably delivery runs without heroics"],
              ["Financial Visibility", "Whether the owner can see revenue, margin, cash, and runway in numbers — not by feel"],
              ["Owner Independence", "How much the business depends on the owner being personally available"],
            ].map(([label, hint]) => (
              <div key={label} className="p-3 rounded-md bg-muted/30 border border-border">
                <div className="text-sm text-foreground">{label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
              </div>
            ))}
          </div>
        </DomainSection>

        <DomainSection
          title="Recent Scorecard Runs"
          subtitle="Latest stored scorecard sessions"
          action={<Link to="/admin/tools/stability-scorecard" className="text-xs text-muted-foreground hover:text-foreground">Open scorecard tool →</Link>}
        >
          {runs.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">No scorecard runs recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {runs.map((r) => (
                <LinkRow
                  key={r.id}
                  to={r.customer_id ? `/admin/customers/${r.customer_id}` : "/admin/tools/stability-scorecard"}
                  label={r.title || "Scorecard run"}
                  hint={new Date(r.created_at).toLocaleString()}
                />
              ))}
            </div>
          )}
        </DomainSection>

        <DomainSection title="Public Scorecard → Lead Pipeline" subtitle="How public submissions become qualified leads">
          <PhaseTwoNote text="Wire the public /scorecard form to create a Lead in CRM / Pipeline automatically. Tracked in the automation registry as scorecard_submission_creates_lead." />
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}