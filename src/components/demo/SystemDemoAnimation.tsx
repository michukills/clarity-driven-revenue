import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  TrendingUp,
  Activity,
  Zap,
} from "lucide-react";

/**
 * Public-safe, sandbox-data system demo.
 * 30–45 second looping web-native animation.
 * Protects RGS internal logic — shows shape, not mechanics.
 */

type SceneKey =
  | "hook1"
  | "hook2"
  | "problem"
  | "positioning"
  | "connection"
  | "event"
  | "intelligence"
  | "control"
  | "cta";

interface Scene {
  key: SceneKey;
  durationMs: number;
}

const SCENES: Scene[] = [
  { key: "hook1", durationMs: 3200 },
  { key: "hook2", durationMs: 3800 },
  { key: "problem", durationMs: 4200 },
  { key: "positioning", durationMs: 4200 },
  { key: "connection", durationMs: 4800 },
  { key: "event", durationMs: 5200 },
  { key: "intelligence", durationMs: 5200 },
  { key: "control", durationMs: 3600 },
  { key: "cta", durationMs: 5200 },
];

const TOTAL_MS = SCENES.reduce((sum, s) => sum + s.durationMs, 0);

export default function SystemDemoAnimation() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % SCENES.length);
    }, SCENES[index].durationMs);
    return () => clearTimeout(t);
  }, [index]);

  const scene = SCENES[index];
  const progress = ((index + 1) / SCENES.length) * 100;

  return (
    <div
      className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/60 bg-[hsl(0_0%_8%)]"
      role="img"
      aria-label="RGS system demo animation, sandbox data"
    >
      {/* subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
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
      <div className="absolute inset-0 flex items-center justify-center p-8 md:p-12">
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
                ? "w-2 bg-foreground/30"
                : "w-2 bg-foreground/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SceneRenderer({ sceneKey }: { sceneKey: SceneKey }) {
  const fade = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as const },
  };

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

    case "problem":
      return (
        <motion.div {...fade} className="w-full max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-6 text-center font-semibold">
            Without a system
          </p>
          <div className="space-y-3">
            {[
              "Revenue unclear",
              "Leads inconsistent",
              "Decisions based on guesswork",
            ].map((line, i) => (
              <motion.div
                key={line}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.18, duration: 0.45 }}
                className="flex items-center gap-3 px-5 py-4 rounded-lg border border-border/50 bg-[hsl(0_0%_12%)]"
              >
                <AlertTriangle
                  size={18}
                  strokeWidth={1.75}
                  className="text-foreground/40 flex-shrink-0"
                />
                <span className="text-base md:text-lg text-foreground/85 font-medium">
                  {line}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      );

    case "positioning":
      return (
        <motion.div {...fade} className="text-center max-w-2xl">
          <p className="font-display text-xl md:text-3xl text-foreground/90 leading-[1.3] mb-5">
            Most businesses don't run systems.{" "}
            <span className="text-[hsl(78,24%,60%)]">They react.</span>
          </p>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            This is what happens when you install one.
          </p>
        </motion.div>
      );

    case "connection":
      return (
        <motion.div {...fade} className="w-full max-w-xl">
          <div className="rounded-xl border border-[hsl(78_24%_60%/0.35)] bg-[hsl(0_0%_10%)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-[hsl(78_36%_35%/0.18)] border border-[hsl(78_24%_60%/0.4)] flex items-center justify-center">
                <Database
                  size={18}
                  className="text-[hsl(78,28%,68%)]"
                  strokeWidth={1.75}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Connected to QuickBooks
                </p>
                <p className="text-[11px] uppercase tracking-widest text-[hsl(78,24%,60%)] font-semibold">
                  Demo / Sandbox Data
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[hsl(78,28%,68%)] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(78,34%,52%)] animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              One live data path. More business tools can connect or import
              data over time.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-4 text-center leading-relaxed">
            Connect or import business-tool data to protect owner time and
            sharpen the operating picture.
          </p>
        </motion.div>
      );

    case "event":
      return (
        <motion.div {...fade} className="w-full max-w-xl space-y-3">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex items-center gap-3 px-5 py-3 rounded-lg border border-border/50 bg-[hsl(0_0%_12%)]"
          >
            <FileText size={16} className="text-[hsl(78,28%,68%)]" strokeWidth={1.75} />
            <span className="text-sm font-medium text-foreground">
              New invoice created
            </span>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
              Sandbox
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="flex items-center gap-3 px-5 py-3 rounded-lg border border-[hsl(78_24%_60%/0.35)] bg-[hsl(78_36%_35%/0.08)]"
          >
            <Zap size={16} className="text-[hsl(78,34%,58%)]" strokeWidth={2} />
            <span className="text-sm font-medium text-foreground">
              System sync triggered
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.5 }}
            className="rounded-lg border border-border/50 bg-[hsl(0_0%_12%)] px-5 py-4 flex items-center justify-between"
          >
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1 font-semibold">
                Operating revenue
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground line-through">
                  $82,500
                </span>
                <span className="font-display text-2xl font-semibold text-[hsl(78,28%,72%)]">
                  $84,200
                </span>
              </div>
            </div>
            <TrendingUp
              size={26}
              className="text-[hsl(78,34%,52%)]"
              strokeWidth={1.75}
            />
          </motion.div>

          <p className="text-xs text-muted-foreground/70 text-center leading-relaxed pt-1">
            The webhook triggers the sync. Fresh accounting data updates the
            operating picture.
          </p>
        </motion.div>
      );

    case "intelligence":
      return (
        <motion.div {...fade} className="w-full max-w-2xl">
          <div className="space-y-2 mb-5 text-center">
            <p className="text-sm md:text-base font-semibold text-foreground">
              Payment delay pattern detected
            </p>
            <p className="text-sm text-[hsl(78,24%,60%)] font-medium">
              Potential revenue leak identified
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "AR over 30", value: "14%", trend: "↑" },
              { label: "Follow-up gap", value: "6 days", trend: "→" },
              { label: "Stability score", value: "612", trend: "—" },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.4 }}
                className="rounded-lg border border-border/50 bg-[hsl(0_0%_12%)] px-4 py-4"
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                  {c.label}
                </p>
                <p className="font-display text-xl md:text-2xl font-semibold text-foreground">
                  {c.value}
                </p>
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/70 text-center mt-5 leading-relaxed">
            The video shows the signal. The internal logic stays protected.
          </p>
        </motion.div>
      );

    case "control":
      return (
        <motion.div {...fade} className="text-center">
          <Activity
            size={32}
            strokeWidth={1.5}
            className="text-[hsl(78,28%,62%)] mx-auto mb-6"
          />
          <p className="font-display text-2xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-tight tracking-tight">
            Clear.{" "}
            <span className="text-[hsl(78,24%,60%)]">Predictable.</span>{" "}
            Controlled.
          </p>
        </motion.div>
      );

    case "cta":
      return (
        <motion.div {...fade} className="text-center max-w-2xl">
          <CheckCircle2
            size={28}
            strokeWidth={1.5}
            className="text-[hsl(78,34%,52%)] mx-auto mb-5"
          />
          <p className="font-display text-xl md:text-2xl lg:text-3xl font-semibold text-foreground leading-[1.25] tracking-tight">
            Install a system that gives you control.
          </p>
          <p className="text-sm text-muted-foreground mt-3 mb-6">
            — Revenue & Growth Systems
          </p>
          <p className="text-base md:text-lg text-foreground/85 leading-relaxed">
            → See how stable your business really is{" "}
            <span className="text-[hsl(78,28%,62%)] font-semibold">
              (0–1000)
            </span>
            .
          </p>
        </motion.div>
      );
  }
}

export { TOTAL_MS as DEMO_TOTAL_MS };
