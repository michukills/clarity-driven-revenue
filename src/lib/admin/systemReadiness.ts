// P35 — Admin-only System Readiness registry.
//
// Static, deterministic catalog of the AI-assisted workflows in this project
// and the external maintenance dashboards an admin needs to keep RGS client
// work running. This file deliberately holds NO secrets, NO live API keys,
// and NO tokens; it only references *where* an admin should manually verify
// balances, billing, and provider state.
//
// The actual configured/ready signal is computed on the backend by the
// `ai-readiness-status` edge function. The catalog below is what we render
// when that signal is unavailable, plus the descriptive metadata used to
// label each workflow in the UI.

export type AiWorkflowStatus =
  | "ready"
  | "needs_api_key"
  | "not_configured"
  | "error"
  | "attention"
  | "unknown";

export type AiWorkflowEntry = {
  key: string;
  label: string;
  surface: string; // where in the admin UI this workflow surfaces
  edgeFunction: string | null; // backing edge function, if any
  description: string;
};

/**
 * AI-assisted workflows in this project. Keep this list in sync with the
 * `workflows` array in `supabase/functions/ai-readiness-status/index.ts`.
 * Surfaces are admin-triggered; public scorecard/diagnostic intake stays
 * deterministic and never spends AI balance.
 */
export const AI_WORKFLOW_CATALOG: AiWorkflowEntry[] = [
  {
    key: "scorecard_report_assist",
    label: "Scorecard interpretation / report draft assist",
    surface: "Admin · Report drafts",
    edgeFunction: "report-ai-assist",
    description:
      "Helps admins interpret written scorecard answers and draft an admin-review-only report. Final 0-1000 score remains deterministic.",
  },
  {
    key: "diagnostic_report_assist",
    label: "Diagnostic report drafting",
    surface: "Admin · Diagnostic Workspace · Report drafts",
    edgeFunction: "report-ai-assist",
    description:
      "Drafts a diagnostic narrative from saved findings. Admin must validate before any client-visible release.",
  },
  {
    key: "persona_seed",
    label: "Persona builder seed helper",
    surface: "Admin · Tools · Persona Builder",
    edgeFunction: "persona-ai-seed",
    description: "Suggests an initial persona hypothesis. Admin edits before saving.",
  },
  {
    key: "journey_seed",
    label: "Journey mapper seed helper",
    surface: "Admin · Tools · Journey Mapper",
    edgeFunction: "journey-ai-seed",
    description: "Suggests a draft customer journey. Admin edits before saving.",
  },
  {
    key: "process_seed",
    label: "Process breakdown seed helper",
    surface: "Admin · Tools · Process Breakdown",
    edgeFunction: "process-ai-seed",
    description: "Suggests a draft process map. Admin edits before saving.",
  },
  {
    key: "client_outcome_review_assist",
    label: "Client task / outcome review assist",
    surface: "Admin · Outcomes review queue",
    edgeFunction: null,
    description:
      "Reserved: assist with summarizing client-submitted task outcomes. Today this surface is fully manual; AI assist is queued for a future phase.",
  },
];

export type MaintenanceLink = {
  key: string;
  label: string;
  description: string;
  url: string;
  balanceMode: "live" | "manual";
  manualNote?: string;
};

/**
 * External admin maintenance dashboards. URLs are public sign-in points only;
 * none of these links carry secrets. Balance amounts are NEVER inferred or
 * displayed — admins click through to verify.
 */
export const MAINTENANCE_LINKS: MaintenanceLink[] = [
  {
    key: "lovable_credits",
    label: "Lovable credits & top-up",
    description: "Cloud & AI balance, plan usage, top-up.",
    url: "https://lovable.dev/settings",
    balanceMode: "manual",
    manualNote: "Open Settings -> Cloud & AI balance to view live numbers.",
  },
  {
    key: "supabase_project",
    label: "Backend project & advisors",
    description: "Lovable Cloud project, security advisors, logs.",
    url: "https://supabase.com/dashboard",
    balanceMode: "manual",
    manualNote: "Sign in with the workspace owner account to view advisors.",
  },
  {
    key: "github_repo",
    label: "GitHub repository",
    description: "Source repo, branches, deploy hooks.",
    url: "https://github.com",
    balanceMode: "manual",
    manualNote: "Open the repo configured for this Lovable project.",
  },
  {
    key: "ai_provider_billing",
    label: "AI provider billing",
    description: "Underlying model provider billing & API keys.",
    url: "https://lovable.dev/settings",
    balanceMode: "manual",
    manualNote:
      "Lovable AI bills through the Cloud & AI balance. No third-party provider key is required when using Lovable AI.",
  },
  {
    key: "published_site",
    label: "Published website",
    description: "Public marketing site & sitemap.",
    url: "https://www.revenueandgrowthsystems.com",
    balanceMode: "live",
  },
];

/**
 * Translates the backend balance signal returned by `ai-readiness-status`
 * into a status label suitable for the admin UI. Never displays secrets.
 */
export function aiWorkflowStatus(input: {
  hasLovableKey: boolean;
  balanceSignal?: string | null;
  recentFailedRuns?: number | null;
  edgeFunction: string | null;
}): { status: AiWorkflowStatus; label: string } {
  if (!input.edgeFunction) {
    return { status: "not_configured", label: "Not yet wired" };
  }
  if (!input.hasLovableKey) {
    return { status: "needs_api_key", label: "Needs API key" };
  }
  if (input.balanceSignal === "top_up_required") {
    return { status: "attention", label: "Usage / balance attention needed" };
  }
  if ((input.recentFailedRuns ?? 0) > 0) {
    return { status: "error", label: "Recent error" };
  }
  return { status: "ready", label: "Ready" };
}

export const AI_REVIEW_DISCLOSURE = [
  "AI does not replace deterministic scoring. Scorecard and diagnostic scores are always computed from the published rubric.",
  "AI may assist with interpreting written client answers and drafting report narratives.",
  "Final client-visible recommendations require admin review and approval before release.",
] as const;
