// P7.2.1 — Single source of truth for "is this resource THE Revenue Control
// Center™ resource?" Used by useRccAccess, the cross-client alert aggregator,
// and the admin Tool Operating Matrix to ensure RCC unlock is driven only by
// the actual RCC subscription resource — not by any generic add-on like the
// Onboarding Worksheet or Revenue & Risk Monitor.
//
// The canonical RCC resource is the client-facing "Revenue Tracker (Client)"
// row pointing at /portal/business-control-center/revenue-tracker. We match
// by URL prefix first (most stable) and fall back to a tight title match so
// renamed/aliased rows still resolve correctly.

const RCC_URL_PREFIX = "/portal/business-control-center";

const RCC_TITLE_MATCHERS: Array<RegExp> = [
  /\brevenue\s*control\s*center\b/i,
  /\brevenue\s*tracker\s*\(?\s*client\s*\)?/i,
  /\brcc\b/i,
];

export interface RccResourceLike {
  title?: string | null;
  url?: string | null;
  tool_category?: string | null;
  tool_audience?: string | null;
}

/** True iff this resource row is the Revenue Control Center™ unlock. */
export function isRccResource(r: RccResourceLike | null | undefined): boolean {
  if (!r) return false;
  // Internal-only rows never grant client RCC access.
  if (r.tool_audience === "internal") return false;
  const url = (r.url || "").trim().toLowerCase();
  if (url.startsWith(RCC_URL_PREFIX)) return true;
  const title = (r.title || "").trim();
  if (!title) return false;
  return RCC_TITLE_MATCHERS.some((re) => re.test(title));
}