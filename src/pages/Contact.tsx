import Layout from "@/components/Layout";
import Section from "@/components/Section";
import { Mail, ArrowRight } from "lucide-react";

const Contact = () => {
  return (
    <Layout>
      <Section className="pt-28">
        <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4">
          Schedule Your Revenue Systems Review
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mb-4">
          The Revenue Systems Review is a structured working session built for owner-led trade businesses. We walk through your core numbers — revenue flow, lead sources, close rates, and capacity — and assess what's being tracked, what isn't, and where structure is missing.
        </p>
        <p className="text-muted-foreground text-lg max-w-2xl mb-4">
          This is a surface-level review to give you clarity on where things stand. If deeper diagnostic work is needed, we'll outline the next step clearly — no pressure, no obligation.
        </p>
        <p className="text-sm max-w-2xl mb-12 text-primary">
          Review → Revenue Diagnostic → Structured Implementation Support. One step at a time.
        </p>

        <div className="max-w-xl">
          <form
            className="space-y-5"
            onSubmit={(e) => { e.preventDefault(); }}
          >
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">Name</label>
              <input type="text" id="name" className="input-field" placeholder="Your name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input type="email" id="email" className="input-field" placeholder="you@company.com" />
            </div>
            <div>
              <label htmlFor="trade" className="block text-sm font-medium text-foreground mb-1.5">Trade / Industry</label>
              <input type="text" id="trade" className="input-field" placeholder="e.g., HVAC, Roofing, General Contracting" />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1.5">What's going on?</label>
              <textarea
                id="message"
                rows={5}
                className="input-field resize-none"
                placeholder="Tell us a bit about your trade business and what you're looking to improve."
              />
            </div>
            <button type="submit" className="btn-primary">
              Request a Review Session
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-border">
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <Mail size={18} className="text-primary" />
              <span>Or email directly — we'll get back to you within a business day.</span>
            </div>
          </div>
        </div>
      </Section>
    </Layout>
  );
};

export default Contact;
