// P20.3 — Required data map per industry.
//
// Pure data. Drives admin checklists for what to collect from a customer
// before industry-specific brains can run with high confidence.

import type { IndustryCategory } from "@/lib/priorityEngine/types";
import type { RequiredDataField } from "./types";

export const INDUSTRY_DATA_MAP: Record<IndustryCategory, RequiredDataField[]> = {
  trade_field_service: [
    { field: "leads", required: true, sources: ["manual_entry", "csv_upload"], confidence: "Estimated" },
    { field: "estimates", required: true, sources: ["manual_entry", "csv_upload", "quickbooks"], confidence: "Confirmed" },
    { field: "jobs", required: true, sources: ["manual_entry", "csv_upload"], confidence: "Estimated" },
    { field: "job_costs", required: false, sources: ["manual_entry", "csv_upload", "quickbooks"], confidence: "Estimated" },
    { field: "invoices", required: true, sources: ["quickbooks", "csv_upload"], confidence: "Confirmed" },
    { field: "payments", required: true, sources: ["quickbooks", "csv_upload"], confidence: "Confirmed" },
    { field: "follow_ups", required: false, sources: ["manual_entry", "client_input"], confidence: "Estimated" },
    { field: "service_line", required: false, sources: ["manual_entry"], confidence: "Estimated" },
    { field: "technician_or_team", required: false, sources: ["manual_entry"], confidence: "Estimated" },
  ],
  restaurant: [
    { field: "daily_sales", required: true, sources: ["csv_upload", "manual_entry"], confidence: "Confirmed" },
    { field: "food_cost", required: true, sources: ["csv_upload", "manual_entry", "quickbooks"], confidence: "Estimated" },
    { field: "labor_cost", required: true, sources: ["csv_upload", "quickbooks"], confidence: "Estimated" },
    { field: "ticket_average", required: false, sources: ["manual_entry"], confidence: "Estimated" },
    { field: "inventory_or_waste", required: false, sources: ["manual_entry", "csv_upload"], confidence: "Estimated" },
    { field: "menu_item_performance", required: false, sources: ["csv_upload"], confidence: "Estimated" },
    { field: "vendor_cost_changes", required: false, sources: ["manual_entry", "file_upload"], confidence: "Needs Verification" },
  ],
  retail: [
    { field: "product_sales", required: true, sources: ["csv_upload"], confidence: "Confirmed" },
    { field: "inventory", required: true, sources: ["csv_upload", "manual_entry"], confidence: "Estimated" },
    { field: "cost_of_goods", required: true, sources: ["csv_upload", "quickbooks"], confidence: "Estimated" },
    { field: "gross_margin", required: false, sources: ["csv_upload", "quickbooks"], confidence: "Estimated" },
    { field: "stockouts", required: false, sources: ["manual_entry", "csv_upload"], confidence: "Estimated" },
    { field: "dead_inventory", required: false, sources: ["manual_entry", "csv_upload"], confidence: "Estimated" },
    { field: "returns", required: false, sources: ["csv_upload"], confidence: "Estimated" },
    { field: "category_performance", required: false, sources: ["csv_upload"], confidence: "Estimated" },
  ],
  // Cannabis / MMC = Medical + Recreational Marijuana / dispensary retail.
  // Treated as regulated retail / inventory / margin business. NOT healthcare.
  mmj_cannabis: [
    // Sales + revenue
    { field: "daily_sales", required: true, sources: ["csv_upload", "manual_entry"], confidence: "Confirmed" },
    { field: "weekly_sales", required: false, sources: ["csv_upload", "manual_entry"], confidence: "Confirmed" },
    { field: "product_sales", required: true, sources: ["csv_upload"], confidence: "Confirmed" },
    { field: "category_sales", required: true, sources: ["csv_upload"], confidence: "Confirmed" },
    { field: "average_transaction_value", required: false, sources: ["csv_upload", "manual_entry"], confidence: "Estimated" },
    { field: "order_count", required: false, sources: ["csv_upload"], confidence: "Confirmed" },
    { field: "customer_count", required: false, sources: ["csv_upload"], confidence: "Estimated" },
    { field: "sales_channel", required: false, sources: ["manual_entry", "csv_upload"], confidence: "Estimated" },
    // Inventory
    { field: "inventory_quantity", required: true, sources: ["csv_upload", "manual_entry"], confidence: "Confirmed" },
    { field: "inventory_value", required: true, sources: ["csv_upload", "manual_entry"], confidence: "Estimated" },
    { field: "product_sku", required: true, sources: ["csv_upload"], confidence: "Confirmed" },
    { field: "category", required: true, sources: ["csv_upload", "manual_entry"], confidence: "Confirmed" },
    { field: "stockout_events", required: false, sources: ["manual_entry", "csv_upload"], confidence: "Estimated" },
    { field: "dead_stock_value", required: false, sources: ["manual_entry", "csv_upload"], confidence: "Estimated" },
    { field: "inventory_turnover", required: false, sources: ["csv_upload"], confidence: "Estimated" },
    { field: "shrinkage_or_waste", required: false, sources: ["manual_entry", "csv_upload"], confidence: "Estimated" },
    { field: "compliance_safe_inventory_movement", required: false, sources: ["manual_entry"], confidence: "Needs Verification", notes: "Regulated cannabis inventory movement; document only operational signal." },
    // Cost + margin
    { field: "cost_of_goods", required: true, sources: ["csv_upload", "quickbooks"], confidence: "Estimated" },
    { field: "gross_margin", required: true, sources: ["csv_upload", "quickbooks"], confidence: "Estimated" },
    { field: "product_margin", required: false, sources: ["csv_upload"], confidence: "Estimated" },
    { field: "category_margin", required: false, sources: ["csv_upload"], confidence: "Estimated" },
    { field: "vendor_cost_changes", required: false, sources: ["manual_entry", "file_upload"], confidence: "Needs Verification" },
    { field: "discount_amount", required: false, sources: ["csv_upload", "manual_entry"], confidence: "Estimated" },
    { field: "promotion_impact", required: false, sources: ["csv_upload", "manual_entry"], confidence: "Estimated" },
    { field: "high_revenue_low_margin_products", required: false, sources: ["csv_upload"], confidence: "Estimated" },
    // Operations
    { field: "review_cadence", required: false, sources: ["manual_entry", "client_input"], confidence: "Estimated" },
    { field: "reporting_rhythm", required: false, sources: ["manual_entry", "client_input"], confidence: "Estimated" },
    { field: "manual_workarounds", required: false, sources: ["manual_entry", "client_input"], confidence: "Estimated" },
    { field: "source_systems", required: false, sources: ["manual_entry", "client_input"], confidence: "Estimated", notes: "POS / QuickBooks / spreadsheet sources." },
    // Payment / cash visibility
    { field: "payment_method_summary", required: false, sources: ["csv_upload", "manual_entry"], confidence: "Estimated" },
    { field: "cash_tracking_summary", required: false, sources: ["manual_entry", "csv_upload"], confidence: "Estimated" },
    { field: "deposit_reconciliation_status", required: false, sources: ["manual_entry"], confidence: "Needs Verification" },
  ],
  general_service: [
    { field: "revenue_summary", required: true, sources: ["manual_entry", "quickbooks"], confidence: "Estimated" },
    { field: "expenses_summary", required: true, sources: ["manual_entry", "quickbooks"], confidence: "Estimated" },
    { field: "owner_dependence_notes", required: false, sources: ["client_input"], confidence: "Estimated" },
  ],
  other: [
    { field: "industry_confirmation", required: true, sources: ["client_input", "admin_assumption"], confidence: "Needs Verification" },
  ],
};

export function dataMapFor(industry: IndustryCategory): RequiredDataField[] {
  return INDUSTRY_DATA_MAP[industry] ?? INDUSTRY_DATA_MAP.other;
}
