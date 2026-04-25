import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection, StatTile } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";

interface RunRow {
  id: string;
  created_at: string;
  source: string;
  status: string;
  confidence: string;
  ai_status: string;
  lead_name: string | null;
  lead_email: string | null;
  lead_business: string | null;
  customer_id: string | null;
}

const STATUS_TONE: Record<string, string> = {
  new: "text-amber-200 border-amber-400/30 bg-amber-400/5",
  reviewed: "text-sky-300 border-sky-400/30 bg-sky-400/5",
  converted: "text-emerald-300 border-emerald-400/30 bg-emerald-400/5",
  archived: "text-muted-foreground border-border bg-muted/20",
};

export default function AdminDiagnosticInterviews() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("diagnostic_interview_runs")
        .select("id, created_at, source, status, confidence, ai_status, lead_name, lead_email, lead_business, customer_id")
        .order("created_at", { ascending: false })
        .limit(200);
      setRuns((data as RunRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === "all" ? runs : runs.filter((r) => r.status === filter);

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="Diagnostic System"
        title="Diagnostic Interviews"
        description="Deep Business Systems Diagnostic Interview submissions. Each run produces an Evidence Map, System Dependency Map, Validation Checklist, and Admin Brief — deterministically, without paid AI."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile label="Total runs" value={runs.length} hint="Across all sources" />
          <StatTile label="New" value={runs.filter((r) => r.status === "new").length} hint="Awaiting review" />
          <StatTile label="Anonymous" value={runs.filter((r) => r.source === "anonymous").length} hint="Public submissions" />
          <StatTile label="From scorecard" value={runs.filter((r) => r.source === "scorecard").length} hint="Cross-funnel" />
        </div>

        <DomainSection title="Submitted runs" subtitle="Newest first">
          <div className="flex items-center gap-2 mb-3 text-xs">
            {(["all", "new", "reviewed", "converted", "archived"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 h-7 rounded-md border ${filter === f ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {f}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="text-xs text-muted-foreground py-6 text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">No runs match this filter.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <Link
                  key={r.id}
                  to={`/admin/diagnostic-interviews/${r.id}`}
                  className="block rounded-md border border-border bg-card/40 hover:bg-card/70 transition-colors p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate">
                        {r.lead_business || r.lead_name || r.lead_email || "Anonymous run"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {r.lead_email ?? "—"} · {new Date(r.created_at).toLocaleString()} · source: {r.source}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_TONE[r.status] ?? "border-border text-muted-foreground"}`}>
                        {r.status}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                        confidence: {r.confidence}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                        ai: {r.ai_status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}
