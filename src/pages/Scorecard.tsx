/**
 * P93E-E2 — Public Scorecard page (v3 deterministic gears).
 *
 * Public-safe: writes scorecard_runs with rubric_version="v3_deterministic_gears".
 * v2 (`src/lib/scorecard/rubric.ts`) is preserved unchanged for historical
 * reads; new runs always go through v3.
 */
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Gauge,
} from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  GEARS_V3,
  RUBRIC_VERSION_V3,
  emptyAnswersV3,
  flattenAnswersV3,
  scoreScorecardV3,
  totalQuestionsV3,
  type GearId,
  type V3Answers,
  type V3OwnerContexts,
  type V3ScorecardResult,
} from "@/lib/scorecard/rubricV3";
import {
  classifyScorecardAnswers,
  classificationsToV3Answers,
  type ClassifierResult,
  type OwnerAnswerInput,
} from "@/lib/scorecard/classifyClient";
import {
  mapIntakeToIndustry,
  type IntakeBusinessModel,
} from "@/lib/industryIntake";

type Step = "intro" | "lead" | "questions" | "submitting" | "result";

type FollowupDispatchStatus =
  | "sent"
  | "skipped_missing_consent"
  | "skipped_missing_config"
  | "failed"
  | "not_confirmed"
  | "not_attempted";

interface FollowupDispatchState {
  status: FollowupDispatchStatus;
  runId: string | null;
  message: string;
}

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

function createScorecardRunId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

