import { TRADES_HOME_SERVICES_BANK } from "../src/lib/industryDiagnostic/banks/trades";
import { RESTAURANTS_FOOD_SERVICE_BANK } from "../src/lib/industryDiagnostic/banks/restaurants";
import { auditBank } from "../src/lib/industryDiagnostic/depthStandard";
import { effectivePromptKind, summarizeBank } from "../src/lib/industryDiagnostic/types";

for (const bank of [TRADES_HOME_SERVICES_BANK, RESTAURANTS_FOOD_SERVICE_BANK]) {
  const a = auditBank(bank);
  const s = summarizeBank(bank);
  console.log("===", bank.industry, "===");
  console.log("total", s.total, "by_kind", s.by_kind, "by_gear", s.by_gear);
  console.log("meets_full_depth", a.meets_full_depth, "issues", a.issues.length);
  // Coverage of metadata
  const stats = {
    with_business_term: 0,
    with_helper: 0,
    with_source_of_truth: 0,
    with_evidence_prompt: 0,
    with_report_seed: 0,
    with_repair_seed: 0,
    with_admin_interpretation: 0,
    with_admin_notes: 0,
    with_trigger_when: 0,
    conditional_count: 0,
    conditional_with_trigger: 0,
    conditional_with_admin_interp: 0,
  };
  for (const q of bank.questions) {
    if (q.business_term) stats.with_business_term++;
    if (q.helper_text) stats.with_helper++;
    if (q.source_of_truth_guidance) stats.with_source_of_truth++;
    if (q.evidence_prompt) stats.with_evidence_prompt++;
    if (q.report_finding_seed) stats.with_report_seed++;
    if (q.repair_map_trigger_seed) stats.with_repair_seed++;
    if (q.admin_interpretation) stats.with_admin_interpretation++;
    if (q.admin_only_notes) stats.with_admin_notes++;
    if (q.trigger_when) stats.with_trigger_when++;
    if (effectivePromptKind(q) === "conditional_deep_dive") {
      stats.conditional_count++;
      if (q.trigger_when) stats.conditional_with_trigger++;
      if (q.admin_interpretation) stats.conditional_with_admin_interp++;
    }
  }
  console.log(stats);
  // long question check
  const longQs = bank.questions.filter(q => q.plain_language_question.length > 160);
  console.log("long_questions(>160)", longQs.length, longQs.slice(0,3).map(q=>q.key));
}
