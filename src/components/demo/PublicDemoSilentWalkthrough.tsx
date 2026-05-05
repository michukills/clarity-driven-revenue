import { useEffect, useMemo, useReducer, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/**
 * PublicDemoSilentWalkthrough
 *
 * Built from the approved script:
 *   docs/public-demo-silent-walkthrough-script.md
 *
 * Hybrid silent walkthrough — slide-style cards interleaved with
 * OS-style mock screens. Captions appear on every scene. A "DEMO"
 * watermark is required on every UI scene (scenes 2–8). Scenes 1
 * and 9 are slide-only and may omit the watermark.
 *
 * This component is intentionally a self-contained mock. It does
 * not load real client data, real reports, or any private signed
 * URLs. All visuals use sample/demo content only.
 */

export type SceneVisualKind =
  | "slide-problem"
  | "ui-scorecard"
  | "ui-portal"
  | "ui-admin-review"
  | "ui-snapshot"
  | "ui-repair-map"
  | "ui-implementation"
  | "ui-control-system"
  | "slide-cta";

export interface WalkthroughScene {
  /** 1-indexed scene number, matching the approved script. */
  number: number;
  title: string;
  /** On-screen label that appears inside the visual panel. */
  label: string;
  /** Subtitle / caption shown beneath the visual. */
  caption: string;
  /** Optional secondary chip (safety / clarification). */
  chip?: string;
  /** Approximate hold duration in ms. */
  durationMs: number;
  /** Whether the DEMO watermark is required on this scene. */
  watermark: boolean;
  /** Visual kind, used to pick the mock panel. */
  visual: SceneVisualKind;
  /** What OS strength this scene is intended to demonstrate. */
  strength: string;
}

export const PUBLIC_DEMO_WALKTHROUGH_SCENES: ReadonlyArray<WalkthroughScene> = [
  {
    number: 1,
    title: "Problem framing",
    label: "Busy is not the same as stable.",
    caption: "Most business problems start when one gear slips.",
    durationMs: 8000,
    watermark: false,
    visual: "slide-problem",
    strength: "Sets the gear metaphor and the calm, system-focused tone.",
  },
  {
    number: 2,
    title: "Scorecard",
    label: "0–1000 Business Stability Scorecard",
    caption:
      "A structured, deterministic 0–1000 read across five gears. Same inputs always produce the same score.",
    chip: "Self-reported · Preliminary · Not a final diagnosis.",
    durationMs: 9000,
    watermark: true,
    visual: "ui-scorecard",
    strength: "Deterministic scoring · structured starting point.",
  },
  {
    number: 3,
    title: "Client portal",
    label: "Guided client portal",
    caption:
      "The client gets a guided path. One next step at a time, instead of a pile of random forms.",
    durationMs: 8000,
    watermark: true,
    visual: "ui-portal",
    strength: "Premium guided client experience.",
  },
  {
    number: 4,
    title: "Admin review · Industry Brain",
    label: "Admin review · Industry Brain",
    caption:
      "Every finding is reviewed by RGS with industry context before it ever reaches the client.",
    chip: "Industry emphasis informs interpretation. It does not change the base score.",
    durationMs: 10000,
    watermark: true,
    visual: "ui-admin-review",
    strength:
      "Admin-reviewed evidence · industry-aware interpretation without score corruption.",
  },
  {
    number: 5,
    title: "RGS Stability Snapshot",
    label: "RGS Stability Snapshot",
    caption:
      "A clear picture of what is working, what is slipping, and what needs attention. In plain language.",
    durationMs: 10000,
    watermark: true,
    visual: "ui-snapshot",
    strength: "Client-ready reporting · plain-language clarity.",
  },
  {
    number: 6,
    title: "Priority Repair Map",
    label: "Priority Repair Map",
    caption:
      "What to fix first, why it matters, and what changes when it is fixed.",
    durationMs: 9000,
    watermark: true,
    visual: "ui-repair-map",
    strength: "Direction over diagnosis · sequenced priorities.",
  },
  {
    number: 7,
    title: "Implementation tools",
    label: "Implementation tools",
    caption:
      "Implementation installs the repair plan. Roadmap, SOPs, decision rights, workflows, training.",
    durationMs: 10000,
    watermark: true,
    visual: "ui-implementation",
    strength: "Implementation depth · structure that gets installed, not just recommended.",
  },
  {
    number: 8,
    title: "RGS Control System",
    label: "RGS Control System",
    caption:
      "Ongoing visibility, priorities, and score history. The owner stays connected to the system — without RGS becoming the operator.",
    durationMs: 10000,
    watermark: true,
    visual: "ui-control-system",
    strength: "Guided independence · ongoing visibility · architect, not operator.",
  },
  {
    number: 9,
    title: "Closing CTA",
    label: "If the same problems keep coming back, check the system.",
    caption: "See where the business may be slipping. Start with the structured 0–1000 read.",
    durationMs: 10000,
    watermark: false,
    visual: "slide-cta",
    strength: "Quietly confident close · low-risk next step.",
  },
];

export const PUBLIC_DEMO_WALKTHROUGH_PRIMARY_CTA = {
  label: "Start the 0–1000 Scorecard",
  to: "/scorecard",
};

export const PUBLIC_DEMO_WALKTHROUGH_SECONDARY_CTA = {
  label: "Request a Diagnostic",
  to: "/diagnostic-apply",
};

type WalkthroughState = {
  index: number;
  playing: boolean;
};

type WalkthroughAction =
  | { type: "next" }
  | { type: "prev" }
  | { type: "go"; index: number }
  | { type: "toggle" }
  | { type: "pause" }
  | { type: "restart" };

function reducer(state: WalkthroughState, action: WalkthroughAction): WalkthroughState {
  switch (action.type) {
    case "next":
      return {
        ...state,
        index: Math.min(state.index + 1, PUBLIC_DEMO_WALKTHROUGH_SCENES.length - 1),
      };
    case "prev":
      return { ...state, index: Math.max(state.index - 1, 0) };
    case "go":
      return {
        ...state,
        index: Math.max(0, Math.min(action.index, PUBLIC_DEMO_WALKTHROUGH_SCENES.length - 1)),
      };
    case "toggle":
      return { ...state, playing: !state.playing };
    case "pause":
      return { ...state, playing: false };
    case "restart":
      return { index: 0, playing: true };
    default:
      return state;
  }
}

function usePrefersReducedMotion(): boolean {
  const ref = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    ref.current = mq.matches;
  }, []);
  return ref.current;
}

