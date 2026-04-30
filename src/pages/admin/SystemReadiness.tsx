import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  KeyRound,
  Wrench,
  Activity,
} from "lucide-react";
import {
  AI_REVIEW_DISCLOSURE,
  AI_WORKFLOW_CATALOG,
  MAINTENANCE_LINKS,
  aiWorkflowStatus,
  type AiWorkflowStatus,
} from "@/lib/admin/systemReadiness";

type ReadinessApi = {
  ai_gateway_configured?: boolean;
  model?: string;
  usage_summary?: {
    recent_runs_30d?: number;
    recent_failed_runs_30d?: number;
    last_run_at?: string | null;
    last_error_at?: string | null;
    last_error_message?: string | null;
    balance_signal?: string;
  };
};

const STATUS_STYLE: Record<AiWorkflowStatus, string> = {
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  needs_api_key: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  not_configured: "border-border bg-muted/30 text-muted-foreground",
  error: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  attention: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  unknown: "border-border bg-muted/20 text-muted-foreground",
};

function StatusPill({ status, label }: { status: AiWorkflowStatus; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-wider ${STATUS_STYLE[status]}`}
      data-testid="readiness-status-pill"
    >
      {status === "ready" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : status === "not_configured" ? (
        <Wrench className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}

export default function SystemReadiness() {
  const [status, setStatus] = useState<ReadinessApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("ai-readiness-status");
        if (fnError) throw fnError;
        if (!cancelled) setStatus(data as ReadinessApi);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not check AI readiness");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasKey = !!status?.ai_gateway_configured;
  const balanceSignal = status?.usage_summary?.balance_signal ?? null;
  const recentFailed = status?.usage_summary?.recent_failed_runs_30d ?? 0;

  return (
    <PortalShell>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Admin · Operations
          </div>
          <h1 className="text-2xl font-semibold text-foreground">System Readiness</h1>
          <p className="text-sm text-muted-foreground">
            Operational view of the services RGS depends on. Status labels only — no secrets,
            tokens, or live balances are exposed in the browser.
          </p>
        </header>

        {/* AI review disclosure */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            How AI is used in RGS
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {AI_REVIEW_DISCLOSURE.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* AI workflow readiness */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              AI-assisted workflows
            </h2>
            {loading ? (
              <span className="text-xs text-muted-foreground">Checking…</span>
            ) : error ? (
              <span className="text-xs text-amber-300">Status check unavailable</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Model: <code className="font-mono">{status?.model ?? "—"}</code>
              </span>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {AI_WORKFLOW_CATALOG.map((wf) => {
              const s = aiWorkflowStatus({
                hasLovableKey: hasKey,
                balanceSignal,
                recentFailedRuns: recentFailed,
                edgeFunction: wf.edgeFunction,
              });
              return (
                <article
                  key={wf.key}
                  className="rounded-xl border border-border bg-card p-4"
                  data-testid={`workflow-${wf.key}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-foreground">{wf.label}</h3>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
                        {wf.surface}
                      </div>
                    </div>
                    <StatusPill status={s.status} label={s.label} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{wf.description}</p>
                  {wf.edgeFunction && (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Backed by edge function:{" "}
                      <code className="font-mono">{wf.edgeFunction}</code>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* Maintenance links */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Maintenance dashboards
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {MAINTENANCE_LINKS.map((link) => (
              <a
                key={link.key}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-colors"
                data-testid={`maintenance-${link.key}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground inline-flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                      {link.label}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="mt-3 text-[11px] text-muted-foreground">
                  {link.balanceMode === "manual"
                    ? `Manual check required. ${link.manualNote ?? ""}`
                    : "Live link — no balance to check."}
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Backend signal block */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Activity className="h-4 w-4 text-primary" /> Recent AI activity (30d)
          </div>
          {loading ? (
            <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
          ) : error || !status ? (
            <p className="mt-2 text-xs text-amber-300">
              Could not reach the readiness check. Open the AI readiness banner from the admin
              dashboard to retry.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-3 text-xs">
              <div>
                <div className="text-muted-foreground uppercase tracking-wider text-[10px]">
                  Runs
                </div>
                <div className="mt-1 text-foreground">
                  {status.usage_summary?.recent_runs_30d ?? 0}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground uppercase tracking-wider text-[10px]">
                  Failed
                </div>
                <div className="mt-1 text-foreground">
                  {status.usage_summary?.recent_failed_runs_30d ?? 0}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground uppercase tracking-wider text-[10px]">
                  Balance signal
                </div>
                <div className="mt-1 text-foreground">
                  {status.usage_summary?.balance_signal ?? "untested"}
                </div>
              </div>
            </div>
          )}
          <div className="mt-3 text-[11px] text-muted-foreground">
            Detailed model, setup checklist, and the deepest balance signal stay on the AI
            readiness banner inside the admin dashboard.{" "}
            <Link to="/admin" className="text-primary hover:underline">
              Open admin dashboard
            </Link>
            .
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
