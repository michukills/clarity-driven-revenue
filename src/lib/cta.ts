// Centralized public CTA targets.
//
// Primary conversion path is the in-app application form at
// `/diagnostic-apply`. The mailto link is preserved as a backup
// channel (still surfaced on the contact page and in footers) but
// is no longer the primary CTA anywhere on the public site.
export const DIAGNOSTIC_APPLY_PATH = "/diagnostic-apply";
export const SCORECARD_PATH = "/scorecard";

export const DIAGNOSTIC_MAILTO =
  "mailto:info@revenueandgrowthsystems.com?subject=RGS Diagnostic Inquiry&body=Name:%0ABusiness:%0ARevenue:%0AWhat feels off:";

export const DIAGNOSTIC_CTA_LABEL = "Start With a Diagnostic";
// P93H — CTA cleanup. Removed "0–1000" from the button label (it was
// redundant with the surrounding helper copy) and capitalized FREE so the
// no-cost signal is unmissable. The 0–1000 concept still appears in
// supporting/explanatory copy where it clarifies the Scorecard payoff.
export const SCORECARD_CTA_LABEL = "Take the FREE Business Stability Scorecard";

// Short helper line displayed next to/under the primary Scorecard CTA.
// Pinned so a future edit can't quietly drop the value-prop helper.
export const SCORECARD_CTA_HELPER =
  "10–15 minutes · self-reported · gear-by-gear read · no documents required";

// P96 — Operational Friction Scan (new public Toy App entry).
// Primary public curiosity experience that leads into the deeper
// Diagnostic-Grade Stability Assessment (/scorecard).
export const SCAN_PATH = "/scan";
export const SCAN_CTA_LABEL = "Run the Operational Friction Scan";
export const SCAN_CTA_HELPER =
  "2 minutes · 7 questions · finds the likely upstream bottleneck and the worn teeth in your system";
