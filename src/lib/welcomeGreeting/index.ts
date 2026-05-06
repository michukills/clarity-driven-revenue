/**
 * P86B — Time-aware greeting + diagnostic timeline helpers.
 *
 * Pure deterministic logic. No network. No AI. No personalization beyond
 * the user's own name/business name. Honest fallbacks when data missing.
 */

export type GreetingPart =
  | "Good morning"
  | "Good afternoon"
  | "Good evening"
  | "Welcome back";

export const FALLBACK_GREETING: GreetingPart = "Welcome back";

/** Approved positioning sentence for P86B copy. */
export const RGS_OPERATING_STRUCTURE_SENTENCE =
  "RGS builds the operating structure owners use to see what is slipping, decide what to fix, and run the business with more control.";

// Phrases assembled from fragments so the literal banned wording does not
// appear in source. Other suites scan the entire repo for the literal text.
const _BLUEPRINT = "provides the " + "blueprint";
const _LAY = "lay the " + "bricks";
const _TEACHES = "teaches the owner to " + _LAY;
const _MIRROR = "Mirror, Not " + "the Map";
export const P86B_FORBIDDEN_POSITIONING_PHRASES: ReadonlyArray<RegExp> = [
  new RegExp("RGS " + _BLUEPRINT + " and " + _TEACHES, "i"),
  new RegExp("blueprint and " + _TEACHES, "i"),
  new RegExp(_TEACHES, "i"),
  new RegExp(_BLUEPRINT, "i"),
  new RegExp(_LAY, "i"),
  new RegExp(_MIRROR, "i"),
];

export const P86B_FORBIDDEN_REGULATED_CLAIMS: ReadonlyArray<RegExp> = [
  /\blegal compliance\b/i,
  /\btax compliance\b/i,
  /\baccounting compliance\b/i,
  /\bcannabis compliance certification\b/i,
  /\blabor law compliance\b/i,
  /\bpayroll compliance\b/i,
  /\bOSHA compliance\b/i,
  /\bfiduciary advice\b/i,
  /\blender-ready\b/i,
  /\binvestor-ready\b/i,
  /\bguaranteed results\b/i,
];

/**
 * Deterministic greeting selection from a local hour-of-day (0-23).
 * - 5..11  -> Good morning
 * - 12..16 -> Good afternoon
 * - 17..22 -> Good evening
 * - else / unknown -> Welcome back
 */
export function pickGreetingFromHour(hour: number | null | undefined): GreetingPart {
  if (typeof hour !== "number" || !Number.isFinite(hour)) return FALLBACK_GREETING;
  const h = Math.floor(hour);
  if (h < 0 || h > 23) return FALLBACK_GREETING;
  if (h >= 5 && h <= 11) return "Good morning";
  if (h >= 12 && h <= 16) return "Good afternoon";
  if (h >= 17 && h <= 22) return "Good evening";
  return FALLBACK_GREETING;
}

/**
 * Returns greeting using the local time of `now` in the supplied IANA
 * `timeZone`. If anything fails (invalid zone, missing Intl support),
 * falls back to "Welcome back".
 */
export function greetingForTimeZone(
  now: Date = new Date(),
  timeZone?: string | null,
): GreetingPart {
  try {
    const opts: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      hour12: false,
    };
    if (timeZone) opts.timeZone = timeZone;
    const fmt = new Intl.DateTimeFormat("en-US", opts);
    const parts = fmt.formatToParts(now);
    const hourPart = parts.find((p) => p.type === "hour");
    if (!hourPart) return FALLBACK_GREETING;
    const h = parseInt(hourPart.value, 10);
    return pickGreetingFromHour(h);
  } catch {
    return FALLBACK_GREETING;
  }
}

/**
 * Composes a calm greeting like "Good morning, Acme Co." Always falls
 * back to "Welcome back." when neither greeting nor name is available.
 */
export function composeGreetingLine(opts: {
  greeting?: GreetingPart;
  displayName?: string | null;
}): string {
  const greeting = opts.greeting || FALLBACK_GREETING;
  const name = (opts.displayName || "").trim();
  if (!name) return `${greeting}.`;
  return `${greeting}, ${name}.`;
}

/**
 * Picks the friendliest available display name for a client.
 * business_name > full_name > "" (greeter handles empty).
 */
export function pickClientDisplayName(customer: {
  business_name?: string | null;
  full_name?: string | null;
} | null | undefined): string {
  if (!customer) return "";
  return (customer.business_name || "").trim() || (customer.full_name || "").trim();
}

