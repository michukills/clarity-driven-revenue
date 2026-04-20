import Layout from "@/components/Layout";
import Section from "@/components/Section";
import { Mail, ArrowRight } from "lucide-react";

const Contact = () => {
  return (
    <Layout>
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
