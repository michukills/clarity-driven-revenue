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
  mmj_cannabis: [
    { field: "appointments_or_visits", required: true, sources: ["csv_upload", "manual_entry"], confidence: "Confirmed" },
    { field: "billable_services", required: true, sources: ["csv_upload", "manual_entry"], confidence: "Confirmed" },
    { field: "billing_status", required: true, sources: ["csv_upload", "manual_entry"], confidence: "Confirmed" },
    { field: "reimbursement_status", required: true, sources: ["csv_upload", "manual_entry"], confidence: "Estimated" },
    { field: "follow_up_status", required: false, sources: ["manual_entry"], confidence: "Estimated", notes: "No PHI in notes." },
    { field: "payment_delays", required: false, sources: ["csv_upload"], confidence: "Estimated" },
    { field: "service_category", required: false, sources: ["manual_entry"], confidence: "Estimated" },
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
