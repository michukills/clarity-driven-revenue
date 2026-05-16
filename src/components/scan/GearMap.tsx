/**
 * P96 - Visual five-gear pressure map for the Operational Friction Scan.
 *
 * Renders the 5 RGS gears as interlocked rings with color and motion
 * driven by detected pressure. Slipping gears pulse softly so the user
 * immediately sees where the system is loaded. Not decorative - the
 * visual encodes the engine's read.
 */
import { motion } from "framer-motion";
import type { GearRead, GearId } from "@/lib/scan/engine";

interface GearMapProps {
  gears: GearRead[];
  upstreamGear?: GearId;
}

const PRESSURE_COLOR: Record<GearRead["pressure"], string> = {
  solid: "hsl(78, 30%, 50%)",
  strained: "hsl(38, 80%, 58%)",
  slipping: "hsl(8, 78%, 58%)",
};

const PRESSURE_LABEL: Record<GearRead["pressure"], string> = {
  solid: "Holding",
  strained: "Strained",
  slipping: "Slipping",
};

export function GearMap({ gears, upstreamGear }: GearMapProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
      <div className="flex items-baseline justify-between mb-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">
          Pressure across the five gears
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          Directional read
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 md:gap-4 mb-6">
        {gears.map((g, idx) => {
          const isUpstream = g.id === upstreamGear;
          const color = PRESSURE_COLOR[g.pressure];
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.45 }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative w-14 h-14 md:w-20 md:h-20 flex items-center justify-center">
                {g.pressure === "slipping" && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: color, opacity: 0.18 }}
                    animate={{ scale: [1, 1.25, 1], opacity: [0.18, 0, 0.18] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <svg
                  viewBox="0 0 64 64"
                  className="relative w-full h-full"
                  aria-hidden="true"
                >
                  <motion.g
                    animate={g.pressure === "solid" ? { rotate: 360 } : { rotate: g.pressure === "strained" ? 360 : 0 }}
                    transition={
                      g.pressure === "solid"
                        ? { duration: 28, repeat: Infinity, ease: "linear" }
                        : g.pressure === "strained"
                        ? { duration: 60, repeat: Infinity, ease: "linear" }
                        : { duration: 0 }
                    }
                    style={{ transformOrigin: "32px 32px" }}
                  >
                    {Array.from({ length: 8 }).map((_, i) => {
                      const angle = (i * 360) / 8;
                      return (
                        <rect
                          key={i}
                          x="29"
                          y="2"
                          width="6"
                          height="10"
                          rx="1"
                          fill={color}
                          transform={`rotate(${angle} 32 32)`}
                          opacity={g.pressure === "slipping" ? 0.55 : 0.85}
                        />
                      );
                    })}
                    <circle
                      cx="32"
                      cy="32"
                      r="20"
                      fill="none"
                      stroke={color}
                      strokeWidth="3"
                      opacity={g.pressure === "slipping" ? 0.7 : 1}
                    />
                    <circle cx="32" cy="32" r="6" fill={color} />
                  </motion.g>
                </svg>
                {isUpstream && (
                  <div className="absolute -top-1 -right-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-foreground text-background font-semibold">
                    Root
                  </div>
                )}
              </div>
              <div className="mt-2 text-[10px] md:text-xs font-semibold text-foreground/85 leading-tight">
                {g.title}
              </div>
              <div
                className="mt-1 text-[9px] md:text-[10px] uppercase tracking-wider"
                style={{ color }}
              >
                {PRESSURE_LABEL[g.pressure]}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px] leading-relaxed text-muted-foreground border-t border-border/40 pt-4">
        {gears.map((g) => (
          <div key={g.id} className="md:col-span-1">
            <div className="font-semibold text-foreground/80 text-[10px] uppercase tracking-wider mb-1">
              {g.title}
            </div>
            <div>{g.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GearMap;
