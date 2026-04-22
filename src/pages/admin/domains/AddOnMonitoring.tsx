import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection, LinkRow, PhaseTwoNote, StatTile } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";

export default function AddOnMonitoringDomain() {
  const [addonTools, setAddonTools] = useState<any[]>([]);
  const [monitoringRuns, setMonitoringRuns] = useState<any[]>([]);
  const [addonAssignments, setAddonAssignments] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [tools, runs, assigns] = await Promise.all([
        supabase.from("resources").select("id, title, description, tool_category").eq("tool_category", "addon"),
        supabase
          .from("tool_runs")
          .select("id, title, customer_id, created_at, tool_key")
          .in("tool_key", ["revenue_risk_monitor", "revenue_leak_finder", "revenue_leak_detection"])
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("resource_assignments")
          .select("id, customer_id, resource_id, assigned_at, assignment_source")
          .eq("assignment_source", "addon")
          .order("assigned_at", { ascending: false })
          .limit(8),
      ]);
      if (tools.data) setAddonTools(tools.data);
      if (runs.data) setMonitoringRuns(runs.data);
      if (assigns.data) setAddonAssignments(assigns.data);
    })();
  }, []);

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="RGS OS Domain"
        title="Add-On / Monitoring System"
        description="Post-diagnostic expansion. Add-on purchases, ongoing monitoring (Revenue & Risk Monitor™, Revenue Leak Detection Engine™), and recurring expansion opportunities."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile label="Add-On Tools" value={addonTools.length} hint="Resources tagged as add-on" />
          <StatTile label="Add-On Assignments" value={addonAssignments.length} hint="Recent (manual)" />
          <StatTile label="Monitoring Runs" value={monitoringRuns.length} hint="Recent" />
          <StatTile label="Subscription Potential" value="—" hint="Phase 2" />
        </div>

        <DomainSection
          title="Add-On Catalog"
          subtitle="Tools that are never auto-assigned. Assigned manually after purchase."
          action={<Link to="/admin/tools" className="text-xs text-muted-foreground hover:text-foreground">Manage tools →</Link>}
        >
          {addonTools.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">
              No tools tagged as Add-On yet. Tag tools in Tool Distribution → Add-On.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {addonTools.map((t) => (
                <div key={t.id} className="p-3 rounded-md bg-muted/30 border border-border">
                  <div className="text-sm text-foreground">{t.title}</div>
                  {t.description && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DomainSection>

        <DomainSection title="Recent Monitoring Activity" subtitle="Revenue & Risk Monitor™ + Revenue Leak Detection Engine™ runs">
          {monitoringRuns.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">No monitoring runs yet.</div>
          ) : (
            <div className="space-y-2">
              {monitoringRuns.map((r) => (
                <LinkRow
                  key={r.id}
                  to={r.customer_id ? `/admin/customers/${r.customer_id}` : "/admin/tools"}
                  label={r.title || r.tool_key}
                  hint={new Date(r.created_at).toLocaleString()}
                />
              ))}
            </div>
          )}
        </DomainSection>

        <DomainSection title="Add-On Packages & Subscriptions" subtitle="Grouped purchases that auto-assign multiple tools">
          <PhaseTwoNote text="Add an addon_packages table + monitoring_records for time-series risk thresholds. Today, add-on tools are assigned individually from Client Management." />
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}