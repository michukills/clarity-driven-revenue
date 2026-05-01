/**
 * P20.16 — Normalized provider summary ingest validator.
 *
 * Pure, framework-free. Validates an admin-pasted/uploaded normalized
 * period summary for Square, Stripe, or Dutchie before it is sent to
 * the matching server-side ingest edge function.
 *
 * Hard rules:
 *   - Whitelisted fields per provider only. Unknown fields are returned
 *     as `ignored` with a warning, never persisted.
 *   - Token-like / secret-like keys are rejected outright. Raw
 *     transaction arrays / line items / card data are rejected.
 *   - Numeric fields must coerce to a finite number; blank ⇒ null.
 *   - period_start, period_end required and period_start ≤ period_end.
 *   - Payload byte-size capped to keep audit-friendly and prevent abuse.
 *
 * No network calls. No AI. Fully testable.
 */

export type IngestProvider = "square" | "stripe" | "dutchie";

export interface IngestValidationResult {
  ok: boolean;
  provider: IngestProvider;
  /** Normalized whitelisted summary safe to send to the edge function. */
  summary: Record<string, string | number | boolean | null>;
  /** Field count after normalization (excludes period bounds). */
  fieldCount: number;
  /** Unknown/unsupported keys that were ignored (kept short for safety). */
  ignored: string[];
  /** Per-field validation errors (e.g. non-numeric where number required). */
  invalid: Array<{ field: string; reason: string }>;
  /** Top-level errors (missing customer_id, bad dates, blocked keys, etc). */
  errors: string[];
  /** Soft warnings (e.g. ignored keys present, partial population). */
  warnings: string[];
}

/** Keys we always refuse — token / secret / raw payload shapes. */
export const BLOCKED_KEYS = [
  "access_token",
  "refresh_token",
  "client_secret",
  "client_id",
  "api_key",
  "apikey",
  "authorization",
  "bearer",
  "secret",
  "password",
  "raw_transactions",
  "transactions",
  "line_items",
  "lineitems",
  "customers",
  "customer",
  "card",
  "card_number",
  "cardnumber",
  "payment_method_details",
  "payment_method",
  "pii",
  "ssn",
  "tax_id",
] as const;

/** Maximum accepted JSON payload size (bytes) — kept small on purpose. */
export const MAX_PAYLOAD_BYTES = 32 * 1024;

const NUM = "number" as const;
const BOOL = "boolean" as const;
const STR = "string" as const;

type FieldType = typeof NUM | typeof BOOL | typeof STR;

const COMMON_OPTIONAL: Record<string, FieldType> = {
  source_account_id: STR,
  source_location_id: STR,
};

const SQUARE_FIELDS: Record<string, FieldType> = {
  gross_sales: NUM,
  net_sales: NUM,
  discounts_total: NUM,
  refunds_total: NUM,
  tips_total: NUM,
  tax_total: NUM,
  transaction_count: NUM,
  day_count: NUM,
  has_recurring_period_reporting: BOOL,
  ...COMMON_OPTIONAL,
};

const STRIPE_FIELDS: Record<string, FieldType> = {
  gross_volume: NUM,
  net_volume: NUM,
  fees_total: NUM,
  refunds_total: NUM,
  disputes_total: NUM,
  successful_payment_count: NUM,
  failed_payment_count: NUM,
  source_account_id: STR,
};

const DUTCHIE_FIELDS: Record<string, FieldType> = {
  gross_sales: NUM,
  net_sales: NUM,
  discounts_total: NUM,
  promotions_total: NUM,
  transaction_count: NUM,
  day_count: NUM,
  average_ticket: NUM,
  product_sales_total: NUM,
  category_sales_total: NUM,
  inventory_value: NUM,
  dead_stock_value: NUM,
  stockout_count: NUM,
  inventory_turnover: NUM,
  shrinkage_pct: NUM,
  payment_reconciliation_gap: BOOL,
  has_recurring_period_reporting: BOOL,
  product_margin_visible: BOOL,
  category_margin_visible: BOOL,
  ...COMMON_OPTIONAL,
};

export const PROVIDER_FIELD_SCHEMAS: Record<IngestProvider, Record<string, FieldType>> = {
  square: SQUARE_FIELDS,
  stripe: STRIPE_FIELDS,
  dutchie: DUTCHIE_FIELDS,
};

/** ISO date — strict YYYY-MM-DD. */
function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

type Coerce<T> = { ok: true; value: T | null } | { ok: false; reason: string };

function coerceNumber(raw: unknown): Coerce<number> {
  if (raw === null || raw === undefined || raw === "") return { ok: true, value: null };
  if (typeof raw === "boolean") return { ok: false, reason: "boolean where number expected" };
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) return { ok: false, reason: "not a finite number" };
  return { ok: true, value: n };
}

function coerceBoolean(raw: unknown): Coerce<boolean> {
  if (raw === null || raw === undefined || raw === "") return { ok: true, value: null };
  if (typeof raw === "boolean") return { ok: true, value: raw };
  if (raw === "true" || raw === 1 || raw === "1") return { ok: true, value: true };
  if (raw === "false" || raw === 0 || raw === "0") return { ok: true, value: false };
  return { ok: false, reason: "not a boolean" };
}

function coerceString(raw: unknown): Coerce<string> {
  if (raw === null || raw === undefined || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string" && typeof raw !== "number") {
    return { ok: false, reason: "not a scalar string" };
  }
  const s = String(raw).trim();
  if (s.length > 200) return { ok: false, reason: "string too long (max 200)" };
  return { ok: true, value: s.length ? s : null };
}

