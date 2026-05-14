/**
 * P93E-E2G — Admin Industry Diagnostic Interviews list + start.
 *
 * Live admin-driven interview workspace (separate from the public
 * self-submitted diagnostic_interview_runs flow). Admin selects a customer
 * via the shared EligibleCustomerSelect, confirms the industry, and starts
 * or continues the correct industry-specific interview.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection, DomainBoundary, StatTile } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EligibleCustomerSelect } from "@/components/admin/EligibleCustomerSelect";
import {
  INDUSTRY_KEYS, INDUSTRY_LABELS, getBank, summarizeBank, type IndustryKey,
  INDUSTRY_MATURITY, MATURITY_LABELS, MATURITY_TONE,
} from "@/lib/industryDiagnostic";

interface SessionRow {
  id: string;
  customer_id: string;
  industry_key: IndustryKey;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export default function IndustryDiagnosticInterviews() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [industry, setIndustry] = useState<IndustryKey>("trades_home_services");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("industry_diagnostic_sessions")
        .select("id, customer_id, industry_key, status, started_at, completed_at")
        .order("started_at", { ascending: false })
        .limit(100);
      setSessions((data as SessionRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function startInterview() {
    if (!customerId) {
      toast.error("Pick a customer first.");
      return;
    }
    setStarting(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("industry_diagnostic_sessions")
      .insert({
        customer_id: customerId,
        industry_key: industry,
        started_by: u.user?.id ?? null,
        status: "in_progress",
      } as never)
      .select("id")
      .single();
    setStarting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate(`/admin/industry-interviews/${(data as { id: string }).id}`);
  }

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="Diagnostic System"
        title="Industry Diagnostic Interviews"
        description="Live admin-driven diagnostic interviews. Pick a client, confirm their industry, and run the deep $5,000-level interview from a plain-English script."
      >
        <DomainBoundary
          scope="Admin-only live interview workspace. Captures owner answers, evidence/confidence state, and repair-map signals during the call."
          outOfScope="No client-facing surface — separate from the self-submitted interview flow at /diagnostic-interview. RGS does not provide legal, tax, accounting, or regulatory counsel."
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile label="Sessions" value={sessions.length} hint="All-time, this admin's view" />
          <StatTile label="In progress" value={sessions.filter((s) => s.status === "in_progress").length} />
          <StatTile label="Paused" value={sessions.filter((s) => s.status === "paused").length} />
          <StatTile label="Completed" value={sessions.filter((s) => s.status === "completed").length} />
        </div>

        <DomainSection title="Start a new interview" subtitle="Picks customer using the shared eligibility selector, then confirms industry.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Customer</label>
              <EligibleCustomerSelect
                value={customerId}
                onChange={setCustomerId}
                runMode="full_client"
                placeholder="— Select customer —"
                selectClassName="w-full rounded-md border border-border bg-card/50 px-3 h-9 text-sm text-foreground"
                testIdPrefix="industry-interview-customer"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as IndustryKey)}
                className="w-full rounded-md border border-border bg-card/50 px-3 h-9 text-sm text-foreground"
              >
                {INDUSTRY_KEYS.map((k) => {
                  const s = summarizeBank(getBank(k));
                  const m = INDUSTRY_MATURITY[k];
                  return (
                    <option key={k} value={k}>
                      {INDUSTRY_LABELS[k]} — {s.total} prompts · {MATURITY_LABELS[m]}
                    </option>
                  );
                })}
              </select>
              {(() => {
                const m = INDUSTRY_MATURITY[industry];
                const tone = MATURITY_TONE[m];
                const cls =
                  tone === "warn"
                    ? "border-amber-400/40 bg-amber-400/5 text-amber-100"
                    : tone === "ok"
                    ? "border-emerald-400/40 bg-emerald-400/5 text-emerald-100"
                    : "border-border bg-card/40 text-muted-foreground";
                return (
                  <div className={`mt-2 rounded-md border ${cls} text-[11px] px-2 py-1`}>
                    {MATURITY_LABELS[m]}
                    {m === "starter_bank" && (
                      <span className="ml-1 opacity-80">— report wiring pending; do not present to client as final.</span>
                    )}
                  </div>
                );
              })()}
            </div>
            <div>
              <button
                onClick={startInterview}
                disabled={starting || !customerId}
                className="btn-primary inline-flex disabled:opacity-50 h-9"
              >
                {starting ? "Starting…" : "Start interview"}
              </button>
            </div>
          </div>
          {industry === "cannabis_mmj_dispensary" && (
            <div className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/5 text-amber-100 text-xs p-3">
              {getBank("cannabis_mmj_dispensary").disclaimer}
            </div>
          )}
        </DomainSection>

        <DomainSection title="Existing sessions" subtitle="Newest first.">
          {loading ? (
            <div className="text-xs text-muted-foreground py-6 text-center">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-xs text-muted-foreground">
              No live interview sessions yet. Start one above.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/admin/industry-interviews/${s.id}`}
                  className="block rounded-md border border-border bg-card/40 hover:bg-card/70 transition-colors p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate">
                        {INDUSTRY_LABELS[s.industry_key] ?? s.industry_key}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        Started {new Date(s.started_at).toLocaleString()} · customer {s.customer_id.slice(0, 8)}…
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                      {s.status}
                    </span>
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
