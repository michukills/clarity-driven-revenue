/**
 * P93E-E2G-P5 — E-commerce / Online Retail FindingCalibration seeds.
 *
 * Industry-specific finding shapes the future report builder will hydrate
 * from `industry_diagnostic_responses` for online retail accounts. Each
 * finding is evidence-aware: when supporting evidence is missing, the report
 * layer must downgrade the finding to a structured interview claim or owner
 * estimate rather than overstating certainty.
 */
import type { FindingCalibration } from "../depthStandard";

export const ECOMMERCE_FINDING_CALIBRATIONS: FindingCalibration[] = [
  {
    key: "ecom.channel_concentration_risk",
    industry: "ecommerce_online_retail",
    gear: "demand",
    finding_title: "Most revenue depends on a single channel",
    why_it_matters:
      "When one channel — paid ads, a single marketplace, or one social platform — drives most revenue, a policy change, ad-account issue, or algorithm shift becomes a store-wide cash event with no quick replacement.",
    evidence_supports: [
      "Channel sales summary — last 90 days",
      "Storefront platform sales export",
      "Marketplace sales reports",
    ],
    evidence_missing_means:
      "Without a 90-day channel split, channel concentration is a structured interview claim rather than a measured ratio.",
    confidence_floor: "medium",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "channel_concentration_relief",
    client_safe_explanation:
      "A high share of revenue currently depends on a single channel, which limits resilience if that channel slows, changes policy, or pauses.",
    admin_only_interpretation:
      "Top-channel share ≥60% = concentration risk regardless of how strong the channel currently feels.",
  },
  {
    key: "ecom.contribution_margin_blind_spot",
    industry: "ecommerce_online_retail",
    gear: "financial",
    finding_title: "Contribution margin per order is not visible",
    why_it_matters:
      "ROAS and gross margin do not show whether an order is actually profitable after ad spend, shipping, payment fees, and returns. Without contribution margin per order, scaling paid traffic can quietly scale losses.",
    evidence_supports: [
      "MER summary — total revenue ÷ total ad spend",
      "Product margin report (revenue − COGS − fees − shipping)",
      "Shipping cost report by carrier or order",
      "Returns report with refund value",
    ],
    evidence_missing_means:
      "Without ad spend, shipping cost, fees, and returns combined per order, contribution margin is owner intuition only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "contribution_margin_install",
    client_safe_explanation:
      "Profit per order after ad spend, shipping, payment fees, and returns is not yet visible, which limits decisions about pricing, promotions, and ad scaling.",
  },
  {
    key: "ecom.paid_acquisition_profitability_gap",
    industry: "ecommerce_online_retail",
    gear: "financial",
    finding_title: "Paid acquisition is judged by ROAS alone",
    why_it_matters:
      "Platform ROAS does not include shipping, returns, fees, or organic baseline. A campaign with great ROAS can still lose money once everything is included.",
    evidence_supports: [
      "Meta Ads — 90-day performance",
      "Google Ads — 90-day performance",
      "MER summary — total revenue ÷ total ad spend",
      "Product margin report",
    ],
    evidence_missing_means:
      "Without MER and contribution margin alongside platform ROAS, paid-acquisition profitability is a structured interview claim.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "paid_acquisition_profitability_install",
    client_safe_explanation:
      "Paid acquisition is currently judged by platform ROAS alone, which limits the ability to see whether ad-driven sales are actually profitable after all costs.",
  },
  {
    key: "ecom.product_profitability_gap",
    industry: "ecommerce_online_retail",
    gear: "financial",
    finding_title: "Best sellers are ranked by volume, not by margin",
    why_it_matters:
      "Two products with identical revenue can earn very different profit. Without SKU-level margin visibility, the store doubles down on volume that may be carrying weaker margin than slower-moving SKUs.",
    evidence_supports: [
      "Product / SKU sales report",
      "Product margin report",
      "Landed cost records by SKU",
    ],
    evidence_missing_means:
      "Without per-SKU margin and landed cost, product profitability ranking is owner intuition only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "sku_margin_visibility_install",
    client_safe_explanation:
      "Product ranking is currently driven by sales volume rather than margin, which limits decisions about pricing, promotion, and ad spend per SKU.",
  },
  {
    key: "ecom.checkout_friction",
    industry: "ecommerce_online_retail",
    gear: "sales",
    finding_title: "Cart abandonment and checkout drop-off are not measured",
    why_it_matters:
      "Most lost online revenue is lost between the cart and the thank-you page. Without measuring abandonment and checkout completion, the store can't tell if friction is the bottleneck, or which step to fix.",
    evidence_supports: [
      "Checkout funnel — add to cart → checkout → completed",
      "Abandoned cart report + recovery flow stats",
      "Storefront platform sales export",
    ],
    evidence_missing_means:
      "Without a checkout funnel report and abandoned cart stats, checkout friction is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "checkout_friction_install",
    client_safe_explanation:
      "Cart abandonment and checkout completion are not consistently measured, which limits the ability to recover otherwise winnable orders.",
  },
  {
    key: "ecom.email_sms_flow_gap",
    industry: "ecommerce_online_retail",
    gear: "demand",
    finding_title: "Core email and SMS flows are missing or not measured",
    why_it_matters:
      "Welcome, abandoned cart, post-purchase, and winback flows are the cheapest revenue an online store can earn. When they're missing or not measured, the store leaves repeat and recovery revenue on the table every day.",
    evidence_supports: [
      "Email / SMS flow performance report",
      "Abandoned cart flow stats",
      "Owned audience size",
    ],
    evidence_missing_means:
      "Without flow performance reports, email/SMS flow strength is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "email_sms_flow_install",
    client_safe_explanation:
      "Core email and SMS flows — welcome, abandoned cart, post-purchase, winback — are not all live or measured, which limits recurring and recovery revenue.",
  },
  {
    key: "ecom.fulfillment_error_drag",
    industry: "ecommerce_online_retail",
    gear: "operations",
    finding_title: "Fulfillment errors are not tracked",
    why_it_matters:
      "Wrong item, wrong address, late ship, and damage all create refunds, replacements, and support load. Without tracking error categories, the same problems repeat and quietly compound.",
    evidence_supports: [
      "3PL fulfillment, shipping cost, and error reports",
      "Support ticket category breakdown",
      "Returns report with reason codes",
    ],
    evidence_missing_means:
      "Without an error report and reason codes, fulfillment accuracy is owner observation only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "fulfillment_error_review",
    client_safe_explanation:
      "Fulfillment errors are not categorized or tracked, which limits the ability to fix repeating root causes and protect customer experience.",
  },
  {
    key: "ecom.return_cost_leakage",
    industry: "ecommerce_online_retail",
    gear: "financial",
    finding_title: "Return cost is not analyzed",
    why_it_matters:
      "A return doesn't just refund revenue — it also burns return shipping, restocking time, and sometimes the unit itself. Without analyzing return cost, the store treats a high-return SKU as a winner.",
    evidence_supports: [
      "Returns report with reason codes and refund value",
      "Shipping cost report by carrier or order",
      "Product margin report",
    ],
    evidence_missing_means:
      "Without a returns report tied to refund value and shipping cost, return cost impact is owner estimate only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "return_cost_visibility_install",
    client_safe_explanation:
      "Returns are not analyzed by reason code and total cost, which limits decisions about product pages, sizing, quality, and SKU-level margin.",
  },
  {
    key: "ecom.inventory_cash_trap",
    industry: "ecommerce_online_retail",
    gear: "financial",
    finding_title: "Inventory cash and aging are not visible",
    why_it_matters:
      "Cash sitting in slow-moving inventory is cash not available for ads, payroll, or new product. Without aging visibility, the store keeps reordering what looks busy and not what actually sells.",
    evidence_supports: [
      "Inventory valuation report — units × cost on hand",
      "Inventory aging by SKU (0-30 / 31-60 / 61-90 / 90+ days)",
      "Product / SKU sales report",
    ],
    evidence_missing_means:
      "Without valuation and aging reports, inventory cash and aging are owner estimate only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "inventory_cash_review_install",
    client_safe_explanation:
      "Inventory dollars on hand and aging are not yet visible, which limits decisions about reorders, promotions, and where cash is currently sitting.",
  },
  {
    key: "ecom.supplier_reliability_risk",
    industry: "ecommerce_online_retail",
    gear: "operations",
    finding_title: "Supplier reliability is not tracked",
    why_it_matters:
      "Late shipments, cost increases, and quality issues from suppliers cause stockouts, refunds, and margin compression. Without tracking, the same supplier problems repeat across seasons.",
    evidence_supports: [
      "Recent supplier invoices + purchase orders",
      "Inventory aging by SKU",
      "Stockout records",
    ],
    evidence_missing_means:
      "Without supplier records and stockout history, supplier reliability is owner observation only.",
    confidence_floor: "medium",
    business_risk: "control",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "supplier_reliability_review",
    client_safe_explanation:
      "Supplier lead time, cost, and quality are not consistently tracked, which limits the ability to plan inventory and protect margin against vendor changes.",
  },
  {
    key: "ecom.platform_admin_dependency",
    industry: "ecommerce_online_retail",
    gear: "owner_independence",
    finding_title: "Platform and ad-account access depend on the owner",
    why_it_matters:
      "When the owner is the only person with admin access to the storefront platform and ad accounts, a single absence or account issue can stall fulfillment, support, and paid traffic at the same time.",
    evidence_supports: [
      "Platform admin access list",
      "Ad account user list",
      "Workflow documentation",
    ],
    evidence_missing_means:
      "Without an access list and documented workflows, platform/admin dependency is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "owner_dependency",
    owner_independence_lift: "high",
    cash_control_impact: "medium",
    repair_map_trigger: "platform_access_redundancy_install",
    client_safe_explanation:
      "Platform and ad-account access currently depend on the owner, which limits the team's ability to act on issues, pause campaigns, or recover from access problems.",
    admin_only_interpretation:
      "Single-admin platform access = both an operational risk and a key-person risk; treat any 'team can handle it' claim with skepticism.",
  },
  {
    key: "ecom.marketplace_dependence_risk",
    industry: "ecommerce_online_retail",
    gear: "demand",
    finding_title: "Most revenue runs through marketplaces",
    why_it_matters:
      "Marketplace sales feel like growth but the store does not own the customer relationship, the price floor, or the policies. A suspension or fee change becomes an immediate revenue event.",
    evidence_supports: [
      "Marketplace sales reports — Amazon / Etsy / eBay / Walmart",
      "Channel sales summary",
      "Owned audience size",
    ],
    evidence_missing_means:
      "Without marketplace and owned-channel revenue split, marketplace dependence is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "marketplace_dependence_relief",
    client_safe_explanation:
      "A high share of revenue currently runs through marketplaces, which limits customer ownership and resilience to policy or fee changes.",
  },
  {
    key: "ecom.discount_promotion_margin_risk",
    industry: "ecommerce_online_retail",
    gear: "financial",
    finding_title: "Promotions are judged by revenue, not by margin",
    why_it_matters:
      "Promo revenue lift is easy to see; margin compression after discount, ad spend, returns, and fees is invisible without a review. Stores can run more promos and earn less.",
    evidence_supports: [
      "Discount margin impact review",
      "Product margin report",
      "MER summary",
    ],
    evidence_missing_means:
      "Without promo margin reviews, discount impact is owner estimate only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "promo_margin_review_install",
    client_safe_explanation:
      "Promotion impact is currently measured by revenue lift rather than contribution margin, which limits decisions about cadence, depth, and which products to discount.",
  },
  {
    key: "ecom.shipping_cost_visibility_gap",
    industry: "ecommerce_online_retail",
    gear: "financial",
    finding_title: "Shipping cost is treated as overhead, not allocated to orders",
    why_it_matters:
      "When shipping cost lives in one bucket, the store can't see which products, channels, or order sizes lose money on shipping. Free-shipping thresholds and pricing get set by feel.",
    evidence_supports: [
      "Shipping cost by carrier / by order — last 90 days",
      "Product margin report",
      "Channel sales summary",
    ],
    evidence_missing_means:
      "Without shipping cost tied to orders or SKUs, shipping cost allocation is owner estimate only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "shipping_cost_allocation_install",
    client_safe_explanation:
      "Shipping cost is not yet tied back to specific products, channels, or order sizes, which limits decisions about pricing, free-shipping thresholds, and SKU-level margin.",
  },
  {
    key: "ecom.customer_support_visibility_gap",
    industry: "ecommerce_online_retail",
    gear: "operations",
    finding_title: "Customer support volume and reasons are not tracked",
    why_it_matters:
      "Support tickets are the first place product, fulfillment, and platform problems show up. Without categorizing them, the store fixes individual tickets and never the underlying cause.",
    evidence_supports: [
      "Support ticket volume, response time, and category breakdown",
      "Returns report with reason codes",
      "3PL error reports",
    ],
    evidence_missing_means:
      "Without categorized ticket data, support patterns are owner observation only.",
    confidence_floor: "medium",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "support_categorization_install",
    client_safe_explanation:
      "Support volume, response time, and recurring issue categories are not tracked, which limits the ability to find and fix the root causes behind ticket load.",
  },
  // P102 — additional e-commerce failure-pattern calibrations.
  {
    key: "ecom.stock_sync_risk",
    industry: "ecommerce_online_retail",
    gear: "operations",
    finding_title: "Inventory sync between store and channels is unmonitored",
    why_it_matters:
      "Oversells, cancellations, and refunds quietly erode margin and reviews. Without a sync-health check, stockouts become customer-facing failures instead of operational ones.",
    evidence_supports: [
      "Inventory sync logs from the storefront / OMS",
      "Cancellation / refund reasons for the last 30 days",
      "Marketplace listing inventory variance report",
    ],
    evidence_missing_means:
      "Without sync logs, oversell exposure is owner observation only.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "inventory_sync_check_install",
    client_safe_explanation:
      "Inventory sync between the store and other sales channels is not yet monitored, which limits early detection of oversells and stockout-driven cancellations.",
  },
  {
    key: "ecom.channel_attribution_fog",
    industry: "ecommerce_online_retail",
    gear: "demand",
    finding_title: "Traffic and order attribution by channel is unclear",
    why_it_matters:
      "Without a clear view of which channels are sending paid, organic, email, social, and referral traffic that actually converts, spend and effort drift toward whichever channel had the loudest week.",
    evidence_supports: [
      "Last 30 days of channel / source traffic and conversion reports",
      "Email and SMS platform performance reports",
      "Ad platform exports if paid channels are running",
    ],
    evidence_missing_means:
      "Without channel-level reports, attribution is owner intuition only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "channel_attribution_tracker_install",
    client_safe_explanation:
      "Traffic and order attribution by channel is not yet a regular view, which limits decisions about where to invest time and budget.",
  },
  {
    key: "ecom.abandoned_cart_recovery_gap",
    industry: "ecommerce_online_retail",
    gear: "sales",
    finding_title: "Abandoned cart recovery is not running as a measured flow",
    why_it_matters:
      "Carts abandoned without a recovery flow are revenue the store already earned and lost. Without measured open, click, and recovered-order rates, no one can tell if recovery is working.",
    evidence_supports: [
      "Abandoned cart flow performance for the last 30 days",
      "Email / SMS platform flow metrics",
      "Recovered revenue tag in order reporting",
    ],
    evidence_missing_means:
      "Without flow metrics, recovery is structured interview claim only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "abandoned_cart_flow_install",
    client_safe_explanation:
      "Abandoned cart recovery is not yet running as a measured flow, which limits recovery of orders that have already shown intent.",
  },
];
];