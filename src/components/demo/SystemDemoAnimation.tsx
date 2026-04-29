import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  type LucideIcon,
  CheckCircle2,
  TrendingUp,
  Users,
  ShoppingCart,
  Wrench,
  LineChart,
  UserCog,
  ClipboardList,
  MessageSquare,
  Database,
  FileUp,
  ShieldCheck,
  Target,
  Eye,
  Layers,
  ListChecks,
  UserPlus,
  AlertTriangle,
  Clock,
  Compass,
} from "lucide-react";

/**
 * Public-safe, sandbox-data system demo — premium 70–80s ad cut for the
 * RGS ideal buyer (owner-led trade/service operator).
 *
 * Story arc (12 scenes):
 *   1. Hook part 1
 *   2. Hook part 2
 *   3. Buyer pain (operator-specific)
 *   4. The cost of guessing
 *   5. What RGS is
 *   6. What RGS diagnoses (5 break points)
 *   7. How RGS works (5-step path)
 *   8. Data / tool layer (connect or import)
 *   9. Revenue leak signal
 *   10. Priority (fix first / fix next / monitor)
 *   11. Execution (tasks, ownership, follow-up, outcomes)
 *   12. Why choose RGS + Scorecard CTA (text only)
 *
 * Protects RGS internal logic — shows shape, not mechanics.
 * No clickable buttons inside the frame (social-video safe).
 *
 * Audio: handled outside this component. The /demo page renders a separate
 * sound toggle below the frame; this component never auto-plays audio.
 * For exported social/video versions, bake in the same music bed at low
 * volume with a 1s fade-in and 2s fade-out.
 */

type SceneKey =
  | "hook1"
  | "hook2"
  | "pain"
  | "guessCost"
  | "whatIs"
  | "industries"
  | "diagnose"
  | "howItWorks"
  | "dataLayer"
  | "leak"
  | "priority"
  | "execution"
  | "ctaCombined";

interface Scene {
  key: SceneKey;
  durationMs: number;
}

const SCENES: Scene[] = [
  { key: "hook1",        durationMs: 3200 },
  { key: "hook2",        durationMs: 3800 },
  { key: "pain",         durationMs: 6400 },
  { key: "guessCost",    durationMs: 5400 },
  { key: "whatIs",       durationMs: 5400 },
  { key: "industries",   durationMs: 5200 },
  { key: "diagnose",     durationMs: 5400 },
  { key: "howItWorks",   durationMs: 5400 },
  { key: "dataLayer",    durationMs: 5200 },
  { key: "leak",         durationMs: 5400 },
  { key: "priority",     durationMs: 5000 },
  { key: "execution",    durationMs: 5000 },
  { key: "ctaCombined",  durationMs: 6800 },
];

