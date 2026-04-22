import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection } from "@/components/domains/DomainShell";

export default function PortalMonitoring() {
  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Add-On"
        title="Monitoring"
        description="Ongoing visibility into revenue health and risk after your diagnostic. Includes the Revenue & Risk Monitor and the Revenue Leak Detection System."
      >
        <DomainSection title="Active Monitoring Tools">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link
              to="/portal/tools/revenue-risk-monitor"
              className="p-4 rounded-md bg-muted/30 border border-border hover:border-primary/40 transition-colors"
            >
              <div className="text-sm text-foreground">Revenue & Risk Monitor</div>
              <div className="text-[11px] text-muted-foreground mt-1">Track risk signals across your revenue system.</div>
            </Link>
            <Link
              to="/portal/tools/revenue-leak-engine"
              className="p-4 rounded-md bg-muted/30 border border-border hover:border-primary/40 transition-colors"
            >
              <div className="text-sm text-foreground">Revenue Leak Detection System</div>
              <div className="text-[11px] text-muted-foreground mt-1">Surface where money is escaping the system.</div>
            </Link>
          </div>
        </DomainSection>

        <DomainSection title="Subscription Status">
          <div className="text-xs text-muted-foreground">
            Monitoring access is granted by RGS as part of an active engagement or add-on.
          </div>
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}