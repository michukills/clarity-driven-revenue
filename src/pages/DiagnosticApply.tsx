import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const ZAPIER_WEBHOOK = "https://hooks.zapier.com/hooks/catch/27303455/ujf52fn/";

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

const revenues = ["Under $5K", "$5K–$20K", "$20K–$50K", "$50K–$100K", "$100K+"];

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  business_name: z.string().trim().min(1, "Required").max(150),
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

export default function DiagnosticApply() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    business_name: "",
    business_description: "",
    situation: "",
    situation_other: "",
    monthly_revenue: "",
    primary_goal: "",
    scorecard_prompt: "",
  });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
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
      await fetch(ZAPIER_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          form_type: "diagnostic_application",
          submitted_at: new Date().toISOString(),
          ...parsed.data,
        }),
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast({
        title: "Submission failed",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl text-center"
        >
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-primary/15 mb-8">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6">
            Application Received
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Your application has been received. If your business is a good fit, you will be contacted with next steps.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-8">
            Response time: 24–48 hours.
          </p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
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
            Complete this short application to determine if your business is a good fit for the RGS Diagnostic.
          </p>
          <p className="text-sm text-muted-foreground/70 leading-relaxed">
            This process ensures we focus on businesses where the analysis will have meaningful impact.
          </p>
        </motion.div>
      </section>

      {/* Expectation Setting */}
      <Section>
        <div className="border-l-2 border-primary/60 pl-6 md:pl-8">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">Before You Apply</h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            This diagnostic is designed for business owners who are serious about understanding and improving system performance.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "You are actively operating a business",
              "You are willing to take a structured approach",
              "You are looking for clarity—not quick fixes",
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

      {/* Form */}
      <Section>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10">Application Form</h2>

        <form onSubmit={onSubmit} className="space-y-7">
          <div>
            <label className={labelClass} htmlFor="name">Name <span className="text-primary">*</span></label>
            <input id="name" type="text" required maxLength={100} className={fieldClass} value={form.name} onChange={update("name")} />
          </div>

          <div>
            <label className={labelClass} htmlFor="email">Email <span className="text-primary">*</span></label>
            <input id="email" type="email" required maxLength={255} className={fieldClass} value={form.email} onChange={update("email")} />
          </div>

          <div>
            <label className={labelClass} htmlFor="business_name">Business Name <span className="text-primary">*</span></label>
            <input id="business_name" type="text" required maxLength={150} className={fieldClass} value={form.business_name} onChange={update("business_name")} />
          </div>

          <div>
            <label className={labelClass} htmlFor="business_description">What does your business do?</label>
            <textarea
              id="business_description"
              rows={3}
              maxLength={1000}
              className={fieldClass}
              placeholder="A short paragraph about what you do and who you serve."
              value={form.business_description}
              onChange={update("business_description")}
            />
          </div>

          <div>
            <label className={labelClass}>Which of the following best describes your current situation?</label>
            <div className="space-y-2 mt-3">
              {situations.map((s) => (
                <label
                  key={s}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                    form.situation === s
                      ? "border-primary/70 bg-primary/5"
                      : "border-border/50 hover:border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="situation"
                    value={s}
                    checked={form.situation === s}
                    onChange={update("situation")}
                    className="accent-primary"
                  />
                  <span className="text-foreground/90 text-sm md:text-base">{s}</span>
                </label>
              ))}
            </div>
            {form.situation === "Other" && (
              <input
                type="text"
                maxLength={300}
                placeholder="Please specify"
                className={`${fieldClass} mt-3`}
                value={form.situation_other}
                onChange={update("situation_other")}
              />
            )}
          </div>

          <div>
            <label className={labelClass}>What is your approximate monthly revenue?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {revenues.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                    form.monthly_revenue === r
                      ? "border-primary/70 bg-primary/5"
                      : "border-border/50 hover:border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="monthly_revenue"
                    value={r}
                    checked={form.monthly_revenue === r}
                    onChange={update("monthly_revenue")}
                    className="accent-primary"
                  />
                  <span className="text-foreground/90 text-sm md:text-base">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="primary_goal">What is your primary goal right now?</label>
            <textarea
              id="primary_goal"
              rows={3}
              maxLength={1000}
              className={fieldClass}
              value={form.primary_goal}
              onChange={update("primary_goal")}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="scorecard_prompt">What prompted you to take the scorecard?</label>
            <textarea
              id="scorecard_prompt"
              rows={3}
              maxLength={1000}
              className={fieldClass}
              value={form.scorecard_prompt}
              onChange={update("scorecard_prompt")}
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-base transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              style={{ boxShadow: "0 4px 24px -4px hsl(78 36% 35% / 0.45)" }}
            >
              {submitting ? "Submitting..." : "Submit Application"} <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-sm text-muted-foreground/70 mt-4">
              You will receive a response within 24–48 hours.
            </p>
          </div>
        </form>
      </Section>
    </main>
  );
}
