import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  type LucideIcon,
  CheckCircle2,
  FileText,
  TrendingUp,
  Activity,
  Zap,
  Users,
  ShoppingCart,
  Wrench,
  LineChart,
  UserCog,
  ClipboardList,
  MessageSquare,
  Database,
  FileUp,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  Target,
  Eye,
  Layers,
  Network,
  ListChecks,
  UserPlus,
  TrendingDown,
} from "lucide-react";

/**
 * Public-safe, sandbox-data system demo.
 * 9-scene story: Hook → Diagnose → Inputs → Evidence → Leak → Priority → Execution → Control → CTA
 * Protects RGS internal logic — shows shape, not mechanics.
 */

type SceneKey =
  | "hook1"
  | "hook2"
  | "diagnose"
  | "inputs"
  | "evidence"
  | "leak"
  | "priority"
  | "execution"
  | "control"
  | "cta";

interface Scene {
  key: SceneKey;
  durationMs: number;
}

const SCENES: Scene[] = [
  { key: "hook1", durationMs: 3200 },
  { key: "hook2", durationMs: 3800 },
  { key: "diagnose", durationMs: 5400 },
  { key: "inputs", durationMs: 5200 },
  { key: "evidence", durationMs: 4800 },
  { key: "leak", durationMs: 5400 },
  { key: "priority", durationMs: 4800 },
  { key: "execution", durationMs: 4600 },
  { key: "control", durationMs: 3600 },
  { key: "cta", durationMs: 5400 },
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
      className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/60 bg-[hsl(0_0%_8%)]"
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

      {/* sandbox data label — always visible */}
      <div className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[hsl(78_24%_60%/0.35)] bg-[hsl(0_0%_8%/0.85)] backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(78,24%,60%)] animate-pulse" />
        <span className="text-[10px] uppercase tracking-widest text-[hsl(78,24%,72%)] font-semibold">
          Demo / Sandbox Data
        </span>
      </div>

      {/* RGS mark */}
      <div className="absolute top-4 right-4 z-20 text-[10px] uppercase tracking-widest text-foreground/40 font-semibold">
        RGS · System Demo
      </div>

      {/* scene content */}
      <div className="absolute inset-0 flex items-center justify-center p-6 md:p-10 pt-14 md:pt-14 pb-10">
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

    case "diagnose":
      return (
        <SceneShell
          eyebrow="What RGS diagnoses"
          headline={
            <>
              RGS diagnoses where{" "}
              <span className="text-[hsl(78,28%,62%)]">revenue breaks</span>.
            </>
          }
          caption="Most businesses feel the symptoms before they can see the system causing them."
        >
          <CardGrid
            columns={5}
            items={[
              { label: "Leads", icon: Users },
              { label: "Sales", icon: ShoppingCart },
              { label: "Operations", icon: Wrench },
              { label: "Financial visibility", icon: LineChart },
              { label: "Owner dependence", icon: UserCog },
            ]}
          />
        </SceneShell>
      );

    case "inputs":
      return (
        <SceneShell
          eyebrow="Inputs"
          headline={
            <>
              Owner input is only the{" "}
              <span className="text-[hsl(78,28%,62%)]">starting point</span>.
            </>
          }
          caption="RGS separates what the owner reports from what the evidence supports."
        >
          <CardGrid
            columns={4}
            items={[
              { label: "Scorecard", icon: ClipboardList },
              { label: "Interview", icon: MessageSquare },
              { label: "QuickBooks sandbox data", icon: Database },
              { label: "Uploaded evidence", icon: FileUp },
            ]}
          />
        </SceneShell>
      );

    case "evidence":
      return (
        <SceneShell
          eyebrow="Evidence"
          headline={
            <>
              Evidence changes{" "}
              <span className="text-[hsl(78,28%,62%)]">confidence</span>.
            </>
          }
          caption="We do not turn weak inputs into confident recommendations."
        >
          <div className="grid grid-cols-3 gap-2.5 md:gap-3 w-full">
            {[
              {
                label: "Owner-reported",
                icon: HelpCircle,
                tone: "text-foreground/55",
                border: "border-border/50",
                bg: "bg-[hsl(0_0%_12%)]",
                tag: "Low",
              },
              {
                label: "Needs validation",
                icon: ShieldAlert,
                tone: "text-foreground/75",
                border: "border-border/60",
                bg: "bg-[hsl(0_0%_13%)]",
                tag: "Medium",
              },
              {
                label: "Evidence-backed",
                icon: ShieldCheck,
                tone: "text-[hsl(78,28%,72%)]",
                border: "border-[hsl(78_24%_60%/0.4)]",
                bg: "bg-[hsl(78_36%_35%/0.08)]",
                tag: "High",
              },
            ].map((it, i) => (
              <motion.div
                key={it.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.45 }}
                className={`flex flex-col items-center justify-center text-center gap-2 px-2 py-4 rounded-lg border ${it.border} ${it.bg}`}
              >
                <it.icon size={20} strokeWidth={1.6} className={it.tone} />
                <span className="text-[11px] md:text-sm font-medium text-foreground/90 leading-tight">
                  {it.label}
                </span>
                <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Confidence: {it.tag}
                </span>
              </motion.div>
            ))}
          </div>
        </SceneShell>
      );

    case "leak":
      return (
        <SceneShell
          eyebrow="Revenue leak"
          headline={
            <>
              Potential revenue leak{" "}
              <span className="text-[hsl(78,28%,62%)]">identified</span>.
            </>
          }
          caption="QuickBooks sandbox data demonstrates how accounting signals can update the operating picture."
        >
          <div className="w-full max-w-xl space-y-2.5 md:space-y-3">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border/50 bg-[hsl(0_0%_12%)]"
            >
              <FileText size={15} className="text-[hsl(78,28%,68%)]" strokeWidth={1.75} />
              <span className="text-xs md:text-sm font-medium text-foreground">
                Invoice created
              </span>
              <span className="ml-auto text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground">
                Sandbox
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-[hsl(78_24%_60%/0.35)] bg-[hsl(78_36%_35%/0.08)]"
            >
              <Zap size={15} className="text-[hsl(78,34%,58%)]" strokeWidth={2} />
              <span className="text-xs md:text-sm font-medium text-foreground">
                Payment delay signal
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
              className="rounded-lg border border-border/50 bg-[hsl(0_0%_12%)] px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] md:text-[11px] uppercase tracking-widest text-muted-foreground mb-1 font-semibold">
                  Operating revenue
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs md:text-sm text-muted-foreground line-through">
                    $82,500
                  </span>
                  <span className="font-display text-lg md:text-2xl font-semibold text-[hsl(78,28%,72%)]">
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
          <CardGrid
            columns={4}
            items={[
              { label: "Impact", icon: Target },
              { label: "Visibility", icon: Eye },
              { label: "Ease of fix", icon: Layers },
              { label: "Dependency", icon: Network },
            ]}
          />
        </SceneShell>
      );

    case "execution":
      return (
        <SceneShell
          eyebrow="Execution path"
          headline={
            <>
              Diagnosis becomes an{" "}
              <span className="text-[hsl(78,28%,62%)]">execution path</span>.
            </>
          }
          caption="The goal is not more information. The goal is better control."
        >
          <CardGrid
            columns={3}
            items={[
              { label: "Fix first", icon: ListChecks },
              { label: "Assign task", icon: UserPlus },
              { label: "Track outcome", icon: TrendingDown },
            ]}
          />
        </SceneShell>
      );

    case "control":
      return (
        <motion.div {...fade} className="text-center">
          <Activity
            size={32}
            strokeWidth={1.5}
            className="text-[hsl(78,28%,62%)] mx-auto mb-5"
          />
          <p className="font-display text-2xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-tight tracking-tight">
            Clear.{" "}
            <span className="text-[hsl(78,24%,60%)]">Prioritized.</span>{" "}
            Controlled.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground/80 mt-5 max-w-xl mx-auto leading-relaxed">
            RGS helps owners see what is breaking, why it matters, and what to do next.
          </p>
        </motion.div>
      );

    case "cta":
      return (
        <motion.div {...fade} className="text-center max-w-2xl">
          <CheckCircle2
            size={26}
            strokeWidth={1.5}
            className="text-[hsl(78,34%,52%)] mx-auto mb-4"
          />
          <p className="font-display text-xl md:text-2xl lg:text-3xl font-semibold text-foreground leading-[1.25] tracking-tight">
            Install a system that gives you control.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground mt-2.5 mb-4">
            — Revenue & Growth Systems
          </p>
          <p className="text-sm md:text-base text-foreground/85 leading-relaxed mb-5">
            → See how stable your business really is{" "}
            <span className="text-[hsl(78,28%,62%)] font-semibold">
              (0–1000)
            </span>
            .
          </p>
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[hsl(78,34%,38%)] text-white font-semibold text-xs md:text-sm">
            Get Your Business Score (0–1000)
          </span>
        </motion.div>
      );
  }
}

const TOTAL_MS = SCENES.reduce((sum, s) => sum + s.durationMs, 0);
export { TOTAL_MS as DEMO_TOTAL_MS };
