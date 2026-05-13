import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, MessageSquare, Sparkles, ShieldCheck, Loader2, AlertTriangle, Info } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PILLARS,
  emptyAnswers,
  scoreScorecard,
  flattenAnswers,
  RUBRIC_VERSION,
  scoreAnswer,
  scorePillar,
  clarifyForAnswer,
  type PillarId,
  type ScorecardResult,
} from "@/lib/scorecard/rubric";
import {
  mapIntakeToIndustry,
  type IntakeBusinessModel,
} from "@/lib/industryIntake";

type Step = "intro" | "lead" | "questions" | "submitting" | "result";

interface Lead {
  first_name: string;
  last_name: string;
  email: string;
  business_name: string;
  role: string;
  phone: string;
  business_model: IntakeBusinessModel | "";
  is_regulated_mmj: boolean;
  email_consent: boolean;
}

const emptyLead: Lead = {
  first_name: "",
  last_name: "",
  email: "",
  business_name: "",
  role: "",
  phone: "",
  business_model: "",
  is_regulated_mmj: false,
  email_consent: true,
};

const BAND_TONE: Record<number, string> = {
  1: "text-rose-300 border-rose-400/30 bg-rose-400/5",
  2: "text-orange-300 border-orange-400/30 bg-orange-400/5",
  3: "text-amber-200 border-amber-400/30 bg-amber-400/5",
  4: "text-lime-300 border-lime-400/30 bg-lime-400/5",
  5: "text-emerald-300 border-emerald-400/30 bg-emerald-400/5",
};

