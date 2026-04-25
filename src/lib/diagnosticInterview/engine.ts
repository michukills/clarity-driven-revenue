// P13.DiagnosticInterview.AI.1 — Deterministic engine for the Business Systems
// Diagnostic Interview. Pure functions: questions + answer→outputs mapping.
// No AI calls. No paid services. Free-safe and works on anonymous submissions.

export type AreaKey =
  | "demand"
  | "sales"
  | "delivery"
  | "financial"
  | "labor"
  | "owner"
  | "tools"
  | "blockers"
  | "beliefs"
  | "evidence";

export interface InterviewQuestion {
  id: string;
  area: AreaKey;
  prompt: string;
  hint?: string;
  placeholder?: string;
  /** Minimum useful answer length (chars) for "good" confidence. */
  minStrong?: number;
}

export interface AreaSpec {
  key: AreaKey;
  label: string;
  intro: string;
}

export const AREAS: AreaSpec[] = [
  { key: "demand", label: "Demand & Lead Generation", intro: "How leads come in and where they come from." },
  { key: "sales", label: "Sales & Conversion", intro: "How leads turn into customers." },
  { key: "delivery", label: "Delivery & Operations", intro: "How the work actually gets done." },
  { key: "financial", label: "Financial Visibility & Cash", intro: "What you can see in your numbers." },
  { key: "labor", label: "Labor & Capacity", intro: "Who does the work and where capacity breaks." },
  { key: "owner", label: "Owner Dependence", intro: "Where the business still needs you personally." },
  { key: "tools", label: "Tools & Data Sources", intro: "What systems you use and what they track." },
  { key: "blockers", label: "Current Blockers", intro: "What's actively in the way right now." },
  { key: "beliefs", label: "What You Believe Is Happening", intro: "Your read on the current state." },
  { key: "evidence", label: "What Evidence Exists", intro: "What proof we'd find if we looked." },
];

export const QUESTIONS: InterviewQuestion[] = [
  // Demand
  { id: "demand_sources", area: "demand", prompt: "Where do most of your leads come from today?", hint: "Referrals, ads, SEO, partners, outbound, repeat customers — name the top 2–3.", minStrong: 60 },
  { id: "demand_volume", area: "demand", prompt: "Roughly how many leads come in per week or month, and is that trend growing, flat, or shrinking?", minStrong: 50 },
  { id: "demand_owner", area: "demand", prompt: "Who owns lead generation? What happens when a new lead arrives?", minStrong: 60 },

  // Sales
  { id: "sales_close", area: "sales", prompt: "How does a lead become a customer? Walk us through the steps.", minStrong: 80 },
  { id: "sales_rate", area: "sales", prompt: "What percent of qualified leads turn into paying customers? How do you know?", minStrong: 50 },
  { id: "sales_breaks", area: "sales", prompt: "Where do deals stall, drop off, or go cold?", minStrong: 60 },

  // Delivery
  { id: "delivery_flow", area: "delivery", prompt: "Once a customer says yes, what happens next? Who owns delivery?", minStrong: 80 },
  { id: "delivery_volume_break", area: "delivery", prompt: "What breaks first when volume goes up?", minStrong: 60 },
  { id: "delivery_documented", area: "delivery", prompt: "Which parts of delivery are documented vs. still in someone's head?", minStrong: 60 },

  // Financial
  { id: "fin_visibility", area: "financial", prompt: "What financial numbers do you actually look at each week or month? Which do you trust?", minStrong: 60 },
  { id: "fin_books", area: "financial", prompt: "Are your books current? Who maintains them? What tool?", minStrong: 50 },
  { id: "fin_cash", area: "financial", prompt: "How do you know how much cash is available and what's owed in the next 30 days?", minStrong: 60 },

  // Labor
  { id: "labor_team", area: "labor", prompt: "Who works in the business and what does each person own?", minStrong: 60 },
  { id: "labor_capacity", area: "labor", prompt: "Where does capacity break first — sales, delivery, admin, or owner time?", minStrong: 50 },

  // Owner
  { id: "owner_pull", area: "owner", prompt: "Where does the business pull you back in even when you don't want to be involved?", minStrong: 60 },
  { id: "owner_time", area: "owner", prompt: "Roughly how is your week split: selling, delivering, fixing, planning, admin?", minStrong: 60 },

  // Tools
  { id: "tools_stack", area: "tools", prompt: "What tools or systems do you currently use? (Accounting, CRM, payments, payroll, job/field, analytics, etc.)", minStrong: 50 },
  { id: "tools_manual", area: "tools", prompt: "What is still tracked in spreadsheets, email, text, or memory?", minStrong: 50 },

  // Blockers
  { id: "blockers_now", area: "blockers", prompt: "What is the single biggest thing blocking the business right now?", minStrong: 60 },

  // Beliefs vs evidence
  { id: "beliefs_top", area: "beliefs", prompt: "What do you believe is the real cause of where the business is stuck?", minStrong: 60 },
  { id: "evidence_top", area: "evidence", prompt: "What evidence exists that supports that belief — reports, numbers, examples?", minStrong: 60 },
  { id: "evidence_books_check", area: "evidence", prompt: "If RGS looked at your books, CRM, payroll, or job system today, what would we likely see?", minStrong: 60 },
];

