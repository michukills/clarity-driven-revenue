/**
 * Connector Admin UI + Importer QA pass — copy contract.
 *
 * Lightweight, deterministic checks. No network, no scoring changes.
 * Asserts:
 *   1. Brand names use exact official spelling (QuickBooks, Stripe, Square,
 *      Dutchie, HubSpot, FreshBooks, PayPal, Housecall Pro, ServiceTitan).
 *   2. statusUi() never labels a non-synced state as "Connected".
 *   3. The default/not-started state reads as "Not connected yet".
 *   4. Provider summary ingest panel and ConnectedSources page do not leak
 *      secrets/tokens into client-rendered strings.
 *   5. Dutchie copy stays in cannabis/dispensary framing — no healthcare terms.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BRANDS } from "@/config/brands";
import { statusUi } from "@/lib/integrations/connectedSources";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

// Note: "provider" is intentionally omitted — in connector context it means
// "data provider" (Square/Stripe/Dutchie), not a clinical provider.
const HEALTHCARE_TERMS = [
  /\bpatient[s]?\b/i,
  /\bhealthcare\b/i,
  /\bclinical\b/i,
  /\binsurance claim/i,
  /\bappointment[s]?\b/i,
  /\bclinic\b/i,
];

describe("Connector copy contract — brand names exact", () => {
  it("BRANDS dictionary uses official capitalization", () => {
    expect(BRANDS.quickbooks).toBe("QuickBooks");
    expect(BRANDS.stripe).toBe("Stripe");
    expect(BRANDS.square).toBe("Square");
    expect(BRANDS.freshbooks).toBe("FreshBooks");
    expect(BRANDS.paypal).toBe("PayPal");
    expect(BRANDS.hubspot).toBe("HubSpot");
    expect(BRANDS.serviceTitan).toBe("ServiceTitan");
    expect(BRANDS.housecallPro).toBe("Housecall Pro");
  });

  it("Dutchie is referenced with exact spelling in customer-facing surfaces", () => {
    const sources = [
      "src/components/intelligence/ProviderSummaryIngestPanel.tsx",
      "src/pages/Diagnostic.tsx",
    ];
    for (const f of sources) {
      const src = read(f);
      expect(src).toContain("Dutchie");
      // Common drift forms
      expect(/dutchie\.com/i.test(src) || /Dutchie/.test(src)).toBe(true);
    }
  });
});

describe("Connector copy contract — status labels honest", () => {
  it("default/not_started reads as 'Not connected yet'", () => {
    expect(statusUi("not_started").label).toBe("Not connected yet");
  });

  it("'Connected' label is reserved for connected/active states only", () => {
    expect(statusUi("connected").label).toBe("Connected");
    expect(statusUi("active").label).toBe("Connected");
    for (const s of [
      "requested",
      "setup_in_progress",
      "needs_review",
      "import_ready",
      "manual_only",
      "unsupported",
      "unavailable",
      "disconnected",
      "error",
      "paused",
      "not_started",
    ] as const) {
      expect(statusUi(s).label).not.toBe("Connected");
    }
  });

  it("error/disconnected/paused are not marked terminalGood", () => {
    for (const s of ["disconnected", "error", "paused", "not_started"] as const) {
      expect(statusUi(s).isTerminalGood).toBe(false);
    }
  });
});

describe("Connector copy contract — no secrets in client-facing files", () => {
  const FILES = [
    "src/pages/portal/ConnectedSources.tsx",
    "src/components/intelligence/ProviderSummaryIngestPanel.tsx",
    "src/components/bcc/QbSourceCallout.tsx",
    "src/components/admin/QuickBooksSyncHealthPanel.tsx",
  ];
  // Banned identifiers that should never be rendered to UI or logged.
  // Skip: refresh_token / client_secret words may appear in inline comments
  // describing the OAuth model. We only flag JSX text or template strings.
  const BANNED = [
    /Bearer\s+[A-Za-z0-9._-]{8,}/,    // a literal bearer token
    /service[_\s]?role[_\s]?key/i,
    /SUPABASE_SERVICE_ROLE_KEY/,
    /sk_live_[A-Za-z0-9]+/,           // Stripe live key
    /sk_test_[A-Za-z0-9]+/,
  ];

  it("no hardcoded secrets/tokens leak into connector UI files", () => {
    for (const f of FILES) {
      const src = read(f);
      for (const pat of BANNED) {
        expect(pat.test(src), `${f} contains banned pattern ${pat}`).toBe(false);
      }
    }
  });
});

describe("Connector copy contract — Dutchie / cannabis framing", () => {
  it("ProviderSummaryIngestPanel describes Dutchie as cannabis/MMJ retail, not healthcare", () => {
    const src = read("src/components/intelligence/ProviderSummaryIngestPanel.tsx");
    expect(src).toMatch(/cannabis|MMJ/i);
    for (const t of HEALTHCARE_TERMS) {
      expect(t.test(src), `ProviderSummaryIngestPanel contains healthcare term ${t}`).toBe(false);
    }
  });
});

describe("Connector copy contract — no over-promising hype", () => {
  const FILES = [
    "src/pages/portal/ConnectedSources.tsx",
    "src/components/bcc/QbSourceCallout.tsx",
    "src/components/intelligence/ProviderSummaryIngestPanel.tsx",
    "src/components/intelligence/AdminMetricsImporterPanel.tsx",
  ];
  const BANNED = [
    /\bfully optimized\b/i,
    /\bmagic connector\b/i,
    /\btotal visibility\b/i,
    /\bcomplete financial picture\b/i,
    /\bguaranteed data accuracy\b/i,
    /\bseamless sync\b/i,
    /\bAI import\b/i,
    /\bactivated intelligence\b/i,
  ];

  it("connector/importer copy avoids hype phrases", () => {
    for (const f of FILES) {
      const src = read(f);
      for (const pat of BANNED) {
        expect(pat.test(src), `${f} contains banned hype ${pat}`).toBe(false);
      }
    }
  });
});