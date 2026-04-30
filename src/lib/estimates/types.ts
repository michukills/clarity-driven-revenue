// P20.1 — Estimates workflow shared types.

export type EstimateStatus =
  | "draft"
  | "sent"
  | "approved"
  | "rejected"
  | "expired"
  | "converted"
  | "cancelled";

export type EstimateSource = "manual" | "import" | "quickbooks";

export interface Estimate {
  id: string;
  customer_id: string;
  period_id: string | null;
  estimate_number: string | null;
  estimate_date: string;
  expires_at: string | null;
  client_or_job: string | null;
  service_category: string | null;
  amount: number;
  status: EstimateStatus;
  sent_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  converted_invoice_id: string | null;
  source: EstimateSource | string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateStatusHistoryRow {
  id: string;
  estimate_id: string;
  customer_id: string;
  from_status: EstimateStatus | null;
  to_status: EstimateStatus;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

/** Number of days an estimate may sit in `sent` before being considered stale. */
export const STALE_SENT_DAYS = 14;

/** Number of days a `draft` may exist before being flagged as never sent. */
export const NEVER_SENT_DAYS = 7;