export type AnswerMap = Record<string, string>;

// ---------------- Helpers ----------------
function lower(a: string | undefined): string {
  return (a || "").toLowerCase();
}
function len(a: string | undefined): number {
  return (a || "").trim().length;
}
function answered(a: string | undefined): boolean {
  return len(a) >= 8;
}
function strong(q: InterviewQuestion, a: string | undefined): boolean {
  return len(a) >= (q.minStrong ?? 60);
}
function any(a: string | undefined, kws: string[]): boolean {
  const s = lower(a);
  return kws.some((k) => s.includes(k));
}

// ---------------- Output types ----------------

export type Confidence = "low" | "medium" | "high";

export interface EvidenceMapItem {
  id: string;
  claim: string;
  area: AreaKey;
  area_label: string;
  supporting_evidence: string;
  missing_evidence: string;
  contradiction_risk: string;
  owner_dependency_signal: string;
  validation_source_needed: string;
  confidence: Confidence;
  client_safe_summary: string;
  admin_notes?: string;
}

export type GearKey = "demand" | "sales" | "delivery" | "cash" | "labor" | "owner_capacity";

export interface DependencyGear {
  key: GearKey;
  label: string;
  current_strength: "weak" | "mixed" | "strong" | "unknown";
  suspected_weak_point: string;
  downstream_effect: string;
  evidence_confidence: Confidence;
  rgs_should_inspect: string;
}

export interface ChecklistItem {
  id: string;
  document: string;
  why_it_matters: string;
  related_areas: AreaKey[];
}

export interface AdminBrief {
  business_claims: string[];
  likely_true_signals: string[];
  unsupported_claims: string[];
  contradictions: string[];
  suspected_system_breaks: string[];
  evidence_requested: string[];
  recommended_diagnostic_agenda: string[];
  confidence_notes: string;
  next_best_rgs_action: string;
}

export interface MissingInformation {
  area: AreaKey;
  area_label: string;
  what_is_missing: string;
  why_it_matters: string;
}

export interface InterviewOutputs {
  evidence_map: EvidenceMapItem[];
  system_dependency_map: DependencyGear[];
  validation_checklist: ChecklistItem[];
  admin_brief: AdminBrief;
  missing_information: MissingInformation[];
  confidence: Confidence;
}

function areaLabel(k: AreaKey): string {
  return AREAS.find((a) => a.key === k)?.label ?? k;
}

// ---------------- Confidence per area ----------------
function areaConfidence(answers: AnswerMap, area: AreaKey): Confidence {
  const qs = QUESTIONS.filter((q) => q.area === area);
  if (qs.length === 0) return "low";
  let strongCount = 0;
  let answeredCount = 0;
  for (const q of qs) {
    if (answered(answers[q.id])) answeredCount += 1;
    if (strong(q, answers[q.id])) strongCount += 1;
  }
  if (answeredCount === 0) return "low";
  if (strongCount >= Math.ceil(qs.length * 0.6)) return "high";
  if (answeredCount >= Math.ceil(qs.length * 0.5)) return "medium";
  return "low";
}

