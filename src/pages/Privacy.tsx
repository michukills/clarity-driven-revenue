import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";

const EFFECTIVE_DATE = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const Privacy = () => {
  return (
    <Layout>
      <SEO
        title="Privacy Policy — Revenue & Growth Systems"
        description="How Revenue & Growth Systems collects, uses, and protects your information."
        canonical="/privacy"
      />
      <Section className="pt-32">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-3 leading-[1.1]">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            Effective Date: {EFFECTIVE_DATE}
          </p>

          <div className="mb-8 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-xs text-foreground/80">
            Draft placeholder for legal review. This document is provided as a
            starting point and must be reviewed and finalized by qualified
            legal counsel before production use.
          </div>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <p>
              Revenue &amp; Growth Systems LLC (&ldquo;RGS&rdquo;, &ldquo;we&rdquo;,
              &ldquo;our&rdquo;, or &ldquo;us&rdquo;) respects your privacy.
            </p>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Name, email, contact info</li>
                <li>Business information</li>
                <li>Data from connected third-party services</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">2. How We Use Information</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Deliver diagnostics and insights</li>
                <li>Improve system performance</li>
                <li>Communicate and support users</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">3. Third-Party Integrations</h2>
              <p className="mb-2">When you connect accounts:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Data is accessed via secure APIs</li>
                <li>Data is not sold</li>
                <li>Data is not modified</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">4. Data Security</h2>
              <p>
                We use reasonable safeguards but cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">5. Data Sharing</h2>
              <p className="mb-3">We do NOT sell or rent data.</p>
              <p>We only share if required by law or for platform operation.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
              <p>You may request access or deletion of your data.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">7. Cookies</h2>
              <p>We may use analytics tools to improve performance.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">8. Changes</h2>
              <p>Policy may be updated periodically.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">9. Contact</h2>
              <p className="mb-1">Revenue &amp; Growth Systems LLC</p>
              <p>
                <a
                  href="mailto:info@revenueandgrowthsystems.com"
                  className="text-primary hover:underline"
                >
                  info@revenueandgrowthsystems.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </Section>
    </Layout>
  );
};

export default Privacy;