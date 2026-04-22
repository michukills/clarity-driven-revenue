import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection, LinkRow, PhaseTwoNote, StatTile } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";

export default function RevenueFinancialsDomain() {
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, business_name, stage, payment_status, monthly_revenue, last_activity_at");
      if (data) setCustomers(data);
    })();
  }, []);

  // Phase 1: derive revenue snapshot from existing pipeline + payment status.
  const diagnosticPaid = customers.filter((c) => c.payment_status === "diagnostic_paid").length;
  const implementationPaid = customers.filter((c) => c.payment_status === "implementation_paid").length;
  const diagnosticRevenue = diagnosticPaid * 1750;
  const projectedDiagnostic =
    customers.filter((c) => ["proposal_sent", "decision_pending"].includes(c.stage) && c.payment_status === "unpaid").length * 1750;

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="RGS OS Domain"
        title="Revenue Tracking / Financial View"
        description="Closed, projected, recurring, and add-on revenue across the RGS book. Sourced from pipeline + payment status; full financial schema lands in Phase 2."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile label="Diagnostic Revenue (closed)" value={`$${diagnosticRevenue.toLocaleString()}`} hint={`${diagnosticPaid} paid`} />
          <StatTile label="Implementation Engagements" value={implementationPaid} hint="Marked paid" />
          <StatTile label="Projected (open proposals)" value={`$${projectedDiagnostic.toLocaleString()}`} hint="Diagnostic at $1,750" />
          <StatTile label="Add-On Revenue" value="—" hint="Tracked in Add-On / Monitoring" />
        </div>

        <DomainSection title="Revenue Categories" subtitle="What this domain will eventually own end-to-end">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              ["Offer value", "Quoted dollar value of each engagement"],
              ["Deal status", "Open, won, lost, churned"],
              ["Closed revenue", "Collected dollars by month / quarter"],
              ["Projected revenue", "Pipeline-weighted forecast"],
              ["Recurring revenue potential", "Add-on, monitoring, retainer"],
              ["Add-on revenue", "Expansion beyond the diagnostic"],
            ].map(([label, hint]) => (
              <div key={label} className="p-3 rounded-md bg-muted/30 border border-border">
                <div className="text-sm text-foreground">{label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
              </div>
            ))}
          </div>
        </DomainSection>

        <DomainSection
          title="Open Proposals (Revenue at Risk)"
          subtitle="Unpaid proposals awaiting decision"
          action={<Link to="/admin/pipeline" className="text-xs text-muted-foreground hover:text-foreground">Open pipeline →</Link>}
        >
          {(() => {
            const open = customers.filter(
              (c) => ["proposal_sent", "decision_pending"].includes(c.stage) && c.payment_status === "unpaid",
            );
            if (open.length === 0)
              return <div className="text-xs text-muted-foreground py-6 text-center">No open proposals.</div>;
            return (
              <div className="space-y-2">
                {open.map((c) => (
                  <LinkRow
                    key={c.id}
                    to={`/admin/customers/${c.id}`}
                    label={c.business_name || c.full_name}
                    hint={`${c.stage.replace(/_/g, " ")} · projected $1,750`}
                  />
                ))}
              </div>
            );
          })()}
        </DomainSection>

        <DomainSection title="Financial Schema" subtitle="Dedicated revenue records">
          <PhaseTwoNote text="Add a revenue_records table with deal_id, offer_value, status, closed_at, recurring_amount. Today this view is derived from customers + payment_status." />
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}