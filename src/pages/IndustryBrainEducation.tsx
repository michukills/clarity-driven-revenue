import { Link } from "react-router-dom";
import { ArrowRight, Compass, ShieldCheck, Layers, BookOpen } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { SCORECARD_PATH } from "@/lib/cta";

/**
 * Public, client-safe Industry Brain education page.
 *
 * Explains what the Industry Brain is and is not. Uses general educational
 * language only — no admin-only catalog rows, no client-specific data,
 * no internal scoring math, no fake proof.
 *
 * Cannabis / MMJ / MMC / Rec is dispensary / regulated retail operations
 * only — never healthcare, HIPAA, patient care, insurance claims, medical
 * billing, or clinical workflows. The word "medical" on this page only
 * refers to medical marijuana.
 */

function Card({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Compass;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-6">
      <Icon className="text-primary mb-3" size={24} />
      <h3 className="font-display text-lg text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

export default function IndustryBrainEducation() {
  return (
    <Layout>
      <SEO
        title="Industry Brain — How RGS Reads Your Industry | Revenue & Growth Systems"
        description="The RGS Industry Brain explains how the Diagnostic, Repair Map, and Control System adjust emphasis based on how your industry actually runs — without changing the deterministic 0–1000 stability score."
        canonical="/industry-brain"
      />

      <Section className="pt-32">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            The Industry Brain
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6 leading-[1.1]">
            How RGS reads your industry
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            The Industry Brain is the structured map RGS uses to recognize
            how each supported industry actually runs — what gears tend to
            slip, which evidence sources tell the truth, and which repair
            items usually rise in priority. It supports the Diagnostic. It
            does not replace owner judgment, and it does not change the
            deterministic 0–1000 Stability Score.
          </p>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="grid md:grid-cols-2 gap-6">
          <Card
            icon={Compass}
            title="Industry-aware, not industry-locked"
            body="The Diagnostic uses the same five gears for every business: revenue, conversion, operations, financial visibility, and owner independence. The Industry Brain adjusts emphasis — which gears matter most for your context."
          />
          <Card
            icon={Layers}
            title="Supports diagnostics, reports, and repair maps"
            body="The brain helps the Diagnostic ask better questions, the Report describe risks in your language, the Repair Map prioritize what to fix first, and the RGS Control System monitor what is worth watching for your industry."
          />
          <Card
            icon={BookOpen}
            title="The score stays deterministic"
            body="The 0–1000 Stability Score is rubric-based and stays the same across industries so it is comparable over time. The Industry Brain influences emphasis, priority, and language — never the underlying score."
          />
          <Card
            icon={ShieldCheck}
            title="AI is support, not authority"
            body="Where AI is used, it runs server-side and is reviewed by RGS before anything client-visible is published. The Industry Brain does not replace legal, tax, accounting, HR, or compliance review."
          />
        </div>
      </Section>

      <Section className="pt-0">
        <div className="rounded-xl border border-border/40 bg-card/30 p-6 mb-6">
          <h2 className="font-display text-xl text-foreground mb-3">
            What the Industry Brain does not do
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li>• Not a guarantee of revenue, outcomes, or compliance.</li>
            <li>• Not a substitute for legal, tax, accounting, HR, or compliance advice.</li>
            <li>• Not unlimited consulting or open-ended support.</li>
            <li>• Does not override deterministic scorecard scoring.</li>
            <li>• Does not auto-publish anything client-visible — RGS reviews first.</li>
            <li>• Does not expose another client's data, admin notes, or internal catalog.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/30 p-6">
          <h2 className="font-display text-xl text-foreground mb-3">
            Cannabis / MMJ / MMC / Rec scope
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            The Industry Brain treats cannabis, MMJ, medical marijuana, and
            recreational as dispensary and regulated retail operations only.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li>• Not healthcare, patient care, HIPAA, insurance claims, medical billing, or clinical workflows.</li>
            <li>• State-specific rules may apply.</li>
            <li>• Professional review may still be required.</li>
            <li>• Not legal advice. Not a compliance guarantee.</li>
          </ul>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="rounded-xl border border-border/40 bg-card/40 p-8 text-center">
          <h2 className="font-display text-2xl text-foreground mb-3">
            See how the Industry Brain shapes your Diagnostic
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
            Start with the 0–1000 Stability Scorecard. The Diagnostic that
            follows uses the Industry Brain to surface the gears most worth
            repairing first.
          </p>
          <Link
            to={SCORECARD_PATH}
            className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-[hsl(78,36%,46%)] transition-colors"
          >
            Start the Stability Scorecard
            <ArrowRight size={16} />
          </Link>
        </div>
      </Section>
    </Layout>
  );
}