/** Returns a lowercased key for blocked-key checks. */
function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[\s_-]/g, "");
}

function looksBlocked(key: string): boolean {
  const k = normalizeKey(key);
  return BLOCKED_KEYS.some((b) => k === normalizeKey(b) || k.includes(normalizeKey(b)));
}

function valueLooksTokenish(v: unknown): boolean {
  if (typeof v !== "string") return false;
  if (v.length < 24) return false;
  // JWT-ish: three base64-url segments separated by '.'
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v)) return true;
  // Stripe / OAuth secret prefixes
  if (/^(sk_|pk_|rk_|whsec_|Bearer\s|bearer\s)/i.test(v)) return true;
  return false;
}

export interface ValidateInput {
  provider: IngestProvider;
  customerId: string;
  /** Raw object as parsed from JSON paste / CSV row. */
  raw: unknown;
}

export function validateProviderSummary(input: ValidateInput): IngestValidationResult {
  const result: IngestValidationResult = {
    ok: false,
    provider: input.provider,
    summary: {},
    fieldCount: 0,
    ignored: [],
    invalid: [],
    errors: [],
    warnings: [],
  };

  if (!input.customerId || typeof input.customerId !== "string") {
    result.errors.push("customer_id required");
    return result;
  }
  if (!["square", "stripe", "dutchie"].includes(input.provider)) {
    result.errors.push("unsupported provider");
    return result;
  }
  if (!input.raw || typeof input.raw !== "object" || Array.isArray(input.raw)) {
    result.errors.push("summary must be a JSON object");
    return result;
  }

  // Size cap.
  let serialized = "";
  try {
    serialized = JSON.stringify(input.raw);
  } catch {
    result.errors.push("summary is not JSON-serializable");
    return result;
  }
  if (serialized.length > MAX_PAYLOAD_BYTES) {
    result.errors.push(`payload too large (max ${MAX_PAYLOAD_BYTES} bytes)`);
    return result;
  }

  const obj = input.raw as Record<string, unknown>;

  // Block on token/secret/raw-transaction-shaped keys anywhere in the payload.
  for (const key of Object.keys(obj)) {
    if (looksBlocked(key)) {
      result.errors.push(`blocked key in payload: ${key}`);
    }
    const v = obj[key];
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") {
      result.errors.push(`array of objects not allowed in normalized summary: ${key}`);
    }
    if (valueLooksTokenish(v)) {
      result.errors.push(`token-like value rejected for key: ${key}`);
    }
  }

  if (result.errors.length > 0) return result;

  // Period bounds.
  const periodStart = obj.period_start;
  const periodEnd = obj.period_end;
  if (!isIsoDate(periodStart)) {
    result.errors.push("period_start required (YYYY-MM-DD)");
  }
  if (!isIsoDate(periodEnd)) {
    result.errors.push("period_end required (YYYY-MM-DD)");
  }
  if (
    isIsoDate(periodStart) &&
    isIsoDate(periodEnd) &&
    Date.parse(periodStart) > Date.parse(periodEnd)
  ) {
    result.errors.push("period_start must be on or before period_end");
  }
  if (result.errors.length > 0) return result;

  result.summary.period_start = periodStart as string;
  result.summary.period_end = periodEnd as string;

  const schema = PROVIDER_FIELD_SCHEMAS[input.provider];

  for (const [key, raw] of Object.entries(obj)) {
    if (key === "period_start" || key === "period_end") continue;
    const type = schema[key];
    if (!type) {
      result.ignored.push(key);
      continue;
    }
    if (type === NUM) {
      const c = coerceNumber(raw);
      if (!c.ok) {
        result.invalid.push({ field: key, reason: c.reason });
        continue;
      }
      result.summary[key] = c.value;
    } else if (type === BOOL) {
      const c = coerceBoolean(raw);
      if (!c.ok) {
        result.invalid.push({ field: key, reason: c.reason });
        continue;
      }
      result.summary[key] = c.value;
    } else if (type === STR) {
      const c = coerceString(raw);
      if (!c.ok) {
        result.invalid.push({ field: key, reason: c.reason });
        continue;
      }
      result.summary[key] = c.value;
    }
  }

  if (result.ignored.length > 0) {
    result.warnings.push(`${result.ignored.length} unsupported field(s) ignored`);
  }

  result.fieldCount = Object.keys(result.summary).filter(
    (k) => k !== "period_start" && k !== "period_end" && result.summary[k] !== null,
  ).length;

  result.ok = result.invalid.length === 0;
  return result;
}

/** Convenience: parse a JSON string and validate in one shot. */
export function parseAndValidate(
  provider: IngestProvider,
  customerId: string,
  jsonText: string,
): IngestValidationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch (e) {
    return {
      ok: false,
      provider,
      summary: {},
      fieldCount: 0,
      ignored: [],
      invalid: [],
      errors: [`invalid JSON: ${(e as Error).message}`],
      warnings: [],
    };
  }
  return validateProviderSummary({ provider, customerId, raw });
}

export function ingestEdgeFunctionName(provider: IngestProvider): string {
  return provider === "square"
    ? "square-sync"
    : provider === "stripe"
      ? "stripe-sync"
      : "dutchie-sync";
}

/** Provider field schema accessor for UI hints. */
export function listProviderFields(provider: IngestProvider): Array<{ field: string; type: FieldType }> {
  return Object.entries(PROVIDER_FIELD_SCHEMAS[provider]).map(([field, type]) => ({ field, type }));
}