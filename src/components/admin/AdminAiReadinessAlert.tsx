import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AiWorkflow = {
  key: string;
  label: string;
  status: string;
  ai_mode: string;
  note: string;
};

type AiStatus = {
  ai_gateway_configured: boolean;
  model: string;
  model_override_configured?: boolean;
  public_ai_calls: boolean;
  scorecard_public_path: string;
  diagnostic_public_path: string;
  report_ai_assist: string;
  seed_helpers: string;
  billing: string;
  scoring_authority?: {
    scorecard: string;
    diagnostic: string;
    ai_role: string;
  };
  balance_management?: {
    balance_visible_in_app: boolean;
    top_up_path: string;
    docs_url: string;
    note: string;
  };
  recommended_model?: {
    current: string;
    default: string;
    recommendation: string;
  };
  usage_summary?: {
    recent_runs_30d: number;
    recent_failed_runs_30d: number;
    recent_total_tokens_30d: number | null;
    last_run_at: string | null;
    last_error_at: string | null;
    last_error_message: string | null;
    balance_signal: "configure_lovable_api_key" | "top_up_required" | "no_recent_credit_error" | "untested" | string;
  };
  workflows?: AiWorkflow[];
  setup_steps?: string[];
};

function balanceLabel(signal: string | undefined, ready: boolean): string {
  if (!ready) return "Configure AI key";
  if (signal === "top_up_required") return "Top up required";
  if (signal === "no_recent_credit_error") return "No recent credit error";
  return "Run smoke test";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export function AdminAiReadinessAlert() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("ai-readiness-status");
        if (fnError) throw fnError;
        if (!cancelled) setStatus(data as AiStatus);
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

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Checking AI readiness…
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" /> AI readiness check unavailable
        </div>
        <p className="mt-1 text-xs text-amber-100/80">
          Confirm the `ai-readiness-status` edge function is deployed with JWT verification.
        </p>
      </div>
    );
  }

  const ready = status.ai_gateway_configured;
  const balanceSignal = status.usage_summary?.balance_signal;
  const needsTopUp = balanceSignal === "top_up_required";
  const docsUrl = status.balance_management?.docs_url ?? "https://docs.lovable.dev/integrations/cloud";
  const setupSteps = status.setup_steps ?? [
    ready ? "LOVABLE_API_KEY is configured." : "Add LOVABLE_API_KEY as a Supabase Edge Function secret.",
    "Keep Lovable Cloud & AI balance funded.",
    "Run one admin-only AI report assist smoke test.",
  ];

  return (
    <div
      className={
        "rounded-xl border px-4 py-3 text-sm " +
        (ready && !needsTopUp
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
          : "border-amber-500/30 bg-amber-500/10 text-amber-100")
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-medium">
            {ready && !needsTopUp ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            AI readiness: {ready ? "admin AI configured" : "needs Lovable AI key"} -{" "}
            {balanceLabel(balanceSignal, ready)}
          </div>
          <p className="mt-1 text-xs opacity-85">
            Public scorecard and diagnostic intake stay deterministic. AI runs only from admin actions,
            uses `{status.model}`, and logs usage in `ai_run_logs`.
          </p>
          <p className="mt-1 text-xs opacity-75">
            {status.billing} Top up in Lovable:{" "}
            {status.balance_management?.top_up_path ?? "Settings -> Cloud & AI balance"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/report-drafts"
            className="inline-flex items-center gap-1.5 rounded-md border border-current/25 px-3 py-1.5 text-xs hover:bg-white/5"
          >
            <Sparkles className="h-3.5 w-3.5" /> Open report drafts
          </Link>
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-current/25 px-3 py-1.5 text-xs hover:bg-white/5"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Top up / AI setup
          </a>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-current/15 bg-black/10 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.16em] opacity-65">Model</div>
          <div className="mt-1 font-mono text-xs">{status.model}</div>
          <div className="mt-1 text-[11px] opacity-70">
            {status.model_override_configured ? "Configured with RGS_AI_MODEL." : "Default launch model."}
          </div>
        </div>
        <div className="rounded-lg border border-current/15 bg-black/10 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.16em] opacity-65">30-day AI usage</div>
          <div className="mt-1 text-xs">
            {status.usage_summary?.recent_runs_30d ?? 0} runs -{" "}
            {status.usage_summary?.recent_failed_runs_30d ?? 0} failed
          </div>
          <div className="mt-1 text-[11px] opacity-70">
            Last run: {formatDate(status.usage_summary?.last_run_at)}
          </div>
        </div>
        <div className="rounded-lg border border-current/15 bg-black/10 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.16em] opacity-65">Balance signal</div>
          <div className="mt-1 text-xs">{balanceLabel(balanceSignal, ready)}</div>
          <div className="mt-1 text-[11px] opacity-70">
            {status.usage_summary?.last_error_message
              ? status.usage_summary.last_error_message
              : "No credit-exhausted error logged."}
          </div>
        </div>
      </div>

      {status.scoring_authority && (
        <div className="mt-3 rounded-lg border border-current/15 bg-black/10 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.16em] opacity-65">Scoring authority</div>
          <p className="mt-1 text-xs opacity-85">
            Scorecard: {status.scoring_authority.scorecard}. Diagnostic:{" "}
            {status.scoring_authority.diagnostic}.
          </p>
          <p className="mt-1 text-[11px] opacity-75">{status.scoring_authority.ai_role}</p>
        </div>
      )}

      {status.workflows && status.workflows.length > 0 && (
        <div className="mt-3 rounded-lg border border-current/15 bg-black/10 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.16em] opacity-65">Launch workflows</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {status.workflows.map((w) => (
              <div key={w.key} className="rounded-md border border-current/10 px-2 py-2">
                <div className="flex items-center justify-between gap-2 text-xs font-medium">
                  <span>{w.label}</span>
                  <span className="font-mono text-[10px] opacity-70">{w.status}</span>
                </div>
                <p className="mt-1 text-[11px] opacity-75">{w.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 rounded-lg border border-current/15 bg-black/10 px-3 py-2">
        <div className="text-[11px] uppercase tracking-[0.16em] opacity-65">Setup checklist</div>
        <ul className="mt-2 space-y-1 text-[11px] opacity-80">
          {setupSteps.map((step) => (
            <li key={step}>- {step}</li>
          ))}
        </ul>
        {status.recommended_model?.recommendation && (
          <p className="mt-2 text-[11px] opacity-80">{status.recommended_model.recommendation}</p>
        )}
      </div>
    </div>
  );
}

export default AdminAiReadinessAlert;
