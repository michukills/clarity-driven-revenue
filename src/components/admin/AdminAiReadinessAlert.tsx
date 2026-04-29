import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AiStatus = {
  ai_gateway_configured: boolean;
  model: string;
  public_ai_calls: boolean;
  scorecard_public_path: string;
  diagnostic_public_path: string;
  report_ai_assist: string;
  seed_helpers: string;
  billing: string;
};

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

  return (
    <div
      className={
        "rounded-xl border px-4 py-3 text-sm " +
        (ready
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
          : "border-amber-500/30 bg-amber-500/10 text-amber-100")
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-medium">
            {ready ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            AI readiness: {ready ? "ready for admin-triggered report assist" : "needs Lovable AI key"}
          </div>
          <p className="mt-1 text-xs opacity-85">
            Public scorecard and diagnostic intake stay deterministic. AI runs only from admin actions,
            uses `{status.model}`, and logs usage in `ai_run_logs`.
          </p>
          <p className="mt-1 text-xs opacity-75">{status.billing}</p>
        </div>
        <Link
          to="/admin/report-drafts"
          className="inline-flex items-center gap-1.5 rounded-md border border-current/25 px-3 py-1.5 text-xs hover:bg-white/5"
        >
          <Sparkles className="h-3.5 w-3.5" /> Open report drafts
        </Link>
      </div>
    </div>
  );
}

export default AdminAiReadinessAlert;