// ---------------- Build outputs ----------------

function buildEvidenceMap(answers: AnswerMap): EvidenceMapItem[] {
  const items: EvidenceMapItem[] = [];

  // Demand: lead source claim
  if (answered(answers.demand_sources)) {
    const referralHeavy = any(answers.demand_sources, ["referral", "word of mouth", "wom"]);
    const adsHeavy = any(answers.demand_sources, ["ads", "google ads", "meta", "facebook", "paid"]);
    items.push({
      id: "claim_lead_source",
      claim: referralHeavy
        ? "Owner says leads are mostly referral-based."
        : adsHeavy
        ? "Owner says leads are driven by paid acquisition."
        : "Owner described primary lead sources.",
      area: "demand",
      area_label: areaLabel("demand"),
      supporting_evidence: answers.demand_sources.trim(),
      missing_evidence: "No CRM export, GA/GSC report, or ad-platform breakdown attached.",
      contradiction_risk: adsHeavy && answered(answers.fin_visibility) && !any(answers.fin_visibility, ["ad", "cac", "spend"])
        ? "Spend on ads is implied but not reflected in tracked numbers."
        : "Low — single-source claim.",
      owner_dependency_signal: any(answers.demand_owner, ["i ", "myself", "owner", "me"])
        ? "Owner appears to own lead intake personally."
        : "Not clearly owner-dependent based on answers.",
      validation_source_needed: "CRM lead-source report, GA4/GSC data, or ad-platform export.",
      confidence: areaConfidence(answers, "demand"),
      client_safe_summary: "We heard your read on lead sources. We'd want to validate that against your CRM or analytics before recommending changes.",
    });
  }

  // Sales: conversion claim
  if (answered(answers.sales_rate)) {
    const hasNumber = /\d/.test(answers.sales_rate);
    items.push({
      id: "claim_conversion_rate",
      claim: "Owner stated a close-rate estimate.",
      area: "sales",
      area_label: areaLabel("sales"),
      supporting_evidence: answers.sales_rate.trim(),
      missing_evidence: hasNumber ? "No CRM pipeline export or won/lost report attached." : "No numeric estimate provided and no source data.",
      contradiction_risk: !hasNumber ? "Estimate is qualitative; risk that actual rate diverges materially." : "Medium until CRM data confirms.",
      owner_dependency_signal: any(answers.sales_close, ["i close", "owner closes", "i sell"])
        ? "Owner appears to close most deals personally."
        : "Not clearly owner-dependent.",
      validation_source_needed: "CRM pipeline export with stage history, or won/lost report.",
      confidence: areaConfidence(answers, "sales"),
      client_safe_summary: "Your close-rate estimate is recorded. We'd validate it against your real pipeline before drawing conclusions.",
    });
  }

  // Delivery: documentation claim
  if (answered(answers.delivery_documented) || answered(answers.delivery_flow)) {
    const undocumented = any(answers.delivery_documented, ["head", "memory", "no sop", "not documented", "tribal"]) || !answered(answers.delivery_documented);
    items.push({
      id: "claim_delivery_state",
      claim: undocumented
        ? "Delivery process appears partly undocumented."
        : "Delivery process is described as documented.",
      area: "delivery",
      area_label: areaLabel("delivery"),
      supporting_evidence: [answers.delivery_flow, answers.delivery_documented].filter(Boolean).join(" — "),
      missing_evidence: "No SOPs, job/field-system export, or completion report attached.",
      contradiction_risk: undocumented && any(answers.delivery_volume_break, ["nothing", "no issues", "fine"])
        ? "Owner reports no volume issues yet says process is undocumented — risk increases as volume grows."
        : "Low.",
      owner_dependency_signal: any(answers.delivery_flow, ["i ", "myself", "owner"]) ? "Owner appears involved in delivery handoffs." : "Not clearly owner-dependent.",
      validation_source_needed: "SOP examples, job/field-system completion report, or process walkthrough.",
      confidence: areaConfidence(answers, "delivery"),
      client_safe_summary: "We have a working picture of delivery. We'd want to see actual SOPs or job-system data to confirm.",
    });
  }

  // Financial: visibility claim
  if (answered(answers.fin_visibility) || answered(answers.fin_books)) {
    const trustsNumbers = any(answers.fin_visibility, ["trust", "confident", "current", "weekly", "monthly"]);
    items.push({
      id: "claim_financial_visibility",
      claim: trustsNumbers
        ? "Owner reports reviewing financial numbers regularly."
        : "Financial visibility appears partial or trust is uncertain.",
      area: "financial",
      area_label: areaLabel("financial"),
      supporting_evidence: [answers.fin_visibility, answers.fin_books].filter(Boolean).join(" — "),
      missing_evidence: "No P&L, AR aging, or bank/cash report attached.",
      contradiction_risk: trustsNumbers && !answered(answers.fin_cash) ? "Trust is claimed but cash visibility was not described." : "Low.",
      owner_dependency_signal: any(answers.fin_books, ["i do", "i keep", "owner"]) ? "Owner may be maintaining the books personally." : "Books may be maintained by a bookkeeper or external.",
      validation_source_needed: "QuickBooks/Xero P&L, AR aging, bank statement.",
      confidence: areaConfidence(answers, "financial"),
      client_safe_summary: "We'd want to see your real P&L and AR aging before making financial recommendations.",
    });
  }

  // Owner: dependence claim
  if (answered(answers.owner_pull) || answered(answers.owner_time)) {
    const heavyPull = answered(answers.owner_pull) && len(answers.owner_pull) > 40;
    items.push({
      id: "claim_owner_dependence",
      claim: heavyPull
        ? "Owner reports being pulled into the business in multiple places."
        : "Owner described their current involvement in the business.",
      area: "owner",
      area_label: areaLabel("owner"),
      supporting_evidence: [answers.owner_pull, answers.owner_time].filter(Boolean).join(" — "),
      missing_evidence: "No calendar/time-tracking sample provided.",
      contradiction_risk: "Self-reported time allocation is often optimistic; real calendar data may show more owner load.",
      owner_dependency_signal: heavyPull ? "Strong signal of owner dependence." : "Mixed signal of owner dependence.",
      validation_source_needed: "Owner calendar export or 2-week time log.",
      confidence: areaConfidence(answers, "owner"),
      client_safe_summary: "We've captured your read on where the business pulls you in. A short time-log would let us validate it.",
    });
  }

  // Beliefs vs Evidence — explicit comparison
  if (answered(answers.beliefs_top)) {
    const hasEvidence = answered(answers.evidence_top);
    items.push({
      id: "claim_owner_belief",
      claim: "Owner stated their belief about why the business is stuck.",
      area: "beliefs",
      area_label: areaLabel("beliefs"),
      supporting_evidence: answers.beliefs_top.trim(),
      missing_evidence: hasEvidence ? "Some evidence cited, but not yet validated against source data." : "No supporting evidence provided.",
      contradiction_risk: hasEvidence ? "Belief and stated evidence should be cross-checked against books/CRM." : "High — belief unsupported by evidence in this interview.",
      owner_dependency_signal: "Belief framing often centers on owner's vantage point — corroborate with team or data.",
      validation_source_needed: "Whichever data source matches the claim (books, CRM, payroll, job system).",
      confidence: hasEvidence ? "medium" : "low",
      client_safe_summary: "We've recorded your read on the root cause. RGS will validate it against real data before recommending direction.",
      admin_notes: hasEvidence ? undefined : "Owner-stated cause without supporting evidence — flag for validation in diagnostic agenda.",
    });
  }

  return items;
}