const ScorecardPage = () => {
  const [step, setStep] = useState<Step>("intro");
  const [lead, setLead] = useState<Lead>(emptyLead);
  const [gearIdx, setGearIdx] = useState(0);
  // P93E-E2D — public Scorecard now collects plain-English text per
  // question. The deterministic v3 option_ids come back from the
  // server-side classifier (`scorecard-classify`).
  const [ownerTexts, setOwnerTexts] = useState<Record<string, string>>({});
  const [classifications, setClassifications] = useState<ClassifierResult[] | null>(null);
  const [result, setResult] = useState<V3ScorecardResult | null>(null);
  const [followupDispatch, setFollowupDispatch] =
    useState<FollowupDispatchState | null>(null);
  const [showIncompletePrompt, setShowIncompletePrompt] = useState(false);
  const submitLockRef = useRef(false);

  const currentGear = GEARS_V3[gearIdx];
  const totalQuestions = useMemo(() => totalQuestionsV3(), []);

  const leadValid =
    lead.first_name.trim() &&
    lead.last_name.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim()) &&
    lead.business_name.trim() &&
    lead.business_model;

  // An answer "counts" once it has at least 12 trimmed characters — same
  // floor the server-side classifier uses to bother trying real
  // classification before falling back to conservative defaults.
  const ANSWER_MIN_CHARS = 12;
  const answeredCount = useMemo(() => {
    let n = 0;
    for (const g of GEARS_V3) {
      for (const q of g.questions) {
        const v = (ownerTexts[q.id] || "").trim();
        if (v.length >= ANSWER_MIN_CHARS) n += 1;
      }
    }
    return n;
  }, [ownerTexts]);

  const setOwnerText = (qid: string, val: string) => {
    setOwnerTexts((prev) => ({ ...prev, [qid]: val.slice(0, 1500) }));
  };

  const onPillarBack = () => {
    if (gearIdx === 0) setStep("intro");
    else setGearIdx((i) => i - 1);
  };

  const goToLeadGate = () => {
    setStep("lead");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onPillarNext = () => {
    if (gearIdx < GEARS_V3.length - 1) {
      setGearIdx((i) => i + 1);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    // Final gear: warn if many questions are unanswered.
    const unanswered = totalQuestions - answeredCount;
    if (unanswered > Math.ceil(totalQuestions * 0.3)) {
      setShowIncompletePrompt(true);
      return;
    }
    goToLeadGate();
  };

  const submit = async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setStep("submitting");
    try {
      const runId = createScorecardRunId();

      // 1) Classify owner-written answers via the server-side classifier.
      const ownerAnswers: OwnerAnswerInput[] = [];
      const contexts: V3OwnerContexts = {};
      for (const g of GEARS_V3) {
        contexts[g.id] = {};
        for (const q of g.questions) {
          const text = (ownerTexts[q.id] || "").trim();
          if (text.length > 0) {
            ownerAnswers.push({
              question_id: q.id,
              gear: g.id,
              prompt: q.prompt,
              owner_text: text,
            });
            contexts[g.id]![q.id] = text;
          }
        }
      }

      let classified: ClassifierResult[] = [];
      let classifierStatus: "ai" | "rules_fallback" | "rules" = "rules";
      if (ownerAnswers.length > 0) {
        try {
          const resp = await classifyScorecardAnswers(ownerAnswers, runId);
          classified = resp.classifications;
          classifierStatus = resp.classifier_status;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("scorecard-classify failed (non-blocking)", e);
        }
      }

      // 2) Build deterministic V3Answers from the classifier output.
      const v3Answers: V3Answers = classificationsToV3Answers(classified);
      // 3) Score deterministically — AI never assigns score values.
      const computed = scoreScorecardV3(v3Answers);
      const flat = flattenAnswersV3(v3Answers, contexts);
      // Annotate flattened rows with classifier metadata for admin review.
      const flatWithMeta = flat.map((row) => {
        const c = classified.find((x) => x.question_id === row.question_id);
        return c
          ? {
              ...row,
              owner_text: c.owner_text,
              classifier_meta: {
                classifier_type: c.classifier_type,
                confidence: c.confidence,
                rationale: c.classification_rationale,
                insufficient_detail: c.insufficient_detail,
                follow_up_question: c.follow_up_question,
              },
            }
          : row;
      });

      const intakeIndustry = mapIntakeToIndustry({
        business_model: lead.business_model || null,
        is_regulated_mmj: lead.is_regulated_mmj,
      });

      const payload = {
        id: runId,
        first_name: lead.first_name.trim(),
        last_name: lead.last_name.trim(),
        email: lead.email.trim().toLowerCase(),
        business_name: lead.business_name.trim(),
        role: lead.role.trim() || null,
        phone: lead.phone.trim() || null,
        source_page: "/scorecard",
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        answers: flatWithMeta,
        industry_intake_value: intakeIndustry.industry,
        industry_intake_other: lead.business_model || null,
        rubric_version: RUBRIC_VERSION_V3,
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
        source: "public_scorecard",
        email_consent: lead.email_consent,
      };

      const { error } = await supabase
        .from("scorecard_runs")
        .insert([payload as any]);
      if (error) {
        const msg = (error.message || "").toLowerCase();
        const isRateLimited =
          msg.includes("scorecard_rate_limited") ||
          msg.includes("duplicate_submission_window");
        if (isRateLimited) {
          toast.message(
            "We received your submission. Please wait a moment before trying again.",
          );
          submitLockRef.current = false;
          setStep("lead");
          return;
        }
        // eslint-disable-next-line no-console
        console.error("scorecard_runs insert error", error);
        toast.error("We couldn't save your scorecard yet. Please try again.");
        submitLockRef.current = false;
        setStep("lead");
        return;
      }

      let dispatchState: FollowupDispatchState = {
        status: "not_confirmed",
        runId,
        message:
          "Your scorecard was saved. RGS can review it, but automatic follow-up could not be confirmed from this browser session.",
      };
      try {
        const { data, error: followupError } = await supabase.functions.invoke(
          "scorecard-followup",
          { body: { runId } },
        );
        const followupStatus = String(
          (data as { followUpEmailStatus?: string } | null)?.followUpEmailStatus ??
            "",
        ) as FollowupDispatchStatus;
        if (followupError) {
          dispatchState = {
            status: "failed",
            runId,
            message:
              "Your scorecard was saved, but automatic follow-up could not be confirmed. RGS can still review the submission manually.",
          };
        } else if (
          followupStatus === "sent" ||
          followupStatus === "skipped_missing_consent" ||
          followupStatus === "skipped_missing_config" ||
          followupStatus === "failed"
        ) {
          dispatchState = {
            status: followupStatus,
            runId,
            message:
              followupStatus === "sent"
                ? "Your scorecard was saved and the follow-up email was sent."
                : followupStatus === "skipped_missing_consent"
                ? "Your scorecard was saved. Because email consent was not granted, RGS will not send an automated follow-up."
                : "Your scorecard was saved. Automatic follow-up needs RGS review before email delivery can be confirmed.",
          };
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("scorecard-followup invoke failed (non-blocking)", e);
        dispatchState = {
          status: "failed",
          runId,
          message:
            "Your scorecard was saved, but automatic follow-up could not be confirmed. RGS can still review the submission manually.",
        };
      }
      setFollowupDispatch(dispatchState);
      setClassifications(classified);
      void classifierStatus;
      setResult(computed);
      setStep("result");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error("We couldn't save your scorecard yet. Please try again.");
      submitLockRef.current = false;
      setStep("lead");
    }
  };

  return (
    <Layout>
      <SEO
        title="0–1000 Business Stability Scorecard | Revenue & Growth Systems"
        description="A 10–15 minute first-pass systems assessment across the five RGS gears: Demand, Conversion, Operations, Financial Visibility, and Owner Independence. Self-reported, deterministic 0–1000 score."
        canonical="/scorecard"
      />
      <AnimatePresence mode="wait">
        {step === "intro" && (
          <Intro key="intro" onStart={() => setStep("questions")} />
        )}
        {step === "questions" && (
          <QuestionsStep
            key={`q-${gearIdx}`}
            gearIdx={gearIdx}
          ownerTexts={ownerTexts}
          setOwnerText={setOwnerText}
            answeredCount={answeredCount}
            totalQuestions={totalQuestions}
          minChars={ANSWER_MIN_CHARS}
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
        {step === "result" && result && (
          <ResultStep
            key="result"
            result={result}
            classifications={classifications}
            followupDispatch={followupDispatch}
          />
        )}
      </AnimatePresence>
      {showIncompletePrompt && (
        <IncompletePrompt
          onSubmitAnyway={() => {
            setShowIncompletePrompt(false);
            goToLeadGate();
          }}
          onReview={() => setShowIncompletePrompt(false)}
        />
      )}
    </Layout>
  );

  void currentGear; // referenced via QuestionsStep
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
            <Sparkles size={12} /> Diagnostic Part 1 · Stability Assessment · 10–15 min
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4 leading-[1.1]">
            Diagnostic Part 1 — RGS Business Stability Scorecard
          </h1>
          <p className="text-xl text-muted-foreground mb-4 leading-relaxed">
            The Stability Scorecard is Part 1 of the full RGS Diagnostic.
            A structured, deterministic read across the five RGS gears:
            Demand Generation, Revenue Conversion, Operational
            Efficiency, Financial Visibility, and Owner Independence.
            Pairs with the Owner Diagnostic Interview and Evidence Review
            to produce the full Diagnostic Report and Repair Map.
          </p>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Work through the five gears of business stability. Answer each
            item in your own words — describe what actually happens today,
            the cadence, and who owns it. RGS maps your written answer to
            a fixed scoring rubric so the Scorecard produces a
            deterministic first-pass read — each gear is 0–200 and the
            overall Business Stability Score is 0–1,000. Short or unclear
            answers are interpreted conservatively. The paid Diagnostic
            goes deeper with evidence review, admin interpretation,
            contradiction checks, and repair sequencing.
          </p>

          <div className="premium-card hover:transform-none mb-10">
            <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
              How this works
            </p>
            <ul className="space-y-3 text-sm">
              {[
                "Tell us a bit about you and the business (no login).",
                "For each of ~30 items, write a short plain-English answer about how it actually works today — RGS maps it to a fixed scoring rubric.",
                "Get a deterministic 0–1,000 Business Stability Score with a 0–200 score per gear — scored by the rubric, not from AI.",
                "See your strongest gear, most slipping gear, worn-tooth signals, and what RGS would validate first in a paid Diagnostic.",
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
              Self-reported, first-pass estimate — not a final diagnosis,
              and not legal, tax, accounting, compliance, valuation, or
              investment advice. No revenue or outcome guarantees.
            </p>
          </div>

          <button onClick={onStart} className="btn-primary group">
            Begin Diagnostic Part 1
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </Section>
    </motion.div>
  );
}

function QuestionsStep({
  gearIdx,
  ownerTexts,
  setOwnerText,
  answeredCount,
  totalQuestions,
  minChars,
  onBack,
  onNext,
}: {
  gearIdx: number;
  ownerTexts: Record<string, string>;
  setOwnerText: (qid: string, val: string) => void;
  answeredCount: number;
  totalQuestions: number;
  minChars: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const gear = GEARS_V3[gearIdx];
  const isLast = gearIdx === GEARS_V3.length - 1;
  const progressPct = Math.round((answeredCount / totalQuestions) * 100);
  const gearAnsweredCount = gear.questions.filter(
    (q) => (ownerTexts[q.id] || "").trim().length >= minChars,
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
    >
      <Section className="pt-32">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              <span>
                Gear {gearIdx + 1} of {GEARS_V3.length}
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
              <Gauge size={14} />
              <span className="text-[11px] uppercase tracking-widest font-medium">
                {gear.title}
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-[1.15] mb-3">
              {gear.title}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {gear.intro}
            </p>
            <div
              data-testid="scorecard-gear-context-note"
              className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 mb-8 text-[12px] leading-relaxed text-muted-foreground"
            >
              Answer in your own words — what is actually true today, not
              what should be true. RGS maps each answer to a fixed
              deterministic scoring rubric so you get a structured first-
              pass stability read without forcing your business into a
              generic check-box format. Short or unclear answers are
              interpreted conservatively, not generously.
            </div>

            <div className="divide-y divide-border/40">
              {gear.questions.map((q, i) => (
                <TextIntakeQuestion
                  key={q.id}
                  index={i}
                  gearId={gear.id}
                  question={q}
                  value={ownerTexts[q.id] ?? ""}
                  onChange={(v) => setOwnerText(q.id, v)}
                  minChars={minChars}
                />
              ))}
            </div>

            <div className="mt-8 rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-[11px] text-muted-foreground">
              {gearAnsweredCount} of {gear.questions.length} answered in this gear.
            </div>

            <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-border/30">
              <button
                onClick={onBack}
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button onClick={onNext} className="btn-primary group">
                {isLast ? "See my read" : "Next gear"}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </Section>
    </motion.div>
  );
}

/**
 * P93E-E2D — Plain-English text intake row.
 *
 * Owner types a real answer in their own words. The server-side
 * classifier (`scorecard-classify`) maps the text to a fixed v3 rubric
 * option id. Deterministic scoring still uses that option id — the
 * classifier never assigns a score.
 */
function TextIntakeQuestion({
  index,
  gearId,
  question,
  value,
  onChange,
  minChars,
}: {
  index: number;
  gearId: GearId;
  question: { id: string; prompt: string; helper?: string };
  value: string;
  onChange: (v: string) => void;
  minChars: number;
}) {
  const groupId = `q-${gearId}-${question.id}`;
  const trimmed = value.trim();
  const isShort = trimmed.length > 0 && trimmed.length < minChars;
  void index;
  return (
    <div data-testid="text-intake-question" className="py-7 first:pt-2 last:pb-2">
      <label
        htmlFor={groupId}
        className="block text-base md:text-[17px] font-medium text-foreground leading-snug"
      >
        {question.prompt}
      </label>
      {question.helper && (
        <p className="text-[12.5px] text-muted-foreground/85 mt-1.5 leading-relaxed">
          {question.helper}
        </p>
      )}
      <textarea
        id={groupId}
        data-testid="text-intake-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe what actually happens today — the tools, cadence, who owns it, or honestly that it doesn't happen yet."
        rows={3}
        maxLength={1500}
        className="mt-4 w-full bg-background/60 border border-border/70 rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/55 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground/75">
        <span>
          {isShort
            ? `Add a bit more — short answers are interpreted conservatively (${trimmed.length}/${minChars} chars).`
            : trimmed.length === 0
            ? "Answer in your own words. Leave blank if the system isn't in place."
            : "RGS will map this to a fixed scoring rubric on submit."}
        </span>
        <span>{trimmed.length}/1500</span>
      </div>
    </div>
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
            0–1,000 Business Stability Score and gear-level read. RGS uses
            this information to send your read and follow up if you want a
            deeper review. No spam, no resale.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); if (valid) onNext(); }}
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
            <label className="flex items-start gap-2 text-[12px] text-muted-foreground pt-1">
              <input
                type="checkbox"
                checked={lead.email_consent}
                onChange={(e) => set("email_consent", e.target.checked)}
                className="mt-0.5 rounded border-border"
                aria-label="Email me a copy of my scorecard read and follow up if relevant"
              />
              <span>
                Email me a copy of my scorecard read and follow up if relevant. If
                you uncheck this we will save your read but will not send the
                automatic follow-up email.
              </span>
            </label>

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
  label, required, value, onChange, type = "text", placeholder,
}: {
  label: string; required?: boolean; value: string;
  onChange: (v: string) => void; type?: string; placeholder?: string;
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

function Submitting() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <Section className="pt-32">
        <div className="max-w-lg mx-auto text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-5" />
          <h2 className="font-display text-2xl text-foreground">Preparing your read…</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Computing your 0–1,000 Business Stability Score across the five gears.
          </p>
        </div>
      </Section>
    </motion.div>
  );
}

function IncompletePrompt({
  onSubmitAnyway, onReview,
}: { onSubmitAnyway: () => void; onReview: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      role="dialog" aria-modal="true"
    >
      <div className="max-w-md w-full rounded-xl border border-amber-400/30 bg-card p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={20} className="text-amber-300 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-display text-lg text-foreground leading-snug mb-1">
              Several questions are still unanswered
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Unanswered questions count as zero so the score stays honest.
              You can go back to fill them in or submit the read as-is.
            </p>
          </div>
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

/* ------------- Premium Result page ------------- */

const BAND_TONE: Record<number, string> = {
  1: "text-rose-300 border-rose-400/30 bg-rose-400/5",
  2: "text-orange-300 border-orange-400/30 bg-orange-400/5",
  3: "text-amber-200 border-amber-400/30 bg-amber-400/5",
  4: "text-lime-300 border-lime-400/30 bg-lime-400/5",
  5: "text-emerald-300 border-emerald-400/30 bg-emerald-400/5",
};

function ResultStep({
  result,
  classifications,
  followupDispatch,
}: {
  result: V3ScorecardResult;
  classifications: ClassifierResult[] | null;
  followupDispatch: FollowupDispatchState | null;
}) {
  const score = result.overall_score_estimate;
  const tone = BAND_TONE[result.overall_band] ?? BAND_TONE[3];
  const lowConfidenceCount = (classifications ?? []).filter(
    (c) => c.confidence === "low" || c.insufficient_detail,
  ).length;
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
            <Sparkles size={12} /> First-pass · Self-reported
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-3 leading-[1.1]">
            Your RGS Scorecard preliminary read
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Based on your answers, this is a self-reported first-pass read
            of where the business may be carrying instability across the
            five gears. <strong className="text-foreground">Your score does not mean the business is bad.</strong>{" "}
            It means the system may be carrying pressure in places it was
            not built to carry. The paid Diagnostic adds evidence review,
            admin interpretation, contradiction checks, and repair
            sequencing.
          </p>

          {/* Submission status */}
          <div
            className={`rounded-xl border p-4 mb-6 ${
              followupDispatch?.status === "sent"
                ? "border-emerald-400/30 bg-emerald-400/5"
                : "border-amber-400/30 bg-amber-400/5"
            }`}
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
              Submission status
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {followupDispatch?.message ??
                "Your scorecard was saved. RGS can review it, but automatic follow-up could not be confirmed from this browser session."}
            </p>
          </div>

          {lowConfidenceCount > 0 && (
            <div
              data-testid="scorecard-low-confidence-banner"
              className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 mb-6"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                Conservative interpretation
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">
                {lowConfidenceCount === 1
                  ? "One answer was interpreted conservatively"
                  : `${lowConfidenceCount} answers were interpreted conservatively`}{" "}
                because they did not include enough detail to map cleanly
                to the rubric. Your score is still calculated from the
                fixed RGS rubric — the paid Diagnostic reviews evidence
                and resolves ambiguity.
              </p>
            </div>
          )}

          {/* Overall card */}
          <div className={`rounded-xl border ${tone} p-6 mb-6`}>
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="md:border-r md:border-border/30 md:pr-6">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Business Stability Score
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <div className="font-display text-5xl tabular-nums text-foreground leading-none">
                    {score}
                  </div>
                  <div className="text-sm text-muted-foreground">/ 1,000</div>
                </div>
                <div className="mt-3 text-xs uppercase tracking-wider">
                  Confidence: {result.overall_confidence}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Interpretation
                </div>
                <div className="text-base font-medium text-foreground mb-2">
                  {result.interpretation_band.label}
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {result.interpretation_band.description}
                </p>
              </div>
            </div>
          </div>

          {/* Strongest + Slipping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 mb-1">
                Strongest gear
              </div>
              <div className="font-display text-lg text-foreground mb-1">
                {result.strongest_gear.title}
              </div>
              <div className="text-sm text-muted-foreground tabular-nums">
                {result.strongest_gear.score} / 200
              </div>
            </div>
            <div className="rounded-xl border border-rose-400/30 bg-rose-400/5 p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-rose-300 mb-1">
                Most slipping gear
              </div>
              <div className="font-display text-lg text-foreground mb-1">
                {result.most_slipping_gear.title}
              </div>
              <div className="text-sm text-muted-foreground tabular-nums">
                {result.most_slipping_gear.score} / 200
              </div>
            </div>
          </div>

          {/* Gear grid (0–200 each) */}
          <h2 className="font-display text-xl text-foreground mb-3">Gear scores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {result.pillar_results.map((p) => {
              const t = BAND_TONE[p.band] ?? BAND_TONE[3];
              const pct = Math.round((p.score / 200) * 100);
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
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <div className="font-display text-2xl tabular-nums text-foreground">
                      {p.score}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      / 200
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-muted/40 overflow-hidden mb-3">
                    <div
                      className="h-full bg-foreground/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed">
                    {p.rationale}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Worn-tooth signals */}
          {result.worn_tooth_signals.length > 0 && (
            <>
              <h2 className="font-display text-xl text-foreground mb-3">
                Worn-tooth signals
              </h2>
              <ul className="space-y-2 mb-8">
                {result.worn_tooth_signals.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-foreground/90 leading-relaxed"
                  >
                    <AlertTriangle size={14} className="text-amber-300 mt-0.5 flex-shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* What this means */}
          <div className="rounded-xl border border-border bg-card/40 p-5 mb-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              What this means
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {result.rationale}
            </p>
          </div>

          {/* What to do next */}
          <h2 className="font-display text-xl text-foreground mb-3">
            What to do next
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

          {/* Diagnostic CTA */}
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center mb-6">
            <h3 className="font-display text-xl text-foreground mb-2">
              Want a deeper, evidence-supported review?
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xl mx-auto leading-relaxed">
              The Scorecard is a first-pass, self-reported read. The paid
              Diagnostic adds evidence review, admin interpretation,
              contradiction checks, and repair sequencing — so you know
              what to fix first and in what order.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
              <a href="/diagnostic-interview?from=scorecard" className="btn-primary inline-flex">
                Apply for the Diagnostic <ArrowRight size={16} />
              </a>
              <a href="/diagnostic" className="px-4 h-10 inline-flex items-center gap-1 rounded-md border border-border text-sm text-foreground hover:bg-card/40">
                See how the Diagnostic works
              </a>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/60 mt-4 leading-relaxed text-center max-w-xl mx-auto">
            Self-reported, first-pass estimate generated using the RGS
            Stability rubric ({RUBRIC_VERSION_V3}). Not a final diagnosis.
            Not legal, tax, accounting, compliance, valuation, investment,
            or professional regulatory advice. No revenue, profit, growth,
            funding, compliance, or business outcome guarantees. The paid
            Diagnostic is deeper and may use evidence and admin review,
            and may inform a draft RGS Structural Health Report™ and
            30/60/90 RGS Repair Map™ after admin review.
          </p>
        </div>
      </Section>
    </motion.div>
  );
}