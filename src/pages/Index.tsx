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
      <section className="min-h-[90vh] flex items-center px-6 grid-bg relative overflow-hidden">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-tight text-foreground">
              Your Business Isn't Broken.
              <br />
              <span className="text-primary">Your Systems Are.</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              We identify where your revenue is leaking, where your process
              breaks, and what's preventing stable growth — then design the
              system to fix it.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a href={mailtoLink} className="btn-primary group">
                Request a Diagnostic
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </a>
            </div>

            <p className="mt-4 text-sm text-muted-foreground/70">
              Built for service businesses, trades, and owners who need
              structure — not more noise.
            </p>
          </motion.div>

          {/* Right decorative element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative w-72 h-72">
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-[spin_30s_linear_infinite]" />
              <div className="absolute inset-6 rounded-full border border-accent/15 animate-[spin_25s_linear_infinite_reverse]" />
              <div className="absolute inset-12 rounded-full border border-primary/25 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-[4.5rem] rounded-full border border-accent/10 animate-[spin_35s_linear_infinite_reverse]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-primary/60" />
              </div>
              {[0, 72, 144, 216, 288].map((deg) => (
                <div
                  key={deg}
                  className="absolute w-2 h-2 rounded-full bg-accent/40"
                  style={{
                    top: `${50 - 45 * Math.cos((deg * Math.PI) / 180)}%`,
                    left: `${50 + 45 * Math.sin((deg * Math.PI) / 180)}%`,
                  }}
                />
              ))}
            </div>
          </motion.div>
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
