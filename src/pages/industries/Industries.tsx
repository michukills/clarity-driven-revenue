import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import {
  INDUSTRY_LANDING_CONTENT,
  INDUSTRY_LANDING_SLUGS,
} from "@/lib/industries/landingContent";

export default function Industries() {
  return (
    <Layout>
      <SEO
        title="Industries Served | Revenue & Growth Systems"
        description="RGS supports owner-led businesses across general / mixed business, trades & field service, restaurant & food service, retail, and cannabis / MMJ / dispensary operations."
        canonical="/industries"
      />
      <Section className="pt-32">
        <div className="max-w-3xl mb-10">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            Industries
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6 leading-[1.1]">
            Industries RGS supports
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            RGS is industry-aware, not industry-locked. The Diagnostic and
            Repair Map adjust emphasis based on how the industry actually
            runs — without changing the deterministic 0–1000 base score.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {INDUSTRY_LANDING_SLUGS.map((slug) => {
            const c = INDUSTRY_LANDING_CONTENT[slug];
            return (
              <Link
                key={slug}
                to={`/industries/${slug}`}
                className="rounded-xl border border-border/40 bg-card/40 p-6 hover:border-primary transition-colors block"
              >
                <h2 className="font-display text-xl text-foreground mb-2">
                  {c.label}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {c.intro.split(".")[0]}.
                </p>
                <span className="inline-flex items-center gap-1 text-sm text-primary">
                  Read more <ArrowRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      </Section>
    </Layout>
  );
}