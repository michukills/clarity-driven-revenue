import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection, DomainBoundary } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QUESTIONS, AREAS, buildInterviewOutputs, clarificationsFor, type AreaKey } from "@/lib/diagnosticInterview/engine";
import { EvidenceTierBadge } from "@/components/evidence/EvidenceTierBadge";
import { IndustryBrainContextPanel } from "@/components/admin/IndustryBrainContextPanel";
import { IndustryEmphasisPanel } from "@/components/admin/IndustryEmphasisPanel";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import { EligibleCustomerSelect } from "@/components/admin/EligibleCustomerSelect";
import { WorkflowEmptyState } from "@/components/admin/WorkflowEmptyState";

interface RunRow {
  id: string;
  customer_id: string | null;
  scorecard_run_id: string | null;
  source: string;
  status: string;
  confidence: string;
  ai_status: string;
  lead_name: string | null;
  lead_email: string | null;
  lead_business: string | null;
  lead_phone: string | null;
  answers: Record<string, string>;
  evidence_map: any[];
  system_dependency_map: any[];
  validation_checklist: any[];
  admin_brief: any;
  missing_information: any[];
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const STRENGTH_TONE: Record<string, string> = {
  weak: "text-rose-300 border-rose-400/30 bg-rose-400/5",
  mixed: "text-amber-200 border-amber-400/30 bg-amber-400/5",
  strong: "text-emerald-300 border-emerald-400/30 bg-emerald-400/5",
  unknown: "text-muted-foreground border-border bg-muted/20",
};

export default function AdminDiagnosticInterviewDetail() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<string>("new");
  const [customers, setCustomers] = useState<{ id: string; full_name: string; business_name: string | null }[]>([]);
  const [linkCustomerId, setLinkCustomerId] = useState<string>("");
  const [linkedIndustry, setLinkedIndustry] = useState<IndustryCategory | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("diagnostic_interview_runs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) toast.error(error.message);
      const row = data as RunRow | null;
      setRun(row);
      setNotesDraft(row?.admin_notes ?? "");
      setStatusDraft(row?.status ?? "new");
      setLinkCustomerId(row?.customer_id ?? "");
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, business_name")
        .order("full_name", { ascending: true })
        .limit(500);
      setCustomers((data as { id: string; full_name: string; business_name: string | null }[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    const cid = run?.customer_id;
    if (!cid) {
      setLinkedIndustry(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("industry")
        .eq("id", cid)
        .maybeSingle();
      setLinkedIndustry(((data as any)?.industry as IndustryCategory | null) ?? null);
    })();
  }, [run?.customer_id]);

  const questionsByArea = useMemo(() => {
    const map: Record<AreaKey, typeof QUESTIONS> = {} as Record<AreaKey, typeof QUESTIONS>;
    for (const a of AREAS) map[a.key] = QUESTIONS.filter((q) => q.area === a.key);
    return map;
  }, []);

  async function saveNotes() {
    if (!run) return;
    setSavingNotes(true);
    const updates: Record<string, unknown> = {
      admin_notes: notesDraft.trim() || null,
      status: statusDraft,
    };
    if (linkCustomerId && linkCustomerId !== run.customer_id) updates.customer_id = linkCustomerId;
    if (!linkCustomerId && run.customer_id) updates.customer_id = null;
    const { error } = await supabase
      .from("diagnostic_interview_runs")
      .update(updates as never)
      .eq("id", run.id);
    setSavingNotes(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Saved.");
      setRun({ ...run, admin_notes: notesDraft.trim() || null, status: statusDraft, customer_id: linkCustomerId || null });
    }
  }

  function generateReportDraft() {
    if (!run) return;
    const params = new URLSearchParams();
    if (run.customer_id) params.set("customer", run.customer_id);
    params.set("type", "diagnostic");
    window.location.href = `/admin/report-drafts?${params.toString()}`;
  }

  if (loading) {
    return (
      <PortalShell variant="admin">
        <div className="p-6 text-xs text-muted-foreground">Loading…</div>
      </PortalShell>
    );
  }
  if (!run) {
    return (
      <PortalShell variant="admin">
        <div className="p-6">
          <WorkflowEmptyState
            tone="blocked"
            title="Diagnostic interview run not found."
            body="This run may have been deleted, archived, or it may not be linked to your admin account. If you reached this page from a stale link, return to the Diagnostic Interviews list and pick a current run. If you expected to find an admin-led live session, use the Industry Interviews workspace instead."
            primary={{ label: "Back to Diagnostic Interviews", to: "/admin/diagnostic-interviews", testId: "diag-detail-not-found-back" }}
            secondary={{ label: "Open Industry Interviews", to: "/admin/industry-interviews", testId: "diag-detail-not-found-industry" }}
            testId="diag-detail-not-found"
          />
        </div>
      </PortalShell>
    );
  }

  const derived = buildInterviewOutputs(run.answers ?? {});
  const brief =
    run.admin_brief && Object.keys(run.admin_brief).length > 0
      ? run.admin_brief
      : derived.admin_brief;
  const systemDependencyMap =
    Array.isArray(run.system_dependency_map) && run.system_dependency_map.length > 0
      ? run.system_dependency_map
      : derived.system_dependency_map;
  const evidenceMap =
    Array.isArray(run.evidence_map) && run.evidence_map.length > 0
      ? run.evidence_map
      : derived.evidence_map;
  const validationChecklist =
    Array.isArray(run.validation_checklist) && run.validation_checklist.length > 0
      ? run.validation_checklist
      : derived.validation_checklist;

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="Diagnostic Interview Run"
        title={run.lead_business || run.lead_name || run.lead_email || "Anonymous run"}
        description={`Source: ${run.source} · Confidence: ${run.confidence} · AI: ${run.ai_status} · Submitted ${new Date(run.created_at).toLocaleString()}`}
      >
        <div className="mb-4">
          <Link to="/admin/diagnostic-interviews" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Back to interviews
          </Link>
        </div>

        <DomainBoundary
          scope="Admin-only review of this submitter's answers, derived evidence map, and dependency map. Use to draft or strengthen a diagnostic report."
          outOfScope="Nothing here is client-visible until packaged through the report drafts workflow. Admin notes are never shown to the client."
        />

        {/* Lead/contact */}
        <DomainSection title="Submitter">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div><span className="text-foreground/70">Name:</span> {run.lead_name ?? "—"}</div>
            <div><span className="text-foreground/70">Email:</span> {run.lead_email ?? "—"}</div>
            <div><span className="text-foreground/70">Business:</span> {run.lead_business ?? "—"}</div>
            <div><span className="text-foreground/70">Phone:</span> {run.lead_phone ?? "—"}</div>
          </div>
        </DomainSection>

        {/* Admin actions */}
        <DomainSection title="Admin review">
          <IndustryBrainContextPanel
            industry={linkedIndustry}
            surface="diagnostic_review"
            className="mb-4"
          />
          <IndustryEmphasisPanel
            industry={linkedIndustry}
            surface="diagnostic_review"
            className="mb-4"
          />
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Status</label>
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  className="w-full rounded-md border border-border bg-card/50 px-3 h-9 text-sm text-foreground"
                >
                  <option value="new">new</option>
                  <option value="reviewed">reviewed</option>
                  <option value="converted">converted</option>
                  <option value="archived">archived</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Link to customer (optional)</label>
                <EligibleCustomerSelect
                  value={linkCustomerId}
                  onChange={setLinkCustomerId}
                  runMode="any_eligible"
                  placeholder="— None —"
                  selectClassName="w-full rounded-md border border-border bg-card/50 px-3 h-9 text-sm text-foreground"
                  testIdPrefix="diagnostic-interview-link-customer"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                Admin notes — internal only, never shown to the client
              </label>
              <textarea
                rows={3}
                maxLength={8000}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                className="w-full rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={saveNotes} disabled={savingNotes} className="btn-primary inline-flex disabled:opacity-50">
                {savingNotes ? "Saving…" : "Save"}
              </button>
              <button onClick={generateReportDraft} className="px-3 h-9 rounded-md border border-border text-sm text-foreground hover:bg-card/40">
                Generate report draft from this interview
              </button>
            </div>
          </div>
        </DomainSection>

        {/* Admin Brief */}
        <DomainSection title="Admin Diagnostic Brief">
          <div className="space-y-3 text-sm">
            <BriefList label="Business claims" items={brief.business_claims} />
            <BriefList label="Likely true signals" items={brief.likely_true_signals} />
            <BriefList label="Unsupported claims" items={brief.unsupported_claims} />
            <BriefList label="Contradictions" items={brief.contradictions} />
            <BriefList label="Suspected system breaks" items={brief.suspected_system_breaks} />
            <BriefList label="Evidence requested" items={brief.evidence_requested} />
            <BriefList label="Recommended diagnostic agenda" items={brief.recommended_diagnostic_agenda} />
            {brief.confidence_notes && (
              <div className="text-xs text-muted-foreground italic">{brief.confidence_notes}</div>
            )}
            {brief.next_best_rgs_action && (
              <div className="rounded-md border border-primary/30 bg-primary/5 text-foreground p-3 text-sm">
                <span className="text-xs uppercase tracking-wider text-primary">Next best RGS action: </span>
                {brief.next_best_rgs_action}
              </div>
            )}
          </div>
        </DomainSection>

        {/* System Dependency Map */}
        <DomainSection title="System Dependency Map">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {systemDependencyMap.map((g: any) => (
              <div key={g.key} className={`rounded-lg border p-3 text-xs ${STRENGTH_TONE[g.current_strength] ?? STRENGTH_TONE.unknown}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-foreground">{g.label}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-80">{g.current_strength}</div>
                </div>
                <div className="text-foreground/80 mb-1">{g.suspected_weak_point}</div>
                <div className="text-muted-foreground">{g.downstream_effect}</div>
                <div className="text-[10px] text-muted-foreground mt-1">RGS would inspect: {g.rgs_should_inspect}</div>
              </div>
            ))}
          </div>
        </DomainSection>

        {/* Evidence Map */}
        <DomainSection title="Evidence Map">
          <div className="space-y-3">
            {evidenceMap.map((item: any) => (
              <div key={item.id} className="rounded-lg border border-border bg-card/60 p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-muted-foreground">{item.area_label}</div>
                  <div className="flex items-center gap-2">
                    <EvidenceTierBadge
                      from={{
                        // Interview-derived claims are owner-reported by
                        // default unless an admin has explicitly noted
                        // otherwise or the supporting evidence is empty.
                        source: "interview",
                        supporting_evidence: item.supporting_evidence,
                        missing_evidence: item.missing_evidence,
                      }}
                    />
                    <div className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                      {item.confidence}
                    </div>
                  </div>
                </div>
                <div className="text-foreground font-medium mb-2">{item.claim}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div><span className="text-foreground/70">Supporting:</span> {item.supporting_evidence}</div>
                  <div><span className="text-foreground/70">Missing:</span> {item.missing_evidence}</div>
                  <div><span className="text-foreground/70">Contradiction risk:</span> {item.contradiction_risk}</div>
                  <div><span className="text-foreground/70">Owner-dependency:</span> {item.owner_dependency_signal}</div>
                  <div className="md:col-span-2"><span className="text-foreground/70">Validate with:</span> {item.validation_source_needed}</div>
                  {item.admin_notes && (
                    <div className="md:col-span-2 text-amber-200/80"><span className="text-foreground/70">Admin note:</span> {item.admin_notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DomainSection>

        {/* Validation Checklist */}
        <DomainSection title="Validation Checklist">
          <ul className="space-y-2">
            {validationChecklist.map((c: any) => (
              <li key={c.id} className="rounded-md border border-border bg-card/40 p-3 text-sm">
                <div className="text-foreground">{c.document}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.why_it_matters}</div>
              </li>
            ))}
          </ul>
        </DomainSection>

        {/* Raw answers */}
        <DomainSection title="Raw answers">
          <div className="space-y-4 text-sm">
            {AREAS.map((a) => (
              <div key={a.key}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{a.label}</div>
                <div className="space-y-2">
                  {questionsByArea[a.key].map((q) => {
                    const ans = (run.answers?.[q.id] ?? "").trim();
                    const clarifications = clarificationsFor(q, ans);
                    const isWeak = clarifications.length > 0;
                    return (
                      <div key={q.id} className="rounded-md border border-border bg-card/30 p-3">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="text-xs text-foreground/80">{q.prompt}</div>
                          {isWeak && (
                            <span className="shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-400/30 bg-amber-400/5 text-amber-200">
                              Weak / vague
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {ans || "—"}
                        </div>
                        {isWeak && (
                          <div className="mt-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5">
                            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 mb-1">
                              Admin · clarifications that would have strengthened this
                            </div>
                            <ul className="space-y-0.5 text-[11px] text-muted-foreground leading-relaxed">
                              {clarifications.map((c) => (
                                <li key={c} className="flex gap-2">
                                  <span className="text-primary/60">·</span>
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}

function BriefList({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <ul className="list-disc list-inside text-sm text-foreground/90 space-y-1">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
