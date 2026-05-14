/**
 * P93E-E2G-B — Map a free-form `customers.industry` string to the closed
 * MatrixIndustryKey enum used by the Control System engine. Falls back
 * to "general_service_other" so the UI never invents an industry it
 * cannot defend.
 */
import {
  MATRIX_INDUSTRY_KEYS,
  type MatrixIndustryKey,
} from "@/config/industryDiagnosticDepthMatrix";

const ALIASES: Record<string, MatrixIndustryKey> = {
  trades: "trades_home_services",
  trade: "trades_home_services",
  home_services: "trades_home_services",
  contractor: "trades_home_services",
  hvac: "trades_home_services",
  plumbing: "trades_home_services",
  electrical: "trades_home_services",
  restaurant: "restaurant_food_service",
  food: "restaurant_food_service",
  food_service: "restaurant_food_service",
  cafe: "restaurant_food_service",
  retail: "retail",
  store: "retail",
  brick_and_mortar: "retail",
  professional_services: "professional_services",
  professional: "professional_services",
  consulting: "professional_services",
  agency: "professional_services",
  ecommerce: "ecommerce_online_retail",
  e_commerce: "ecommerce_online_retail",
  online: "ecommerce_online_retail",
  online_retail: "ecommerce_online_retail",
  cannabis: "cannabis_mmj_dispensary",
  mmj: "cannabis_mmj_dispensary",
  dispensary: "cannabis_mmj_dispensary",
  general: "general_service_other",
  other: "general_service_other",
  service: "general_service_other",
};

export function industryToMatrixKey(raw: string | null | undefined): MatrixIndustryKey {
  if (!raw) return "general_service_other";
  const norm = raw.trim().toLowerCase().replace(/[\s\-/]+/g, "_");
  if ((MATRIX_INDUSTRY_KEYS as ReadonlyArray<string>).includes(norm)) {
    return norm as MatrixIndustryKey;
  }
  if (ALIASES[norm]) return ALIASES[norm];
  for (const [alias, key] of Object.entries(ALIASES)) {
    if (norm.includes(alias)) return key;
  }
  return "general_service_other";
}