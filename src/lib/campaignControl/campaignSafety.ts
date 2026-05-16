import type { CampaignSafetyStatus } from "./types";

export type CampaignSafetyIssueType =
  | "guaranteed_outcome"
  | "regulated_claim"
  | "fake_proof"
  | "fake_urgency"
  | "unsupported_superiority"
  | "cannabis_compliance"
  | "spam_or_auto_dm"
  | "fake_integration";

export interface CampaignSafetyIssue {
  issue_type: CampaignSafetyIssueType;
  severity: "low" | "medium" | "high" | "blocker";
  matched_text: string;
  client_safe_explanation: string;
  admin_remediation_suggestion: string;
  suggested_safer_rewrite?: string;
}

export interface CampaignSafetyResult {
  status: CampaignSafetyStatus;
  issues: CampaignSafetyIssue[];
  safe_summary: string;
}

type Rule = {
  type: CampaignSafetyIssueType;
  severity: CampaignSafetyIssue["severity"];
  re: RegExp;
  client: string;
  admin: string;
  rewrite?: string;
};

const RULES: Rule[] = [
  {
    type: "guaranteed_outcome",
    severity: "blocker",
    re: /\b(guarantee(?:d|s)?|promise(?:d|s)?|ensure(?:s|d)?|will (?:increase|double|triple|convert)|10x|skyrocket|explosive growth|guaranteed (?:leads|revenue|profit|growth|roi|results?)|outperform guaranteed|platform[- ]approved|viral[- ]ready)\b/i,
    client: "This wording implies a guaranteed business outcome.",
    admin: "Replace outcome promises with operational guidance and review language.",
    rewrite: "This campaign is designed to test a clearer message and learn which prospects respond.",
  },
  {
    type: "regulated_claim",
    severity: "blocker",
    re: /\b(legal(?:ly)? compliant|compliance approved|tax advice|accounting advice|valuation lift|fiduciary|certif(?:y|ied|ication)|safe harbor)\b/i,
    client: "This wording sounds like legal, tax, accounting, compliance, valuation, or certification advice.",
    admin: "Use operational visibility language and recommend qualified professional review where needed.",
    rewrite: "This gives operational visibility for review; it does not certify compliance or replace professional advice.",
  },
  {
    type: "fake_proof",
    severity: "high",
    re: /\b(proven results?|case stud(?:y|ies)|testimonial|trusted by|clients say|number one|#1|best in (?:class|market|industry))\b/i,
    client: "This wording implies proof or superiority that has not been verified for this campaign.",
    admin: "Remove proof claims unless the proof is verified, approved, and specific to the customer.",
    rewrite: "Use a specific, evidence-backed observation instead of a broad proof claim.",
  },
  {
    type: "fake_urgency",
    severity: "medium",
    re: /\b(only \d+ spots|act now|last chance|limited time|before it'?s too late|do not miss out)\b/i,
    client: "This adds urgency that may not be true.",
    admin: "Use a concrete next step without manufactured scarcity.",
    rewrite: "If this is worth reviewing, start with the Scorecard and decide from there.",
  },
  {
    type: "unsupported_superiority",
    severity: "medium",
    re: /\b(best|leading|top-rated|unmatched|world-class)\b/i,
    client: "This may overstate superiority without evidence.",
    admin: "Make the claim specific, observable, and supportable.",
    rewrite: "Use a practical, specific benefit tied to the offer.",
  },
  {
    type: "cannabis_compliance",
    severity: "blocker",
    re: /\b(cannabis|mmj|dispensary|metrc|biotrack)[\s\S]{0,90}\b(compliant|compliance certified|legal approval|regulatory approval)\b/i,
    client: "Cannabis/MMJ campaign language must stay operational and cannot certify compliance.",
    admin: "Keep cannabis guidance limited to operational readiness and documentation visibility.",
    rewrite: "This supports operational and documentation visibility in a compliance-sensitive environment.",
  },
  {
    type: "spam_or_auto_dm",
    severity: "high",
    re: /\b(auto[- ]?dm|mass dm|scrape(?:d)? leads|blast everyone|cold spam|stealth outreach)\b/i,
    client: "This suggests spammy or unsafe outreach.",
    admin: "Keep outreach permission-aware, manual where needed, and platform-safe.",
    rewrite: "Create a reviewed draft the team can send manually to appropriate contacts.",
  },
  {
    type: "fake_integration",
    severity: "high",
    re: /\b(auto[- ]?post|live GA4 sync|connected analytics|posted via integration|automatic social posting)\b/i,
    client: "This claims a live integration or posting path that may not be wired.",
    admin: "Only claim manual posting/tracking unless a live connector is actually configured and verified.",
    rewrite: "Manual posting and manual performance tracking are available until a verified connector is configured.",
  },
];

function statusFor(issues: CampaignSafetyIssue[]): CampaignSafetyStatus {
  if (issues.some((i) => i.severity === "blocker")) return "blocked";
  if (issues.length > 0) return "needs_review";
  return "passed";
}

export function checkCampaignSafety(text: string): CampaignSafetyResult {
  const body = text ?? "";
  const issues: CampaignSafetyIssue[] = [];
  for (const rule of RULES) {
    const match = body.match(rule.re);
    if (!match) continue;
    issues.push({
      issue_type: rule.type,
      severity: rule.severity,
      matched_text: match[0],
      client_safe_explanation: rule.client,
      admin_remediation_suggestion: rule.admin,
      suggested_safer_rewrite: rule.rewrite,
    });
  }
  const status = statusFor(issues);
  return {
    status,
    issues,
    safe_summary:
      status === "passed"
        ? "No blocked campaign claims found. Admin review is still required before publishing."
        : "Campaign copy needs review before it can be approved or scheduled.",
  };
}

export function assertCampaignCopySafeForApproval(text: string): CampaignSafetyResult {
  return checkCampaignSafety(text);
}
