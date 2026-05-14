/**
 * P12.4.C — Admin: Connected Source Requests panel.
 *
 * Lightweight surface that lists the connection requests clients have
 * sent from the Connected Sources workspace, across all customers.
 * Renders into the Diagnostic Workspace so admins see client-supplied
 * truth requests as part of the diagnostic flow without having to dig
 * into per-customer detail.
 *
 * Admin can move a request through the lifecycle:
 *   requested → setup_in_progress → connected
 * or mark needs_review / unavailable.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plug, ExternalLink } from "lucide-react";
import { WorkflowEmptyState } from "@/components/admin/WorkflowEmptyState";
import {
  CONNECTOR_PLANS,
  type ConnectorId,
} from "@/lib/integrations/planning";
import {
  statusUi,
  type SourceStatus,
} from "@/lib/integrations/connectedSources";

interface RequestRow {
  id: string;
  customer_id: string;
  provider: ConnectorId;
  status: SourceStatus;
  metadata: Record<string, any>;
  account_label: string | null;
  created_at: string;
  updated_at: string;
  customers?: { full_name: string | null; business_name: string | null } | null;
}

const ADMIN_STATUSES: SourceStatus[] = [
  "requested",
  "setup_in_progress",
  "needs_review",
  "connected",
  "unavailable",
];

interface Props {
  /** Optional — restrict to one customer (for customer detail surfaces). */
  customerId?: string;
}

export function ConnectedSourceRequestsPanel({ customerId }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    let q = supabase
      .from("customer_integrations")
      .select(
        "id, customer_id, provider, status, metadata, account_label, created_at, updated_at, customers ( full_name, business_name )",
      )
      .order("updated_at", { ascending: false })
      .limit(50);
    if (customerId) q = q.eq("customer_id", customerId);
    const { data, error } = await q;
    if (!error) setRows((data ?? []) as unknown as RequestRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const updateStatus = async (id: string, status: SourceStatus) => {
    const { error } = await supabase
      .from("customer_integrations")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Status updated" });
    void refresh();
  };

  const visible = useMemo(
    () => rows.filter((r) => r.status !== "active" && r.status !== "disconnected"),
    [rows],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plug className="h-4 w-4" /> Connected Source Requests
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Live requests from clients to connect or set up a source. Move them
          through the lifecycle as your team works them.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-muted-foreground">Checking for open connected-source requests…</p>
        ) : visible.length === 0 ? (
          <WorkflowEmptyState
            tone="empty"
            testId="connected-source-requests-empty"
            title={
              customerId
                ? "No connected-source requests are open for this customer."
                : "No connected-source requests are open right now."
            }
            body="If the diagnostic needs source-of-truth data, ask the client to open a request from Connected Sources, or capture the same evidence through manual upload. Requests stay listed here until an admin marks them connected, needs review, or unavailable."
          />
        ) : (
          <div className="space-y-2">
            {visible.map((r) => {
              const plan = CONNECTOR_PLANS.find((c) => c.id === r.provider);
              const ui = statusUi(r.status);
              const note = (r.metadata as any)?.request_note as string | null;
              const clientName =
                r.customers?.business_name ??
                r.customers?.full_name ??
                "Unknown client";
              return (
                <div
                  key={r.id}
                  className="border rounded-md p-3 flex flex-wrap items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {plan?.label ?? r.provider}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider ${ui.tone}`}
                      >
                        {ui.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {!customerId && (
                        <Link
                          to={`/admin/customers/${r.customer_id}`}
                          className="hover:text-foreground underline-offset-2 hover:underline"
                        >
                          {clientName}
                        </Link>
                      )}
                      {!customerId && " · "}
                      Updated {new Date(r.updated_at).toLocaleString()}
                    </div>
                    {note && (
                      <div className="text-[11px] text-muted-foreground mt-1 italic">
                        "{note}"
                      </div>
                    )}
                  </div>
                  <Select
                    value={r.status}
                    onValueChange={(v) =>
                      updateStatus(r.id, v as SourceStatus)
                    }
                  >
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {statusUi(s).label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!customerId && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/admin/customers/${r.customer_id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}