/**
 * P93E-E2G — RGS Control System Support Boundary.
 *
 * Deterministic classification of inbound client support requests for the
 * post-Implementation Control System add-on. The Control System is the
 * client-operated continuation layer; it is NOT a new Implementation
 * project and is NOT unlimited consulting.
 *
 * Classification is rules-first (regex/keyword). AI may be used upstream
 * to draft summaries, but cannot bypass deterministic re-engagement
 * triggers, cannot create official findings, and cannot move score.
 */

export type SupportClassification =
  | "included_support"
  | "reengagement_required"
  | "admin_review_needed";

export interface ClassifiedSupportRequest {
  classification: SupportClassification;
  rationale: string;
  client_safe_explanation: string;
  admin_note: string;
  matched_signals: ReadonlyArray<string>;
  ai_assisted: boolean;
}

const REENGAGEMENT_PATTERNS: ReadonlyArray<{ re: RegExp; label: string }> = [
  { re: /\bnew\s+(diagnostic|business\s+mri)\b/i, label: "new diagnostic request" },
  { re: /\bredo\s+(our|the)\s+(diagnostic|business\s+mri)\b/i, label: "redo diagnostic" },
  { re: /\bnew\s+implementation\b/i, label: "new implementation project" },
  { re: /\b(major|full)\s+(strategy|redesign)\b/i, label: "major strategy redesign" },
  { re: /\bnew\s+(department|process|workflow|sop\s+system)\b/i, label: "new department or workflow buildout" },
  { re: /\bnew\s+(custom\s+tool|tool|workflow)\b/i, label: "new custom tool/workflow" },
  { re: /\bnew\s+business\s+line\b/i, label: "new business line analysis" },
  { re: /\b(legal|tax|accounting|compliance|valuation|regulatory)\s+(advice|question|opinion|determination)\b/i,
    label: "regulated advice request" },
  { re: /\b(advise|advice|opinion)\s+(on|about|regarding)\s+(legal|tax|accounting|compliance|valuation|regulatory)\b/i,
    label: "regulated advice request" },
  { re: /\b(advise|advice)\b[\s\S]*\b(legal|tax|accounting|compliance|valuation|regulatory)\b/i,
    label: "regulated advice request" },
  { re: /\b(legal|tax|accounting|compliance|valuation|regulatory)\b.*\?$/i,
    label: "regulated topic question" },
  { re: /\b(material|significant)\s+scope\s+(expansion|change)\b/i, label: "material scope expansion" },
  { re: /\b(rgs\s+)?(manage|run|operate)\s+(this|our|the)\s+(business|operations?)\b/i,
    label: "request for ongoing execution" },
  { re: /\bguarantee(d)?\s+(revenue|profit|growth|valuation|outcomes?|results?|compliance)\b/i,
    label: "guaranteed-outcome request" },
  { re: /\bbuild\s+(a|an|me)\s+(new\s+)?(sales\s+process|crm|sop\s+system|funnel)\b/i,
    label: "new system build" },
  { re: /\bcan\s+rgs\s+(execute|do|run|handle)\s+(this|our)\s+(every\s+week|weekly|daily|ongoing)/i,
    label: "request for RGS to operate" },
  { re: /\bcan\s+rgs\s+(manage|run|operate|handle|execute|do)\b/i,
    label: "request for RGS to operate" },
];

const INCLUDED_PATTERNS: ReadonlyArray<{ re: RegExp; label: string }> = [
  { re: /\b(how\s+do\s+i|where\s+do\s+i|where\s+can\s+i)\b/i, label: "tool usage question" },
  { re: /\b(what\s+does\s+(this|that)\s+(warning|flag|alert|message)\s+mean)\b/i, label: "warning clarification" },
  { re: /\b(mark|update|complete|status)\b.*\b(repair|task|item)\b/i, label: "repair item status update" },
  { re: /\b(refresh|update|upload)\b.*\bevidence\b/i, label: "evidence refresh question" },
  { re: /\b(clarif(y|ication))\b.*\b(installed|existing|current)\b/i, label: "clarification on installed item" },
  { re: /\b(installed\s+(process|tool|workflow|sop))\b/i, label: "installed-tool clarification" },
  { re: /\b(score|gear|stability|history)\b.*\b(mean|movement|trend|change)\b/i, label: "score/gear clarification" },
  { re: /\b(priority\s+action|next\s+action|next\s+step)\b/i, label: "priority action clarification" },
  { re: /\b(dashboard|monitoring|visibility|signal)\b/i, label: "dashboard/visibility clarification" },
];

