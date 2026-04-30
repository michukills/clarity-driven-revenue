// P20.3 — Medical / MMC industry brain.
//
// Compliance-sensitive: never include patient identifiers. Only operational
// signals about billing/reimbursement/follow-up are surfaced.

import type { Leak } from "@/lib/leakEngine/leakObject";
import type { BrainInput, BrainResult } from "../types";
import { makeLeak } from "./_helpers";

export function runMedicalBrain(input: BrainInput): BrainResult {
  const d = input.industryData?.medical ?? {};
  const leaks: Leak[] = [];

  if (typeof d.unbilledServiceCount === "number" && d.unbilledServiceCount > 0) {
    leaks.push(
      makeLeak(input, {
        id: `medical:unbilled:${d.unbilledServiceCount}`,
        type: "services_not_billed",
        category: "financial_visibility",
        gear: 4,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: `${d.unbilledServiceCount} services delivered but not yet billed.`,
        recommended_fix: "Close the encounter → claim loop daily. Unbilled visits are unfunded visits.",
      }),
    );
  }

  if (typeof d.avgBillingDelayDays === "number" && d.avgBillingDelayDays > 3) {
    leaks.push(
      makeLeak(input, {
        id: "medical:billing_delay",
        type: "delayed_claims_or_billing",
        category: "financial_visibility",
        gear: 4,
        severity: d.avgBillingDelayDays > 7 ? "high" : "medium",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Average billing delay ${d.avgBillingDelayDays.toFixed(0)} days post-service.`,
        recommended_fix: "Bill within 24 hours of service approval to shorten reimbursement.",
      }),
    );
  }

  if (typeof d.avgReimbursementDelayDays === "number" && d.avgReimbursementDelayDays > 30) {
    leaks.push(
      makeLeak(input, {
        id: "medical:reimbursement_delay",
        type: "reimbursement_delays",
        category: "financial_visibility",
        gear: 4,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Reimbursement averages ${d.avgReimbursementDelayDays.toFixed(0)} days.`,
        recommended_fix: "Audit denials and resubmissions for the top 3 payers this week.",
      }),
    );
  }

  if (typeof d.followUpBacklog === "number" && d.followUpBacklog > 0) {
    leaks.push(
      makeLeak(input, {
        id: `medical:followup_backlog:${d.followUpBacklog}`,
        type: "incomplete_follow_up",
        category: "retention",
        gear: 2,
        severity: "medium",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: `${d.followUpBacklog} patients/customers awaiting follow-up.`,
        recommended_fix: "Assign a daily follow-up owner and clear the backlog this week.",
      }),
    );
  }

  return { brain: "mmj_cannabis", leaks };
}
