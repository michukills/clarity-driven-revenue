/**
 * P34 — Client-safe field allowlist for `business_control_reports`.
 *
 * Single source of truth for which columns may be selected by client-facing
 * (portal) surfaces. RLS restricts rows to published + own-customer; this
 * additionally restricts the column projection so admin-only fields like
 * `internal_notes` never travel to the client even if a query forgets to
 * exclude them.
 *
 * NEVER include in this list:
 *   - internal_notes
 *   - any future admin-only/audit/debug column
 *   - service-role / token / secret columns
 */
export const CLIENT_SAFE_REPORT_COLUMNS = [
  "id",
  "customer_id",
  "report_type",
  "period_start",
  "period_end",
  "status",
  "health_score",
  "recommended_next_step",
  "report_data",
  "client_notes",
  "published_at",
  "created_at",
  "updated_at",
  "created_by",
] as const;

/**
 * Comma-joined select string for use with
 * `supabase.from("business_control_reports").select(...)` in client surfaces.
 */
export const CLIENT_SAFE_REPORT_SELECT = CLIENT_SAFE_REPORT_COLUMNS.join(", ");

/**
 * Columns that must NEVER appear in client-facing report queries, exports,
 * or rendered output. Used by the P34 contract test to scan client surfaces.
 */
export const REPORT_FIELDS_FORBIDDEN_IN_CLIENT_SURFACES = [
  "internal_notes",
] as const;