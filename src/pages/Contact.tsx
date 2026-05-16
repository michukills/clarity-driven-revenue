import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { Mail, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  SCAN_PATH,
  SCAN_CTA_LABEL,
} from "@/lib/cta";

const Contact = () => {
  return (
    <Layout>
      <SEO
        title="Contact Revenue & Growth Systems — Schedule a Revenue Systems Review"
        description="Schedule a Revenue Systems Review with Revenue & Growth Systems. A structured working session for owner-led trade and service businesses to assess where structure is missing."
        canonical="/contact"
      />
      <Section className="pt-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-16 items-start">
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4 leading-[1.1]">
              Schedule Your Revenue Systems Review
            </h1>
            <p className="text-sm text-primary/90 font-medium max-w-2xl mb-6">
              This is a short initial review to determine if a full diagnostic is the right next step.
            </p>
            <p className="text-muted-foreground text-lg max-w-2xl mb-4 leading-relaxed">
              The Revenue Systems Review is a structured working session built for owner-led trade and service businesses. We walk through your core numbers — revenue flow, lead sources, close rates, and capacity — and assess what's being tracked, what isn't, and where structure is missing.
            </p>
            <p className="text-muted-foreground text-lg max-w-2xl mb-6 leading-relaxed">
              This is a surface-level review to give you clarity on where things stand. If deeper diagnostic work is needed, we'll outline the next step clearly — no pressure, no obligation.
            </p>
            <p className="text-sm max-w-2xl text-primary font-medium">
              Review → Revenue Diagnostic → Structured Implementation Support. One step at a time.
            </p>

            {/* P96E — Public routing is Scan-first. The deeper Diagnostic is
                the next step for owners ready for a structured review. The
                Scorecard is no longer a public lead magnet. */}
            <div className="mt-8 max-w-2xl space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground/70 font-medium">
                Not sure where to start?
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to={SCAN_PATH}
                  className="inline-flex items-center justify-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-sm px-5 py-3 rounded-md hover:bg-[hsl(78,36%,46%)] transition-colors group"
                >
                  {SCAN_CTA_LABEL}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/diagnostic"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground/85 px-5 py-3 rounded-md border border-border/60 hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  Learn About the Diagnostic
                </Link>
              </div>
              <p className="text-xs text-muted-foreground/75 leading-relaxed">
                The Operational Friction Scan is a 2-minute directional read.
                The deeper Diagnostic reviews the operating structure behind
                what the Scan surfaces. Contact RGS if you want help deciding
                what scope fits.
              </p>
            </div>
          </div>

          <div className="premium-card hover:transform-none">
            <form
              className="space-y-5"
              onSubmit={(e) => { e.preventDefault(); }}
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input type="text" id="name" className="input-field" placeholder="Your name" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input type="email" id="email" className="input-field" placeholder="you@company.com" />
              </div>
              <div>
                <label htmlFor="trade" className="block text-sm font-medium text-foreground mb-2">Trade / Industry</label>
                <input type="text" id="trade" className="input-field" placeholder="e.g., HVAC, Roofing, General Contracting" />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">What's going on?</label>
                <textarea
                  id="message"
                  rows={5}
                  className="input-field resize-none"
                  placeholder="Tell us a bit about your trade business and what you're looking to improve."
                />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">
                Request a Review Session
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/40">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Mail size={18} className="text-primary/70" />
                <span>Or email directly — we'll get back to you within a business day.</span>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </Layout>
  );
};

export default Contact;
