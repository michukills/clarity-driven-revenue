import { motion } from "framer-motion";
import { ArrowRight, Search, TrendingDown, Cog, BarChart3, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Section from "@/components/Section";

const mailtoLink =
  "mailto:info@revenueandgrowthsystems.com?subject=RGS Diagnostic Inquiry";

const pageCards = [
  {
    icon: Search,
    title: "What We Do",
    description: "Discover how we identify system breakdowns and design solutions that remove them.",
    path: "/what-we-do",
  },
  {
    icon: Cog,
    title: "The System",
    description: "Explore the five interlocking pillars of the RGS Stability System™.",
    path: "/system",
  },
  {
    icon: BarChart3,
    title: "The Diagnostic",
    description: "See what's included in our Operational & Revenue Pain Point Discovery.",
    path: "/diagnostic",
  },
];

const Index = () => {
  return (
    <Layout>
      {/* ── HERO ── */}
      <section className="min-h-[92vh] flex items-center pt-32 pb-20 px-6 grid-bg relative overflow-hidden">
        {/* Radial glow — center-right, very subtle */}
        <div className="absolute top-1/2 right-[15%] -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#6B7B3A]/[0.07] blur-[140px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[60%_40%] gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[3.75rem] font-bold leading-[1.08] tracking-tight text-foreground">
              Your Business Isn't Broken.
              <br />
              <span className="text-accent">Your Systems Are.</span>
            </h1>

            <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              We identify where your revenue is leaking, where your process
              breaks, and what's preventing stable growth — then design the
              system to fix it.
            </p>

            <div className="mt-12 flex flex-wrap gap-4">
              <a
                href={mailtoLink}
                className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-7 py-3.5 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_hsl(78_36%_35%/0.55)] group"
              >
                Request a Diagnostic
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </a>
            </div>

            <p className="mt-5 text-sm text-muted-foreground/60">
              Built for service businesses, trades, and owners who need
              structure — not more noise.
            </p>
          </motion.div>

          {/* Right side — empty with depth glow only */}
          <div className="hidden lg:block relative h-[400px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#6B7B3A]/[0.06] blur-[100px] pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── EXPLORE PAGES ── */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 text-center">
          Explore RGS
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          We install disciplined systems into service businesses. Here's how.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pageCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <Link
                to={card.path}
                className="group block p-8 rounded-xl bg-card/80 border border-border/60 transition-all duration-300 hover:border-primary/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_-12px_hsl(78_36%_35%/0.2)]"
              >
                <card.icon
                  className="text-primary mb-5 transition-transform duration-300 group-hover:scale-110"
                  size={28}
                />
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {card.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {card.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                  Learn more
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>
    </Layout>
  );
};

export default Index;
