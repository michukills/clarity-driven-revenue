// Centralized public CTA targets.
//
// P96E — The public funnel is Scan-first. The primary public CTA is
// the Operational Friction Scan (`SCAN_PATH`). The deeper Diagnostic
// is the secondary CTA via `/diagnostic-apply`. The Scorecard is no
// longer a public lead magnet — it lives inside the Diagnostic OS at
// `/diagnostic/scorecard` (protected). The public `/scorecard` route
// redirects to `/scan`.
export const DIAGNOSTIC_APPLY_PATH = "/diagnostic-apply";

// INTERNAL/DIAGNOSTIC-ONLY. Used by the protected `/diagnostic/scorecard`
// tool, the public `/scorecard` → `/scan` redirect, admin scorecard
// surfaces, and pinned regression tests. Not a public marketing path.
export const SCORECARD_PATH = "/scorecard";

export const DIAGNOSTIC_MAILTO =
  "mailto:info@revenueandgrowthsystems.com?subject=RGS Diagnostic Inquiry&body=Name:%0ABusiness:%0ARevenue:%0AWhat feels off:";

export const DIAGNOSTIC_CTA_LABEL = "Start With a Diagnostic";

// INTERNAL/DIAGNOSTIC-ONLY label. Retained for the protected scorecard
// tool inside the Diagnostic OS, admin/portal scorecard surfaces, and
// pinned regression tests. Not rendered on any public marketing surface.
export const SCORECARD_CTA_LABEL = "Take the FREE Business Stability Scorecard";

// INTERNAL/DIAGNOSTIC-ONLY helper. Same scope as `SCORECARD_CTA_LABEL`.
export const SCORECARD_CTA_HELPER =
  "10–15 minutes · self-reported · gear-by-gear read · no documents required";

// P96 — Operational Friction Scan (new public Toy App entry).
// Primary public curiosity experience that leads into the deeper
// Diagnostic-Grade Stability Assessment (/scorecard).
export const SCAN_PATH = "/scan";
export const SCAN_CTA_LABEL = "Run the Operational Friction Scan";
export const SCAN_CTA_HELPER =
  "2 minutes · 7 questions · finds the likely upstream bottleneck and the worn teeth in your system";

// INTERNAL/DIAGNOSTIC-ONLY. Labels used inside the Diagnostic workflow
// where the Scorecard is structurally the first part of the deeper
// Diagnostic (Scorecard + Owner Interview + Evidence Review →
// Diagnostic Report). Never used on the public marketing surface.
export const SCORECARD_DIAGNOSTIC_LABEL =
  "Open Diagnostic Part 1 — Stability Assessment";
export const SCORECARD_DIAGNOSTIC_HELPER =
  "Structured 0–1000 read · pairs with the Owner Interview and Evidence Review to produce the full Diagnostic Report";
