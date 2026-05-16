/**
 * P96 - Operational Friction Scan (public).
 *
 * The new public entry experience. Combines a Worn Teeth Detector and
 * a Hidden Bottleneck Explorer. Replaces the prior "free Scorecard
 * funnel" energy with an operational intelligence feel: ask a few
 * loaded questions, infer the upstream bottleneck, show slipping gears
 * visually, and surface specific friction points.
 *
 * Naturally leads into the deeper Diagnostic-Grade Stability
 * Assessment (the deterministic /scorecard surface).
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Activity, Eye, Wrench, ChevronRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import GearMap from "@/components/scan/GearMap";
import {
  SCAN_QUESTIONS,
  runScan,
  type ScanAnswers,
} from "@/lib/scan/engine";
import { SCORECARD_PATH } from "@/lib/cta";
import { supabase } from "@/integrations/supabase/client";

type Stage = "intro" | "questions" | "result";

const CONSENT_LINE =
  "I'd like the RGS team to follow up with my Operational Friction Scan summary and the deeper Diagnostic options. I can opt out anytime.";

const LeadSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(80),
  last_name: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  business_name: z.string().trim().min(1, "Business name is required").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email_consent: z.boolean(),
});
type LeadForm = z.infer<typeof LeadSchema>;
type LeadStatus = "idle" | "submitting" | "success" | "error";

const STAGE_TITLES: Record<Stage, string> = {
  intro: "Operational Friction Scan",
  questions: "Operational Friction Scan",
  result: "Where the system is slipping",
};

const Scan = () => {
  const [stage, setStage] = useState<Stage>("intro");
  const [answers, setAnswers] = useState<ScanAnswers>({});
  const [idx, setIdx] = useState(0);
  const [lead, setLead] = useState<LeadForm>({
    first_name: "",
    last_name: "",
    email: "",
    business_name: "",
    phone: "",
    email_consent: true,
  });
  const [leadErrors, setLeadErrors] = useState<Partial<Record<keyof LeadForm, string>>>({});
  const [leadStatus, setLeadStatus] = useState<LeadStatus>("idle");
  const [leadErrorMsg, setLeadErrorMsg] = useState<string | null>(null);
  const [wantsDeeper, setWantsDeeper] = useState(false);

  const total = SCAN_QUESTIONS.length;
  const currentQ = SCAN_QUESTIONS[idx];
  const progress = stage === "result" ? 1 : stage === "intro" ? 0 : (idx + 1) / total;

  const result = useMemo(
    () => (stage === "result" ? runScan(answers) : null),
    [stage, answers],
  );

  const answer = (optionId: string) => {
    const next = { ...answers, [currentQ.id]: optionId };
    setAnswers(next);
    if (idx + 1 < total) {
      setIdx(idx + 1);
    } else {
      setStage("result");
    }
  };

  const restart = () => {
    setAnswers({});
    setIdx(0);
    setStage("intro");
    setLeadStatus("idle");
    setLeadErrors({});
    setLeadErrorMsg(null);
    setWantsDeeper(false);
  };

  const submitLead = async (requestDeeper: boolean) => {
    if (!result) return;
    setLeadErrorMsg(null);
    const parsed = LeadSchema.safeParse(lead);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setLeadErrors(
        Object.fromEntries(
          Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? ""]),
        ) as Partial<Record<keyof LeadForm, string>>,
      );
      return;
    }
    setLeadErrors({});
    setLeadStatus("submitting");
    setWantsDeeper(requestDeeper);
    try {
      const scan_summary = {
        engineVersion: result.engineVersion,
        bottleneck: result.bottleneck,
        wornTeeth: result.wornTeeth,
        downstreamIfUntouched: result.downstreamIfUntouched,
        confidence: result.confidence,
        gears: result.gears.map((g) => ({ id: g.id, load: g.load, pressure: g.pressure })),
      };
      const insertPayload = {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        email: parsed.data.email.toLowerCase(),
        business_name: parsed.data.business_name,
        phone: parsed.data.phone || null,
        email_consent: parsed.data.email_consent,
        consent_one_liner: parsed.data.email_consent ? CONSENT_LINE : null,
        source: "operational_friction_scan",
        source_page: "/scan",
        scan_answers: answers,
        scan_summary,
        requested_next_step: requestDeeper ? "request_deeper_diagnostic" : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      };
      const { data: inserted, error } = await supabase
        .from("scan_leads")
        .insert([insertPayload])
        .select("id")
        .single();
      if (error || !inserted) {
        console.warn("scan_leads insert failed", error);
        setLeadStatus("error");
        setLeadErrorMsg("We couldn't save that. Please try again in a moment.");
        return;
      }
      // Fire-and-forget follow-up; do not block UX if it stalls.
      supabase.functions
        .invoke("scan-followup", { body: { leadId: inserted.id } })
        .catch((e) => console.warn("scan-followup invoke failed", e));
      setLeadStatus("success");
    } catch (e) {
      console.warn("scan lead submit error", e);
      setLeadStatus("error");
      setLeadErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <Layout>
      <SEO
        title="Operational Friction Scan - See where your business is slipping | RGS"
        description="A two-minute operational intelligence scan. Find the likely upstream bottleneck, the worn teeth in your system, and what those signals usually lead to downstream."
        canonical="/scan"
      />

      <section className="pt-24 pb-16 px-6 min-h-[calc(100vh-4rem)] hero-grid-bg">
        <div className="container mx-auto max-w-4xl">
          {/* Progress + eyebrow */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[hsl(78,30%,45%)]/40 bg-[hsl(78,34%,38%)]/10 text-[10px] uppercase tracking-[0.18em] text-[hsl(78,30%,68%)] font-semibold">
                <Activity size={11} strokeWidth={2.25} />
                <span>{STAGE_TITLES[stage]}</span>
              </div>
              {stage === "questions" && (
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {idx + 1} of {total}
                </div>
              )}
            </div>
            <div className="h-[2px] w-full bg-border/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[hsl(78,34%,46%)]"
                initial={false}
                animate={{ width: `${Math.max(0.04, progress) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {stage === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45 }}
              >
                <h1 className="font-hero text-[2.25rem] md:text-[3rem] font-bold leading-[1.1] tracking-[-0.02em] text-foreground text-balance">
                  See where your business is actually{" "}
                  <span className="text-[hsl(78,24%,60%)] font-semibold">slipping</span>.
                </h1>
                <p className="mt-6 text-base md:text-lg text-foreground/75 max-w-2xl leading-relaxed">
                  Seven questions. Two minutes. The scan reads the answers
                  for operational pattern - not personality - and surfaces
                  the likely upstream bottleneck, the worn teeth in your
                  system, and what those signals usually lead to downstream
                  if nothing changes.
                </p>
                <ul className="mt-8 space-y-2.5 text-sm text-muted-foreground max-w-xl">
                  {[
                    "No documents. No 1-10 sliders. No personality quiz.",
                    "A causality-aware read - root cause, not symptom.",
                    "Specific friction points, not generic advice.",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5">
                      <ChevronRight size={14} className="text-[hsl(78,30%,60%)] mt-0.5 flex-shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10">
                  <button
                    onClick={() => setStage("questions")}
                    className="font-hero inline-flex items-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-[0.9375rem] px-7 py-3.5 rounded-md shadow-[0_2px_10px_-2px_hsl(78_36%_35%/0.35)] transition-all duration-200 hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px hover:shadow-[0_8px_24px_-6px_hsl(78_36%_35%/0.45)] group"
                  >
                    Start the scan
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </button>
                  <p className="mt-3 text-[11px] text-muted-foreground/75">
                    Directional only. The deeper, structured 0-1,000
                    Diagnostic-Grade Assessment is the serious next step.
                  </p>
                </div>
              </motion.div>
            )}

            {stage === "questions" && currentQ && (
              <motion.div
                key={`q-${currentQ.id}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35 }}
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-4">
                  Question {idx + 1}
                </div>
                <h2 className="font-display text-2xl md:text-[1.875rem] font-semibold text-foreground leading-snug max-w-3xl">
                  {currentQ.prompt}
                </h2>
                {currentQ.helper && (
                  <p className="mt-3 text-sm text-muted-foreground italic max-w-2xl">
                    {currentQ.helper}
                  </p>
                )}

                <div className="mt-8 space-y-2.5 max-w-2xl">
                  {currentQ.options.map((opt) => {
                    const selected = answers[currentQ.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => answer(opt.id)}
                        className={`w-full text-left px-5 py-4 rounded-lg border transition-all duration-200 group ${
                          selected
                            ? "border-[hsl(78,30%,45%)]/70 bg-[hsl(78,34%,38%)]/12"
                            : "border-border/60 bg-card/30 hover:border-[hsl(78,30%,45%)]/50 hover:bg-card/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm md:text-[0.95rem] text-foreground/90 leading-relaxed">
                            {opt.label}
                          </span>
                          <ArrowRight
                            size={14}
                            className="text-muted-foreground/40 group-hover:text-[hsl(78,30%,60%)] group-hover:translate-x-0.5 transition-all mt-1 flex-shrink-0"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {idx > 0 && (
                  <button
                    onClick={() => setIdx(idx - 1)}
                    className="mt-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>
                )}
              </motion.div>
            )}

            {stage === "result" && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-3">
                    Operational read
                  </div>
                  <h2 className="font-hero text-3xl md:text-[2.5rem] font-bold leading-tight text-foreground text-balance">
                    {result.bottleneck.headline}
                  </h2>
                  <p className="mt-5 text-base text-foreground/80 leading-relaxed max-w-3xl">
                    {result.bottleneck.why}
                  </p>
                </div>

                <GearMap gears={result.gears} upstreamGear={result.bottleneck.upstreamGear} />

                {result.wornTeeth.length > 0 && (
                  <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Wrench size={14} className="text-[hsl(78,30%,60%)]" />
                      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">
                        Likely worn teeth
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {result.wornTeeth.map((wt) => (
                        <li
                          key={wt.id}
                          className="flex items-start gap-3 text-sm text-foreground/85 leading-relaxed"
                        >
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[hsl(78,30%,60%)] flex-shrink-0" />
                          <span>{wt.finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.downstreamIfUntouched.length > 0 && (
                  <div className="rounded-2xl border border-[hsl(8,60%,50%)]/30 bg-[hsl(8,40%,30%)]/10 p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Eye size={14} className="text-[hsl(8,70%,65%)]" />
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[hsl(8,70%,65%)]">
                        If this is not addressed
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {result.downstreamIfUntouched.map((d, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-sm text-foreground/85 leading-relaxed"
                        >
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[hsl(8,70%,60%)] flex-shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {leadStatus !== "success" ? (
                  <div
                    data-testid="scan-lead-capture"
                    className="rounded-2xl border border-[hsl(78,30%,45%)]/40 bg-[hsl(78,34%,38%)]/8 p-6 md:p-8"
                  >
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[hsl(78,30%,68%)] font-semibold mb-3">
                      Save this read · Become a tracked lead
                    </div>
                    <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-2">
                      Send me my scan summary and the deeper Diagnostic options
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-2xl">
                      The Operational Friction Scan is a directional read.
                      The full Diagnostic is structured: a 0-1,000 Business
                      Stability Scorecard (Part 1) paired with an Owner
                      Diagnostic Interview, reviewed by the RGS team. Give
                      us your contact details and we'll route you in.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <LeadField
                        label="First name"
                        value={lead.first_name}
                        error={leadErrors.first_name}
                        onChange={(v) => setLead({ ...lead, first_name: v })}
                        autoComplete="given-name"
                      />
                      <LeadField
                        label="Last name"
                        value={lead.last_name}
                        error={leadErrors.last_name}
                        onChange={(v) => setLead({ ...lead, last_name: v })}
                        autoComplete="family-name"
                      />
                      <LeadField
                        label="Business name"
                        value={lead.business_name}
                        error={leadErrors.business_name}
                        onChange={(v) => setLead({ ...lead, business_name: v })}
                        autoComplete="organization"
                      />
                      <LeadField
                        label="Work email"
                        type="email"
                        value={lead.email}
                        error={leadErrors.email}
                        onChange={(v) => setLead({ ...lead, email: v })}
                        autoComplete="email"
                      />
                      <LeadField
                        label="Phone (optional)"
                        value={lead.phone ?? ""}
                        error={leadErrors.phone}
                        onChange={(v) => setLead({ ...lead, phone: v })}
                        autoComplete="tel"
                      />
                    </div>
                    <label className="mt-5 flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lead.email_consent}
                        onChange={(e) => setLead({ ...lead, email_consent: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(78,34%,46%)]"
                      />
                      <span>{CONSENT_LINE}</span>
                    </label>

                    {leadStatus === "error" && leadErrorMsg && (
                      <div className="mt-4 flex items-start gap-2 rounded-md border border-[hsl(8,60%,50%)]/40 bg-[hsl(8,40%,30%)]/15 px-3 py-2 text-xs text-[hsl(8,70%,75%)]">
                        <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                        <span>{leadErrorMsg}</span>
                      </div>
                    )}

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        data-testid="scan-lead-submit-deeper"
                        disabled={leadStatus === "submitting"}
                        onClick={() => submitLead(true)}
                        className="inline-flex items-center justify-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-sm px-6 py-3 rounded-md transition-all hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed group"
                      >
                        {leadStatus === "submitting" ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Saving…
                          </>
                        ) : (
                          <>
                            Request the deeper Diagnostic
                            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        data-testid="scan-lead-submit-summary"
                        disabled={leadStatus === "submitting"}
                        onClick={() => submitLead(false)}
                        className="inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground/80 px-6 py-3 rounded-md border border-border/60 hover:border-[hsl(78,30%,45%)]/60 hover:text-foreground transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Just email me the summary
                      </button>
                    </div>
                    <p className="mt-4 text-[11px] text-muted-foreground/65 leading-relaxed">
                      Submitting saves your scan to the RGS team as a
                      tracked lead. It does not unlock the Client Portal,
                      the Diagnostic Workspace, or the RGS Control System -
                      those are activated only after a Diagnostic engagement
                      is opened.
                    </p>
                  </div>
                ) : (
                  <div
                    data-testid="scan-lead-success"
                    className="rounded-2xl border border-[hsl(78,30%,45%)]/50 bg-[hsl(78,34%,38%)]/12 p-6 md:p-8"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={16} className="text-[hsl(78,30%,68%)]" />
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[hsl(78,30%,68%)] font-semibold">
                        Saved · You are on the RGS lead list
                      </div>
                    </div>
                    <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-3">
                      {wantsDeeper
                        ? "Your deeper Diagnostic request is in."
                        : "Your scan summary is on its way."}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-2xl">
                      A member of the RGS team will reach out with your
                      Operational Friction Scan summary and the structured
                      Diagnostic next step (Business Stability Scorecard +
                      Owner Diagnostic Interview). In the meantime, you can
                      run Part 1 of the Diagnostic yourself.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link
                        to={SCORECARD_PATH}
                        className="inline-flex items-center justify-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-sm px-6 py-3 rounded-md transition-all hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px group"
                      >
                        Start Diagnostic Part 1 - Stability Scorecard
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                      </Link>
                      <button
                        type="button"
                        onClick={restart}
                        className="inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground/80 px-6 py-3 rounded-md border border-border/60 hover:border-[hsl(78,30%,45%)]/60 hover:text-foreground transition-all"
                      >
                        Run the scan again
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground/65 leading-relaxed max-w-3xl">
                  The Operational Friction Scan is a directional read from
                  self-reported answers - useful for orienting, not for
                  diagnosing. It is not legal, tax, accounting, compliance,
                  or valuation advice, and does not promise revenue,
                  profit, growth, or business outcomes. Confidence:{" "}
                  <span className="uppercase tracking-wider">{result.confidence.label}</span>{" "}
                  - {result.confidence.rationale}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </Layout>
  );
};

export default Scan;

function LeadField({
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={`mt-1.5 w-full h-10 px-3 rounded-md bg-card/40 border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none transition-colors ${
          error
            ? "border-[hsl(8,60%,55%)]/60 focus:border-[hsl(8,60%,55%)]"
            : "border-border/60 focus:border-[hsl(78,30%,45%)]/70"
        }`}
      />
      {error && (
        <span className="mt-1 block text-[11px] text-[hsl(8,70%,72%)]">{error}</span>
      )}
    </label>
  );
}
