import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  type LucideIcon,
  Clock,
  PhoneOff,
  Workflow,
  EyeOff,
  Megaphone,
  ShoppingCart,
  Wrench,
  LineChart,
  UserCog,
  ClipboardList,
  ShieldCheck,
  ListChecks,
  Compass,
  ArrowRight,
} from "lucide-react";

/**
 * P38.1 — Public-safe RGS demo storyboard (8 scenes).
 *
 * Story arc:
 *   1. It usually starts small (a slipping gear)
 *   2. Symptoms show up (look like separate problems)
 *   3. Pressure moves through the system
 *   4. The five gears
 *   5. The Diagnostic lens
 *   6. Less guessing, clearer decisions
 *   7. Guided independence (owner stays in control)
 *   8. CTA — Take the Scorecard
 *
 * Silent, text-led, sandbox-data only. No remote video, no audio,
 * no fake client proof. Brand palette only.
 */

type SceneKey =
  | "slipStart"
  | "symptoms"
  | "pressure"
  | "fiveGears"
  | "diagnostic"
  | "lessGuessing"
  | "guidedIndependence"
  | "cta";

interface Scene {
  key: SceneKey;
  durationMs: number;
}

const SCENES: Scene[] = [
  { key: "slipStart",         durationMs: 4200 },
  { key: "symptoms",          durationMs: 5400 },
  { key: "pressure",          durationMs: 5200 },
  { key: "fiveGears",         durationMs: 5800 },
  { key: "diagnostic",        durationMs: 5800 },
  { key: "lessGuessing",      durationMs: 5000 },
  { key: "guidedIndependence",durationMs: 5400 },
  { key: "cta",               durationMs: 6200 },
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
      aria-label="RGS system demo animation, illustrative sandbox visuals"
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

      {/* Sandbox pill */}
      <div
        className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-20 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-[hsl(78_24%_60%/0.3)] bg-[hsl(0_0%_8%/0.7)]"
        aria-label="Illustrative sandbox visuals"
      >
        <span className="w-1 h-1 rounded-full bg-[hsl(78,24%,60%)]" />
        <span className="text-[8px] md:text-[9px] uppercase tracking-[0.18em] text-[hsl(78,24%,72%)]/85 font-semibold leading-none">
          Sandbox
        </span>
      </div>

      {/* scene content */}
      <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 md:px-10 pt-12 md:pt-10 pb-12 overflow-hidden">
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

      {/* scene chip dots */}
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
  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
};

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
              : "text-lg md:text-2xl lg:text-[1.7rem]"
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

/** A single gear glyph with optional "slipping" tooth animation. */
function Gear({
  size = 56,
  active = false,
  slipping = false,
  pressured = false,
  label,
  icon: Icon,
  delay = 0,
}: {
  size?: number;
  active?: boolean;
  slipping?: boolean;
  pressured?: boolean;
  label?: string;
  icon?: LucideIcon;
  delay?: number;
}) {
  const ring = active
    ? "border-[hsl(78,32%,55%)] bg-[hsl(78_36%_35%/0.18)]"
    : pressured
    ? "border-[hsl(38,55%,55%)]/70 bg-[hsl(38_45%_30%/0.18)]"
    : "border-[hsl(0_0%_22%)] bg-[hsl(0_0%_14%)]";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: 1,
        scale: 1,
        rotate: slipping ? [0, -6, 4, -2, 0] : 0,
      }}
      transition={{
        delay,
        duration: slipping ? 1.6 : 0.5,
        repeat: slipping ? Infinity : 0,
        repeatDelay: slipping ? 1.2 : 0,
      }}
      className={`flex flex-col items-center gap-1.5`}
    >
      <div
        className={`flex items-center justify-center rounded-full border ${ring}`}
        style={{ width: size, height: size }}
      >
        {Icon ? (
          <Icon
            size={Math.round(size * 0.42)}
            strokeWidth={1.75}
            className={
              active
                ? "text-[hsl(78,32%,72%)]"
                : pressured
                ? "text-[hsl(38,65%,72%)]"
                : "text-foreground/70"
            }
          />
        ) : null}
      </div>
      {label && (
        <span className="text-[10px] md:text-[11px] font-semibold text-foreground/85 leading-tight max-w-[88px]">
          {label}
        </span>
      )}
    </motion.div>
  );
}

