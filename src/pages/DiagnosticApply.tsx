import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, Lock } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
};

const Section = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.section {...fadeUp} className={`py-16 md:py-24 px-6 ${className}`}>
    <div className="container mx-auto max-w-2xl">{children}</div>
  </motion.section>
);

const situations = [
  "Inconsistent revenue",
  "Growth feels slower than expected",
  "Operational inefficiencies",
  "Lack of clarity in numbers",
  "Business depends heavily on me",
  "Other",
];

const revenues = ["Under $5K", "$5K–$20K", "$20K–$50K", "$50K–$100K", "$100K+"] as const;

const schema = z.object({
  full_name: z.string().trim().min(1, "Required").max(200),
  email: z.string().trim().email("Invalid email").max(255),
  business_name: z.string().trim().min(1, "Required").max(200),
  business_description: z.string().trim().min(1, "Required").max(1000),
  situation: z.string().min(1, "Please select one"),
  situation_other: z.string().max(300).optional(),
  monthly_revenue: z.string().min(1, "Please select one"),
  primary_goal: z.string().trim().min(1, "Required").max(1000),
  scorecard_prompt: z.string().trim().min(1, "Required").max(1000),
});

const fieldClass =
  "w-full bg-background/40 border border-border/60 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all";
const labelClass = "block text-sm font-medium text-foreground mb-2";

type FitResult = "auto_qualified" | "needs_review" | "auto_declined";

function classifyFit(input: z.infer<typeof schema>): { fit: FitResult; reason: string } {
  const r = input.monthly_revenue;
  // Heuristic, not a hard gate. Auto-decline only the very smallest tier so
  // we keep most applicants in human review.
  if (r === "Under $5K") {
    return {
      fit: "auto_declined",
      reason:
        "The Diagnostic is built for established owner-led businesses; below ~$5K/mo we recommend the free Scorecard first.",
    };
  }
  if (r === "$5K–$20K" || r === "$20K–$50K") {
    return { fit: "needs_review", reason: "Within range; RGS will review fit before next steps." };
  }
  return { fit: "auto_qualified", reason: "Within target range for the Diagnostic." };
}

