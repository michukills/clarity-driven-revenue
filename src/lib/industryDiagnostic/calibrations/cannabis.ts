/**
 * P93E-E2G-P6 — Cannabis / MMJ Dispensary Operations FindingCalibration seeds.
 *
 * SAFETY: Cannabis findings are operational-visibility and
 * documentation-readiness only. They are NOT legal, tax, accounting,
 * fiduciary, healthcare, patient-care, or product-medical findings,
 * and never represent compliance certification or regulatory approval.
 * 280E and seed-to-sale references are CPA/tax-professional and
 * qualified-counsel coordinated visibility only.
 */
import type { FindingCalibration } from "../depthStandard";

export const CANNABIS_FINDING_CALIBRATIONS: FindingCalibration[] = [
  {
    key: "cannabis.seed_to_sale_documentation_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Seed-to-sale workflow lacks written documentation",
    why_it_matters:
      "When the seed-to-sale workflow lives in one operator's head, a single absence, turnover, or memory gap can break daily operations and weaken later evidence reviews.",
    evidence_supports: [
      "Seed-to-sale activity export — last 90 days",
      "Two recent inventory reconciliations",
      "Documented seed-to-sale procedure",
    ],
    evidence_missing_means:
      "Without a written seed-to-sale procedure and recent reconciliation records, this is a structured interview claim, not verified documentation readiness.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "high",
    cash_control_impact: "high",
    repair_map_trigger: "seed_to_sale_documentation_install",
    client_safe_explanation:
      "The seed-to-sale workflow is not yet documented in a way another trained operator could pick up, which limits day-to-day continuity and evidence readiness.",
    admin_only_interpretation:
      "Operational visibility only. Refer the client to qualified counsel for any regulatory question.",
  },
  {
    key: "cannabis.inventory_reconciliation_risk",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Inventory reconciliation cadence is informal",
    why_it_matters:
      "Without a fixed reconciliation cadence, discrepancies go unnoticed for days and the store can't tell whether the system, the shelf, or the process is drifting.",
    evidence_supports: [
      "Three most recent inventory reconciliations",
      "Two recent inventory count sheets",
      "Discrepancy log — last 90 days",
    ],
    evidence_missing_means:
      "Without scheduled reconciliations and recent count sheets, reconciliation strength is owner-estimated, not measured.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "inventory_reconciliation_install",
    client_safe_explanation:
      "Inventory reconciliation runs reactively rather than on a fixed cadence, which limits early detection of drift and discrepancy patterns.",
  },
  {
    key: "cannabis.documentation_velocity_risk",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Last manual audit date is unknown or stale",
    why_it_matters:
      "If no one can name the date of the last manual seed-to-sale or inventory audit, the store cannot answer basic operating questions on the spot.",
    evidence_supports: [
      "Three most recent inventory reconciliations",
      "Seed-to-sale activity export — last 90 days",
    ],
    evidence_missing_means:
      "Without a dated, manual audit on file, documentation-readiness velocity is unmeasured and stays a structured interview claim.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "documentation_velocity_install",
    client_safe_explanation:
      "The store cannot confidently name the date of the last manual seed-to-sale or inventory audit, which limits documentation-readiness on demand.",
  },
  {
    key: "cannabis.discrepancy_handling_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Discrepancies are escalated verbally and not tracked to closure",
    why_it_matters:
      "Verbal-only discrepancy handling loses signal on repeat issues and leaves no trail showing the issue was actually resolved.",
    evidence_supports: [
      "Discrepancy log — last 90 days",
      "Three most recent inventory reconciliations",
    ],
    evidence_missing_means:
      "Without a written discrepancy log tracked to closure, repeat discrepancy patterns are invisible and stay a structured interview claim.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "discrepancy_closure_install",
    client_safe_explanation:
      "Inventory discrepancies are handled verbally and are not tracked from spot to closure, which limits pattern detection and accountability.",
  },
  {
    key: "cannabis.stop_sell_process_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Stop-sell or hold process is not consistently documented",
    why_it_matters:
      "When stop-sell or hold instructions live in conversation rather than in writing, the next shift can sell what should be off the floor.",
    evidence_supports: [
      "Stop-sell / hold / quarantine records — last 90 days",
      "Closing checklist or shift report file",
    ],
    evidence_missing_means:
      "Without written stop-sell records, shift-to-shift consistency is owner-estimated only.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "stop_sell_process_install",
    client_safe_explanation:
      "Stop-sell and hold actions are not consistently documented in a way the next shift can rely on.",
  },
  {
    key: "cannabis.waste_logging_process_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Waste logging is delayed or owner-dependent",
    why_it_matters:
      "Delayed or single-person waste logging creates gaps between physical events and the written record, which weakens later reviews.",
    evidence_supports: [
      "Waste logs — last 60 days",
      "Documented waste-logging procedure",
    ],
    evidence_missing_means:
      "Without timely waste logs and a written procedure, waste-handling discipline is owner-estimated only.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "waste_logging_process_install",
    client_safe_explanation:
      "Waste logging happens late or depends on one person, which weakens the operating record.",
  },
  {
    key: "cannabis.manifest_receiving_control_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Manifest and receiving discrepancies are not consistently documented",
    why_it_matters:
      "When manifest mismatches are corrected by phone or memory, the store loses the trail that explains why physical inventory differs from the manifest.",
    evidence_supports: [
      "Two recent manifests with receiving notes",
      "Vendor invoices — last 90 days",
    ],
    evidence_missing_means:
      "Without written receiving notes on each manifest, intake control is a structured interview claim.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "manifest_receiving_install",
    client_safe_explanation:
      "Manifest and receiving discrepancies are not consistently captured in writing at intake.",
  },
  {
    key: "cannabis.tag_label_integrity_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Tag and label corrections are not tracked",
    why_it_matters:
      "Untracked tag or label corrections hide the volume and pattern of label issues, which limits process improvement.",
    evidence_supports: [
      "Tag / label correction log — last 60 days",
    ],
    evidence_missing_means:
      "Without a correction log, tag and label integrity is owner-estimated only and not measurable.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "low",
    cash_control_impact: "low",
    repair_map_trigger: "tag_label_log_install",
    client_safe_explanation:
      "Tag and label corrections are not consistently tracked, which hides volume and root-cause patterns.",
  },
  {
    key: "cannabis.cash_handling_visibility_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Cash drawer, drop, and deposit visibility is incomplete",
    why_it_matters:
      "Without trended drawer variance, witnessed drops, and deposit records, cash control issues stay invisible until they're large.",
    evidence_supports: [
      "Drawer closeout records + variance notes — last 30 days",
      "Safe / drop log — last 30 days",
      "Deposit records — last 30 days",
    ],
    evidence_missing_means:
      "Without closeout, drop, and deposit records, cash discipline is owner-estimated only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "cash_handling_visibility_install",
    client_safe_explanation:
      "Drawer closeouts, safe and drop activity, and deposits are not yet visible as a connected, trended record.",
  },
  {
    key: "cannabis.badge_training_documentation_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Badge and training records are hard to locate",
    why_it_matters:
      "If badge renewals and training records are scattered, expirations and training gaps surface late and disrupt staffing.",
    evidence_supports: [
      "Staff badge + training records",
    ],
    evidence_missing_means:
      "Without an organized badge and training file, renewal and training visibility is owner-estimated.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "medium",
    cash_control_impact: "low",
    repair_map_trigger: "badge_training_tracker_install",
    client_safe_explanation:
      "Staff badge and training records are not centrally organized for fast lookup or renewal tracking.",
  },
  {
    key: "cannabis.visitor_protocol_documentation_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Visitor protocol and visitor logs are informal",
    why_it_matters:
      "Informal visitor logs leave gaps in the operating record of who entered restricted areas and when.",
    evidence_supports: [
      "Visitor log — last 30 days",
      "Documented visitor protocol",
    ],
    evidence_missing_means:
      "Without a complete visitor log and written protocol, visitor handling is a structured interview claim.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "low",
    cash_control_impact: "low",
    repair_map_trigger: "visitor_log_process_install",
    client_safe_explanation:
      "The visitor protocol and visitor log are inconsistent and may have gaps in the operating record.",
  },
  {
    key: "cannabis.camera_security_documentation_readiness_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Camera and security checks are not run as a routine",
    why_it_matters:
      "If camera coverage, retention, and alarm logs aren't reviewed on a fixed cadence, the store learns about gaps only after an incident.",
    evidence_supports: [
      "Camera / security check log — last 90 days",
    ],
    evidence_missing_means:
      "Without a written camera and security review cadence, security-documentation readiness is owner-estimated only.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "security_review_cadence_install",
    client_safe_explanation:
      "Camera coverage, retention, and alarm logs are not reviewed on a fixed operating cadence.",
  },
  {
    key: "cannabis.owner_admin_bottleneck",
    industry: "cannabis_mmj_dispensary",
    gear: "owner_independence",
    finding_title: "One person owns most documentation and admin work",
    why_it_matters:
      "When one person owns documentation, reconciliation, and admin coverage, a single absence stalls operations and weakens documentation readiness.",
    evidence_supports: [
      "Role / responsibility matrix",
      "Documented escalation path",
      "Trained backup for seed-to-sale operator",
    ],
    evidence_missing_means:
      "Without a written role matrix and trained backups, admin coverage is owner-estimated only.",
    confidence_floor: "low",
    business_risk: "owner_dependency",
    owner_independence_lift: "high",
    cash_control_impact: "high",
    repair_map_trigger: "owner_admin_redundancy_install",
    client_safe_explanation:
      "Documentation and admin coverage depend heavily on one person, which limits resilience and continuity.",
  },
  {
    key: "cannabis.menu_pos_inventory_sync_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "operations",
    finding_title: "Menu, POS, and physical inventory drift apart",
    why_it_matters:
      "When the online menu, POS inventory, and shelf don't reliably match, customers and staff hit out-of-stocks at the counter and the store loses revenue and trust.",
    evidence_supports: [
      "Menu / POS / inventory sync notes or screenshots",
      "POS sales-by-category report — last 30 days",
    ],
    evidence_missing_means:
      "Without sync notes and POS exports, menu accuracy is owner-estimated only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "menu_inventory_sync_install",
    client_safe_explanation:
      "The online menu, POS inventory, and physical shelf are not yet kept in sync as a written operating routine.",
  },
  {
    key: "cannabis.category_margin_inventory_aging_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "financial",
    finding_title: "Category margin and inventory aging are not reviewed",
    why_it_matters:
      "Without a regular category-margin and inventory-aging review, slow-moving cash sits on the shelf and pricing decisions rely on instinct.",
    evidence_supports: [
      "Margin-by-category report — last 30 days",
      "Inventory aging report from POS or seed-to-sale system",
    ],
    evidence_missing_means:
      "Without category-margin and aging reports, profitability and aging are owner-estimated only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "category_margin_review_install",
    client_safe_explanation:
      "Category margin and inventory aging are not yet reviewed on a fixed cadence, which limits pricing and buying decisions.",
  },
  {
    key: "cannabis.cogs_280e_visibility_gap",
    industry: "cannabis_mmj_dispensary",
    gear: "financial",
    finding_title: "COGS and 280E coordination visibility is unclear (CPA-coordinated)",
    why_it_matters:
      "When the owner can't see how COGS is categorized for 280E coordination with the CPA, cash planning and pricing decisions rely on incomplete visibility.",
    evidence_supports: [
      "Trailing 12-month P&L + CPA-coordinated COGS breakout",
      "CPA-coordinated tax set-aside cash plan",
    ],
    evidence_missing_means:
      "Without a CPA-coordinated COGS breakout, 280E-aware visibility stays a structured interview claim. RGS provides operational visibility only — refer to a qualified cannabis CPA.",
    confidence_floor: "low",
    business_risk: "compliance_visibility",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "cogs_280e_visibility_install",
    client_safe_explanation:
      "Day-to-day visibility into how COGS is categorized for CPA-coordinated 280E work is limited, which weakens cash planning.",
    admin_only_interpretation:
      "Refer the client to a qualified cannabis CPA. RGS provides operational visibility only — never advise on 280E treatment, position, or strategy.",
  },
];
