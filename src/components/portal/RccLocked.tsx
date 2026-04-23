// P6.1 / P7.2.4 — Calm locked-state shown when a client without RCC access
// lands on /portal/business-control-center/*. Copy is tailored to the
// entitlement reason returned by useRccAccess so clients see the right
// next step.
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell } from "@/components/domains/DomainShell";
import { Briefcase, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import type { RccEntitlementReason } from "@/lib/access/rccEntitlement";

function copyForReason(reason: RccEntitlementReason | null | undefined): {
  heading: string;
  body: string;
} {
  switch (reason) {
    case "subscription_past_due":
      return {
        heading: "Revenue Control Center™ access is paused",
        body: "Your Revenue Control Center™ subscription is past due. Contact RGS to bring billing current and restore access.",
      };
    case "subscription_cancelled":
      return {
        heading: "Revenue Control Center™ access is paused",
        body: "Your Revenue Control Center™ subscription is cancelled. Contact RGS to reactivate.",
      };
    case "paid_through_expired":
    case "subscription_required":
      return {
        heading: "A Revenue Control Center™ subscription is required",
        body: "Your implementation access period has ended. A Revenue Control Center™ subscription is required to continue.",
      };
    case "no_rcc_resource":
    default:
      return {
        heading: "Revenue Control Center™ is not active for your account",
        body: "Revenue Control Center™ is available as an ongoing-control add-on. Contact RGS to activate.",
      };
  }
}

export default function RccLocked({
  reason,
}: { reason?: RccEntitlementReason | null } = {}) {
  const { heading, body } = copyForReason(reason ?? null);
  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Control Systems"
        title="Revenue Control Center™"
        description="An ongoing-control add-on for owners who want a weekly view of revenue, expenses, payroll, and cash flow."
      >
        <div className="rounded-2xl border border-border bg-card/50 p-10 text-center max-w-2xl mx-auto">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center mb-4">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-light text-foreground mb-2 flex items-center justify-center gap-2">
            <Briefcase className="h-4 w-4 text-primary/70" />
            {heading}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {body}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/portal"
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <a
              href="mailto:jmchubb@revenueandgrowthsystems.com?subject=Revenue%20Control%20Center%E2%84%A2%20activation"
              className="text-xs uppercase tracking-[0.2em] text-primary hover:text-primary/80 transition-colors"
            >
              Contact RGS
            </a>
          </div>
        </div>
      </DomainShell>
    </PortalShell>
  );
}
