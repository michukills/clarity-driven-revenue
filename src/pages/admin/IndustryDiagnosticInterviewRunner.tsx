/**
 * P93E-E2G — Live admin interview runner.
 * Reads the industry-specific script and captures structured owner answers.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection, DomainBoundary } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  getBank, questionsByGear, GEAR_LABELS, INDUSTRY_LABELS, CONFIDENCE_LABELS, EVIDENCE_LABELS,
  STATUS_LABELS, PROMPT_KIND_LABELS, effectivePromptKind,
  type IndustryKey, type DiagnosticQuestion, type ConfidenceLevel,
  type EvidenceState, type ResponseStatus,
} from "@/lib/industryDiagnostic";

interface Session {
  id: string; customer_id: string; industry_key: IndustryKey; status: string;
  started_at: string; completed_at: string | null; admin_notes: string | null; summary: string | null;
}
interface Response {
  id?: string; session_id: string; question_key: string;
  status: ResponseStatus; notes: string | null;
  exact_value: number | null; estimated_value: number | null;
  low_value: number | null; high_value: number | null;
  seasonal_low: number | null; seasonal_high: number | null;
  seasonal_notes: string | null;
  confidence: ConfidenceLevel; evidence_state: EvidenceState;
  evidence_requested_text: string | null; admin_observation: string | null;
  follow_up_needed: boolean; repair_map_signal_triggered: boolean;
}

const blankResponse = (sessionId: string, key: string): Response => ({
  session_id: sessionId, question_key: key,
  status: "answered", notes: "",
  exact_value: null, estimated_value: null, low_value: null, high_value: null,
  seasonal_low: null, seasonal_high: null, seasonal_notes: null,
  confidence: "owner_estimated", evidence_state: "not_requested",
  evidence_requested_text: null, admin_observation: null,
  follow_up_needed: false, repair_map_signal_triggered: false,
});

export default function IndustryDiagnosticInterviewRunner() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: s }, { data: r }] = await Promise.all([
        supabase.from("industry_diagnostic_sessions").select("*").eq("id", id).maybeSingle(),
        supabase.from("industry_diagnostic_responses").select("*").eq("session_id", id),
      ]);
      setSession(s as Session | null);
      const map: Record<string, Response> = {};
      for (const row of (r as Response[]) ?? []) map[row.question_key] = row;
      setResponses(map);
      setLoading(false);
    })();
  }, [id]);

  const bank = useMemo(() => session ? getBank(session.industry_key) : null, [session]);
  const grouped = useMemo(() => bank ? questionsByGear(bank) : new Map(), [bank]);

  function get(qkey: string): Response {
    return responses[qkey] ?? blankResponse(id!, qkey);
  }

  function patch(qkey: string, p: Partial<Response>) {
    setResponses((cur) => ({ ...cur, [qkey]: { ...get(qkey), ...p } }));
  }

  async function save(q: DiagnosticQuestion) {
    if (!session) return;
    const r = get(q.key);
    setSavingKey(q.key);
    const payload = {
      session_id: session.id, question_key: q.key,
      status: r.status, notes: r.notes || null,
      exact_value: r.exact_value, estimated_value: r.estimated_value,
      low_value: r.low_value, high_value: r.high_value,
      seasonal_low: r.seasonal_low, seasonal_high: r.seasonal_high,
      seasonal_notes: r.seasonal_notes || null,
      confidence: r.confidence, evidence_state: r.evidence_state,
      evidence_requested_text: r.evidence_requested_text || null,
      admin_observation: r.admin_observation || null,
      follow_up_needed: r.follow_up_needed,
      repair_map_signal_triggered: r.repair_map_signal_triggered,
      repair_map_signals: q.repair_map_signal && r.repair_map_signal_triggered
        ? [{ signal: q.repair_map_signal, gear: q.gear, question_key: q.key }]
        : [],
    };
    const { data, error } = await supabase
      .from("industry_diagnostic_responses")
      .upsert(payload as never, { onConflict: "session_id,question_key" })
      .select("*").single();
    setSavingKey(null);
    if (error) { toast.error(error.message); return; }
    setResponses((cur) => ({ ...cur, [q.key]: data as Response }));
    toast.success("Saved.");
  }

  async function setSessionStatus(status: string) {
    if (!session) return;
    const updates: Record<string, unknown> = { status };
    if (status === "completed") updates.completed_at = new Date().toISOString();
    const { error } = await supabase.from("industry_diagnostic_sessions")
      .update(updates as never).eq("id", session.id);
    if (error) { toast.error(error.message); return; }
    setSession({ ...session, status, completed_at: status === "completed" ? new Date().toISOString() : session.completed_at });
    toast.success(`Marked ${status}.`);
  }

  if (loading) return <PortalShell variant="admin"><div className="p-6 text-xs text-muted-foreground">Loading…</div></PortalShell>;
  if (!session || !bank) return <PortalShell variant="admin"><div className="p-6 text-xs text-muted-foreground">Session not found.</div></PortalShell>;

  const totalQs = bank.questions.length;
  const answered = Object.values(responses).filter((r) => r.status === "answered").length;
  const followups = Object.values(responses).filter((r) => r.follow_up_needed).length;

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="Live Diagnostic Interview"
        title={INDUSTRY_LABELS[session.industry_key]}
        description={`Status: ${session.status} · Started ${new Date(session.started_at).toLocaleString()} · ${answered}/${totalQs} answered · ${followups} follow-ups`}
      >
        <div className="mb-4 flex items-center justify-between">
          <Link to="/admin/industry-interviews" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Back to interviews
          </Link>
          <div className="flex items-center gap-2">
            {session.status !== "paused" && (
              <button onClick={() => setSessionStatus("paused")} className="px-3 h-8 rounded-md border border-border text-xs text-foreground hover:bg-card/40">Pause</button>
            )}
            {session.status === "paused" && (
              <button onClick={() => setSessionStatus("in_progress")} className="px-3 h-8 rounded-md border border-border text-xs text-foreground hover:bg-card/40">Resume</button>
            )}
            <button onClick={() => setSessionStatus("completed")} className="btn-primary inline-flex h-8 text-xs">Mark complete</button>
          </div>
        </div>

        <DomainBoundary
          scope="Admin reads each plain-English question to the owner during the call and captures their answer with confidence, evidence state, and repair-map flags."
          outOfScope="Nothing here is client-visible. Repair-map signals feed downstream RGS engines but never bypass deterministic scoring."
        />

        {bank.disclaimer && (
          <div className="mb-4 rounded-md border border-amber-400/30 bg-amber-400/5 text-amber-100 text-xs p-3">{bank.disclaimer}</div>
        )}

        {Array.from(grouped.entries()).map(([gear, qs]) => (
          <DomainSection key={gear} title={GEAR_LABELS[gear as keyof typeof GEAR_LABELS] ?? gear} subtitle={`${(qs as DiagnosticQuestion[]).length} prompts`}>
            <div className="space-y-3">
              {(qs as DiagnosticQuestion[]).map((q) => {
                const r = get(q.key);
                const cap = q.capture;
                return (
                  <div key={q.key} className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
                    <div>
                      <div className="flex flex-wrap gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider">
                        <span className={`px-1.5 py-0.5 rounded border ${
                          effectivePromptKind(q) === "conditional_deep_dive"
                            ? "border-amber-400/40 text-amber-200"
                            : effectivePromptKind(q) === "evidence_source_of_truth"
                            ? "border-primary/40 text-primary"
                            : "border-border text-muted-foreground"
                        }`}>
                          {PROMPT_KIND_LABELS[effectivePromptKind(q)]}
                        </span>
                        {q.trigger_when && (
                          <span className="px-1.5 py-0.5 rounded border border-amber-400/30 text-amber-200 normal-case tracking-normal">
                            Open when: {q.trigger_when}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-foreground leading-snug">{q.plain_language_question}</div>
                      {q.business_term && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          <span className="text-foreground/70">Business term:</span> {q.business_term}
                        </div>
                      )}
                      {q.helper_text && (
                        <div className="text-[11px] text-muted-foreground italic mt-1">{q.helper_text}</div>
                      )}
                      {q.admin_interpretation && (
                        <div className="text-[11px] text-amber-100/80 mt-1">
                          <span className="uppercase tracking-wider text-[10px] text-amber-200/80">Admin interpretation:</span>{" "}
                          {q.admin_interpretation}
                        </div>
                      )}
                      {(q.report_finding_seed || q.repair_map_trigger_seed) && (
                        <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                          {q.report_finding_seed && (
                            <div><span className="text-foreground/70">Report seed:</span> {q.report_finding_seed}</div>
                          )}
                          {q.repair_map_trigger_seed && (
                            <div><span className="text-foreground/70">Repair-map seed:</span> {q.repair_map_trigger_seed}</div>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded border border-border">Gear: {q.gear}</span>
                        {q.source_of_truth_guidance && (
                          <span className="px-1.5 py-0.5 rounded border border-border">Source: {q.source_of_truth_guidance}</span>
                        )}
                        {q.repair_map_signal && (
                          <span className="px-1.5 py-0.5 rounded border border-amber-400/30 text-amber-200">Signal: {q.repair_map_signal}</span>
                        )}
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      placeholder="Owner's answer (notes)…"
                      value={r.notes ?? ""}
                      onChange={(e) => patch(q.key, { notes: e.target.value })}
                      className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-foreground"
                    />

                    {(cap.exact_value || cap.estimated_value || cap.range || cap.seasonal) && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {cap.exact_value && (
                          <NumField label="Exact value" value={r.exact_value} onChange={(v) => patch(q.key, { exact_value: v })} />
                        )}
                        {cap.estimated_value && (
                          <NumField label="Estimated" value={r.estimated_value} onChange={(v) => patch(q.key, { estimated_value: v })} />
                        )}
                        {cap.range && (
                          <>
                            <NumField label="Low" value={r.low_value} onChange={(v) => patch(q.key, { low_value: v })} />
                            <NumField label="High" value={r.high_value} onChange={(v) => patch(q.key, { high_value: v })} />
                          </>
                        )}
                        {cap.seasonal && (
                          <>
                            <NumField label="Seasonal low" value={r.seasonal_low} onChange={(v) => patch(q.key, { seasonal_low: v })} />
                            <NumField label="Seasonal high" value={r.seasonal_high} onChange={(v) => patch(q.key, { seasonal_high: v })} />
                          </>
                        )}
                      </div>
                    )}

                    {cap.seasonal && (
                      <input
                        type="text" placeholder="Seasonal notes (e.g. peak Jun-Aug)"
                        value={r.seasonal_notes ?? ""}
                        onChange={(e) => patch(q.key, { seasonal_notes: e.target.value })}
                        className="w-full rounded-md border border-border bg-background/60 px-3 py-1.5 text-xs text-foreground"
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <Select label="Status" value={r.status} onChange={(v) => patch(q.key, { status: v as ResponseStatus })} options={STATUS_LABELS} />
                      <Select label="Confidence" value={r.confidence} onChange={(v) => patch(q.key, { confidence: v as ConfidenceLevel })} options={CONFIDENCE_LABELS} />
                      <Select label="Evidence" value={r.evidence_state} onChange={(v) => patch(q.key, { evidence_state: v as EvidenceState })} options={EVIDENCE_LABELS} />
                    </div>

                    {q.evidence_prompt && (
                      <input
                        type="text" placeholder={`Evidence to request: ${q.evidence_prompt}`}
                        value={r.evidence_requested_text ?? ""}
                        onChange={(e) => patch(q.key, { evidence_requested_text: e.target.value })}
                        className="w-full rounded-md border border-border bg-background/60 px-3 py-1.5 text-xs text-foreground"
                      />
                    )}

                    <textarea
                      rows={2}
                      placeholder="Admin observation (internal only — never shown to client)…"
                      value={r.admin_observation ?? ""}
                      onChange={(e) => patch(q.key, { admin_observation: e.target.value })}
                      className="w-full rounded-md border border-border bg-background/60 px-3 py-1.5 text-xs text-amber-100/90"
                    />

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <input type="checkbox" checked={r.follow_up_needed}
                          onChange={(e) => patch(q.key, { follow_up_needed: e.target.checked })} />
                        Follow-up needed
                      </label>
                      {q.repair_map_signal && (
                        <label className="inline-flex items-center gap-1.5 text-amber-200">
                          <input type="checkbox" checked={r.repair_map_signal_triggered}
                            onChange={(e) => patch(q.key, { repair_map_signal_triggered: e.target.checked })} />
                          Trigger signal: {q.repair_map_signal}
                        </label>
                      )}
                      <div className="ml-auto">
                        <button onClick={() => save(q)} disabled={savingKey === q.key}
                          className="px-3 h-8 rounded-md border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50">
                          {savingKey === q.key ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DomainSection>
        ))}
      </DomainShell>
    </PortalShell>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-0.5">{label}</span>
      <input type="number" inputMode="decimal" value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full rounded-md border border-border bg-background/60 px-2 h-8 text-xs text-foreground" />
    </label>
  );
}

function Select<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: Record<string, string>;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-0.5">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-md border border-border bg-background/60 px-2 h-8 text-xs text-foreground">
        {Object.entries(options).map(([k, lbl]) => (<option key={k} value={k}>{lbl}</option>))}
      </select>
    </label>
  );
}
