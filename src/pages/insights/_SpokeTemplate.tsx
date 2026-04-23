import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { DIAGNOSTIC_APPLY_PATH } from "@/lib/cta";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export interface SpokeBlock {
  title: string;
  body: string;
}

export interface SpokeRelatedLink {
  to: string;
  label: string;
}

export interface SpokeProps {
  eyebrow: string;
  h1: React.ReactNode;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  canonical: string;
  problemHeading: string;
  problemParagraphs: string[];
  signals: string[];
  signalsHeading: string;
  blocks: SpokeBlock[];
  blocksHeading: string;
  proofTools: string[];
  proofParagraph: string;
  closingHeading: React.ReactNode;
  closingNote?: string;
  relatedLinks: SpokeRelatedLink[];
}

export default function SpokeTemplate(props: SpokeProps) {
  return (
    <Layout>
      <SEO
        title={props.seoTitle}
        description={props.seoDescription}
        canonical={props.canonical}
      />

      {/* Hero */}
      <Section className="pt-32 grid-bg">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            {props.eyebrow}
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6 leading-[1.05]">
            {props.h1}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl">
            {props.intro}
          </p>
          <div className="flex flex-col items-start gap-3">
            <Link
              to={DIAGNOSTIC_APPLY_PATH}
              className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-7 py-3.5 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_hsl(78_36%_35%/0.55)] group"
            >
              Request a Diagnostic
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/why-businesses-lose-revenue"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <ArrowLeft size={12} />
              Back to: Why businesses lose revenue
            </Link>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Problem framing */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            The Problem
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.1] mb-6">
            {props.problemHeading}
          </h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            {props.problemParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Signals list */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            Signals To Watch For
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8 leading-[1.15]">
            {props.signalsHeading}
          </h2>
          <ul className="space-y-3">
            {props.signals.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2.5 text-muted-foreground leading-relaxed"
              >
                <CheckCircle2
                  size={16}
                  className="text-primary/70 flex-shrink-0 mt-1"
                  strokeWidth={1.75}
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Structural blocks */}
      <Section>
        <div className="max-w-3xl mb-12 mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            How To Think About It
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.1]">
            {props.blocksHeading}
          </h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {props.blocks.map((b, i) => (
            <motion.div
              key={b.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="premium-card"
            >
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {b.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Proof / RGS positioning */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            Where RGS Fits
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6 leading-[1.15]">
            Diagnosis is structural — not a workshop.
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">{props.proofParagraph}</p>
          {props.proofTools.length > 0 && (
            <div className="border-t border-border/30 pt-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground/70 font-medium mb-3">
                Relevant RGS diagnostic systems
              </p>
              <ul className="flex flex-wrap gap-2">
                {props.proofTools.map((t) => (
                  <li
                    key={t}
                    className="text-xs text-foreground/80 px-3 py-1.5 rounded-md border border-border/40 bg-card/40"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Related */}
      {props.relatedLinks.length > 0 && (
        <>
          <Section>
            <div className="max-w-3xl mx-auto">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
                Related
              </p>
              <ul className="space-y-2">
                {props.relatedLinks.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors font-medium"
                    >
                      {l.label}
                      <ArrowRight size={14} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
          <div className="container mx-auto max-w-5xl px-6">
            <div className="section-divider" />
          </div>
        </>
      )}

      {/* Final CTA */}
      <Section className="grid-bg">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-6 leading-[1.1]">
            {props.closingHeading}
          </h2>
          {props.closingNote && (
            <p className="text-sm md:text-base text-muted-foreground/80 italic mb-10 max-w-xl mx-auto leading-relaxed">
              {props.closingNote}
            </p>
          )}
          <Link
            to={DIAGNOSTIC_APPLY_PATH}
            className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_hsl(78_36%_35%/0.6)] group"
          >
            Request a Diagnostic
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </Section>
    </Layout>
  );
}