/** P93E-E2G — Industry diagnostic question-bank registry. */
import type { IndustryKey, IndustryQuestionBank, DiagnosticQuestion } from "./types";
import type { FindingCalibration } from "./depthStandard";
import { TRADES_HOME_SERVICES_BANK } from "./banks/trades";
import { RESTAURANTS_FOOD_SERVICE_BANK } from "./banks/restaurants";
import { RETAIL_BRICK_MORTAR_BANK } from "./banks/retail";
import { PROFESSIONAL_SERVICES_BANK } from "./banks/professional_services";
import { ECOMMERCE_ONLINE_RETAIL_BANK } from "./banks/ecommerce";
import { CANNABIS_MMJ_DISPENSARY_BANK } from "./banks/cannabis";
import { RESTAURANTS_FINDING_CALIBRATIONS } from "./calibrations/restaurants";
import { TRADES_FINDING_CALIBRATIONS } from "./calibrations/trades";
import { RETAIL_FINDING_CALIBRATIONS } from "./calibrations/retail";
import { PROFESSIONAL_SERVICES_FINDING_CALIBRATIONS } from "./calibrations/professional_services";

export * from "./types";
export * from "./depthStandard";

export const INDUSTRY_BANKS: Record<IndustryKey, IndustryQuestionBank> = {
  trades_home_services: TRADES_HOME_SERVICES_BANK,
  restaurants_food_service: RESTAURANTS_FOOD_SERVICE_BANK,
  retail_brick_mortar: RETAIL_BRICK_MORTAR_BANK,
  professional_services: PROFESSIONAL_SERVICES_BANK,
  ecommerce_online_retail: ECOMMERCE_ONLINE_RETAIL_BANK,
  cannabis_mmj_dispensary: CANNABIS_MMJ_DISPENSARY_BANK,
};

/**
 * Industry-specific FindingCalibration registry. Hydrated incrementally as
 * each bank reaches full-depth readiness. Other industries remain empty until
 * their own depth pass lands.
 */
export const INDUSTRY_FINDING_CALIBRATIONS: Record<IndustryKey, FindingCalibration[]> = {
  trades_home_services: TRADES_FINDING_CALIBRATIONS,
  restaurants_food_service: RESTAURANTS_FINDING_CALIBRATIONS,
  retail_brick_mortar: RETAIL_FINDING_CALIBRATIONS,
  professional_services: PROFESSIONAL_SERVICES_FINDING_CALIBRATIONS,
  ecommerce_online_retail: [],
  cannabis_mmj_dispensary: [],
};

export function getBank(industry: IndustryKey): IndustryQuestionBank {
  return INDUSTRY_BANKS[industry];
}

export function getFindingCalibrations(industry: IndustryKey): FindingCalibration[] {
  return INDUSTRY_FINDING_CALIBRATIONS[industry] ?? [];
}

export function questionsByGear(bank: IndustryQuestionBank): Map<string, DiagnosticQuestion[]> {
  const m = new Map<string, DiagnosticQuestion[]>();
  for (const q of bank.questions) {
    const arr = m.get(q.gear) ?? [];
    arr.push(q);
    m.set(q.gear, arr);
  }
  return m;
}
