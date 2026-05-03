// P21.2 / P49.1 — Admin Tool Access panel for Customer Detail.
// Stage-based access is the default (see private.get_effective_tools_for_customer
// and docs/stage-based-tool-access.md). This panel is the override layer:
// admins use it to grant exceptions, early access, or revoke specific tools
// on top of the stage/lane defaults. Admin-only tools can never be granted
// to clients here.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearClientToolAccess,
  getEffectiveToolsForCustomer,
  setClientToolAccess,
  REASON_LABEL,
  TOOL_TYPE_LABEL,
  canGrantToClient,
  type EffectiveTool,
} from "@/lib/toolCatalog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, ShieldAlert, ShieldCheck, X, Loader2 } from "lucide-react";

interface Props {
  customerId: string;
  customerIndustry: string | null | undefined;
  customerLifecycle: string | null | undefined;
}

const VISIBILITY_LABEL: Record<string, string> = {
  admin_only: "Admin only",
  client_available: "Client-available",
  hidden: "Hidden",
};

function reasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? reason;
}

function effectivePill(t: EffectiveTool) {
  if (t.effective_enabled) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-secondary/15 text-secondary border-secondary/40">
        <CheckCircle2 className="h-3 w-3" /> Enabled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-muted/40 text-muted-foreground border-border">
      Disabled
    </span>
  );
}

function overridePill(state: EffectiveTool["override_state"]) {
  if (state === "granted") {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-primary/15 text-primary border-primary/40">
        Override: granted
      </span>
    );
  }
  if (state === "revoked") {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-destructive/15 text-destructive border-destructive/40">
        Override: revoked
      </span>
    );
  }
  return null;
}

export function ToolAccessPanel({ customerId, customerIndustry, customerLifecycle }: Props) {
  const [tools, setTools] = useState<EffectiveTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getEffectiveToolsForCustomer(customerId);
      setTools(rows);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load tool access");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grantClient = async (t: EffectiveTool) => {
    if (!canGrantToClient(t)) {
      toast.error("Admin-only tools cannot be granted to clients.");
      return;
    }
    setBusyId(t.tool_id);
    try {
      await setClientToolAccess({
        customerId,
        toolId: t.tool_id,
        enabled: true,
        reason: "admin_grant",
      });
      toast.success(`Granted: ${t.name}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to grant tool");
    } finally {
      setBusyId(null);
    }
  };

  const revokeClient = async (t: EffectiveTool) => {
    setBusyId(t.tool_id);
    try {
      await setClientToolAccess({
        customerId,
        toolId: t.tool_id,
        enabled: false,
        reason: "admin_revoke",
      });
      toast.success(`Revoked: ${t.name}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to revoke tool");
    } finally {
      setBusyId(null);
    }
  };

  const clearOverride = async (t: EffectiveTool) => {
    setBusyId(t.tool_id);
    try {
      await clearClientToolAccess(customerId, t.tool_id);
      toast.success(`Cleared override: ${t.name}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to clear override");
    } finally {
      setBusyId(null);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, EffectiveTool[]>();
    for (const t of tools) {
      const k = t.tool_type;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return map;
  }, [tools]);

  const industryDisplay = customerIndustry ?? "(not set)";
  const lifecycleDisplay = customerLifecycle ?? "(unknown)";
  const industryRestricted =
    !customerIndustry || customerIndustry === "other";

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
            Tool access
          </div>
          <h3 className="text-base text-foreground mt-1">RGS Tool Catalog · effective access</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Per-client overrides win over industry rules. Admin-only tools are never granted to clients.
          </p>
        </div>
        <div className="text-right text-[11px] text-muted-foreground space-y-0.5">
          <div>
            Industry: <span className="text-foreground">{industryDisplay}</span>
          </div>
          <div>
            Lifecycle: <span className="text-foreground">{lifecycleDisplay}</span>
          </div>
        </div>
      </div>

      {industryRestricted && (
        <div className="text-[11px] text-foreground border border-amber-500/30 bg-amber-500/10 rounded-md px-3 py-2 flex items-start gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
          <div>
            Industry is missing or set to <code>other</code>. Industry-gated tools default to restricted —
            grant individual tools below if needed.
          </div>
        </div>
      )}

      {loading && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tool access…
        </div>
      )}
      {error && (
        <div className="text-xs text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-3">
          {error}
        </div>
      )}

      {!loading && !error && Array.from(grouped.entries()).map(([type, items]) => (
        <section key={type}>
          <div className="flex items-center gap-2 mb-2 mt-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {TOOL_TYPE_LABEL[type as keyof typeof TOOL_TYPE_LABEL] ?? type}
            </div>
            <div className="text-[10px] text-muted-foreground">· {items.length}</div>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Tool</th>
                  <th className="text-left px-3 py-2 font-medium">Visibility</th>
                  <th className="text-left px-3 py-2 font-medium">Effective</th>
                  <th className="text-left px-3 py-2 font-medium">Reason</th>
                  <th className="text-left px-3 py-2 font-medium">Route</th>
                  <th className="text-right px-3 py-2 font-medium">Override</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => {
                  const grantable = canGrantToClient(t);
                  const busy = busyId === t.tool_id;
                  return (
                    <tr key={t.tool_id} className="border-t border-border/60 align-top">
                      <td className="px-3 py-2 text-foreground">
                        <div className="font-medium">{t.name}</div>
                        {t.description && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 max-w-md">
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-foreground">
                        {VISIBILITY_LABEL[t.default_visibility] ?? t.default_visibility}
                      </td>
                      <td className="px-3 py-2">{effectivePill(t)}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">
                        {reasonLabel(t.reason)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">
                        {t.route_path ? <code>{t.route_path}</code> : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {overridePill(t.override_state)}
                          {grantable ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy || t.override_state === "granted"}
                              onClick={() => grantClient(t)}
                              className="h-7 px-2 text-[11px] border-border"
                            >
                              <ShieldCheck className="h-3 w-3" /> Grant
                            </Button>
                          ) : (
                            <span
                              className="text-[10px] text-muted-foreground italic"
                              title="Admin-only tools cannot be granted to clients."
                            >
                              Admin-only
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy || t.override_state === "revoked"}
                            onClick={() => revokeClient(t)}
                            className="h-7 px-2 text-[11px] border-border"
                          >
                            <X className="h-3 w-3" /> Revoke
                          </Button>
                          {t.override_state !== "none" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() => clearOverride(t)}
                              className="h-7 px-2 text-[11px]"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export default ToolAccessPanel;