function buildSystemDependencyMap(answers: AnswerMap): DependencyGear[] {
  const gears: DependencyGear[] = [];

  // Demand
  {
    const conf = areaConfidence(answers, "demand");
    const weak = any(answers.demand_volume, ["shrink", "down", "flat", "slow", "few"]);
    gears.push({
      key: "demand",
      label: "Demand",
      current_strength: !answered(answers.demand_sources) ? "unknown" : weak ? "weak" : "mixed",
      suspected_weak_point: weak ? "Lead volume is flat or shrinking." : "Lead source mix not yet validated.",
      downstream_effect: "Lower top-of-funnel feeds lower close volume even at constant conversion.",
      evidence_confidence: conf,
      rgs_should_inspect: "CRM lead-source report and GA4/GSC traffic data.",
    });
  }

  // Sales
  {
    const conf = areaConfidence(answers, "sales");
    const stalls = any(answers.sales_breaks, ["stall", "ghost", "cold", "delay", "follow up", "follow-up"]);
    gears.push({
      key: "sales",
      label: "Sales",
      current_strength: stalls ? "weak" : answered(answers.sales_rate) ? "mixed" : "unknown",
      suspected_weak_point: stalls ? "Deals stall in mid-pipeline; follow-up cadence likely inconsistent." : "Conversion estimate is unverified.",
      downstream_effect: "Slower conversion delays revenue and ties up owner time in unclosed opportunities.",
      evidence_confidence: conf,
      rgs_should_inspect: "CRM pipeline export with stage history and won/lost reasons.",
    });
  }

  // Delivery
  {
    const conf = areaConfidence(answers, "delivery");
    const undocumented = any(answers.delivery_documented, ["head", "memory", "not documented", "tribal", "no sop"]);
    const breaks = any(answers.delivery_volume_break, ["everything", "delivery", "owner", "me", "quality"]);
    gears.push({
      key: "delivery",
      label: "Delivery",
      current_strength: undocumented || breaks ? "weak" : "mixed",
      suspected_weak_point: undocumented ? "Delivery process is partly tribal/undocumented." : breaks ? "Volume increases break delivery quality or owner load." : "Process described but not yet validated.",
      downstream_effect: "Quality issues, slower cash collection, and owner pulled back into operations.",
      evidence_confidence: conf,
      rgs_should_inspect: "Job/field-system completion report, SOP samples, and quality complaint log.",
    });
  }

  // Cash
  {
    const conf = areaConfidence(answers, "financial");
    const noCash = !answered(answers.fin_cash);
    gears.push({
      key: "cash",
      label: "Cash",
      current_strength: noCash ? "unknown" : "mixed",
      suspected_weak_point: noCash ? "Cash visibility was not clearly described." : "Cash visibility may be partial — AR/AP unconfirmed.",
      downstream_effect: "Without clear cash visibility, financial decisions and recommendations carry more risk.",
      evidence_confidence: conf,
      rgs_should_inspect: "QuickBooks/Xero P&L, AR aging, and bank/cash report.",
    });
  }

  // Labor
  {
    const conf = areaConfidence(answers, "labor");
    const capacityIssue = any(answers.labor_capacity, ["owner", "me", "delivery", "stretched", "burn"]);
    gears.push({
      key: "labor",
      label: "Labor",
      current_strength: capacityIssue ? "weak" : answered(answers.labor_team) ? "mixed" : "unknown",
      suspected_weak_point: capacityIssue ? "Capacity breaks at owner or delivery layer first." : "Team structure described but capacity not validated.",
      downstream_effect: "Capacity ceilings cap revenue and pull the owner back in operationally.",
      evidence_confidence: conf,
      rgs_should_inspect: "Payroll/labor summary and a 2-week task allocation snapshot.",
    });
  }

  // Owner capacity
  {
    const conf = areaConfidence(answers, "owner");
    const heavy = answered(answers.owner_pull) && len(answers.owner_pull) > 40;
    gears.push({
      key: "owner_capacity",
      label: "Owner Capacity",
      current_strength: heavy ? "weak" : answered(answers.owner_pull) ? "mixed" : "unknown",
      suspected_weak_point: heavy ? "Owner is pulled into multiple operational areas." : "Owner load is described but not validated against calendar.",
      downstream_effect: "Owner becomes the bottleneck for sales, delivery, and decision-making.",
      evidence_confidence: conf,
      rgs_should_inspect: "Owner calendar export and a 2-week time log.",
    });
  }

  return gears;
}

