/**
 * P67A — Industry-Wide Source-of-Truth Connector + Truth-in-Sync contract.
 *
 * Pins the Connector Capability Matrix as the honest source of truth
 * for what is live, manual, planned, demo-only, or not available, and
 * enforces the "Truth-in-Sync" marketing-safety rules.
 */

import { describe, it, expect } from "vitest";
import {
  CONNECTOR_CAPABILITY_MATRIX,
  CONNECTOR_STATUS_LABEL,
  CONNECTOR_STATUS_CLIENT_LABEL,
  FORBIDDEN_LIVE_SYNC_PHRASES,
  getConnectorsForIndustry,
  getCannabisConnectors,
  liveLanguageWouldBeFalse,
  safeMarketingClaim,
  type ConnectorStatus,
} from "@/lib/integrations/connectorCapabilityMatrix";

describe("P67A — Connector Capability Matrix", () => {
  it("has at least one connector for every supported RGS industry", () => {
    const required = [
      "general_service",
      "trade_field_service",
      "restaurant",
      "retail",
      "mmj_cannabis",
    ] as const;
    for (const ind of required) {
      expect(getConnectorsForIndustry(ind).length).toBeGreaterThan(0);
    }
  });

  it("includes Dutchie under cannabis/MMJ with honest status (not 'live')", () => {
    const cannabis = getCannabisConnectors();
    const dutchie = cannabis.find((c) => c.providerId === "dutchie");
    expect(dutchie).toBeDefined();
    expect(dutchie!.providerName).toBe("Dutchie");
    expect(dutchie!.industries).toContain("mmj_cannabis");
    expect(dutchie!.status).not.toBe("live_connected_sync");
    expect(dutchie!.manualExportImportSupported).toBe(true);
  });

  it("includes METRC and BioTrack under cannabis seed-to-sale tracking", () => {
    const cannabis = getCannabisConnectors();
    const metrc = cannabis.find((c) => c.providerId === "metrc");
    const biotrack = cannabis.find((c) => c.providerId === "biotrack");
    expect(metrc).toBeDefined();
    expect(biotrack).toBeDefined();
    expect(metrc!.sourceOfTruth).toContain("seed_to_sale_state_tracking");
    expect(biotrack!.sourceOfTruth).toContain("seed_to_sale_state_tracking");
  });

  it("does not classify cannabis connectors as healthcare", () => {
    const cannabis = getCannabisConnectors();
    for (const c of cannabis) {
      // Healthcare/PHI vocabulary must never appear in cannabis blurbs.
      const blurb = c.clientSafeBlurb.toLowerCase();
      expect(blurb).not.toMatch(/hipaa|patient|clinical|healthcare/);
    }
  });

  it("includes restaurant POS (Toast/Clover) and labor (7shifts/Homebase)", () => {
    const r = getConnectorsForIndustry("restaurant").map((c) => c.providerId);
    expect(r).toContain("toast");
    expect(r).toContain("sevenshifts");
  });

  it("includes Shopify and other retail/e-commerce sources", () => {
    const r = getConnectorsForIndustry("retail").map((c) => c.providerId);
    expect(r).toContain("shopify");
  });

  it("includes field-service systems for trades", () => {
    const t = getConnectorsForIndustry("trade_field_service").map(
      (c) => c.providerId,
    );
    expect(t).toContain("jobber");
    expect(t).toContain("housecall_pro");
    expect(t).toContain("servicetitan");
  });

  it("every connector has a status, marketing-safe claim, and client blurb", () => {
    for (const c of CONNECTOR_CAPABILITY_MATRIX) {
      expect(CONNECTOR_STATUS_LABEL[c.status]).toBeDefined();
      expect(CONNECTOR_STATUS_CLIENT_LABEL[c.status]).toBeDefined();
      expect(c.marketingClaim.length).toBeGreaterThan(0);
      expect(c.clientSafeBlurb.length).toBeGreaterThan(0);
      expect(c.sourceOfTruth.length).toBeGreaterThan(0);
      expect(c.industries.length).toBeGreaterThan(0);
    }
  });

  it("non-live connectors never claim Live Sync Available", () => {
    for (const c of CONNECTOR_CAPABILITY_MATRIX) {
      if (c.status !== "live_connected_sync") {
        expect(c.marketingClaim).not.toBe("Live Sync Available");
        expect(liveLanguageWouldBeFalse(c)).toBe(true);
      }
      expect(safeMarketingClaim(c)).toBe(c.marketingClaim);
    }
  });

  it("client-safe blurbs never use forbidden live-sync phrases for non-live connectors", () => {
    for (const c of CONNECTOR_CAPABILITY_MATRIX) {
      if (c.status === "live_connected_sync") continue;
      const lower = c.clientSafeBlurb.toLowerCase();
      for (const phrase of FORBIDDEN_LIVE_SYNC_PHRASES) {
        expect(lower).not.toContain(phrase);
      }
    }
  });

  it("manual-only connectors route fallback through the Evidence Vault", () => {
    const manuals = CONNECTOR_CAPABILITY_MATRIX.filter(
      (c) => c.status === "manual_export_import_supported",
    );
    expect(manuals.length).toBeGreaterThan(0);
    for (const c of manuals) {
      expect(c.clientSafeBlurb.toLowerCase()).toContain("evidence vault");
    }
  });

  it("status vocabulary is closed and stable", () => {
    const valid: ConnectorStatus[] = [
      "live_connected_sync",
      "manual_export_import_supported",
      "admin_setup_required",
      "oauth_configured_not_synced",
      "planned_connector",
      "demo_only_connector",
      "sync_failed_needs_reconnect",
      "not_available",
    ];
    for (const c of CONNECTOR_CAPABILITY_MATRIX) {
      expect(valid).toContain(c.status);
    }
  });
});