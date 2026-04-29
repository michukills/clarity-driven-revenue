// P21.2 — Client-side tool route guard.
// Wraps a portal page so that direct navigation to a disabled or unavailable
// tool shows a generic "not available" message. Internal reasons / admin notes
// are never shown to the client. Whether the tool exists for other industries
// is never disclosed.

import { useEffect, useState, type ReactNode } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { getEffectiveToolsForCustomer } from "@/lib/toolCatalog";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  /** tool_key from the catalog. */
  toolKey: string;
  children: ReactNode;
}

type State =
  | { kind: "loading" }
  | { kind: "no_customer" }
  | { kind: "allowed" }
  | { kind: "denied" }
  | { kind: "error"; message: string };

export function ClientToolGuard({ toolKey, children }: Props) {
  const { customerId, loading: customerLoading } = usePortalCustomerId();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (customerLoading) {
      setState({ kind: "loading" });
      return;
    }
    if (!customerId) {
      setState({ kind: "no_customer" });
      return;
    }
    let alive = true;
    (async () => {
      try {
        const rows = await getEffectiveToolsForCustomer(customerId);
        if (!alive) return;
        // Client RPC already filters to effectively-enabled tools.
        const found = rows.find((r) => r.tool_key === toolKey);
        if (found && found.effective_enabled) {
          setState({ kind: "allowed" });
        } else {
          setState({ kind: "denied" });
        }
      } catch (e: any) {
        if (!alive) return;
        setState({ kind: "error", message: e?.message ?? "Failed to verify access" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [customerId, customerLoading, toolKey]);

  if (state.kind === "loading") {
    return (
      <PortalShell variant="customer">
        <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking access…
        </div>
      </PortalShell>
    );
  }

  if (state.kind === "allowed") {
    return <>{children}</>;
  }

  // no_customer / denied / error all surface the same neutral message —
  // we never disclose whether a tool exists or why it is unavailable.
  return (
    <PortalShell variant="customer">
      <div className="max-w-xl mx-auto mt-12 bg-card border border-border rounded-xl p-8 text-center">
        <ShieldAlert className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
        <h1 className="text-lg text-foreground mb-2">This tool is not available for your account.</h1>
        <p className="text-sm text-muted-foreground">
          If you believe this is a mistake, contact your account team and they can review your access.
        </p>
        <div className="mt-6">
          <Link
            to="/portal/tools"
            className="inline-flex items-center text-xs font-medium px-3 py-2 rounded-md border border-border hover:border-primary/50 text-foreground"
          >
            Back to your tools
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}

export default ClientToolGuard;