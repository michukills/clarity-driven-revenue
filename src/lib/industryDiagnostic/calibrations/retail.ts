/**
 * P93E-E2G-P3 — Retail / Brick-and-Mortar FindingCalibration seeds.
 *
 * Industry-specific finding shapes the future report builder will hydrate
 * from `industry_diagnostic_responses` for retail accounts. Each finding is
 * evidence-aware: when the supporting evidence is missing, the report layer
 * must downgrade the finding to a structured interview claim or owner
 * estimate rather than overstating certainty.
 */
import type { FindingCalibration } from "../depthStandard";

export const RETAIL_FINDING_CALIBRATIONS: FindingCalibration[] = [
  {
    key: "retail.inventory_cash_trap",
    industry: "retail_brick_mortar",
    gear: "financial",
    finding_title: "Inventory dollars are not visible as cash exposure",
    why_it_matters:
      "Retail cash quietly lives in inventory. When turnover and aging aren't visible, the store can be 'profitable on paper' while running short of cash to cover rent, payroll, and reorders.",
    evidence_supports: [
      "POS inventory valuation export",
      "Aged inventory / dead stock report",
      "POS sales-by-category vs. inventory-on-hand comparison",
    ],
    evidence_missing_means:
      "Without an inventory valuation and aging report, inventory cash exposure is owner intuition only and must be reported as a structured interview claim.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "inventory_cash_visibility_install",
    client_safe_explanation:
      "Inventory cash exposure is not yet visible by category or by age, which limits decisions about reorders, markdowns, and seasonal cash planning.",
    admin_only_interpretation:
      "If the owner can't quote inventory dollars within ±20%, treat any margin or turnover claim as owner-estimated regardless of how confidently it is delivered.",
  },
  {
    key: "retail.shrink_stock_accuracy_gap",
    industry: "retail_brick_mortar",
    gear: "operations",
    finding_title: "Inventory accuracy and shrink are not measured",
    why_it_matters:
      "Without periodic counts, cycle counts, and a shrink log, the POS quantity-on-hand can't be trusted — driving stockouts, dead stock, and silent margin loss.",
    evidence_supports: [
      "Most recent full inventory count vs. POS quantity-on-hand",
      "Cycle count log",
      "Shrink / damage log",
    ],
    evidence_missing_means:
      "Without count and shrink records, inventory accuracy is reported as a structured interview claim, not a measured KPI.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "inventory_accuracy_program_install",
    client_safe_explanation:
      "Inventory accuracy and shrink are not consistently measured, which limits trust in POS quantity-on-hand and the ability to identify shrink patterns.",
  },
  {
    key: "retail.category_margin_blind_spot",
    industry: "retail_brick_mortar",
    gear: "financial",
    finding_title: "Margin by category is not visible",
    why_it_matters:
      "Knowing sales by category without margin by category steers the store toward volume, not profit. Two categories with identical revenue can earn very different margin dollars.",
    evidence_supports: [
      "POS sales by category, last 90 days",
      "Cost-of-goods data per category",
    ],
    evidence_missing_means:
      "Without category cost data, any category-margin statement is owner intuition only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "category_margin_visibility_install",
    client_safe_explanation:
      "Margin by category is not yet visible, which limits decisions about pricing, placement, vendor mix, and discount strategy.",
  },
  {
    key: "retail.owner_buying_bottleneck",
    industry: "retail_brick_mortar",
    gear: "owner_independence",
    finding_title: "Buying decisions depend on the owner",
    why_it_matters:
      "When only the owner can buy, supply continuity, vendor negotiation, and seasonal preparation all stop the moment the owner is unavailable.",
    evidence_supports: [
      "Documented buying authority list",
      "Reorder list / suggested-order report",
      "Vendor terms & lead-times list",
    ],
    evidence_missing_means:
      "Without written buying authority and a reorder report, owner-only buying is reported as a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "owner_dependency",
    owner_independence_lift: "high",
    cash_control_impact: "medium",
    repair_map_trigger: "buying_authority_redundancy_install",
    client_safe_explanation:
      "Buying and reorder decisions currently depend on the owner, which limits operational continuity if the owner is unavailable.",
  },
  {
    key: "retail.store_coverage_risk",
    industry: "retail_brick_mortar",
    gear: "owner_independence",
    finding_title: "The store cannot run a normal day without the owner",
    why_it_matters:
      "When the schedule, the floor, and the cash close all assume the owner is present, the business cannot absorb illness, vacation, or growth without revenue or service slipping.",
    evidence_supports: [
      "Schedule for the past four weeks",
      "Org chart with decision rights",
      "Open / close checklists with sign-off",
    ],
    evidence_missing_means:
      "Without schedules and decision-rights documentation, store coverage risk is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "owner_dependency",
    owner_independence_lift: "high",
    cash_control_impact: "medium",
    repair_map_trigger: "store_coverage_bench_build",
    client_safe_explanation:
      "Several days each week rely on the owner being on the floor, which limits the store's ability to run predictably without them.",
  },
  {
    key: "retail.discount_leakage_risk",
    industry: "retail_brick_mortar",
    gear: "sales",
    finding_title: "Discount and promotion impact on margin is not reviewed",
    why_it_matters:
      "Discounts and promotions can lift sales while destroying margin. Without a margin review after each event, the same activity that 'feels successful' can be steadily eroding profit.",
    evidence_supports: [
      "POS discount / promotion report, last 90 days",
      "Sales-by-day comparison around promo dates",
      "Margin report tied to promo SKUs",
    ],
    evidence_missing_means:
      "Without a discount report and margin comparison, promo impact is owner intuition only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "discount_margin_review_install",
    client_safe_explanation:
      "Discount and promotion impact on margin is not yet reviewed on a regular cadence, which limits decisions about future events.",
  },
  {
    key: "retail.stockout_reorder_process_gap",
    industry: "retail_brick_mortar",
    gear: "operations",
    finding_title: "Reorders depend on memory rather than reorder points",
    why_it_matters:
      "When reorders run on memory, best sellers run out and slow movers get re-bought. Both quietly cost margin and revenue without showing up in any single report.",
    evidence_supports: [
      "Reorder list / suggested-order report",
      "Stockout record / out-of-stock log",
      "Vendor lead-times list",
    ],
    evidence_missing_means:
      "Without written reorder points and a stockout record, reorder discipline is a structured interview claim.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "reorder_point_program_install",
    client_safe_explanation:
      "Reorder timing for top items is not driven by written reorder points, which limits in-stock reliability on best sellers.",
  },
  {
    key: "retail.dead_stock_aging_inventory_risk",
    industry: "retail_brick_mortar",
    gear: "operations",
    finding_title: "Aging inventory is not reviewed on a cadence",
    why_it_matters:
      "Old inventory is buried cash. Without a regular markdown or clearance cadence, dead stock crowds out new product and ties up money the business needs elsewhere.",
    evidence_supports: [
      "Aged inventory / dead stock report",
      "Markdown calendar",
    ],
    evidence_missing_means:
      "Without an aging report and markdown calendar, dead stock exposure is owner intuition only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "aged_inventory_cadence_install",
    client_safe_explanation:
      "Aging inventory is not reviewed on a regular cadence, which limits cash recovery and floor space for newer product.",
  },
  {
    key: "retail.returns_exchange_leakage",
    industry: "retail_brick_mortar",
    gear: "sales",
    finding_title: "Returns are processed without root-cause analysis",
    why_it_matters:
      "Without logging return reasons, the store cannot tell whether returns are driven by fit, defect, vendor quality, or staff over-promising — so the underlying cause keeps repeating.",
    evidence_supports: [
      "POS returns report, last 90 days",
      "Return reason log",
    ],
    evidence_missing_means:
      "Without a reason log, return root cause is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "return_reason_capture_install",
    client_safe_explanation:
      "Returns are processed but reasons are not captured consistently, which limits the ability to address the root cause.",
  },
  {
    key: "retail.pos_sku_setup_control_gap",
    industry: "retail_brick_mortar",
    gear: "operations",
    finding_title: "POS and SKU setup is not controlled",
    why_it_matters:
      "When categories, taxes, prices, and barcodes drift in the POS, every downstream report — sales by category, margin, inventory, tax — becomes unreliable.",
    evidence_supports: [
      "POS new-item setup checklist",
      "Spot audit of 5 random shelf tags vs. POS",
    ],
    evidence_missing_means:
      "Without a setup checklist and spot audits, POS data quality is reported as a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "control",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "pos_setup_discipline_install",
    client_safe_explanation:
      "POS and SKU setup is not yet controlled by a written process, which limits trust in category, margin, and inventory reports.",
  },
  {
    key: "retail.merchandising_control_gap",
    industry: "retail_brick_mortar",
    gear: "operations",
    finding_title: "Merchandising changes are not tied to performance review",
    why_it_matters:
      "Window displays, end caps, and product placement drive sales, but without a review the store can't tell which changes worked and which quietly cost demand.",
    evidence_supports: [
      "Merchandising calendar / product-drop plan",
      "Sales-by-category comparison around layout changes",
    ],
    evidence_missing_means:
      "Without a calendar and sales comparison, merchandising impact is owner intuition only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "low",
    repair_map_trigger: "merchandising_review_install",
    client_safe_explanation:
      "Display and merchandising changes are not yet reviewed for sales impact, which limits the store's ability to learn what works.",
  },
  {
    key: "retail.cash_handling_visibility_gap",
    industry: "retail_brick_mortar",
    gear: "operations",
    finding_title: "Cash drawer and deposit visibility is informal",
    why_it_matters:
      "Untracked drawer variances and deposit lag are both control risks: they hide both honest mistakes and intentional skim, and they delay reconciliation to accounting.",
    evidence_supports: [
      "Drawer count records by shift",
      "Cash deposit records, last 30 days",
      "POS-to-bank reconciliation",
    ],
    evidence_missing_means:
      "Without drawer and deposit records, cash control is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "control",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "cash_handling_controls_install",
    client_safe_explanation:
      "Cash drawer and deposit handling is not yet captured in a consistent record, which limits early detection of variances and reconciliation accuracy.",
  },
  {
    key: "retail.customer_retention_visibility_gap",
    industry: "retail_brick_mortar",
    gear: "demand",
    finding_title: "Repeat customer behavior is not visible",
    why_it_matters:
      "If the store can't see repeat purchase rate, loyalty adoption, or customer source, every dollar spent on marketing is spent without knowing whether it earned a returning customer.",
    evidence_supports: [
      "Loyalty enrollment + repeat purchase report",
      "Email / SMS send + open/click report",
    ],
    evidence_missing_means:
      "Without loyalty and email data, repeat behavior is owner estimate only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "customer_retention_visibility_install",
    client_safe_explanation:
      "Repeat customer behavior is not yet visible, which limits the ability to grow loyalty and reduce reliance on new-customer acquisition.",
  },
  {
    key: "retail.staff_selling_consistency_gap",
    industry: "retail_brick_mortar",
    gear: "sales",
    finding_title: "Conversion and basket depend on which employee is working",
    why_it_matters:
      "When sales swing by employee, the store has people, not a system. Top performers carry the day, and their absence quietly costs the business each week.",
    evidence_supports: [
      "POS sales-by-employee, last 90 days",
      "Schedule for the same period",
    ],
    evidence_missing_means:
      "Without sales-by-employee data, staff consistency is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "staff_selling_program_install",
    client_safe_explanation:
      "Conversion and basket size vary noticeably by employee, which limits predictable sales performance across the schedule.",
  },
  {
    key: "retail.vendor_terms_buying_discipline_gap",
    industry: "retail_brick_mortar",
    gear: "financial",
    finding_title: "Vendor terms and open-to-buy discipline are informal",
    why_it_matters:
      "Without a tracked vendor terms list and a monthly buying budget, vendor visits and impulse buys can quietly overcommit cash and create dead stock.",
    evidence_supports: [
      "Vendor terms / lead-times / minimums list",
      "Monthly open-to-buy budget",
      "Vendor invoices, last 30 days",
    ],
    evidence_missing_means:
      "Without a vendor list and open-to-buy budget, buying discipline is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "cash",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "vendor_open_to_buy_install",
    client_safe_explanation:
      "Vendor terms and monthly buying are not yet managed by written rules, which limits cash discipline and dead-stock prevention.",
  },
];