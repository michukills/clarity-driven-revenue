/* P10.2c-Hardening — Helper-level guards for per-customer learning writes.
 *
 * These wrappers re-load the customer's learning settings on every call
 * and refuse to write to global RGS pattern intelligence (or local memory)
 * when learning is paused or local-only. UI flows (and any future code)
 * should use these instead of the raw helpers in
 * `customerMemory.ts` / `patternIntelligence.ts` whenever the action is
 * tied to a specific customer.
 */

import {
  loadLearningSettings,
  shouldWriteGlobal,
  shouldWriteMemory,
} from "./learningSettings";
import {
  recordApprovedGuidance,
  type CustomerMemoryRow,
} from "./customerMemory";
import {
  recordPatternApproval,
  recordPatternRejection,
  recordPatternSignal,
} from "./patternIntelligence";

type PatternArgs = Parameters<typeof recordPatternApproval>[0];
type GuidanceArgs = Parameters<typeof recordApprovedGuidance>[0];

async function isGlobalAllowed(customerId: string): Promise<boolean> {
  try {
    const s = await loadLearningSettings(customerId);
    return shouldWriteGlobal(s);
  } catch {
    // Fail closed: if we can't read the flag, do not contribute to global.
    return false;
  }
}

async function isMemoryAllowed(customerId: string): Promise<boolean> {
  try {
    const s = await loadLearningSettings(customerId);
    return shouldWriteMemory(s);
  } catch {
    return false;
  }
}

/** Global pattern approval, gated by the customer's learning settings. */
export async function recordPatternApprovalForCustomer(
  customerId: string,
  args: PatternArgs,
): Promise<void> {
  if (!(await isGlobalAllowed(customerId))) return;
  await recordPatternApproval(args);
}

/** Global pattern rejection, gated by the customer's learning settings. */
export async function recordPatternRejectionForCustomer(
  customerId: string,
  args: PatternArgs,
): Promise<void> {
  if (!(await isGlobalAllowed(customerId))) return;
  await recordPatternRejection(args);
}

/** Generic global pattern signal, gated by the customer's learning settings. */
export async function recordPatternSignalForCustomer(
  customerId: string,
  args: PatternArgs,
): Promise<void> {
  if (!(await isGlobalAllowed(customerId))) return;
  await recordPatternSignal(args);
}

/** Approved-guidance memory write, gated by the customer's learning flag. */
export async function recordApprovedGuidanceForCustomer(
  customerId: string,
  args: GuidanceArgs,
): Promise<void> {
  if (!(await isMemoryAllowed(customerId))) return;
  await recordApprovedGuidance(args);
}

export type { CustomerMemoryRow };