function buildValidationChecklist(answers: AnswerMap): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  if (!answered(answers.fin_books) || !any(answers.tools_stack, ["quickbook", "xero", "freshbooks"])) {
    items.push({
      id: "qb_pl",
      document: "QuickBooks (or accounting) P&L for the last 3–6 months",
      why_it_matters: "Validates revenue stability, margin, and expense patterns instead of relying on owner estimates.",
      related_areas: ["financial"],
    });
  }
  if (!answered(answers.fin_cash)) {
    items.push({
      id: "ar_aging",
      document: "AR aging report",
      why_it_matters: "Reveals receivables risk and how much promised revenue is actually collectible soon.",
      related_areas: ["financial"],
    });
  }
  if (!any(answers.tools_stack, ["hubspot", "salesforce", "pipedrive", "crm"])) {
    items.push({
      id: "crm_export",
      document: "CRM pipeline export (stages, source, status, last activity)",
      why_it_matters: "Validates conversion claims and shows where deals actually stall.",
      related_areas: ["sales", "demand"],
    });
  }
  items.push({
    id: "lead_source_report",
    document: "Lead source breakdown (CRM or analytics)",
    why_it_matters: "Confirms whether the stated lead-source mix matches reality.",
    related_areas: ["demand"],
  });
  if (!any(answers.tools_stack, ["paycom", "adp", "gusto", "payroll"])) {
    items.push({
      id: "payroll",
      document: "Payroll/labor summary",
      why_it_matters: "Validates labor load against revenue and identifies capacity ceilings.",
      related_areas: ["labor"],
    });
  }
  if (!any(answers.tools_stack, ["jobber", "housecall", "servicetitan", "field"])) {
    items.push({
      id: "job_completion",
      document: "Job / project completion report (or field-system export)",
      why_it_matters: "Validates delivery throughput and quality signals.",
      related_areas: ["delivery"],
    });
  }
  if (any(answers.delivery_documented, ["head", "memory", "tribal", "not documented", "no sop"]) || !answered(answers.delivery_documented)) {
    items.push({
      id: "sops",
      document: "Examples of any current SOPs or process docs",
      why_it_matters: "Establishes baseline for what's actually documented vs. what lives in someone's head.",
      related_areas: ["delivery", "owner"],
    });
  }
  if (!answered(answers.owner_time) || len(answers.owner_time) < 80) {
    items.push({
      id: "owner_calendar",
      document: "Owner calendar export or 2-week time log",
      why_it_matters: "Validates self-reported owner time allocation against real calendar data.",
      related_areas: ["owner"],
    });
  }
  items.push({
    id: "bank_cash",
    document: "Bank balance / cash position snapshot",
    why_it_matters: "Anchors cash recommendations to current reality, not estimates.",
    related_areas: ["financial"],
  });

  return items;
}