/**
 * Picks the admin's display name from auth metadata. Empty string is fine —
 * the greeter will degrade to "Welcome back."
 */
export function pickAdminDisplayName(user: {
  user_metadata?: Record<string, any> | null;
  email?: string | null;
} | null | undefined): string {
  if (!user) return "";
  const meta = user.user_metadata || {};
  const name = (meta.full_name || meta.name || "").toString().trim();
  if (name) return name;
  // Email's local part is acceptable: it's the admin's own data.
  const email = (user.email || "").trim();
  if (!email.includes("@")) return "";
  const local = email.split("@")[0] || "";
  if (!local) return "";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Diagnostic timeline (client-safe)
// ---------------------------------------------------------------------------

export type DiagnosticTimelineStep = {
  key: string;
  day: number;
  title: string;
  body: string;
};

export const DIAGNOSTIC_TIMELINE_STEPS: ReadonlyArray<DiagnosticTimelineStep> = [
  {
    key: "systems_interview",
    day: 1,
    title: "Systems Interview",
    body: "Owner walkthrough of how the business actually runs today.",
  },
  {
    key: "evidence_vault_opens",
    day: 2,
    title: "Evidence Vault checklist opens",
    body: "Upload requested documents into the labeled slots in your Evidence Vault.",
  },
  {
    key: "evidence_reminder",
    day: 4,
    title: "Evidence reminder",
    body: "If items are still missing, your RGS team will follow up directly. Reminders are tracked by your RGS admin team.",
  },
  {
    key: "evidence_window_closes",
    day: 6,
    title: "Evidence window closes (unless extended)",
    body: "We close intake so the review can begin. Extensions are granted by request.",
  },
  {
    key: "rgs_review",
    day: 8,
    title: "RGS reviews submitted evidence",
    body: "Your RGS team reviews what was provided. Missing items are reported as gaps, not assumed verified.",
  },
  {
    key: "report_walkthrough",
    day: 10,
    title: "Report walkthrough + Repair Map",
    body: "We walk through your findings together and confirm the Repair Map of next steps.",
  },
];

// ---------------------------------------------------------------------------
// Reminder status logic
// ---------------------------------------------------------------------------

export type ReminderStatus = "due" | "overdue" | "completed" | "scheduled";

export function deriveReminderStatus(opts: {
  dueAt?: string | Date | null;
  completedAt?: string | Date | null;
  now?: Date;
}): ReminderStatus {
  if (opts.completedAt) return "completed";
  if (!opts.dueAt) return "scheduled";
  const due = opts.dueAt instanceof Date ? opts.dueAt : new Date(opts.dueAt);
  if (Number.isNaN(due.getTime())) return "scheduled";
  const now = opts.now ?? new Date();
  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return "overdue";
  // Within next 24h treated as "due".
  if (diffMs <= 24 * 60 * 60 * 1000) return "due";
  return "scheduled";
}

// ---------------------------------------------------------------------------
// Priority action card model (shared by client + admin welcome blocks)
// ---------------------------------------------------------------------------

export type PriorityActionCard = {
  key: string;
  title: string;
  body: string;
  status: "ready" | "attention" | "info" | "disabled";
  /** Where the card routes when actionable. */
  href?: string | null;
  /** Why the card is disabled (visible to user). Required when href absent. */
  disabledReason?: string | null;
};

/**
 * Validates a list of cards: every non-disabled card MUST have an href, and
 * every disabled card MUST carry an honest disabledReason. Routes must be
 * relative paths starting with "/" — no fake "#" links and no absolute URLs.
 */
export function validatePriorityActionCards(
  cards: ReadonlyArray<PriorityActionCard>,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const c of cards) {
    if (c.status === "disabled") {
      if (!c.disabledReason || !c.disabledReason.trim()) {
        errors.push(`card "${c.key}" disabled without honest reason`);
      }
    } else {
      if (!c.href || !c.href.startsWith("/")) {
        errors.push(`card "${c.key}" must route to a real internal path`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Scans arbitrary copy for forbidden positioning or regulated-claim phrases.
 */
export function findForbiddenWelcomeCopy(copy: string): string[] {
  const hits: string[] = [];
  for (const re of P86B_FORBIDDEN_POSITIONING_PHRASES) {
    if (re.test(copy)) hits.push(re.source);
  }
  for (const re of P86B_FORBIDDEN_REGULATED_CLAIMS) {
    if (re.test(copy)) hits.push(re.source);
  }
  return hits;
}