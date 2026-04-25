import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AREAS,
  QUESTIONS,
  buildInterviewOutputs,
  emptyAnswers,
  answeredCount,
  clarificationsFor,
  type AnswerMap,
  type InterviewOutputs,
  type AreaKey,
  INTERVIEW_VERSION,
} from "@/lib/diagnosticInterview/engine";

type Step = "intro" | "lead" | "questions" | "submitting" | "result";

interface Lead {
  name: string;
  email: string;
  business: string;
  phone: string;
}

const emptyLead: Lead = { name: "", email: "", business: "", phone: "" };

const STRENGTH_TONE: Record<string, string> = {
  weak: "text-rose-300 border-rose-400/30 bg-rose-400/5",
  mixed: "text-amber-200 border-amber-400/30 bg-amber-400/5",
  strong: "text-emerald-300 border-emerald-400/30 bg-emerald-400/5",
  unknown: "text-muted-foreground border-border bg-muted/20",
};

const CONFIDENCE_TONE: Record<string, string> = {
  low: "text-rose-300 border-rose-400/30 bg-rose-400/5",
  medium: "text-amber-200 border-amber-400/30 bg-amber-400/5",
  high: "text-emerald-300 border-emerald-400/30 bg-emerald-400/5",
};

const DiagnosticInterviewPage = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const fromScorecard = params.get("from") === "scorecard";

  const [step, setStep] = useState<Step>("intro");
  const [lead, setLead] = useState<Lead>(emptyLead);
  const [areaIdx, setAreaIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>(() => emptyAnswers());
  const [outputs, setOutputs] = useState<InterviewOutputs | null>(null);

  const currentArea = AREAS[areaIdx];
  const areaQuestions = useMemo(
    () => QUESTIONS.filter((q) => q.area === currentArea.key),
    [currentArea.key],
  );

  const totalAnswered = answeredCount(answers);
  const leadValid = (user || (lead.name.trim() && lead.email.trim() && lead.email.includes("@")));

  function startInterview() {
    if (user) {
      setStep("questions");
    } else {
      setStep("lead");
    }
  }

  function next() {
    if (areaIdx < AREAS.length - 1) {
      setAreaIdx((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      submit();
    }
  }

  function back() {
    if (areaIdx > 0) {
      setAreaIdx((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (!user) {
      setStep("lead");
    } else {
      setStep("intro");
    }
  }

  async function submit() {
    setStep("submitting");
    try {
      const built = buildInterviewOutputs(answers);
      // Try to link to a customer record if signed in
      let linkedCustomerId: string | null = null;
      if (user) {
        const { data: cust } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        linkedCustomerId = cust?.id ?? null;
      }
      const source = user
        ? "client"
        : fromScorecard
        ? "scorecard"
        : "anonymous";

      const insertPayload: Record<string, unknown> = {
        source,
        submitted_by: user?.id ?? null,
        // RLS public-insert policy requires customer_id IS NULL on insert.
        // Admins can link to a customer after review.
        customer_id: null,
        lead_name: user ? null : lead.name.trim() || null,
        lead_email: user ? user.email ?? null : lead.email.trim() || null,
        lead_business: user ? null : lead.business.trim() || null,
        lead_phone: user ? null : lead.phone.trim() || null,
        answers,
        evidence_map: built.evidence_map,
        system_dependency_map: built.system_dependency_map,
        validation_checklist: built.validation_checklist,
        admin_brief: built.admin_brief,
        missing_information: built.missing_information,
        confidence: built.confidence,
        ai_status: "not_run",
        status: "new",
      };
      const { error } = await supabase
        .from("diagnostic_interview_runs")
        .insert(insertPayload as never);
      if (error) throw error;

      // If signed-in client, attempt a follow-up admin-only link by storing
      // a hint via existing activity_log channel — admins can review and
      // link the run to the customer record from the admin surface.
      if (linkedCustomerId) {
        // best-effort; ignore failures
        await supabase.from("activity_log").insert({
          action: "diagnostic_interview_submitted",
          customer_id: linkedCustomerId,
          details: { interview_version: INTERVIEW_VERSION, confidence: built.confidence },
        }).then(() => undefined, () => undefined);
      }

      setOutputs(built);
      setStep("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast.error("We couldn't save your interview. Please try again.");
      setStep("questions");
    }
  }

  return (
    <Layout>
      <SEO
        title="Business Systems Diagnostic Interview — RGS"
        description="A deeper guided interview that turns your answers into an Evidence Map, System Dependency Map, Validation Checklist, and Admin Brief."
        canonical="/diagnostic-interview"
      />
      {step === "intro" && (
        <Section className="pt-24">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary mb-4">
              <ShieldCheck size={14} /> Preliminary investigation — not a final diagnosis
            </div>
            <h1 className="font-display text-4xl md:text-5xl text-foreground mb-4">
              Business Systems Diagnostic Interview
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The scorecard rates your business. This goes deeper. We'll walk you
              through how your business actually runs, what you believe is happening,
              and what evidence supports it — then build an Evidence Map, System
              Dependency Map, and a Validation Checklist of what RGS would look at first.
            </p>
            <div className="rounded-xl border border-border bg-card/70 p-5 text-left text-sm text-muted-foreground space-y-2 mb-6">
              <p><strong className="text-foreground">10 areas</strong> — about 10–15 minutes.</p>
              <p><strong className="text-foreground">Plain-language questions</strong> — answer with as much detail as you can.</p>
              <p><strong className="text-foreground">No final diagnosis.</strong> Outputs are framed as preliminary signals.</p>
              <p><strong className="text-foreground">Stronger detail = higher confidence</strong> in the Evidence Map.</p>
            </div>
            <button onClick={startInterview} className="btn-primary inline-flex">
              Start the interview <ArrowRight size={16} />
            </button>
          </div>
        </Section>
      )}

      {step === "lead" && (
        <Section className="pt-24">
          <div className="max-w-xl mx-auto">
            <h2 className="font-display text-2xl text-foreground mb-4">Who is taking the interview?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              We use this to associate your answers with you. We'll never share or publish your answers.
            </p>
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-foreground"
                placeholder="Your name"
                value={lead.name}
                maxLength={200}
                onChange={(e) => setLead({ ...lead, name: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-foreground"
                placeholder="Email"
                type="email"
                value={lead.email}
                maxLength={255}
                onChange={(e) => setLead({ ...lead, email: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-foreground"
                placeholder="Business name (optional)"
                value={lead.business}
                maxLength={200}
                onChange={(e) => setLead({ ...lead, business: e.target.value })}
              />
              <input
                className="w-full rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-foreground"
                placeholder="Phone (optional)"
                value={lead.phone}
                maxLength={50}
                onChange={(e) => setLead({ ...lead, phone: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between mt-6">
              <button onClick={() => setStep("intro")} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={() => setStep("questions")}
                disabled={!leadValid}
                className="btn-primary inline-flex disabled:opacity-50"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Section>
      )}

      {step === "questions" && (
        <Section className="pt-24">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
              <span>Area {areaIdx + 1} of {AREAS.length}</span>
              <span>{totalAnswered} of {QUESTIONS.length} answered</span>
            </div>
            <div className="h-1 rounded-full bg-muted/40 mb-6 overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((areaIdx + 1) / AREAS.length) * 100}%` }}
              />
            </div>
            <h2 className="font-display text-2xl text-foreground mb-1">{currentArea.label}</h2>
            <p className="text-sm text-muted-foreground mb-6">{currentArea.intro}</p>

            <div className="space-y-5">
              {areaQuestions.map((q) => (
                <div key={q.id} className="rounded-lg border border-border bg-card/50 p-4">
                  <label className="block text-sm text-foreground mb-1">{q.prompt}</label>
                  {q.hint && <p className="text-xs text-muted-foreground mb-2">{q.hint}</p>}
                  <textarea
                    rows={3}
                    maxLength={2000}
                    placeholder={q.placeholder ?? "Type your answer…"}
                    className="w-full rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-foreground"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {answers[q.id]?.trim().length ?? 0} chars · more detail = higher confidence
                  </p>
                  {(() => {
                    const prompts = clarificationsFor(q, answers[q.id]).slice(0, 3);
                    if (prompts.length === 0) return null;
                    return (
                      <div className="mt-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 mb-1">
                          To strengthen this answer
                        </div>
                        <ul className="space-y-0.5 text-[11px] text-muted-foreground leading-relaxed">
                          {prompts.map((p) => (
                            <li key={p} className="flex gap-2">
                              <span className="text-primary/60">·</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6">
              <button onClick={back} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Back
              </button>
              <button onClick={next} className="btn-primary inline-flex">
                {areaIdx < AREAS.length - 1 ? "Next area" : "Submit"} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Section>
      )}

      {step === "submitting" && (
        <Section className="pt-24">
          <div className="max-w-xl mx-auto text-center text-muted-foreground">
            <Loader2 className="animate-spin mx-auto mb-3" />
            Building your Evidence Map…
          </div>
        </Section>
      )}

      {step === "result" && outputs && (
        <Section className="pt-24">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center">
              <CheckCircle2 className="mx-auto text-emerald-300 mb-2" />
              <h1 className="font-display text-3xl text-foreground mb-2">
                Preliminary Evidence Map
              </h1>
              <p className="text-sm text-muted-foreground">
                These are signals — not a final diagnosis. RGS would validate them
                against your real books, CRM, payroll, or job system before recommending
                what to fix first.
              </p>
              <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs ${CONFIDENCE_TONE[outputs.confidence]}`}>
                Overall confidence: {outputs.confidence}
              </div>
            </div>

            {/* Evidence Map */}
            <div>
              <h2 className="font-display text-xl text-foreground mb-3">Evidence Map</h2>
              <div className="space-y-3">
                {outputs.evidence_map.length === 0 && (
                  <div className="text-sm text-muted-foreground border border-border rounded-md p-4">
                    Not enough detail to form claims. Adding more answers would build a stronger map.
                  </div>
                )}
                {outputs.evidence_map.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-card/60 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-muted-foreground">{item.area_label}</div>
                      <div className={`text-[10px] px-2 py-0.5 rounded-full border ${CONFIDENCE_TONE[item.confidence]}`}>
                        {item.confidence} confidence
                      </div>
                    </div>
                    <div className="text-sm text-foreground font-medium mb-2">{item.claim}</div>
                    <div className="text-xs text-muted-foreground italic mb-2">{item.client_safe_summary}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div><span className="text-foreground/70">Missing evidence:</span> {item.missing_evidence}</div>
                      <div><span className="text-foreground/70">Validate with:</span> {item.validation_source_needed}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Dependency Map */}
            <div>
              <h2 className="font-display text-xl text-foreground mb-3">System Dependency Map</h2>
              <p className="text-xs text-muted-foreground mb-3">
                demand → sales → delivery → cash → labor → owner capacity
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {outputs.system_dependency_map.map((g) => (
                  <div key={g.key} className={`rounded-lg border p-3 text-xs ${STRENGTH_TONE[g.current_strength]}`}>
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
            </div>

            {/* Validation Checklist */}
            <div>
              <h2 className="font-display text-xl text-foreground mb-3">What RGS would validate first</h2>
              <ul className="space-y-2">
                {outputs.validation_checklist.map((c) => (
                  <li key={c.id} className="rounded-md border border-border bg-card/50 p-3 text-sm">
                    <div className="text-foreground">{c.document}</div>
                    <div className="text-xs text-muted-foreground mt-1">{c.why_it_matters}</div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Missing info */}
            {outputs.missing_information.length > 0 && (
              <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-4">
                <div className="flex items-center gap-2 text-amber-200 text-xs mb-2">
                  <AlertTriangle size={14} /> Missing information narrowed our confidence
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {outputs.missing_information.map((m, i) => (
                    <li key={i}><strong className="text-foreground/80">{m.area_label}:</strong> {m.what_is_missing}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="rounded-xl border border-border bg-card/70 p-6 text-center">
              <h3 className="font-display text-xl text-foreground mb-2">Want RGS to validate this?</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-xl mx-auto leading-relaxed">
                The RGS Diagnostic validates these signals against your real revenue,
                cash, and operating data — and tells you exactly what to fix first.
              </p>
              <Link to="/diagnostic" className="btn-primary inline-flex">
                Start a Diagnostic <ArrowRight size={16} />
              </Link>
            </div>

            <p className="text-[11px] text-muted-foreground/60 leading-relaxed text-center max-w-xl mx-auto">
              Preliminary evidence map generated deterministically from your answers
              ({INTERVIEW_VERSION}). Not a final diagnosis. Not legal, tax, or financial advice.
            </p>
          </div>
        </Section>
      )}
    </Layout>
  );
};

export default DiagnosticInterviewPage;
