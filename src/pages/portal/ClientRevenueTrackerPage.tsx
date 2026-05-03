import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell } from "@/components/domains/DomainShell";
import { ClientRevenueTracker } from "@/components/bcc/ClientRevenueTracker";
import { useClientRevenueTrackerData } from "@/lib/bcc/useClientRevenueTrackerData";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { useToolUsageSession } from "@/lib/usage/toolUsageSession";
import { Link } from "react-router-dom";

export default function ClientRevenueTrackerPage() {
  const { customerId } = usePortalCustomerId();
  useToolUsageSession({ toolTitle: "Revenue Tracker", toolKey: "revenue_tracker" });

  const { data, isSample, loading, reload } = useClientRevenueTrackerData(customerId);

  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Revenue Control System™ · Part of the RGS Control System™"
        title="Revenue Control Center™"
        description="The Revenue Control System™ focuses on revenue visibility — weekly revenue, expenses, payroll, receivables, and cash movement — so the important signals stay visible week to week. It lives inside the larger RGS Control System™ ongoing visibility lane. This is a visibility and decision-support layer, not accounting software, and it does not replace owner judgment."
      >
        <div className="mb-4 text-xs text-muted-foreground">
          <Link to="/portal/tools/rgs-control-system" className="text-primary hover:underline">
            ← Back to RGS Control System™
          </Link>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <ClientRevenueTracker
            data={data}
            customerId={customerId}
            isSample={isSample}
            onChange={reload}
          />
        )}
      </DomainShell>
    </PortalShell>
  );
}