function buildAdminBrief(
  answers: AnswerMap,
  evidence_map: EvidenceMapItem[],
  gears: DependencyGear[],
  checklist: ChecklistItem[],
  overallConfidence: Confidence,
): AdminBrief {
  const claims = evidence_map.map((e) => e.claim);
  const unsupported = evidence_map
    .filter((e) => e.confidence === "low" || /No .* attached/i.test(e.missing_evidence))
    .map((e) => `${e.claim} (${e.area_label})`);
  const likely = evidence_map
    .filter((e) => e.confidence !== "low")
    .map((e) => `${e.claim} — corroborate with ${e.validation_source_needed}`);
  const contradictions = evidence_map
    .filter((e) => e.contradiction_risk && !/^low\.?$/i.test(e.contradiction_risk))
    .map((e) => `${e.area_label}: ${e.contradiction_risk}`);
  const breaks = gears
    .filter((g) => g.current_strength === "weak")
    .map((g) => `${g.label}: ${g.suspected_weak_point} → ${g.downstream_effect}`);
  const evidenceRequested = checklist.map((c) => c.document);

  const agenda: string[] = [];
  if (gears.some((g) => g.key === "cash" && g.current_strength !== "strong")) {
    agenda.push("Validate cash and AR before any financial recommendation.");
  }
  if (gears.some((g) => g.key === "sales" && g.current_strength === "weak")) {
    agenda.push("Pull CRM stage history to confirm where deals stall.");
  }
  if (gears.some((g) => g.key === "delivery" && g.current_strength === "weak")) {
    agenda.push("Inspect SOP gaps and quality signals in delivery before scaling.");
  }
  if (gears.some((g) => g.key === "owner_capacity" && g.current_strength === "weak")) {
    agenda.push("Time-log owner week to confirm dependence pattern.");
  }
  if (agenda.length === 0) {
    agenda.push("Confirm primary evidence sources before recommending stop/start/scale moves.");
  }

  const next =
    overallConfidence === "low"
      ? "Request validation documents before drafting recommendations. Treat all findings as preliminary."
      : overallConfidence === "medium"
      ? "Schedule diagnostic working session and request 2–3 highest-impact validation documents."
      : "Schedule diagnostic readout and confirm a single highest-impact validation source.";

  return {
    business_claims: claims,
    likely_true_signals: likely,
    unsupported_claims: unsupported,
    contradictions,
    suspected_system_breaks: breaks,
    evidence_requested: evidenceRequested,
    recommended_diagnostic_agenda: agenda,
    confidence_notes: `Overall confidence: ${overallConfidence}. Confidence is bounded by missing primary-source evidence. Treat all findings as preliminary signals, not final diagnoses.`,
    next_best_rgs_action: next,
  };
}

