export const P94A_GUIDE_BOT_VERSION = "p94a-guide-bots-v1";

export type GuideBotSurface = "public" | "client" | "admin";

export type GuideBotMode = "deterministic" | "ai_backed" | "unavailable";

export interface GuideBotAction {
  label: string;
  href: string;
  reason: string;
  surface: GuideBotSurface | "shared";
}

export interface GuideBotContextSummary {
  route: string;
  surface: GuideBotSurface;
  accountLabel?: string | null;
  stageLabel?: string | null;
  assignedToolCount?: number | null;
  visibleReportCount?: number | null;
  evidenceRequestCount?: number | null;
  blockers?: string[];
}

export interface GuideBotResponse {
  version: string;
  surface: GuideBotSurface;
  mode: GuideBotMode;
  answer: string;
  actions: GuideBotAction[];
  boundaries: string[];
  contextSummary: GuideBotContextSummary;
  aiAssisted: boolean;
  draftOnly: boolean;
}

export interface ImageInputDraftField {
  key: string;
  label: string;
  value: string;
  confidence: "low" | "medium" | "high";
  sourceNote: string;
  sensitivity: "normal" | "sensitive" | "regulated_review";
}

export interface ImageInputAssistDraft {
  version: string;
  surface: Exclude<GuideBotSurface, "public">;
  mode: GuideBotMode;
  draftLabel: "AI-assisted draft";
  summary: string;
  fields: ImageInputDraftField[];
  recommendedDestination: string;
  warnings: string[];
  requiresConfirmationBeforeWrite: true;
  verified: false;
}

const PUBLIC_ACTIONS: GuideBotAction[] = [
  {
    label: "Take the Scorecard",
    href: "/scorecard",
    reason: "Start with the free first-pass stability check.",
    surface: "public",
  },
  {
    label: "Compare Scorecard vs Diagnostic",
    href: "/diagnostic",
    reason: "See what the paid Diagnostic examines beyond the public check.",
    surface: "public",
  },
  {
    label: "How RGS Works",
    href: "/what-we-do",
    reason: "Understand RGS as operating-structure architecture, not outsourced operation.",
    surface: "public",
  },
  {
    label: "Request Diagnostic",
    href: "/diagnostic-apply",
    reason: "Move toward the paid Diagnostic if the fit is clear.",
    surface: "public",
  },
];

const CLIENT_ACTIONS: GuideBotAction[] = [
  {
    label: "Open My Tools",
    href: "/portal/tools",
    reason: "Find assigned tools without exposing unassigned work.",
    surface: "client",
  },
  {
    label: "Upload Evidence",
    href: "/portal/uploads",
    reason: "Submit materials RGS requested for review.",
    surface: "client",
  },
  {
    label: "View Reports",
    href: "/portal/reports",
    reason: "Open approved client-visible reports only.",
    surface: "client",
  },
  {
    label: "Review Next Tasks",
    href: "/portal/priority-tasks",
    reason: "See what is waiting on you next.",
    surface: "client",
  },
];

const ADMIN_ACTIONS: GuideBotAction[] = [
  {
    label: "Review Scorecard Leads",
    href: "/admin/scorecard-leads",
    reason: "Check public submissions, email status, and next action.",
    surface: "admin",
  },
  {
    label: "Open Pending Accounts",
    href: "/admin/pending-accounts",
    reason: "Approve, deny, clarify, or link new portal requests.",
    surface: "admin",
  },
  {
    label: "Open Review Queue",
    href: "/admin/rgs-review-queue",
    reason: "Find drafts and items that need admin review before client visibility.",
    surface: "admin",
  },
  {
    label: "Open Customer List",
    href: "/admin/customers",
    reason: "Choose the account before using customer-scoped workflows.",
    surface: "admin",
  },
];