export default function DiagnosticApply() {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "declined" | "checkout" | "complete">("form");
  const [submitting, setSubmitting] = useState(false);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [fit, setFit] = useState<{ fit: FitResult; reason: string } | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    business_name: "",
    business_description: "",
    situation: "",
    situation_other: "",
    monthly_revenue: "",
    primary_goal: "",
    scorecard_prompt: "",
  });

  const update = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Please complete all required fields",
        description: parsed.error.issues[0]?.message ?? "Check your entries and try again.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const decision = classifyFit(parsed.data);
      const { data: intake, error } = await supabase
        .from("diagnostic_intakes")
        .insert({
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          business_name: parsed.data.business_name,
          business_description: parsed.data.business_description,
          situation: parsed.data.situation,
          situation_other: parsed.data.situation_other || null,
          monthly_revenue: parsed.data.monthly_revenue,
          primary_goal: parsed.data.primary_goal,
          scorecard_prompt: parsed.data.scorecard_prompt,
          fit_status: decision.fit === "auto_declined" ? "auto_declined" : decision.fit,
          fit_reason: decision.reason,
          intake_status: decision.fit === "auto_declined" ? "fit_declined" : "fit_passed",
          source: "diagnostic_apply",
          user_agent: navigator.userAgent.slice(0, 500),
        })
        .select("id")
        .single();
      if (error || !intake) {
        if ((error as any)?.message?.includes("rate_limited")) {
          throw new Error("You've submitted several requests recently. Please wait a few minutes.");
        }
        throw error ?? new Error("Could not save your application.");
      }
      setIntakeId(intake.id);
      setFit(decision);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (decision.fit === "needs_review") {
        // Best-effort owner/admin alert; never blocks the user.
        supabase.functions
          .invoke("notify-admin-event", {
            body: { event: "intake_needs_review", intakeId: intake.id },
          })
          .catch(() => {});
      }
      if (decision.fit === "auto_declined") {
        setStep("declined");
        return;
      }
      // Create checkout session.
      const { data: checkout, error: checkoutError } = await supabase.functions.invoke(
        "create-diagnostic-checkout",
        {
          body: {
            intakeId: intake.id,
            email: parsed.data.email,
            environment: getStripeEnvironment(),
            returnUrl: `${window.location.origin}/diagnostic-apply?paid=1&session_id={CHECKOUT_SESSION_ID}`,
          },
        },
      );
      if (checkoutError || !checkout?.clientSecret) {
        throw new Error(checkoutError?.message || "Could not start checkout.");
      }
      setClientSecret(checkout.clientSecret);
      setStep("checkout");
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err?.message ?? "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const checkoutOptions = useMemo(
    () => (clientSecret ? { fetchClientSecret: async () => clientSecret } : null),
    [clientSecret],
  );

  // Returned from Stripe with paid=1. Show success state.
  const showSuccessFromUrl = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("paid") === "1";
  if (showSuccessFromUrl && step !== "complete") {
    setStep("complete");
  }

  if (step === "complete") {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-24">
        <SEO
          title="Payment Received — RGS Business Diagnostic"
          description="Your RGS Business Diagnostic payment has been received. RGS will review and send your secure portal invite shortly."
          canonical="/diagnostic-apply"
          noindex
        />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-xl text-center">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-primary/15 mb-8">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6">
            Payment Received
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Thank you. Your $3,000 RGS Business Diagnostic is paid. RGS will review your
            intake and send your secure portal invite to the email you provided.
            Invites are typically issued within one business day.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-8">
            If you need to follow up, reply to your receipt email with your business name.
          </p>
        </motion.div>
      </main>
    );
  }

  if (step === "declined") {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-24">
        <SEO
          title="Application Received — RGS Business Diagnostic"
          description="Your RGS Business Diagnostic application has been received. RGS will follow up if it is a good fit."
          canonical="/diagnostic-apply"
          noindex
        />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-xl text-center">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6">
            Thanks — Your Request Was Received
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {fit?.reason}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-8">
            Try the free <a href="/scorecard" className="text-primary hover:text-secondary">Business Scorecard</a> to see where you stand today.
          </p>
        </motion.div>
      </main>
    );
  }

  if (step === "checkout" && checkoutOptions) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <SEO
          title="Pay for the RGS Business Diagnostic"
          description="Secure payment for the $3,000 RGS Business Diagnostic."
          canonical="/diagnostic-apply"
          noindex
        />
        <PaymentTestModeBanner />
        <section className="px-6 pt-20 pb-12">
          <div className="container mx-auto max-w-2xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent/90 mb-4">
                <Lock className="w-3.5 h-3.5" /> Secure Checkout
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                RGS Business Diagnostic — $3,000
              </h1>
              <p className="text-sm text-muted-foreground">
                After payment, RGS will review your intake and send your secure portal invite by email.
                Your portal account is created from that one-time invite link.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-2 md:p-4 overflow-hidden">
              <EmbeddedCheckoutProvider stripe={getStripe()} options={checkoutOptions}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SEO
        title="Apply for the RGS Business Diagnostic"
        description="Apply for the $3,000 RGS Business Diagnostic — fixed-scope analysis for owner-led service and trades businesses. Short application then secure payment."
        canonical="/diagnostic-apply"
        noindex
      />
      <PaymentTestModeBanner />

      <section className="px-6 pt-24 md:pt-32 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="container mx-auto max-w-2xl text-center"
        >
          <div className="inline-block text-xs uppercase tracking-[0.2em] text-accent/90 mb-6">
            RGS Diagnostic
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6 leading-[1.1]">
            Request a Full Diagnostic
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-4">
            Complete this short application, then pay securely for the $3,000 RGS Business Diagnostic.
          </p>
          <p className="text-sm text-muted-foreground/70 leading-relaxed">
            Portal access is granted by RGS after intake review. There is no public account creation.
          </p>
        </motion.div>
      </section>

      <Section>
        <div className="border-l-2 border-primary/60 pl-6 md:pl-8">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">Before You Apply</h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            This diagnostic is designed for owners who are serious about understanding and improving system performance.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "You are actively operating a business",
              "You are willing to take a structured approach",
              "You are looking for clarity, not quick fixes",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check className="w-5 h-5 mt-0.5 shrink-0 text-primary" strokeWidth={2.25} />
                <span className="text-foreground/90 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <div className="container mx-auto max-w-2xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>

      <Section>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10">Application Form</h2>

        <form onSubmit={onSubmit} className="space-y-7">
          <div>
            <label className={labelClass} htmlFor="full_name">Name <span className="text-primary">*</span></label>
            <input id="full_name" type="text" required maxLength={200} className={fieldClass}
              value={form.full_name} onChange={update("full_name")} />
          </div>

          <div>
            <label className={labelClass} htmlFor="email">Email <span className="text-primary">*</span></label>
            <input id="email" type="email" required maxLength={255} className={fieldClass}
              value={form.email} onChange={update("email")} />
            <p className="text-xs text-muted-foreground/70 mt-2">
              Your portal invite will be sent to this email. Use the inbox you check.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="business_name">Business Name <span className="text-primary">*</span></label>
            <input id="business_name" type="text" required maxLength={200} className={fieldClass}
              value={form.business_name} onChange={update("business_name")} />
          </div>

          <div>
            <label className={labelClass} htmlFor="business_description">What does your business do?</label>
            <textarea id="business_description" rows={3} maxLength={1000} className={fieldClass}
              placeholder="A short paragraph about what you do and who you serve."
              value={form.business_description} onChange={update("business_description")} />
          </div>

          <div>
            <label className={labelClass}>Which best describes your current situation?</label>
            <div className="space-y-2 mt-3">
              {situations.map((s) => (
                <label key={s} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                  form.situation === s ? "border-primary/70 bg-primary/5" : "border-border/50 hover:border-border"
                }`}>
                  <input type="radio" name="situation" value={s}
                    checked={form.situation === s} onChange={update("situation")} className="accent-primary" />
                  <span className="text-foreground/90 text-sm md:text-base">{s}</span>
                </label>
              ))}
            </div>
            {form.situation === "Other" && (
              <input type="text" maxLength={300} placeholder="Please specify"
                className={`${fieldClass} mt-3`} value={form.situation_other}
                onChange={update("situation_other")} />
            )}
          </div>

          <div>
            <label className={labelClass}>What is your approximate monthly revenue?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {revenues.map((r) => (
                <label key={r} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                  form.monthly_revenue === r ? "border-primary/70 bg-primary/5" : "border-border/50 hover:border-border"
                }`}>
                  <input type="radio" name="monthly_revenue" value={r}
                    checked={form.monthly_revenue === r} onChange={update("monthly_revenue")} className="accent-primary" />
                  <span className="text-foreground/90 text-sm md:text-base">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="primary_goal">What is your primary goal right now?</label>
            <textarea id="primary_goal" rows={3} maxLength={1000} className={fieldClass}
              value={form.primary_goal} onChange={update("primary_goal")} />
          </div>

          <div>
            <label className={labelClass} htmlFor="scorecard_prompt">What prompted you to take the scorecard?</label>
            <textarea id="scorecard_prompt" rows={3} maxLength={1000} className={fieldClass}
              value={form.scorecard_prompt} onChange={update("scorecard_prompt")} />
          </div>

          <div className="pt-4">
            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-base transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              style={{ boxShadow: "0 4px 24px -4px hsl(78 36% 35% / 0.45)" }}>
              {submitting ? "Preparing checkout…" : "Continue to Secure Payment"} <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-sm text-muted-foreground/70 mt-4">
              Total today: <strong className="text-foreground">$3,000</strong> (one-time). Card details are entered on the next step.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2 leading-relaxed">
              Your portal account is created only after RGS reviews your intake and sends a secure invite link to your email.
            </p>
          </div>
        </form>
      </Section>
    </main>
  );
}