export function classifySupportRequest(text: string): ClassifiedSupportRequest {
  const t = (text || "").trim();
  const reMatches: string[] = [];
  for (const p of REENGAGEMENT_PATTERNS) if (p.re.test(t)) reMatches.push(p.label);
  if (reMatches.length > 0) {
    return {
      classification: "reengagement_required",
      rationale:
        "Request appears to fall outside the installed RGS system and likely requires a new Diagnostic or Implementation engagement.",
      client_safe_explanation:
        "This request looks like it goes beyond the installed system. Some requests may require a new Diagnostic or Implementation engagement. The Control System add-on covers ongoing visibility, monitoring, and bounded support for what RGS has already installed.",
      admin_note:
        "Re-engagement signals matched. Confirm scope before treating as included support. RGS does not provide legal, tax, accounting, compliance, or valuation advice and does not guarantee outcomes.",
      matched_signals: reMatches,
      ai_assisted: false,
    };
  }
  const incMatches: string[] = [];
  for (const p of INCLUDED_PATTERNS) if (p.re.test(t)) incMatches.push(p.label);
  if (incMatches.length > 0) {
    return {
      classification: "included_support",
      rationale:
        "Request appears to be included Control System support: tool usage, evidence refresh, dashboard clarification, or installed-item clarification.",
      client_safe_explanation:
        "This is part of ongoing Control System support. RGS will help you continue using the installed tools and keep the system current. The owner remains the decision-maker.",
      admin_note:
        "Treat as included support unless the conversation expands scope. No legal, tax, accounting, compliance, or valuation determination should be offered.",
      matched_signals: incMatches,
      ai_assisted: false,
    };
  }
  return {
    classification: "admin_review_needed",
    rationale:
      "No included or re-engagement signals matched deterministically. Admin should classify before responding.",
    client_safe_explanation:
      "Thanks — this one needs a quick review so we route it correctly within your installed Control System scope.",
    admin_note:
      "Classify manually. Consider whether the request stays inside installed scope (included) or expands scope (re-engagement). RGS does not provide legal, tax, accounting, compliance, or valuation advice.",
    matched_signals: [],
    ai_assisted: false,
  };
}

export const CONTROL_SYSTEM_INCLUDED_SUPPORT: ReadonlyArray<string> = [
  "Tool usage guidance for RGS-installed tools",
  "Clarification on existing diagnostic findings",
  "Clarification on installed implementation items",
  "Visibility review of the installed system",
  "Evidence refresh guidance",
  "Priority action clarification",
  "Minor workflow clarification",
  "Understanding dashboard warnings",
  "Keeping the system current",
];

export const CONTROL_SYSTEM_REENGAGEMENT_TRIGGERS: ReadonlyArray<string> = [
  "New Diagnostic engagement",
  "New Implementation project",
  "Major strategy redesign",
  "New department or process buildout",
  "New custom tool or workflow build",
  "New business line analysis",
  "Regulated/legal/tax/accounting/compliance/valuation question",
  "Material scope expansion beyond the installed system",
  "Request for RGS to execute ongoing operations",
  "Request for guaranteed outcomes",
];

/** Affirmative phrases that must NEVER appear in client-facing Control System copy. */
export const CONTROL_SYSTEM_FORBIDDEN_CLAIMS: ReadonlyArray<RegExp> = [
  /\bguarantee(d|s)?\s+(revenue|profit|growth|roi|valuation|compliance|outcomes?|results?)\b/i,
  /\bguaranteed\s+timeline\b/i,
  /\bwe\s+(run|manage|operate)\s+(your\s+)?business\b/i,
  /\blegal\s+compliance\s+achieved\b/i,
  /\baudit\s+certified\b/i,
  /\bvaluation\s+certified\b/i,
  /\bcompliance\s+certified\b/i,
  /\bdone[- ]for[- ]you\b/i,
  /\bhands[- ]off\s+for\s+the\s+owner\b/i,
];

/** Cannabis affirmative claims forbidden in Cannabis Control System surfaces. */
export const CONTROL_SYSTEM_CANNABIS_AFFIRMATIVE_BLOCK: ReadonlyArray<RegExp> = [
  /\blegally\s+compliant\b/i,
  /\bcompliance\s+certified\b/i,
  /\bregulatory\s+safe\b/i,
  /\bguaranteed\s+compliant\b/i,
  /\blegally\s+verified\b/i,
  /\bsafe\s+harbor\s+achieved\b/i,
];