export const GUIDE_BOT_BOUNDARIES: Record<GuideBotSurface, string[]> = {
  public: [
    "Public guidance only. No portal, client, or admin data is available here.",
    "The guide can explain RGS and route you to the Scorecard or Diagnostic, but it cannot fully diagnose a business from chat.",
    "No legal, tax, accounting, compliance, valuation, revenue, profit, or growth guarantees.",
  ],
  client: [
    "Client-safe guidance only. Admin notes, hidden scoring logic, and other client data are not available here.",
    "AI can help draft or organize inputs, but you confirm before anything is submitted.",
    "Deterministic scoring and RGS/admin review remain the source of truth.",
  ],
  admin: [
    "Admin-only guidance. It can summarize workflow context, but it cannot approve, publish, send, delete, or change scores.",
    "AI drafts and extraction results require admin review before client-visible use.",
    "Deterministic scoring, evidence review, and approval gates remain the source of truth.",
  ],
};

export const GUIDE_BOT_BAR_COPY: Record<GuideBotSurface, string> = {
  public: "Ask how RGS, the Scorecard, or the Diagnostic works.",
  client: "Ask what to do next, where to upload, or how to use your assigned tools.",
  admin: "Ask what to review next, what is blocked, or where this workflow lives.",
};

export function inferGuideSurface(pathname: string, isAdmin = false): GuideBotSurface {
  if (pathname.startsWith("/admin") || isAdmin) return "admin";
  if (pathname.startsWith("/portal")) return "client";
  return "public";
}

export function getGuideBotActions(surface: GuideBotSurface, route: string, message = ""): GuideBotAction[] {
  const text = `${route} ${message}`.toLowerCase();
  const base =
    surface === "admin" ? ADMIN_ACTIONS : surface === "client" ? CLIENT_ACTIONS : PUBLIC_ACTIONS;

  const prioritized = [...base];
  if (surface === "public" && /diagnostic|paid|review|fit/.test(text)) {
    prioritized.sort((a) => (a.href === "/diagnostic" ? -1 : 1));
  }
  if (surface === "public" && /score|stable|scorecard|free|0.?1000/.test(text)) {
    prioritized.sort((a) => (a.href === "/scorecard" ? -1 : 1));
  }
  if (surface === "client" && /upload|evidence|file|document|photo|image/.test(text)) {
    prioritized.sort((a) => (a.href === "/portal/uploads" ? -1 : 1));
  }
  if (surface === "admin" && /lead|scorecard|email|follow/.test(text)) {
    prioritized.sort((a) => (a.href === "/admin/scorecard-leads" ? -1 : 1));
  }
  if (surface === "admin" && /pending|approve|signup|request|demo|client|gig/.test(text)) {
    prioritized.sort((a) => (a.href === "/admin/pending-accounts" ? -1 : 1));
  }

  return prioritized.slice(0, 4);
}

export const FORBIDDEN_GUIDE_CLAIMS = [
  /guarantee(?:d|s)?\s+(?:growth|revenue|profit|results|outcomes?)/i,
  /\b10x\b/i,
  /skyrocket/i,
  /legal advice/i,
  /tax advice/i,
  /accounting advice/i,
  /compliance certification/i,
  /valuation advice/i,
  /we will run your business/i,
  /done[- ]for[- ]you business operator/i,
];

export function findForbiddenGuideClaims(text: string): string[] {
  return FORBIDDEN_GUIDE_CLAIMS.filter((rx) => rx.test(text)).map((rx) => rx.source);
}

export function sanitizeGuideAnswer(text: string, surface: GuideBotSurface): string {
  const trimmed = text.trim().replace(/\n{3,}/g, "\n\n");
  if (!trimmed) return buildDeterministicGuideAnswer(surface, "");
  if (findForbiddenGuideClaims(trimmed).length === 0) return trimmed;

  return [
    "I need to keep this inside RGS boundaries.",
    buildDeterministicGuideAnswer(surface, ""),
  ].join("\n\n");
}