export default function PublicDemoSilentWalkthrough() {
  const reduced = usePrefersReducedMotion();
  const [state, dispatch] = useReducer(reducer, { index: 0, playing: !reduced });

  const scene = PUBLIC_DEMO_WALKTHROUGH_SCENES[state.index];
  const total = PUBLIC_DEMO_WALKTHROUGH_SCENES.length;

  // Auto-advance timer (skipped if paused or last scene)
  useEffect(() => {
    if (!state.playing) return;
    if (state.index >= total - 1) return;
    const t = window.setTimeout(() => dispatch({ type: "next" }), scene.durationMs);
    return () => window.clearTimeout(t);
  }, [state.playing, state.index, scene.durationMs, total]);

  const onLast = state.index === total - 1;

  return (
    <section
      aria-labelledby="rgs-silent-walkthrough-title"
      className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden"
    >
      <div className="px-5 md:px-7 pt-6 pb-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(78,24%,60%)] font-semibold mb-2">
          Silent walkthrough
        </p>
        <h2
          id="rgs-silent-walkthrough-title"
          className="font-display text-xl md:text-2xl font-semibold text-foreground leading-snug"
        >
          A quiet, captioned tour of the RGS OS
        </h2>
        <p className="text-sm text-foreground/75 mt-2 leading-relaxed">
          Sample/demo data only. Product walkthrough, not a client case study.
          No revenue improvement or business outcome is guaranteed.
        </p>
      </div>

      <div
        className="relative w-full aspect-video bg-[hsl(0_0%_8%)] border-y border-border/40 overflow-hidden"
        role="group"
        aria-roledescription="silent walkthrough"
        aria-label={`Scene ${scene.number} of ${total}: ${scene.title}`}
      >
        <SceneVisual scene={scene} />

        {scene.watermark && (
          <div
            aria-hidden="true"
            data-testid="demo-watermark"
            className="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-sm border border-[hsl(78,24%,60%)]/40 bg-black/40 text-[10px] tracking-[0.25em] font-semibold text-[hsl(78,32%,72%)]"
          >
            DEMO
          </div>
        )}

        <div
          aria-hidden="true"
          className="absolute bottom-3 left-3 z-20 text-[10px] uppercase tracking-[0.22em] text-foreground/55"
        >
          Sample / demo data
        </div>
      </div>

      {/* Caption + chip */}
      <div className="px-5 md:px-7 py-4 min-h-[88px]">
        <p
          aria-live="polite"
          className="text-sm md:text-base text-foreground/90 leading-relaxed"
        >
          {scene.caption}
        </p>
        {scene.chip && (
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {scene.chip}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="px-5 md:px-7 pb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => dispatch({ type: "prev" })}
          disabled={state.index === 0}
          className="inline-flex items-center gap-1.5 text-xs text-foreground/80 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous scene"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "toggle" })}
          className="inline-flex items-center gap-1.5 text-xs text-foreground/80 hover:text-foreground"
          aria-label={state.playing ? "Pause walkthrough" : "Play walkthrough"}
        >
          {state.playing ? <Pause size={14} /> : <Play size={14} />}
          {state.playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "next" })}
          disabled={onLast}
          className="inline-flex items-center gap-1.5 text-xs text-foreground/80 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next scene"
        >
          Next <ChevronRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "restart" })}
          className="inline-flex items-center gap-1.5 text-xs text-foreground/80 hover:text-foreground"
          aria-label="Replay walkthrough from the beginning"
        >
          <RotateCcw size={14} /> Replay
        </button>

        <div
          className="ml-auto flex items-center gap-1.5"
          role="tablist"
          aria-label="Walkthrough scenes"
        >
          {PUBLIC_DEMO_WALKTHROUGH_SCENES.map((s, i) => (
            <button
              key={s.number}
              type="button"
              role="tab"
              aria-selected={i === state.index}
              aria-label={`Go to scene ${s.number}: ${s.title}`}
              onClick={() => dispatch({ type: "go", index: i })}
              className={[
                "h-1.5 rounded-full transition-all",
                i === state.index
                  ? "w-6 bg-[hsl(78,34%,55%)]"
                  : "w-2 bg-foreground/25 hover:bg-foreground/50",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      {/* Final-scene CTAs */}
      {onLast && (
        <div className="px-5 md:px-7 pb-6 flex flex-wrap gap-3">
          <Link
            to={PUBLIC_DEMO_WALKTHROUGH_PRIMARY_CTA.to}
            className="inline-flex items-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-sm px-5 py-2.5 rounded-md transition-all duration-200 hover:bg-[hsl(78,36%,46%)]"
          >
            {PUBLIC_DEMO_WALKTHROUGH_PRIMARY_CTA.label}
            <ArrowRight size={14} />
          </Link>
          <Link
            to={PUBLIC_DEMO_WALKTHROUGH_SECONDARY_CTA.to}
            className="inline-flex items-center gap-2 border border-border/60 text-foreground/85 font-medium text-sm px-5 py-2.5 rounded-md hover:text-foreground hover:border-border"
          >
            {PUBLIC_DEMO_WALKTHROUGH_SECONDARY_CTA.label}
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
 * Scene visuals — calm OS-style mocks. No real data, no real
 * client info, no fake testimonials, no fake metrics framed
 * as outcomes. Sample numbers are clearly illustrative.
 * ────────────────────────────────────────────────────────── */

function SceneVisual({ scene }: { scene: WalkthroughScene }) {
  switch (scene.visual) {
    case "slide-problem":
      return <SlideProblem label={scene.label} />;
    case "ui-scorecard":
      return <MockScorecard label={scene.label} />;
    case "ui-portal":
      return <MockPortal label={scene.label} />;
    case "ui-admin-review":
      return <MockAdminReview label={scene.label} />;
    case "ui-snapshot":
      return <MockSnapshot label={scene.label} />;
    case "ui-repair-map":
      return <MockRepairMap label={scene.label} />;
    case "ui-implementation":
      return <MockImplementation label={scene.label} />;
    case "ui-control-system":
      return <MockControlSystem label={scene.label} />;
    case "slide-cta":
      return <SlideCta label={scene.label} />;
    default:
      return null;
  }
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.22em] text-foreground/60">
      {children}
    </div>
  );
}

function SlideProblem({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-8">
      <div className="text-center max-w-xl">
        <div className="mx-auto mb-6 w-12 h-12 rounded-full border-2 border-[hsl(78,34%,45%)]/70 flex items-center justify-center text-[hsl(78,32%,60%)] text-xl">
          ◉
        </div>
        <p className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-snug">
          {label}
        </p>
      </div>
    </div>
  );
}

function MockScorecard({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 p-6 md:p-8">
      <PanelLabel>{label}</PanelLabel>
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-xs text-muted-foreground mb-2">Sample stability score</p>
        <p className="font-display text-5xl md:text-6xl font-bold text-foreground tabular-nums">
          612
          <span className="text-lg text-muted-foreground"> / 1000</span>
        </p>
        <div className="mt-5 grid grid-cols-5 gap-2 w-full max-w-md">
          {["Demand", "Conversion", "Operations", "Visibility", "Owner"].map((g, i) => (
            <div key={g} className="text-center">
              <div className="h-1.5 rounded-full bg-foreground/15 overflow-hidden">
                <div
                  className="h-full bg-[hsl(78,34%,50%)]"
                  style={{ width: `${[68, 54, 61, 48, 72][i]}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{g}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockPortal({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 p-6">
      <PanelLabel>{label}</PanelLabel>
      <div className="h-full flex flex-col justify-center max-w-lg mx-auto">
        <p className="text-xs text-muted-foreground mb-2">Welcome back</p>
        <p className="font-display text-xl md:text-2xl font-semibold text-foreground mb-4">
          Your next step
        </p>
        <div className="rounded-lg border border-[hsl(78,24%,45%)]/40 bg-[hsl(78,34%,38%)]/10 p-4">
          <p className="text-[10px] uppercase tracking-widest text-[hsl(78,32%,60%)] mb-1">
            Step 2 of 4
          </p>
          <p className="text-sm text-foreground/90">
            Confirm the financial summary so the diagnostic can be reviewed.
          </p>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {[true, true, false, false].map((done, i) => (
            <div
              key={i}
              className={`h-1 rounded-full ${done ? "bg-[hsl(78,34%,55%)]" : "bg-foreground/15"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MockAdminReview({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 p-6">
      <PanelLabel>{label}</PanelLabel>
      <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-3 pt-7">
        <div className="md:col-span-2 rounded-lg border border-border/50 bg-card/40 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Evidence under review
          </p>
          <p className="text-sm text-foreground/85">
            Inconsistent follow-up cadence across new leads.
          </p>
          <div className="mt-3 flex gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded-sm bg-foreground/10 text-foreground/70">Draft</span>
            <span className="px-2 py-0.5 rounded-sm bg-[hsl(78,34%,38%)]/30 text-[hsl(78,32%,72%)]">Awaiting admin review</span>
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/30 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Industry Brain
          </p>
          <p className="text-xs text-foreground/80">
            Field-service emphasis: dispatch consistency weighs higher in interpretation.
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Does not change base score.
          </p>
        </div>
      </div>
    </div>
  );
}

function MockSnapshot({ label }: { label: string }) {
  const cols: Array<{ heading: string; items: string[]; tone: string }> = [
    { heading: "Working", items: ["Repeat customers steady", "Owner trusted in market"], tone: "hsl(78,32%,60%)" },
    { heading: "Slipping", items: ["Lead follow-up gaps", "Cash visibility late"], tone: "hsl(38,40%,60%)" },
    { heading: "Needs attention", items: ["Owner is the approval point"], tone: "hsl(0,40%,65%)" },
  ];
  return (
    <div className="absolute inset-0 p-6">
      <PanelLabel>{label}</PanelLabel>
      <div className="h-full pt-7 grid grid-cols-1 md:grid-cols-3 gap-3">
        {cols.map((c) => (
          <div key={c.heading} className="rounded-lg border border-border/50 bg-card/40 p-3">
            <p
              className="text-[10px] uppercase tracking-widest mb-2"
              style={{ color: c.tone }}
            >
              {c.heading}
            </p>
            <ul className="space-y-1.5">
              {c.items.map((it) => (
                <li key={it} className="text-xs text-foreground/85 leading-relaxed">
                  • {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockRepairMap({ label }: { label: string }) {
  const items = [
    { n: 1, label: "Install a follow-up cadence", why: "Recovers leads currently lost to silence." },
    { n: 2, label: "Move weekly cash to a single view", why: "Decisions stop waiting on month-end." },
    { n: 3, label: "Define owner approval boundaries", why: "Removes the owner as the daily bottleneck." },
  ];
  return (
    <div className="absolute inset-0 p-6">
      <PanelLabel>{label}</PanelLabel>
      <div className="h-full pt-7 space-y-2 max-w-2xl mx-auto">
        {items.map((it) => (
          <div
            key={it.n}
            className="rounded-lg border border-border/50 bg-card/40 px-4 py-3 flex items-start gap-3"
          >
            <div className="w-7 h-7 rounded-full bg-[hsl(78,34%,38%)]/20 border border-[hsl(78,34%,45%)]/50 flex items-center justify-center text-[11px] text-[hsl(78,32%,72%)] font-semibold flex-shrink-0">
              {it.n}
            </div>
            <div>
              <p className="text-sm text-foreground/90 font-medium">{it.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{it.why}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockImplementation({ label }: { label: string }) {
  const tiles = [
    "Implementation Roadmap",
    "SOP / Training Bible",
    "Decision Rights",
    "Workflow Mapping",
    "Tool Assignment",
    "Training Tracker",
  ];
  return (
    <div className="absolute inset-0 p-6">
      <PanelLabel>{label}</PanelLabel>
      <div className="h-full pt-7 grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {tiles.map((t) => (
          <div
            key={t}
            className="rounded-lg border border-border/50 bg-card/40 p-3 flex items-center justify-center text-center"
          >
            <p className="text-xs text-foreground/85 leading-snug">{t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockControlSystem({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 p-6">
      <PanelLabel>{label}</PanelLabel>
      <div className="h-full pt-7 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/50 bg-card/40 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Revenue & risk monitor
          </p>
          <div className="flex items-end gap-1 h-16">
            {[40, 55, 48, 62, 58, 70, 66, 72].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-[hsl(78,34%,45%)]/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/40 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Priority actions
          </p>
          <ul className="space-y-1.5 text-xs text-foreground/85">
            <li>• Confirm weekly cash review</li>
            <li>• Approve revised follow-up cadence</li>
            <li>• Review handoff bottleneck</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function SlideCta({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-8">
      <div className="text-center max-w-xl">
        <p className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-snug">
          {label}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Use the buttons below to start the structured 0–1000 read.
        </p>
      </div>
    </div>
  );
}

export function _testHelpers() {
  // Exposed for tests to import without rendering.
  return useMemo(() => null, []);
}