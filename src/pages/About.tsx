import { useState } from "react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import ShareButtons from "@/components/ShareButtons";
import CTAStack from "@/components/CTAStack";
import DownloadModal from "@/components/DownloadModal";
import { Search, ClipboardList, Compass } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Revenue Systems Review",
    description: "We start with a structured working session — walking through your numbers at a practical level. Revenue flow, lead sources, close rates, and capacity. We identify what's being tracked, what isn't, and whether deeper diagnostic work is needed.",
  },
  {
    icon: ClipboardList,
    title: "Revenue Diagnostic",
    description: "A paid engagement designed for serious trade business owners who want clarity and a clear plan. Includes a structured audit with key metric identification, revenue flow analysis, and a written report with a prioritized roadmap.",
  },
  {
    icon: Compass,
    title: "Structured Implementation Support",
    description: "We work alongside you to execute the roadmap — phased execution with clear priorities, a regular review rhythm, measurable accountability, and ongoing refinement. Typically runs 3–6 months.",
  },
];

const About = () => {
  const [downloadOpen, setDownloadOpen] = useState(false);

  return (
    <Layout>
      {/* Philosophy */}
      <Section className="pt-28">
        <div className="flex items-start justify-between mb-6">
          <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground max-w-3xl text-balance">
            Most Owner-led businesses don't have a sales problem. They have a systems problem.
          </h1>
        </div>
        <div className="mb-6">
          <ShareButtons title="About RGS — Most trade businesses don't have a sales problem" />
        </div>
        <div className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          <p>
            Revenue doesn't stall because operators stop working hard. It stalls when visibility breaks down — when tracking is inconsistent, margins are not measured clearly, and operating behavior drifts.
          </p>
          <p>
            Growth without structure creates volatility.
          </p>
          <p>
            We work with owner-led trade and service businesses to install disciplined revenue systems — the tracking, cadence, and accountability required for stability under pressure.
          </p>
          <p>
            No hype. No theory.<br />
            Just a measurable structure that holds.
          </p>
        </div>
      </Section>

      {/* Our Approach */}
      <Section className="border-t border-border">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
          Our Approach
        </h2>
        <div className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          <p>
            Revenue &amp; Growth Systems is built on two core principles: <span className="text-foreground font-medium">data over emotion</span>, and <span className="text-foreground font-medium">structure over chaos</span>.
          </p>
          <p>
            Many trade businesses operate on instinct and urgency. We believe long-term success comes from revenue visibility, defined processes, and disciplined execution. Not because instinct is wrong — but because instinct without data is unreliable, and effort without structure is unsustainable.
          </p>
          <p>
            Every recommendation we make is grounded in what the numbers actually show. Every system we help build is designed to create consistency — so growth doesn't depend on heroics, and decisions don't depend on mood.
          </p>
        </div>
      </Section>

      {/* Mission */}
      <Section className="border-t border-border">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          Why we do this work
        </h2>
        <div className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          <p>
            More than half of small businesses fail to make it past the first five years.
          </p>
          <p>
            Not because the owners lack effort.<br />
            Not because they lack skill.
          </p>
          <p>
            They fail because they lack structural control.
          </p>
          <p>
            Revenue volatility isn't random.<br />
            Margin compression isn't mysterious.<br />
            Operational chaos isn't inevitable.
          </p>
          <p>
            It's structural.
          </p>
          <p>
            Capable operators should not be trapped in reactive cycles — guessing at performance, carrying unnecessary operational weight, or hoping growth will fix instability.
          </p>
          <p>
            Discipline changes that.
          </p>
          <p>
            When revenue visibility improves, decisions sharpen.<br />
            When tracking becomes structured, volatility declines.<br />
            When operating behavior stabilizes, growth becomes sustainable.
          </p>
          <p>
            This work isn't about motivation.<br />
            It's about installing structure where it was missing.
          </p>
          <p className="text-sm text-primary font-medium">
            Clarity. Control. Predictable Revenue.
          </p>
        </div>
      </Section>

      {/* How We Work */}
      <Section className="border-t border-border">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          How we work
        </h2>
        <p className="text-muted-foreground text-sm mb-10 max-w-2xl leading-relaxed">
          We follow a clear three-step engagement model. Each step builds on the last.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.title} className="space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {i + 1}
                </span>
                <step.icon className="text-primary" size={22} />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Specialization */}
      <Section className="border-t border-border">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          Who we work with
        </h2>
        <div className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          <p>
            We specialize in <span className="text-foreground font-medium">owner-led services to trade businesses</span>.
          </p>
          <p>
            We work with owner-led trade and service businesses that are already operating — and ready to replace volatility with structure.
          </p>
          <p>
            Our clients typically:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Generate consistent revenue but experience fluctuation</li>
            <li>Carry too much operational responsibility at the ownership level</li>
            <li>Lack structured tracking across revenue, margins, and performance</li>
            <li>Feel growth happening — but without control</li>
          </ul>
          <p>
            They are not looking for motivation.<br />
            They are looking for discipline.
          </p>
          <p>
            They understand that systems, not effort, determine long-term stability.
          </p>
        </div>
      </Section>

      {/* Founder */}
      <Section className="border-t border-border">
        <div className="flex flex-col md:flex-row gap-10 items-start">
          <div className="w-40 h-52 rounded-lg bg-muted/50 border border-dashed border-border flex-shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground mb-1">
              John Matthew Chubb
            </h2>
            <p className="text-primary font-medium text-sm mb-4">
              Founder &amp; Revenue Systems Advisor
            </p>
            <div className="max-w-xl space-y-4 text-muted-foreground leading-relaxed text-sm">
              <p>
                Revenue &amp; Growth Systems exists to help owner-led businesses replace chaos with structure.
              </p>
              <p>
                John focuses on what's actually happening in the numbers — where visibility is missing, where discipline has slipped, and where revenue becomes emotional instead of measurable. From there, the work is simple: clarify, structure, and stabilize.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA Stack */}
      <Section>
        <CTAStack onDownloadClick={() => setDownloadOpen(true)} />
      </Section>

      <DownloadModal open={downloadOpen} onClose={() => setDownloadOpen(false)} />
    </Layout>
  );
};

export default About;