export function buildDeterministicGuideAnswer(
  surface: GuideBotSurface,
  message: string,
  context?: Partial<GuideBotContextSummary>,
): string {
  const text = message.toLowerCase();

  if (surface === "public") {
    if (/scorecard|score|0.?1000|free/.test(text)) {
      return "The free Scorecard is a first-pass stability check across Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, and Owner Independence. It helps you see where the business may be slipping. It is not the full Diagnostic and does not promise outcomes.";
    }
    if (/diagnostic|paid|full review|next step/.test(text)) {
      return "The paid Diagnostic goes deeper than the public Scorecard. RGS reviews the operating structure, looks for what is working and what is slipping, and produces clearer repair direction. Implementation is separate unless purchased.";
    }
    return "RGS builds the operating structure owners use to see what is slipping, decide what to fix, and run the business with more control. I can explain the Scorecard, Diagnostic, Implementation, or RGS Control System and point you to the right next step.";
  }

  if (surface === "client") {
    const stage = context?.stageLabel ? ` Your current visible stage is ${context.stageLabel}.` : "";
    if (/upload|evidence|file|document|photo|image/.test(text)) {
      return `Use the upload area for materials RGS requested, such as SOPs, screenshots, exports, notes, or process examples.${stage} Uploads are reviewed before they become official findings.`;
    }
    if (/tool|assigned|where/.test(text)) {
      return `Open My Tools to see only the tools assigned to your account.${stage} Locked tools stay locked until RGS assigns or unlocks them for your current scope.`;
    }
    return `I can help you understand your next action, assigned tools, evidence requests, and visible reports.${stage} I cannot see admin notes or make final findings.`;
  }

  const account = context?.accountLabel ? ` for ${context.accountLabel}` : "";
  if (/lead|scorecard|email|follow/.test(text)) {
    return `Open Scorecard Leads to review submission quality, linked customer status, consent, follow-up email status, and the safest manual next action${account}.`;
  }
  if (/publish|report|draft|approve/.test(text)) {
    return `Before publishing anything client-visible${account}, confirm evidence, scope, draft status, client visibility, and approval state. AI can draft or summarize, but admin review controls the release.`;
  }
  return `I can help route the admin workflow${account}: what needs review, what is blocked, what evidence is missing, and what page to open next. I cannot approve, publish, send, delete, change access, or change deterministic scores.`;
}

export function buildGuideResponse(
  surface: GuideBotSurface,
  route: string,
  answer: string,
  mode: GuideBotMode,
  context: Partial<GuideBotContextSummary> = {},
): GuideBotResponse {
  const contextSummary: GuideBotContextSummary = {
    route,
    surface,
    ...context,
  };
  return {
    version: P94A_GUIDE_BOT_VERSION,
    surface,
    mode,
    answer: sanitizeGuideAnswer(answer, surface),
    actions: getGuideBotActions(surface, route, answer),
    boundaries: GUIDE_BOT_BOUNDARIES[surface],
    contextSummary,
    aiAssisted: mode === "ai_backed",
    draftOnly: true,
  };
}

export function getImageAssistWarnings(mimeType: string): string[] {
  const warnings = [
    "AI extraction is a draft only. Confirm or edit before storing or using it.",
    "Do not upload sensitive personal, health, financial, regulated, or client-private data unless it belongs in this RGS workspace.",
    "This does not verify evidence or provide legal, tax, accounting, compliance, valuation, or financial advice.",
  ];
  if (!/^image\/|application\/pdf|text\/|application\/vnd/.test(mimeType)) {
    warnings.unshift("This file type may not extract cleanly. Use a screenshot, image, PDF, or text export when possible.");
  }
  return warnings;
}

export function isRouteSafeForSurface(action: GuideBotAction, surface: GuideBotSurface): boolean {
  if (surface === "public") return !action.href.startsWith("/admin") && !action.href.startsWith("/portal");
  if (surface === "client") return action.href.startsWith("/portal") || action.surface === "shared";
  return action.href.startsWith("/admin") || action.surface === "admin";
}
