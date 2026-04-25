import { describe, it, expect } from "vitest";
import {
  PILLARS,
  PillarId,
  emptyAnswers,
  scoreScorecard,
} from "./rubric";

function fillAll(text: string) {
  const a = emptyAnswers();
  for (const p of PILLARS) {
    for (const q of p.questions) {
      a[p.id][q.id] = text;
    }
  }
  return a;
}

function fillPerPillar(map: Partial<Record<PillarId, string>>) {
  const a = emptyAnswers();
  for (const p of PILLARS) {
    const text = map[p.id] ?? "";
    for (const q of p.questions) a[p.id][q.id] = text;
  }
  return a;
}

describe("scorecard rubric — confidence calibration (P13.Scorecard.AI.2)", () => {
  it("very vague answers across all pillars → low overall confidence", () => {
    const r = scoreScorecard(fillAll("Not sure. Varies a lot."));
    expect(r.overall_confidence).toBe("low");
    expect(r.missing_information.length).toBeGreaterThan(0);
  });

  it("missing answers entirely → low overall confidence", () => {
    const r = scoreScorecard(emptyAnswers());
    expect(r.overall_confidence).toBe("low");
  });

  it("mixed answers with some useful detail → medium overall confidence", () => {
    const r = scoreScorecard(
      fillPerPillar({
        demand:
          "Most leads come from referrals, maybe 60% — the rest is word of mouth and inbound.",
        conversion:
          "I respond personally and send a quote. Sometimes follow up, sometimes I forget.",
        operations: "Mostly in our heads. A few checklists exist.",
        financial: "I check the bank balance and the P&L from my bookkeeper monthly.",
        owner: "Some things are delegated, but pricing and hiring depend on me.",
      }),
    );
    expect(r.overall_confidence).toBe("medium");
  });

  it("detailed evidence-rich answers across all pillars → high overall confidence", () => {
    const detailed =
      "We have a documented process reviewed weekly with an owner assigned. " +
      "Tracked in HubSpot CRM with KPIs on a dashboard, and we close out every Monday. " +
      "Last 6 months we averaged 24 leads per month with a 30% close rate, $12,000 average deal. " +
      "Step 1 we qualify, then we send a templated proposal, then we run a follow-up cadence. " +
      "QuickBooks reconciled monthly by our bookkeeper, payroll runs through Gusto every two weeks.";
    const r = scoreScorecard(fillAll(detailed));
    expect(r.overall_confidence).toBe("high");
  });

  it("detailed but owner-dependent/manual → stays at medium, not high", () => {
    const ownerHeavy =
      "Everything ultimately depends on me. I do it manually in my head — no system tracks it. " +
      "I review numbers weekly but it's all from memory and instinct. We don't track sources formally. " +
      "Pricing, hiring, delivery decisions — only me. Team handles scheduling but I'm the bottleneck. " +
      "I guess at margins because I don't have a real dashboard or KPIs in place.";
    const r = scoreScorecard(fillAll(ownerHeavy));
    expect(r.overall_confidence).not.toBe("high");
  });

  it("one thin minor answer should not drag overall to low", () => {
    const detailed =
      "We run a documented weekly review with an owner assigned. Tracked in HubSpot CRM with KPIs " +
      "on a dashboard. Last quarter we averaged 18 leads/month at 28% close. QuickBooks reconciled " +
      "monthly by our bookkeeper. Step 1 qualify, then proposal, then follow-up cadence every Monday.";
    const a = fillAll(detailed);
    // Make one secondary question short.
    a.owner.owner_decisions = "Mostly delegated.";
    const r = scoreScorecard(a);
    expect(r.overall_confidence).not.toBe("low");
  });

  it("score is honest: detailed but weak answers should not inflate the score", () => {
    const weakDetailed =
      "Honestly nothing is documented. Everything depends on me, I do it all manually from memory. " +
      "We don't track lead sources, we don't review numbers on any cadence, and the team waits on me " +
      "for every decision. Same problems come up every month and we firefight them. No dashboard, " +
      "no KPIs, no system. I guess at margins.";
    const r = scoreScorecard(fillAll(weakDetailed));
    // Maturity should land in the bottom bands regardless of detail.
    expect(r.overall_band).toBeLessThanOrEqual(2);
  });
});