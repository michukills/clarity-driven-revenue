// P6.1 — Gate wrapper for /portal/business-control-center/*.
// Renders the locked state until access check completes (no flash of content
// for non-access users).
import { ReactNode } from "react";
import { useRccAccess } from "@/lib/access/useRccAccess";
import RccLocked from "@/components/portal/RccLocked";
import { PortalShell } from "@/components/portal/PortalShell";

export default function RccGate({ children }: { children: ReactNode }) {
  const { loading, hasAccess } = useRccAccess();
  if (loading) {
    return (
      <PortalShell variant="customer">
        <div className="py-16 text-center text-sm text-muted-foreground">Checking access…</div>
      </PortalShell>
    );
  }
  if (!hasAccess) return <RccLocked />;
  return <>{children}</>;
}