export default function SystemDemoAnimation() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % SCENES.length);
    }, SCENES[index].durationMs);
    return () => clearTimeout(t);
  }, [index]);

  const scene = SCENES[index];

  return (
    <div
      className="relative w-full max-w-full aspect-[4/5] sm:aspect-[5/4] md:aspect-video rounded-xl overflow-hidden border border-border/60 bg-[hsl(0_0%_8%)]"
      role="img"
      aria-label="RGS system demo animation, sandbox data"
    >
      {/* subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.10] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(78 24% 60% / 0.18) 1px, transparent 1px), linear-gradient(90deg, hsl(78 24% 60% / 0.18) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full bg-[hsl(78_36%_35%/0.06)] blur-[120px] pointer-events-none" />

      {/* Tiny non-blocking sandbox pill — top-right, both desktop and mobile */}
      <div
        className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-20 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-[hsl(78_24%_60%/0.3)] bg-[hsl(0_0%_8%/0.7)]"
        aria-label="Sandbox data indicator"
      >
        <span className="w-1 h-1 rounded-full bg-[hsl(78,24%,60%)]" />
        <span className="text-[8px] md:text-[9px] uppercase tracking-[0.18em] text-[hsl(78,24%,72%)]/85 font-semibold leading-none">
          Sandbox
        </span>
      </div>

      {/* scene content */}
      <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 md:px-10 pt-12 md:pt-10 pb-10 overflow-hidden">
        <AnimatePresence mode="wait">
          <SceneRenderer key={scene.key} sceneKey={scene.key} />
        </AnimatePresence>
      </div>

      {/* progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/[0.06]">
        <motion.div
          key={index}
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: scene.durationMs / 1000, ease: "linear" }}
          className="h-full bg-[hsl(78,34%,46%)]"
        />
      </div>

      {/* scene chip indicator (bottom progress dots) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SCENES.map((s, i) => (
          <span
            key={s.key}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === index
                ? "w-6 bg-[hsl(78,34%,52%)]"
                : i < index
                ? "w-2 bg-foreground/50"
                : "w-2 bg-foreground/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as const },
};

function CardGrid({
  items,
  columns = 5,
}: {
  items: { label: string; icon: LucideIcon }[];
  columns?: number;
}) {
  const colClass =
    columns === 5
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
      : columns === 4
      ? "grid-cols-2 md:grid-cols-4"
      : "grid-cols-3";
  return (
    <div className={`grid ${colClass} gap-2.5 md:gap-3 w-full`}>
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 + i * 0.08, duration: 0.4 }}
          className="flex flex-col items-center justify-center text-center gap-2 px-2 py-3 md:py-4 rounded-lg border border-[hsl(0_0%_22%)] bg-[hsl(0_0%_14%)] shadow-[0_1px_0_hsl(0_0%_100%/0.03)_inset]"
        >
          <it.icon
            size={20}
            strokeWidth={1.75}
            className="text-[hsl(78,32%,72%)]"
          />
          <span className="text-[12px] md:text-sm font-semibold text-foreground leading-tight">
            {it.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function SceneShell({
  eyebrow,
  headline,
  caption,
  children,
  accent,
}: {
  eyebrow?: string;
  headline?: React.ReactNode;
  caption?: string;
  children?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <motion.div {...fade} className="w-full max-w-3xl flex flex-col items-center text-center">
      {eyebrow && (
        <p className="text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-[hsl(78,24%,60%)] mb-3 md:mb-4 font-semibold">
          {eyebrow}
        </p>
      )}
      {headline && (
        <h3
          className={`font-display font-semibold text-foreground leading-[1.2] tracking-tight mb-4 md:mb-5 ${
            accent
              ? "text-xl md:text-3xl lg:text-4xl"
              : "text-lg md:text-2xl lg:text-[1.75rem]"
          }`}
        >
          {headline}
        </h3>
      )}
      {children}
      {caption && (
        <p className="text-xs md:text-sm text-foreground/75 leading-relaxed mt-4 md:mt-5 max-w-2xl">
          {caption}
        </p>
      )}
    </motion.div>
  );
}

function SceneRenderer({ sceneKey }: { sceneKey: SceneKey }) {
  switch (sceneKey) {
    case "hook1":
      return (
        <motion.div {...fade} className="text-center max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[hsl(78,24%,60%)] mb-6 font-semibold">
            Question
          </p>
          <h3 className="font-display text-2xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-[1.15] tracking-tight">
            Are you reacting to problems…
          </h3>
        </motion.div>
      );

    case "hook2":
      return (
        <motion.div {...fade} className="text-center max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[hsl(78,24%,60%)] mb-6 font-semibold">
            Or
          </p>
          <h3 className="font-display text-2xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-[1.15] tracking-tight">
            …or operating with a system that{" "}
            <span className="text-[hsl(78,28%,62%)]">guides the solution</span>?
          </h3>
        </motion.div>
      );

    case "pain":
      return (
        <SceneShell
          eyebrow="If this sounds familiar"
          headline={
            <>
              The day-to-day starts running{" "}
              <span className="text-[hsl(78,28%,62%)]">you</span>.
            </>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 w-full">
            {[
              { label: "Leads come in, follow-up slips", icon: Clock },
              { label: "Revenue moves, profit feels unclear", icon: Eye },
              { label: "Cash gets tight before anyone sees why", icon: AlertTriangle },
              { label: "Every decision still runs through the owner", icon: UserCog },
            ].map((it, i) => (
              <motion.div
                key={it.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.1, duration: 0.4 }}
                className="flex flex-col items-center justify-center text-center gap-2 px-2 py-3 md:py-4 rounded-lg border border-[hsl(0_0%_22%)] bg-[hsl(0_0%_14%)]"
              >
                <it.icon size={20} strokeWidth={1.75} className="text-[hsl(38,55%,70%)]" />
                <span className="text-[12px] md:text-sm font-semibold text-foreground leading-tight">
                  {it.label}
                </span>
              </motion.div>
            ))}
          </div>
        </SceneShell>
      );

    case "guessCost":
      return (
        <SceneShell
          eyebrow="The cost of guessing"
          headline={
            <>
              Guesswork is{" "}
              <span className="text-[hsl(78,28%,62%)]">expensive</span>.
            </>
          }
          caption="Not because the owner is lazy. Because the system is unclear."
        >
          <div className="relative w-full max-w-xl h-24 md:h-28">
            {/* Scattered signals tightening into one operating view */}
            {[
              { x: "8%",  y: "10%", delay: 0.10 },
              { x: "26%", y: "70%", delay: 0.15 },
              { x: "44%", y: "20%", delay: 0.20 },
              { x: "62%", y: "60%", delay: 0.25 },
              { x: "80%", y: "15%", delay: 0.30 },
              { x: "92%", y: "65%", delay: 0.35 },
            ].map((d, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, left: d.x, top: d.y, scale: 0.6 }}
                animate={{
                  opacity: [0, 1, 1, 0.85],
                  left: ["50%", "50%"],
                  top: ["50%", "50%"],
                  scale: 1,
                }}
                transition={{ delay: d.delay, duration: 1.6, ease: "easeInOut" }}
                className="absolute w-2 h-2 rounded-full bg-[hsl(78,40%,62%)] -translate-x-1/2 -translate-y-1/2"
              />
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md border border-[hsl(78_30%_55%/0.5)] bg-[hsl(78_36%_35%/0.18)]"
            >
              <span className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-[hsl(78,32%,76%)] font-semibold">
                One operating view
              </span>
            </motion.div>
          </div>
        </SceneShell>
      );

    case "whatIs":
      return (
        <SceneShell
          eyebrow="What RGS is"
          headline={
            <>
              A{" "}
              <span className="text-[hsl(78,28%,62%)]">Revenue Control System™</span>{" "}
              for owner-led businesses.
            </>
          }
          caption="See what is breaking, what it is costing, and what to fix first."
          accent
        />
      );

    case "industries":
      return (
        <SceneShell
          eyebrow="Configured by industry"
          headline={
            <>
              Different industries.{" "}
              <span className="text-[hsl(78,28%,62%)]">One control system</span>.
            </>
          }
          caption="Tools and workflows stay in the right lane. Admin-controlled access prevents cross-over."
        >
          <CardGrid
            columns={5}
            items={[
              { label: "Trade / Field Service", icon: Wrench },
              { label: "Retail", icon: ShoppingCart },
              { label: "Restaurant", icon: Users },
              { label: "MMJ / Cannabis", icon: ShieldCheck },
              { label: "General Service", icon: Compass },
            ]}
          />
        </SceneShell>
      );

    case "diagnose":
      return (
        <SceneShell
          eyebrow="The five places revenue breaks"
          headline={
            <>
              RGS looks across the{" "}
              <span className="text-[hsl(78,28%,62%)]">five places</span>{" "}
              revenue breaks.
            </>
          }
          caption="Most owners feel the symptoms before they can see the system causing them."
        >
          <CardGrid
            columns={5}
            items={[
              { label: "Demand", icon: Users },
              { label: "Conversion", icon: ShoppingCart },
              { label: "Operations", icon: Wrench },
              { label: "Financial visibility", icon: LineChart },
              { label: "Owner independence", icon: UserCog },
            ]}
          />
        </SceneShell>
      );

    case "howItWorks":
      return (
        <SceneShell
          eyebrow="How RGS works"
          headline={
            <>
              From owner input to{" "}
              <span className="text-[hsl(78,28%,62%)]">prioritized action</span>.
            </>
          }
          caption="Owner input starts the process. Evidence improves confidence."
        >
          <CardGrid
            columns={5}
            items={[
              { label: "Scorecard", icon: ClipboardList },
              { label: "Diagnostic", icon: MessageSquare },
              { label: "Evidence", icon: ShieldCheck },
              { label: "Priority Roadmap", icon: ListChecks },
              { label: "Action", icon: Target },
            ]}
          />
        </SceneShell>
      );

    case "dataLayer":
      return (
        <SceneShell
          eyebrow="Data and tools"
          headline={
            <>
              Better signals.{" "}
              <span className="text-[hsl(78,28%,62%)]">Less owner time wasted</span>.
            </>
          }
          caption="Business tools can connect or import data over time. QuickBooks sandbox data shown here."
        >
          <CardGrid
            columns={4}
            items={[
              { label: "QuickBooks (sandbox)", icon: Database },
              { label: "Spreadsheet import", icon: FileUp },
              { label: "Owner interview", icon: MessageSquare },
              { label: "Uploaded evidence", icon: ShieldCheck },
            ]}
          />
        </SceneShell>
      );

    case "leak":
      return (
        <SceneShell
          eyebrow="Revenue leak"
          headline={
            <>
              Potential revenue leak{" "}
              <span className="text-[hsl(78,28%,62%)]">detected</span>.
            </>
          }
          caption="Sandbox signals show how RGS surfaces patterns from connected and imported data."
        >
          <div className="w-full max-w-xl space-y-2.5 md:space-y-3">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-[hsl(0_0%_22%)] bg-[hsl(0_0%_14%)]"
            >
              <AlertTriangle size={16} className="text-[hsl(38,70%,72%)]" strokeWidth={1.85} />
              <span className="text-xs md:text-sm font-semibold text-foreground">
                Payment delay pattern found
              </span>
              <span className="ml-auto text-[10px] md:text-[11px] uppercase tracking-widest text-foreground/65 font-semibold">
                Sandbox
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-[hsl(78_30%_55%/0.5)] bg-[hsl(78_36%_35%/0.14)]"
            >
              <Clock size={16} className="text-[hsl(78,40%,62%)]" strokeWidth={2} />
              <span className="text-xs md:text-sm font-semibold text-foreground">
                Follow-up gap identified
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
              className="rounded-lg border border-[hsl(0_0%_22%)] bg-[hsl(0_0%_14%)] px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] md:text-[11px] uppercase tracking-widest text-foreground/70 mb-1 font-semibold">
                  Operating revenue
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs md:text-sm text-foreground/55 line-through">
                    $82,500
                  </span>
                  <span className="font-display text-lg md:text-2xl font-semibold text-[hsl(78,38%,78%)]">
                    $84,200
                  </span>
                </div>
              </div>
              <TrendingUp
                size={22}
                className="text-[hsl(78,34%,52%)]"
                strokeWidth={1.75}
              />
            </motion.div>
          </div>
        </SceneShell>
      );

    case "priority":
      return (
        <SceneShell
          eyebrow="Priority"
          headline={
            <>
              Not every problem gets{" "}
              <span className="text-[hsl(78,28%,62%)]">fixed first</span>.
            </>
          }
          caption="RGS ranks what matters most so the owner does not chase noise."
        >
          <div className="grid grid-cols-3 gap-2.5 md:gap-3 w-full">
            {[
              {
                rank: "1",
                label: "Fix first",
                icon: Target,
                border: "border-[hsl(78_30%_55%/0.55)]",
                bg: "bg-[hsl(78_36%_35%/0.16)]",
                tone: "text-[hsl(78,34%,76%)]",
              },
              {
                rank: "2",
                label: "Fix next",
                icon: Layers,
                border: "border-[hsl(0_0%_26%)]",
                bg: "bg-[hsl(0_0%_15%)]",
                tone: "text-foreground",
              },
              {
                rank: "3",
                label: "Monitor",
                icon: Eye,
                border: "border-[hsl(0_0%_22%)]",
                bg: "bg-[hsl(0_0%_14%)]",
                tone: "text-foreground/75",
              },
            ].map((it, i) => (
              <motion.div
                key={it.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.45 }}
                className={`flex flex-col items-center justify-center text-center gap-2 px-2 py-4 rounded-lg border ${it.border} ${it.bg}`}
              >
                <span className="text-[10px] md:text-[11px] uppercase tracking-widest text-foreground/65 font-semibold">
                  Priority {it.rank}
                </span>
                <it.icon size={22} strokeWidth={1.75} className={it.tone} />
                <span className="text-[12px] md:text-sm font-semibold text-foreground leading-tight">
                  {it.label}
                </span>
              </motion.div>
            ))}
          </div>
        </SceneShell>
      );

    case "execution":
      return (
        <SceneShell
          eyebrow="Execution path"
          headline={
            <>
              Diagnosis becomes{" "}
              <span className="text-[hsl(78,28%,62%)]">execution</span>.
            </>
          }
          caption="Tasks. Ownership. Follow-up. Outcomes."
        >
          <CardGrid
            columns={4}
            items={[
              { label: "Tasks", icon: ListChecks },
              { label: "Ownership", icon: UserPlus },
              { label: "Follow-up", icon: Clock },
              { label: "Outcomes", icon: CheckCircle2 },
            ]}
          />
        </SceneShell>
      );

    case "ctaCombined":
      return (
        <motion.div {...fade} className="text-center max-w-2xl w-full">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] md:tracking-[0.25em] text-[hsl(78,24%,60%)] mb-3 md:mb-4 font-semibold">
            Why owners choose RGS
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-2.5 mb-4 md:mb-6">
            {[
              { label: "Less guessing", icon: Compass },
              { label: "More visibility", icon: Eye },
              { label: "Clearer priorities", icon: ListChecks },
              { label: "Control over what's next", icon: ShieldCheck },
            ].map((it, i) => (
              <motion.div
                key={it.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                className="flex flex-col items-center justify-center text-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-2 md:py-2.5 rounded-md border border-[hsl(78_30%_55%/0.35)] bg-[hsl(78_36%_35%/0.10)]"
              >
                <it.icon size={14} strokeWidth={1.75} className="text-[hsl(78,32%,72%)] md:!w-4 md:!h-4" />
                <span className="text-[10px] md:text-xs font-semibold text-foreground leading-tight break-words">
                  {it.label}
                </span>
              </motion.div>
            ))}
          </div>
          <p className="font-display text-base md:text-2xl lg:text-[1.6rem] font-semibold text-foreground leading-[1.25] tracking-tight">
            Install a system that gives you control.
          </p>
          <p className="text-[11px] md:text-sm text-foreground/70 mt-1.5 md:mt-2 mb-2 md:mb-3">
            — Revenue & Growth Systems
          </p>
          <p className="text-[12px] md:text-base text-foreground/85 leading-snug md:leading-relaxed">
            See how stable your business really is —{" "}
            <span className="text-[hsl(78,28%,62%)] font-semibold">
              Get Your Business Score (0–1000)
            </span>
            .
          </p>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.22em] text-[hsl(78,24%,60%)] font-semibold mt-3 md:mt-4">
            Link below the video
          </p>
        </motion.div>
      );
  }
}

const TOTAL_MS = SCENES.reduce((sum, s) => sum + s.durationMs, 0);
export { TOTAL_MS as DEMO_TOTAL_MS };
