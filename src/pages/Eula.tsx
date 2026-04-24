import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";

const EFFECTIVE_DATE = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const Eula = () => {
  return (
    <Layout>
      <SEO
        title="End User License Agreement (EULA) — Revenue & Growth Systems"
        description="The End User License Agreement governing your use of Revenue & Growth Systems software, tools, and services."
        canonical="/eula"
      />
      <Section className="pt-32">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-3 leading-[1.1]">
            End User License Agreement (EULA)
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            Effective Date: {EFFECTIVE_DATE}
          </p>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <p>
              This End User License Agreement (&ldquo;Agreement&rdquo;) is a legal agreement
              between you (&ldquo;User&rdquo;) and Revenue &amp; Growth Systems LLC
              (&ldquo;RGS&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;)
              governing your use of our software, tools, and services.
            </p>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">1. License Grant</h2>
              <p>
                RGS grants you a limited, non-exclusive, non-transferable, revocable license
                to access and use our software and systems for business analysis and
                operational insights.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">2. Use of Services</h2>
              <p className="mb-3">You agree to use the platform only for lawful purposes.</p>
              <p className="mb-2">You may not:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Reverse engineer or attempt to extract source code</li>
                <li>Resell or redistribute the platform</li>
                <li>Use the system to store or transmit harmful or illegal content</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">3. Data Integration</h2>
              <p className="mb-3">
                Our platform may connect to third-party services to analyze business
                performance.
              </p>
              <p className="mb-3">
                By connecting accounts, you authorize RGS to access and process your data
                solely to deliver insights.
              </p>
              <p>RGS does not modify or control your third-party data.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">4. No Guarantee of Results</h2>
              <p className="mb-3">
                RGS provides analysis and recommendations but does not guarantee revenue
                increases or business outcomes.
              </p>
              <p>You are responsible for implementation and results.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">5. Ownership</h2>
              <p>
                All RGS systems, frameworks, and tools remain the property of Revenue &amp;
                Growth Systems LLC.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">6. Termination</h2>
              <p>
                We may suspend or terminate access for misuse or violation of this Agreement.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
              <p>
                RGS is not liable for loss of revenue, business interruption, or indirect
                damages.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-foreground mb-3">8. Changes</h2>
              <p>We may update this Agreement at any time.</p>
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

export default Eula;