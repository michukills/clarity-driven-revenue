import type { EvidenceTier } from "@/lib/evidenceIntake/prompts";
import { EVIDENCE_TIER_LABEL } from "@/lib/evidenceIntake/prompts";
import { deriveEvidenceTier, type DeriveEvidenceTierInput } from "@/lib/evidenceIntake/tier";

/**
 * P13.EvidenceTiers.UI.1 — small, accessible badge that surfaces the
 * trust state of a claim / finding / evidence item.
 *
 * Visual language:
 *   owner_reported   → amber-toned, with "Owner-reported"
 *   system_tracked   → sky-toned,   with "System-tracked"
 *   admin_validated  → emerald,     with "Admin-validated"
 *   missing          → muted/rose,  with "Missing / unverified"
 *
 * Important: text is NEVER conveyed by color alone. The label is always
 * rendered next to the dot.
 */

const TIER_STYLE: Record<EvidenceTier, { wrap: string; dot: string }> = {
  owner_reported: {
    wrap: "border-amber-400/30 bg-amber-400/5 text-amber-200",
    dot: "bg-amber-300",
  },
  system_tracked: {
    wrap: "border-sky-400/30 bg-sky-400/5 text-sky-200",
    dot: "bg-sky-300",
  },
  admin_validated: {
    wrap: "border-emerald-400/30 bg-emerald-400/5 text-emerald-200",
    dot: "bg-emerald-300",
  },
  missing: {
    wrap: "border-rose-400/30 bg-rose-400/5 text-rose-200",
    dot: "bg-rose-300",
  },
};

/** Friendlier copy for client-safe surfaces. */
const TIER_LABEL_CLIENT: Record<EvidenceTier, string> = {
  owner_reported: "Based on what you reported",
  system_tracked: "Validated by data",
  admin_validated: "Reviewed by RGS",
  missing: "Still needs evidence",
};

export interface EvidenceTierBadgeProps {
  /** Pass an explicit tier OR provide derivation input via `from`. */
  tier?: EvidenceTier;
  /** Loose object used to derive a tier conservatively. */
  from?: DeriveEvidenceTierInput;
  /** When true, swap admin labels for client-facing language. */
  clientFacing?: boolean;
  className?: string;
}

export function EvidenceTierBadge({
  tier,
  from,
  clientFacing = false,
  className = "",
}: EvidenceTierBadgeProps) {
  const resolved: EvidenceTier = tier ?? (from ? deriveEvidenceTier(from) : "owner_reported");
  const style = TIER_STYLE[resolved];
  const label = clientFacing ? TIER_LABEL_CLIENT[resolved] : EVIDENCE_TIER_LABEL[resolved];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${style.wrap} ${className}`}
      role="status"
      aria-label={`Evidence tier: ${label}`}
      title={label}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export { EVIDENCE_TIER_LABEL };