function buildMissingInformation(answers: AnswerMap): MissingInformation[] {
  const out: MissingInformation[] = [];
  for (const a of AREAS) {
    const qs = QUESTIONS.filter((q) => q.area === a.key);
    const answeredQs = qs.filter((q) => answered(answers[q.id]));
    if (answeredQs.length === 0) {
      out.push({
        area: a.key,
        area_label: a.label,
        what_is_missing: `No answers provided for ${a.label}.`,
        why_it_matters: "We can't form a signal in this area without owner input or a source document.",
      });
    } else if (answeredQs.length < qs.length) {
      const skipped = qs.filter((q) => !answered(answers[q.id])).map((q) => q.prompt);
      out.push({
        area: a.key,
        area_label: a.label,
        what_is_missing: `Skipped: ${skipped.join(" | ")}`,
        why_it_matters: "Partial answers reduce confidence and widen the validation list.",
      });
    }
  }
  return out;
}

function overallConfidence(answers: AnswerMap): Confidence {
  const perArea = AREAS.map((a) => areaConfidence(answers, a.key));
  const high = perArea.filter((c) => c === "high").length;
  const med = perArea.filter((c) => c === "medium").length;
  const low = perArea.filter((c) => c === "low").length;
  if (low > med + high) return "low";
  if (high >= 3) return "high";
  return "medium";
}

export function buildInterviewOutputs(answers: AnswerMap): InterviewOutputs {
  const evidence_map = buildEvidenceMap(answers);
  const system_dependency_map = buildSystemDependencyMap(answers);
  const validation_checklist = buildValidationChecklist(answers);
  const missing_information = buildMissingInformation(answers);
  const conf = overallConfidence(answers);
  const admin_brief = buildAdminBrief(answers, evidence_map, system_dependency_map, validation_checklist, conf);
  return {
    evidence_map,
    system_dependency_map,
    validation_checklist,
    admin_brief,
    missing_information,
    confidence: conf,
  };
}

export function emptyAnswers(): AnswerMap {
  const o: AnswerMap = {};
  for (const q of QUESTIONS) o[q.id] = "";
  return o;
}

export function answeredCount(answers: AnswerMap): number {
  return QUESTIONS.filter((q) => answered(answers[q.id])).length;
}

export const INTERVIEW_VERSION = "diagnostic-interview-v1.0";