function SceneRenderer({ sceneKey }: { sceneKey: SceneKey }) {
  switch (sceneKey) {
    case "slipStart":
      return (
        <SceneShell
          eyebrow="It usually starts small"
          headline={
            <>
              Most business problems do not start as a{" "}
              <span className="text-[hsl(78,28%,62%)]">disaster</span>.
            </>
          }
          accent
        >
          <div className="mt-2">
            <Gear size={84} slipping icon={Wrench} />
          </div>
          <p className="text-xs md:text-sm text-foreground/70 mt-5">
            They start as a small slip in the system.
          </p>
        </SceneShell>
      );

    case "symptoms":
      return (
        <SceneShell
          eyebrow="Symptoms show up"
          headline={
            <>
              At first, it looks like{" "}
              <span className="text-[hsl(78,28%,62%)]">separate problems</span>.
            </>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 w-full">
            {[
              { label: "Slower sales", icon: LineChart },
              { label: "Missed follow-ups", icon: PhoneOff },
              { label: "Messy handoffs", icon: Workflow },
              { label: "Unclear numbers", icon: EyeOff },
            ].map((it, i) => (
              <motion.div
                key={it.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.12, duration: 0.45 }}
                className="flex flex-col items-center justify-center text-center gap-2 px-2 py-3 md:py-4 rounded-lg border border-[hsl(0_0%_22%)] bg-[hsl(0_0%_14%)]"
              >
                <it.icon size={20} strokeWidth={1.75} className="text-[hsl(38,55%,72%)]" />
                <span className="text-[12px] md:text-sm font-semibold text-foreground leading-tight">
                  {it.label}
                </span>
              </motion.div>
            ))}
          </div>
          <p className="text-xs md:text-sm text-foreground/70 mt-5">
            They are usually connected.
          </p>
        </SceneShell>
      );

    case "pressure":
      return (
        <SceneShell
          eyebrow="Pressure moves"
          headline={
            <>
              One slipping gear puts{" "}
              <span className="text-[hsl(78,28%,62%)]">pressure on the rest</span>{" "}
              of the system.
            </>
          }
          caption="That is not five separate problems. It is one system carrying weight in the wrong places."
        >
          <div className="relative flex items-center justify-center gap-6 md:gap-10 mt-2">
            <Gear size={64} slipping icon={Megaphone} />
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="origin-left h-px w-12 md:w-20 bg-[hsl(38,55%,55%)]/60 relative"
            >
              <ArrowRight
                size={14}
                className="absolute -right-2 -top-2 text-[hsl(38,55%,72%)]"
              />
            </motion.div>
            <Gear size={64} pressured icon={ShoppingCart} delay={0.5} />
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="origin-left h-px w-12 md:w-20 bg-[hsl(38,55%,55%)]/60 relative"
            >
              <ArrowRight
                size={14}
                className="absolute -right-2 -top-2 text-[hsl(38,55%,72%)]"
              />
            </motion.div>
            <Gear size={64} pressured icon={UserCog} delay={1.0} />
          </div>
        </SceneShell>
      );

    case "fiveGears":
      return (
        <SceneShell
          eyebrow="The five gears"
          headline={
            <>
              RGS looks at the business as a{" "}
              <span className="text-[hsl(78,28%,62%)]">system</span>.
            </>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
            {[
              { label: "Demand Generation", icon: Megaphone },
              { label: "Revenue Conversion", icon: ShoppingCart },
              { label: "Operational Efficiency", icon: Wrench },
              { label: "Financial Visibility", icon: LineChart },
              { label: "Owner Independence", icon: UserCog },
            ].map((g, i) => (
              <motion.div
                key={g.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.45 }}
              >
                <Gear size={52} active icon={g.icon} label={g.label} />
              </motion.div>
            ))}
          </div>
          <p className="text-xs md:text-sm text-foreground/70 mt-5">
            Five gears. One connected operating picture.
          </p>
        </SceneShell>
      );

    case "diagnostic":
      return (
        <SceneShell
          eyebrow="The Diagnostic lens"
          headline={
            <>
              What is{" "}
              <span className="text-[hsl(78,28%,62%)]">slipping</span>, what supports
              it, and what to fix first.
            </>
          }
          caption="The Business Stability Diagnostic looks at evidence behind the score and turns findings into a roadmap."
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 w-full">
            {[
              { label: "Scorecard", icon: ClipboardList },
              { label: "Evidence", icon: ShieldCheck },
              { label: "Findings", icon: Compass },
              { label: "Roadmap", icon: ListChecks },
            ].map((it, i) => (
              <motion.div
                key={it.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.1, duration: 0.45 }}
                className="flex flex-col items-center justify-center text-center gap-2 px-2 py-3 md:py-4 rounded-lg border border-[hsl(78_30%_45%/0.45)] bg-[hsl(78_36%_35%/0.10)]"
              >
                <it.icon size={20} strokeWidth={1.75} className="text-[hsl(78,32%,72%)]" />
                <span className="text-[12px] md:text-sm font-semibold text-foreground leading-tight">
                  {it.label}
                </span>
              </motion.div>
            ))}
          </div>
        </SceneShell>
      );

    case "lessGuessing":
      return (
        <SceneShell
          eyebrow="No more guessing"
          headline={
            <>
              The goal is not more noise. It is{" "}
              <span className="text-[hsl(78,28%,62%)]">clearer decisions</span>.
            </>
          }
          caption="When the right information is already in front of the owner, the next step usually makes more sense."
          accent
        >
          <div className="relative w-full max-w-md h-20 md:h-24 mt-2">
            <motion.div
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.6, delay: 0.3 }}
              className="absolute inset-0 rounded-lg bg-[hsl(0_0%_30%)] blur-md"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.4, delay: 0.6 }}
              className="absolute inset-0 rounded-lg border border-[hsl(78_30%_45%/0.55)] bg-[hsl(78_36%_35%/0.12)] flex items-center justify-center"
            >
              <span className="text-xs md:text-sm font-semibold text-[hsl(78,32%,80%)] uppercase tracking-[0.2em]">
                Clearer operating picture
              </span>
            </motion.div>
          </div>
        </SceneShell>
      );

    case "guidedIndependence":
      return (
        <SceneShell
          eyebrow="Guided independence"
          headline={
            <>
              RGS does not create dependency. It gives the owner{" "}
              <span className="text-[hsl(78,28%,62%)]">clearer control</span>.
            </>
          }
          caption="RGS is not done-for-you marketing. It does not replace the owner. It makes the business easier to think through."
        >
          <div className="relative w-full max-w-md h-32 md:h-36 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="absolute inset-0 rounded-full border border-[hsl(78_30%_45%/0.35)]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.55 }}
              className="z-10 flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border border-[hsl(78_30%_45%/0.55)] bg-[hsl(78_36%_35%/0.16)]"
            >
              <UserCog size={26} className="text-[hsl(78,32%,76%)]" strokeWidth={1.75} />
              <span className="text-xs md:text-sm font-semibold text-foreground">
                Owner stays in control
              </span>
            </motion.div>
          </div>
        </SceneShell>
      );

    case "cta":
      return (
        <motion.div {...fade} className="text-center max-w-2xl w-full">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] md:tracking-[0.25em] text-[hsl(78,24%,60%)] mb-3 md:mb-4 font-semibold">
            Start here
          </p>
          <h3 className="font-display text-xl md:text-3xl lg:text-[2rem] font-semibold text-foreground leading-[1.2] tracking-tight">
            See how stable your business really is.
          </h3>
          <p className="text-[12px] md:text-base text-foreground/80 mt-4 md:mt-5 leading-snug md:leading-relaxed">
            Take the{" "}
            <span className="text-[hsl(78,28%,72%)] font-semibold">
              0–1000 Business Stability Scorecard
            </span>
            . It is preliminary and self-reported, and it points attention.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[hsl(78_30%_45%/0.55)] bg-[hsl(78_36%_35%/0.14)]">
            <Clock size={14} className="text-[hsl(78,32%,76%)]" />
            <span className="text-[11px] md:text-xs font-semibold text-[hsl(78,32%,80%)] uppercase tracking-[0.2em]">
              About 5 minutes
            </span>
          </div>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.22em] text-[hsl(78,24%,60%)] font-semibold mt-5 md:mt-6">
            Scorecard link below the video
          </p>
        </motion.div>
      );
  }
}

const TOTAL_MS = SCENES.reduce((sum, s) => sum + s.durationMs, 0);
export { TOTAL_MS as DEMO_TOTAL_MS };