const ScorecardPage = () => {
  const [step, setStep] = useState<Step>("intro");
  const [lead, setLead] = useState<Lead>(emptyLead);
  const [pillarIdx, setPillarIdx] = useState(0);
  const [answers, setAnswers] = useState(() => emptyAnswers());
  const [result, setResult] = useState<ScorecardResult | null>(null);
  const [showLowEvidencePrompt, setShowLowEvidencePrompt] = useState(false);
  // P27.2 — Hard duplicate-submit lock. Prevents double-insert even if a
  // user manages to click twice before the React state transition to
  // "submitting" repaints and disables the button.
  const submitLockRef = useRef(false);

  const currentPillar = PILLARS[pillarIdx];

  const leadValid =
    lead.first_name.trim() &&
    lead.last_name.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim()) &&
    lead.business_name.trim() &&
    lead.business_model;

  const totalQuestions = useMemo(
    () => PILLARS.reduce((a, p) => a + p.questions.length, 0),
    [],
  );
  const answeredCount = useMemo(() => {
    let n = 0;
    for (const p of PILLARS) {
      for (const q of p.questions) {
        if ((answers[p.id]?.[q.id] ?? "").trim().length > 0) n += 1;
      }
    }
    return n;
  }, [answers]);

  const setAnswer = (pid: PillarId, qid: string, val: string) => {
    setAnswers((prev) => ({
      ...prev,
      [pid]: { ...prev[pid], [qid]: val },
    }));
  };

  const onPillarBack = () => {
    if (pillarIdx === 0) {
      setStep("intro");
    } else {
      setPillarIdx((i) => i - 1);
    }
  };

  // P.scorecard.move-lead-capture-before-results-not-before-input —
  // After all pillars are answered we no longer submit immediately.
  // Instead we silently compute a preview (only used to decide whether to
  // warn about thin evidence) and route the user to the lead capture gate.
  // The actual score is NOT shown until lead capture submits successfully.
  const goToLeadGate = () => {
    setStep("lead");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onPillarNext = () => {
    if (pillarIdx < PILLARS.length - 1) {
      setPillarIdx((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // On final pillar: silently check overall evidence, then go to lead gate.
    const preview = scoreScorecard(answers);
    if (preview.overall_confidence === "low") {
      setShowLowEvidencePrompt(true);
      return;
    }
    goToLeadGate();
  };

  const submit = async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setStep("submitting");
    try {
      const computed = scoreScorecard(answers);
      const flat = flattenAnswers(answers);
      const intakeIndustry = mapIntakeToIndustry({
        business_model: lead.business_model || null,
        is_regulated_mmj: lead.is_regulated_mmj,
      });

      const payload = {
        first_name: lead.first_name.trim(),
        last_name: lead.last_name.trim(),
        email: lead.email.trim(),
        business_name: lead.business_name.trim(),
        role: lead.role.trim() || null,
        phone: lead.phone.trim() || null,
        source_page: "/scorecard",
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        answers: flat,
        // P32.2 — record intake industry signal. NEVER auto-confirms.
        industry_intake_value: intakeIndustry.industry,
        industry_intake_other: lead.business_model || null,
        rubric_version: RUBRIC_VERSION,
        pillar_results: computed.pillar_results,
        overall_score_estimate: computed.overall_score_estimate,
        overall_score_low: computed.overall_score_low,
        overall_score_high: computed.overall_score_high,
        overall_band: computed.overall_band,
        overall_confidence: computed.overall_confidence,
        rationale: computed.rationale,
        missing_information: computed.missing_information,
        recommended_focus: computed.recommended_focus,
        top_gaps: computed.top_gaps,
        ai_status: "not_run" as const,
        status: "new" as const,
        // P93-L — capture lead source + explicit email consent so the admin
        // pipeline can route follow-up correctly. Default consent is true
        // (the form copy already states the user agrees to be contacted),
        // but the user can opt out via the checkbox on the lead gate.
        source: "public_scorecard",
        email_consent: lead.email_consent,
      };

      // Free-safe: this is a plain anonymous insert. No AI/edge calls.
      const { data: inserted, error } = await supabase
        .from("scorecard_runs")
        .insert([payload as any])
        .select("id")
        .maybeSingle();
      if (error) {
        // P30 — server-side short-window duplicate-submit protection.
        // Surface a friendly message and allow the user to retry shortly.
        const msg = (error.message || "").toLowerCase();
        const isRateLimited =
          msg.includes("scorecard_rate_limited") ||
          msg.includes("duplicate_submission_window");
        if (isRateLimited) {
          toast.message(
            "We received your submission. Please wait a moment before trying again.",
          );
          // Release the lock so the user can retry after the short window.
          submitLockRef.current = false;
          setStep("lead");
          return;
        }
        // p.scorecard.prevent-results-reveal-on-save-failure —
        // Save failed: do NOT reveal the score. Keep the user on the lead
        // gate with their answers + contact intact, surface a calm error,
        // and release the submit lock so they can retry.
        console.error("scorecard_runs insert error", error);
        toast.error(
          "We couldn't save your scorecard yet. Please try again.",
        );
        submitLockRef.current = false;
        setStep("lead");
        return;
      }
      setResult(computed);
      setStep("result");
      window.scrollTo({ top: 0, behavior: "smooth" });

      // P93-L — fire-and-forget follow-up dispatcher. Best-effort: a
      // failure here MUST NOT block the user's result reveal. The function
      // re-reads the row server-side, sends an admin alert, and (when
      // consent is true) sends the lead a follow-up email from
      // jmchubb@revenueandgrowthsystems.com. All outcomes are recorded
      // back onto the scorecard_runs row for the admin pipeline.
      if (inserted?.id) {
        try {
          void supabase.functions.invoke("scorecard-followup", {
            body: { runId: inserted.id },
          });
        } catch (e) {
          console.warn("scorecard-followup invoke failed (non-blocking)", e);
        }
      }
    } catch (err) {
      // p.scorecard.prevent-results-reveal-on-save-failure —
      // Network or unexpected error: same fail-closed behavior. Score is
      // never shown unless the insert succeeds.
      console.error(err);
      toast.error(
        "We couldn't save your scorecard yet. Please try again.",
      );
      submitLockRef.current = false;
      setStep("lead");
    } finally {
      // Lock stays engaged ONLY on a successful save (the result step
      // unmounts the form). Failure paths above explicitly release it so
      // the user can retry without losing answers or contact fields.
    }
  };

  return (
    <Layout>
      <SEO
        title="0–1000 Business Stability Scorecard | Revenue & Growth Systems"
        description="Take the RGS Business Stability Scorecard to get a self-reported starting read on where your business may be slipping across demand, conversion, operations, financial visibility, and owner independence."
        canonical="/scorecard"
      />
      <AnimatePresence mode="wait">
        {step === "intro" && (
          <Intro key="intro" onStart={() => setStep("questions")} />
        )}
        {step === "questions" && (
          <QuestionsStep
            key={`q-${pillarIdx}`}
            pillarIdx={pillarIdx}
            answers={answers}
            setAnswer={setAnswer}
            answeredCount={answeredCount}
            totalQuestions={totalQuestions}
            onBack={onPillarBack}
            onNext={onPillarNext}
          />
        )}
        {step === "lead" && (
          <LeadStep
            key="lead"
            lead={lead}
            setLead={setLead}
            valid={!!leadValid}
            onBack={() => setStep("questions")}
            onNext={() => void submit()}
          />
        )}
        {step === "submitting" && <Submitting key="sub" />}
        {step === "result" && result && <ResultStep key="result" result={result} />}
      </AnimatePresence>
      {showLowEvidencePrompt && (
        <LowEvidencePrompt
          onSubmitAnyway={() => {
            setShowLowEvidencePrompt(false);
            goToLeadGate();
          }}
          onReview={() => setShowLowEvidencePrompt(false)}
        />
      )}
    </Layout>
  );
};

export default ScorecardPage;

/* ------------- Step components ------------- */

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
    >
      <Section className="pt-32">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary mb-6">
            <Sparkles size={12} /> Self-reported · Preliminary
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4 leading-[1.1]">
            RGS Business Scorecard
          </h1>
          <p className="text-xl text-muted-foreground mb-4 leading-relaxed">
            A 0–1000 system check on the five places revenue usually starts to
            slip — not a personality quiz or a motivational assessment. Answer
            a few plain-language questions in your own words and get a
            self-reported read on where your business looks stable and where
            it may be slipping.
          </p>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            No login. No vague 1–10 self-rating. RGS looks for concrete
            operating evidence — cadence, ownership, systems, numbers, and
            what breaks when pressure hits. This is a starting read, not a
            final diagnosis. Before recommending action, RGS would validate
            it against your real data.
          </p>

          <div className="premium-card hover:transform-none mb-10">
            <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
              How this works
            </p>
            <ul className="space-y-3 text-sm">
              {[
                "Tell us a bit about you and the business (no login).",
                "Write short, concrete answers for 1–2 questions per pillar.",
                "Get a preliminary 0–1,000 estimate, pillar maturity bands, and likely priority areas — based on what you reported.",
                "See what RGS would validate first in a Diagnostic, against your real revenue, cash, and operating evidence.",
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-3 text-muted-foreground leading-relaxed">
                  <span className="font-display text-xs text-primary/70 tabular-nums mt-0.5 flex-shrink-0">
                    0{i + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 pt-4 border-t border-border/30 text-xs text-muted-foreground/80 leading-relaxed flex items-start gap-2">
              <ShieldCheck size={13} className="text-primary/70 mt-0.5 flex-shrink-0" />
              Self-reported, preliminary estimate — not a final diagnosis, and not
              legal, tax, or financial advice.
            </p>
          </div>

          <button onClick={onStart} className="btn-primary group">
            Start the RGS Scorecard
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </Section>
    </motion.div>
  );
}

function LeadStep({
  lead,
  setLead,
  valid,
  onBack,
  onNext,
}: {
  lead: Lead;
  setLead: React.Dispatch<React.SetStateAction<Lead>>;
  valid: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => setLead((p) => ({ ...p, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
    >
      <Section className="pt-32">
        <div className="max-w-lg mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary mb-5">
            <CheckCircle2 size={12} /> Your scorecard is ready
          </div>
          <h2 className="font-display text-3xl font-semibold text-foreground mb-3 leading-[1.1]">
            Enter your contact details to view your read
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            Your answers are ready. Enter your contact details to see your
            0–1,000 Business Stability Score and receive a copy of the
            results. RGS uses this information to send your read and follow
            up if you want a deeper review. No spam, no resale.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) onNext();
            }}
            className="premium-card hover:transform-none space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First name" required value={lead.first_name} onChange={(v) => set("first_name", v)} />
              <Field label="Last name" required value={lead.last_name} onChange={(v) => set("last_name", v)} />
            </div>
            <Field label="Work email" required type="email" placeholder="you@company.com" value={lead.email} onChange={(v) => set("email", v)} />
            <Field label="Business name" required value={lead.business_name} onChange={(v) => set("business_name", v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Your role" placeholder="Owner, GM, COO…" value={lead.role} onChange={(v) => set("role", v)} />
              <Field label="Phone (optional)" type="tel" value={lead.phone} onChange={(v) => set("phone", v)} />
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-muted-foreground">
                Which best describes your business? <span className="text-primary">*</span>
              </label>
              <select
                value={lead.business_model}
                onChange={(e) => set("business_model", e.target.value as IntakeBusinessModel | "")}
                className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
                required
              >
                <option value="" disabled>Select one…</option>
                <option value="appointments_jobs">Appointments / jobs (trade or field service)</option>
                <option value="in_store_orders">In-store retail orders</option>
                <option value="restaurant_orders">Restaurant / food service orders</option>
                <option value="regulated_retail_mmj">Regulated retail (MMJ / cannabis)</option>
                <option value="general_services">General services delivered to clients</option>
                <option value="online_only">Online-only business</option>
                <option value="other_unsure">Other / not sure</option>
              </select>
              <label className="inline-flex items-center gap-2 text-[12px] text-muted-foreground pt-1">
                <input
                  type="checkbox"
                  checked={lead.is_regulated_mmj}
                  onChange={(e) => set("is_regulated_mmj", e.target.checked)}
                  className="rounded border-border"
                />
                Are you in a regulated industry such as MMJ / cannabis?
              </label>
              <p className="text-[11px] text-muted-foreground/70 leading-snug">
                We use this to route your read. It's never treated as a confirmed industry — an admin reviews before any industry-specific tools are enabled.
              </p>
            </div>

            <p className="text-[11px] text-muted-foreground/70 leading-relaxed pt-2">
              By submitting, you agree to be contacted by Revenue &amp; Growth Systems
              about your scorecard read and related services. See our Privacy Statement.
            </p>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              Your scorecard responses are used to prepare your diagnostic
              review. They are not published, sold, or used as public examples.
            </p>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="submit"
                disabled={!valid}
                className={`btn-primary ${!valid ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                View my scorecard <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      </Section>
    </motion.div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
        maxLength={250}
      />
    </div>
  );
}

function QuestionsStep({
  pillarIdx,
  answers,
  setAnswer,
  answeredCount,
  totalQuestions,
  onBack,
  onNext,
}: {
  pillarIdx: number;
  answers: ReturnType<typeof emptyAnswers>;
  setAnswer: (pid: PillarId, qid: string, val: string) => void;
  answeredCount: number;
  totalQuestions: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const pillar = PILLARS[pillarIdx];
  const isLast = pillarIdx === PILLARS.length - 1;
  const progressPct = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
    >
      <Section className="pt-32">
        <div className="max-w-2xl mx-auto">
          {/* progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              <span>
                Pillar {pillarIdx + 1} of {PILLARS.length}
              </span>
              <span>{progressPct}% answered</span>
            </div>
            <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="premium-card hover:transform-none">
            <div className="flex items-center gap-2 text-primary mb-3">
              <MessageSquare size={14} />
              <span className="text-[11px] uppercase tracking-widest font-medium">
                {pillar.title}
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-[1.15] mb-3">
              {pillar.title}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              {pillar.intro}
            </p>
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 mb-6 text-[12px] leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Describe what actually happens in your business, not what should happen.</strong>{" "}
              Be specific. The more detail you provide, the more accurate your score will be.
            </div>

            <div className="space-y-7">
              {pillar.questions.map((q, i) => {
                const val = answers[pillar.id]?.[q.id] ?? "";
                const sig = scoreAnswer(q, val);
                const guidance = guidanceFor(sig);
                const clarifications = clarifyForAnswer(val).slice(0, 2);
                const showClarify =
                  clarifications.length > 0 &&
                  (guidance.level === "thin" || guidance.level === "empty");
                return (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-foreground mb-2 leading-snug">
                      <span className="text-primary/70 mr-2 tabular-nums">Q{i + 1}.</span>
                      {q.prompt}
                    </label>
                    <textarea
                      value={val}
                      onChange={(e) => setAnswer(pillar.id, q.id, e.target.value)}
                      placeholder={q.placeholder}
                      rows={4}
                      maxLength={2000}
                      className="w-full rounded-md bg-background border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 leading-relaxed resize-y"
                    />
                    <div className="mt-1.5 flex items-start justify-between gap-3 text-[11px]">
                      <span className={`${guidance.tone} leading-relaxed`}>
                        {guidance.text}
                      </span>
                      <span className="tabular-nums text-muted-foreground/60 whitespace-nowrap">
                        {val.length}/2000
                      </span>
                    </div>
                    {showClarify && (
                      <div className="mt-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 mb-1">
                          To strengthen this answer
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

            {/* Per-pillar evidence readiness */}
            <PillarEvidenceMeter
              pillarId={pillar.id}
              answers={answers[pillar.id] ?? {}}
            />

            <div className="flex items-center justify-between gap-3 mt-10 pt-6 border-t border-border/30">
              <button
                onClick={onBack}
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button onClick={onNext} className="btn-primary group">
                {isLast ? "See my read" : "Next pillar"}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </Section>
    </motion.div>
  );
}

function Submitting() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Section className="pt-32">
        <div className="max-w-lg mx-auto text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-5" />
          <h2 className="font-display text-2xl text-foreground">Preparing your read…</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Mapping your answers across the five RGS pillars.
          </p>
        </div>
      </Section>
    </motion.div>
  );
}

/* ------------- Evidence guidance helpers ------------- */

type GuidanceLevel = "empty" | "thin" | "useful" | "strong";

function guidanceFor(sig: ReturnType<typeof scoreAnswer>): {
  level: GuidanceLevel;
  text: string;
  tone: string;
} {
  const wc = sig.word_count;
  if (wc === 0) {
    return {
      level: "empty",
      tone: "text-muted-foreground/70",
      text: "Skipping this will lower confidence and widen your score range.",
    };
  }
  if (sig.evidence === "low") {
    return {
      level: "thin",
      tone: "text-amber-300/90",
      text:
        "This answer may be too thin to trust. Add what happens, who owns it, how often it's reviewed, or what numbers you track.",
    };
  }
  if (sig.evidence === "high") {
    return {
      level: "strong",
      tone: "text-emerald-300/90",
      text: "Strong answer — includes enough detail to tighten the estimate.",
    };
  }
  return {
    level: "useful",
    tone: "text-lime-300/90",
    text: "Good — this gives the scorecard enough evidence to work with.",
  };
}

function PillarEvidenceMeter({
  pillarId,
  answers,
}: {
  pillarId: PillarId;
  answers: Record<string, string>;
}) {
  const pillar = PILLARS.find((p) => p.id === pillarId)!;
  const result = scorePillar(pillar, answers);
  const tier = result.confidence;
  const cfg =
    tier === "high"
      ? {
          label: "Strong evidence",
          tone: "text-emerald-300 border-emerald-400/30 bg-emerald-400/5",
          dot: "bg-emerald-400",
          msg: "Enough detail, ownership, and cadence to tighten this pillar's estimate.",
        }
      : tier === "medium"
      ? {
          label: "Moderate evidence",
          tone: "text-amber-200 border-amber-400/30 bg-amber-400/5",
          dot: "bg-amber-300",
          msg: "Some useful signal — adding a system, owner, or cadence would tighten the read.",
        }
      : {
          label: "Low evidence",
          tone: "text-rose-300 border-rose-400/30 bg-rose-400/5",
          dot: "bg-rose-400",
          msg: "Too thin to trust yet. Mention who owns it, how often it's reviewed, what tool is used, or numbers tracked.",
        };
  return (
    <div className={`mt-7 rounded-lg border ${cfg.tone} p-3 flex items-start gap-3`}>
      <span className={`mt-1.5 h-2 w-2 rounded-full ${cfg.dot} flex-shrink-0`} />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.18em]">{cfg.label}</div>
        <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">
          {cfg.msg}
        </p>
      </div>
    </div>
  );
}

function LowEvidencePrompt({
  onSubmitAnyway,
  onReview,
}: {
  onSubmitAnyway: () => void;
  onReview: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-md w-full rounded-xl border border-amber-400/30 bg-card p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={20} className="text-amber-300 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-display text-lg text-foreground leading-snug mb-1">
              Light on evidence
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your answers are still light on evidence, so this result will be
              less reliable. You can submit now or go back and add detail.
            </p>
          </div>
        </div>
        <div className="rounded-md border border-border/50 bg-background/40 p-3 mb-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Info size={11} /> Detail that improves confidence
          </div>
          <ul className="text-[11px] text-foreground/75 leading-relaxed space-y-1 list-disc pl-4">
            <li>Who owns the process</li>
            <li>How often it's reviewed</li>
            <li>What tool or system is used</li>
            <li>What numbers or key performance indicators (KPIs) are tracked</li>
            <li>What happens when it breaks</li>
            <li>Whether the owner is required</li>
          </ul>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onReview}
            className="text-sm px-4 h-10 rounded-md border border-border text-foreground hover:bg-muted/40 transition-colors"
          >
            Review answers
          </button>
          <button
            onClick={onSubmitAnyway}
            className="text-sm px-4 h-10 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Submit anyway
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultStep({ result }: { result: ScorecardResult }) {
  const score = result.overall_score_estimate;
  const tone = BAND_TONE[result.overall_band] ?? BAND_TONE[3];
  return _ResultStepBody({ result, score, tone });
}

function ConfidenceExplainer({
  confidence,
}: {
  confidence: "low" | "medium" | "high";
}) {
  const cfg =
    confidence === "high"
      ? {
          tone: "border-emerald-400/30 bg-emerald-400/5 text-emerald-200",
          label: "High confidence",
          msg:
            "Your answers included enough detail, ownership, cadence, and measurable evidence to tighten the estimate.",
        }
      : confidence === "medium"
      ? {
          tone: "border-amber-400/30 bg-amber-400/5 text-amber-200",
          label: "Medium confidence",
          msg:
            "Your answers gave some useful evidence, but a few areas need more detail to fully trust the read.",
        }
      : {
          tone: "border-rose-400/30 bg-rose-400/5 text-rose-200",
          label: "Low confidence",
          msg:
            "Your answers did not provide enough evidence to tightly estimate this area. Treat the score range as wide.",
        };
  return (
    <div className={`rounded-xl border ${cfg.tone} p-4 mb-6 flex items-start gap-3`}>
      <Info size={16} className="mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.18em] mb-1">
          {cfg.label}
        </div>
        <p className="text-sm text-foreground/85 leading-relaxed">{cfg.msg}</p>
      </div>
    </div>
  );
}

function _ResultStepBody({
  result,
  score,
  tone,
}: {
  result: ScorecardResult;
  score: number;
  tone: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
    >
      <Section className="pt-32">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary mb-5">
            <Sparkles size={12} /> Preliminary · Self-reported
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-3 leading-[1.1]">
            Your RGS Scorecard preliminary read
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Based on your answers, this score suggests where the business
            may be carrying instability across the five gears. This is a
            <strong className="text-foreground"> starting read, not a final diagnosis</strong>.
            The next step is to validate what is actually happening behind
            the score. A low score does not mean the business is hopeless.
            A high score does not mean the business is perfect. This
            score should help point attention, not create panic.
          </p>

          {/* Trust ladder: where this scorecard sits in the RGS evidence model */}
          <div className="rounded-xl border border-border bg-card/40 p-5 mb-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Where this read sits
            </div>
            <ol className="space-y-2 text-sm text-foreground/85 leading-relaxed">
              <li>
                <span className="font-display text-primary/80 tabular-nums mr-2">01</span>
                <strong className="text-foreground">Public scorecard</strong> — owner-reported starting signal. <em className="text-muted-foreground">You are here.</em>
              </li>
              <li>
                <span className="font-display text-primary/80 tabular-nums mr-2">02</span>
                <strong className="text-foreground">Diagnostic interview</strong> — structured evidence map with system dependencies and validation checklist.
              </li>
              <li>
                <span className="font-display text-primary/80 tabular-nums mr-2">03</span>
                <strong className="text-foreground">Reports / Revenue Control Center</strong> — evidence-over-time operating view that improves as data, check-ins, and admin review accumulate.
              </li>
            </ol>
          </div>

          {/* Overall card */}
          <div className={`rounded-xl border ${tone} p-6 mb-6`}>
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="md:border-r md:border-border/30 md:pr-6">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Estimated overall
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <div className="font-display text-5xl tabular-nums text-foreground leading-none">
                    {score}
                  </div>
                  <div className="text-sm text-muted-foreground">/ 1,000</div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                  Range {result.overall_score_low}–{result.overall_score_high}
                </div>
                <div className="mt-3 text-xs uppercase tracking-wider">
                  Confidence: {result.overall_confidence}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Maturity band
                </div>
                <div className="text-base font-medium text-foreground mb-2">
                  Band {result.overall_band} · {result.overall_band_label}
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {result.rationale}
                </p>
              </div>
            </div>
          </div>

          {/* Confidence explainer */}
          <ConfidenceExplainer confidence={result.overall_confidence} />

          {/* Pillar grid */}
          <h2 className="font-display text-xl text-foreground mb-3">Pillar maturity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {result.pillar_results.map((p) => {
              const t = BAND_TONE[p.band] ?? BAND_TONE[3];
              return (
                <div key={p.pillar_id} className={`rounded-xl border ${t} p-5`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="font-display text-base text-foreground leading-snug">
                      {p.title}
                    </div>
                    <div className="text-xs uppercase tracking-wider whitespace-nowrap">
                      Band {p.band}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {p.band_label}
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-3">
                    <div className="font-display text-2xl tabular-nums text-foreground">
                      {p.score}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      ({p.score_low}–{p.score_high}) · conf {p.confidence}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed">
                    {p.rationale}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Top gaps */}
          <h2 className="font-display text-xl text-foreground mb-3">
            Likely priority areas
          </h2>
          <div className="space-y-2 mb-8">
            {result.top_gaps.map((g, i) => (
              <div
                key={g.pillar_id}
                className="rounded-lg border border-border bg-card/60 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="font-display text-sm text-primary/80 tabular-nums mt-0.5">
                    0{i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-foreground font-medium">{g.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {g.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* What RGS would validate first */}
          <h2 className="font-display text-xl text-foreground mb-3">
            What RGS would validate first
          </h2>
          <ul className="space-y-2 mb-8">
            {result.recommended_focus.map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground/90 leading-relaxed"
              >
                <CheckCircle2 size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {/* Missing info */}
          {result.missing_information.length > 0 && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 mb-8">
              <div className="text-[10px] uppercase tracking-[0.18em] text-amber-300 mb-2">
                What we'd want more detail on
              </div>
              <ul className="space-y-1.5 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                {result.missing_information.slice(0, 6).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center">
            <h3 className="font-display text-xl text-foreground mb-2">
              The next step, if you want a deeper review
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xl mx-auto leading-relaxed">
              The Scorecard gives a self-reported starting read. The
              Diagnostic goes deeper by reviewing the information behind the
              score and identifying what needs attention first.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
              <a href="/diagnostic-interview?from=scorecard" className="btn-primary inline-flex">
                Request a Diagnostic Review <ArrowRight size={16} />
              </a>
              <a href="/diagnostic" className="px-4 h-10 inline-flex items-center gap-1 rounded-md border border-border text-sm text-foreground hover:bg-card/40">
                See How the Diagnostic Works
              </a>
            </div>
            <div className="text-[11px] text-muted-foreground mt-3">
              A low score does not mean the business is hopeless. A high score does not mean the business is perfect. The score is meant to point attention, not create panic.
            </div>
          </div>

          {/* What happens next + report/source readiness */}
          <div className="mt-6 rounded-xl border border-border bg-card/40 p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              What happens with this read
            </div>
            <ul className="text-sm text-foreground/85 leading-relaxed list-disc pl-5 space-y-1.5">
              <li>Your responses are saved as a deterministic, evidence-informed read — never an AI-generated score.</li>
              <li>RGS may use this read to draft your RGS Structural Health Report™ and 30/60/90 RGS Repair Map™ after admin review. It is not auto-published.</li>
              <li>If you become a client, this submission can be saved as a benchmark inside RGS — visible only to you and your assigned RGS reviewer.</li>
            </ul>
          </div>

          <p className="text-[11px] text-muted-foreground/60 mt-8 leading-relaxed text-center max-w-xl mx-auto">
            Self-reported, preliminary estimate generated from your answers using the
            RGS Stability rubric ({RUBRIC_VERSION}). Not a final diagnosis. Not legal,
            tax, or financial advice. RGS would validate these signals against evidence
            before recommending action.
          </p>
        </div>
      </Section>
    </motion.div>
  );
}
