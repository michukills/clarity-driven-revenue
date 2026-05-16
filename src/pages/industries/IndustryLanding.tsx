import { useParams, Navigate, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import {
  INDUSTRY_LANDING_CONTENT,
  type IndustrySlug,
} from "@/lib/industries/landingContent";
import {
  DIAGNOSTIC_APPLY_PATH,
  SCAN_PATH,
  SCAN_CTA_LABEL,
} from "@/lib/cta";

function Block({ heading, items }: { heading: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-6">
      <h3 className="font-display text-xl text-foreground mb-4">{heading}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="text-sm text-muted-foreground leading-relaxed flex gap-2"
          >
            <span className="text-primary mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function IndustryLanding() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug
    ? INDUSTRY_LANDING_CONTENT[slug as IndustrySlug]
    : undefined;

  if (!content) {
    return <Navigate to="/industries" replace />;
  }

  return (
    <Layout>
      <SEO
        title={content.seoTitle}
        description={content.seoDescription}
        canonical={`/industries/${content.slug}`}
      />

      <Section className="pt-32">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            {content.eyebrow}
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6 leading-[1.1]">
            {content.h1}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            {content.intro}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={SCAN_PATH}
              className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-[hsl(78,36%,46%)] transition-colors"
            >
              {SCAN_CTA_LABEL}
              <ArrowRight size={16} />
            </Link>
            <Link
              to={DIAGNOSTIC_APPLY_PATH}
              className="inline-flex items-center gap-2 border border-border/60 text-foreground text-sm px-6 py-3 rounded-lg hover:border-primary transition-colors"
            >
              Request a Diagnostic
            </Link>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="grid md:grid-cols-2 gap-6">
          <Block
            heading="Common slipping gears"
            items={content.slippingGears}
          />
          <Block
            heading="What the Diagnostic looks for"
            items={content.diagnosticLooksFor}
          />
          <Block
            heading="What Implementation may install"
            items={content.implementationInstalls}
          />
          <Block
            heading="What the RGS Control System™ may monitor"
            items={content.controlSystemMonitors}
          />
          <Block
            heading="What the owner can expect"
            items={content.ownerExpectations}
          />
          <Block
            heading="What RGS does not do"
            items={content.notWhatRgsDoes}
          />
        </div>

        {content.cannabisSafetyNotes && content.cannabisSafetyNotes.length > 0 && (
          <div className="mt-10 rounded-xl border border-border/40 bg-card/30 p-6">
            <h3 className="font-display text-lg text-foreground mb-3">
              Cannabis / MMJ / MMC / Rec scope
            </h3>
            <ul className="space-y-2">
              {content.cannabisSafetyNotes.map((note) => (
                <li
                  key={note}
                  className="text-sm text-muted-foreground leading-relaxed"
                >
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section className="pt-0">
        <div className="rounded-xl border border-border/40 bg-card/40 p-8 text-center">
          <h2 className="font-display text-2xl text-foreground mb-3">
            See how stable {content.label.toLowerCase()} is right now
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
            The Operational Friction Scan takes two minutes and surfaces the
            likely upstream bottleneck before the deeper Diagnostic.
          </p>
          <Link
            to={SCAN_PATH}
            className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-[hsl(78,36%,46%)] transition-colors"
          >
            Run the Operational Friction Scan
            <ArrowRight size={16} />
          </Link>
        </div>
      </Section>
    </Layout>
  );
}