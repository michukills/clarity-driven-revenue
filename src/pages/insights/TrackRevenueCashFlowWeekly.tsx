import SpokeTemplate from "./_SpokeTemplate";

export default function TrackRevenueCashFlowWeekly() {
  return (
    <SpokeTemplate
      eyebrow="Weekly Operating Rhythm"
      h1={
        <>
          How to track revenue and{" "}
          <span className="text-accent">cash flow weekly</span>.
        </>
      }
      intro="Most owners review numbers monthly or quarterly. By then patterns have already happened — leaks have already shipped, cash has already tightened, the slow problem has already become the urgent one. Weekly visibility is what makes structural problems visible early enough to act."
      seoTitle="How to Track Revenue and Cash Flow Weekly — Build a Real Operating Rhythm | RGS"
      seoDescription="Monthly review is too late for most service businesses. Learn what to track weekly across revenue, pipeline, expenses, cash, blockers, and source systems — and how RGS turns weekly inputs into operating insight."
      canonical="/track-revenue-cash-flow-weekly"
      problemHeading="Monthly review is the speed of the problem, not the speed of the business."
      problemParagraphs={[
        "By the time monthly numbers land, the leak that caused them has been running for weeks. Patterns that would have been obvious in week two arrive as a surprise in week six.",
        "Spreadsheets and dashboards aren't the issue. The issue is rhythm — whether the business has a weekly habit of actually looking, with every number tied to a real source.",
        "Weekly visibility doesn't mean more reporting. It means a small, consistent set of inputs reviewed at the same cadence, every week, by the same person.",
      ]}
      signalsHeading="You probably need a weekly rhythm if…"
      signals={[
        "You can't tell on a Wednesday how the month is actually trending.",
        "Cash concerns surface when they're already cash concerns.",
        "Pipeline reports change shape every time someone different opens them.",
        "You're not sure which source produced last week's revenue numbers.",
        "Repeated blockers don't get spotted until a quarterly review forces the look.",
      ]}
      blocksHeading="What a weekly operating rhythm actually tracks."
      blocks={[
        {
          title: "Revenue and pipeline",
          body: "Weekly revenue logged consistently, pipeline confidence tracked honestly, and quote-to-close monitored as a moving picture rather than a year-end recap.",
        },
        {
          title: "Cash and obligations",
          body: "AR aging, inflows and obligations across the next 7 and 30 days, and a captured weekly cash concern level. Cash flow gets its own view — not a footnote in a revenue report.",
        },
        {
          title: "Blockers and source systems",
          body: "Repeated process, sales, people, and cash blockers surface across weeks. Every input ties to a real source system, so numbers can be trusted and challenged the same way every time.",
        },
      ]}
      proofParagraph="RGS clients run their weekly operating rhythm inside the Revenue Control Center™ — the client software experience — as part of the Revenue Control System™ monthly offer. Inputs become trend lines, repeated blockers get flagged, and an RGS reviewer can be requested when something looks off."
      proofTools={["Revenue Control Center™ (software)", "Revenue Control System™ (monthly offer)"]}
      relatedLinks={[
        { to: "/why-businesses-lose-revenue", label: "Why your business is losing money (and how to fix it)" },
        { to: "/revenue-control-system", label: "About the Revenue Control System™" },
        { to: "/measure-business-stability", label: "How to measure business stability" },
      ]}
      closingHeading={
        <>
          Stable revenue is a{" "}
          <span className="text-accent">weekly habit</span>, not a quarterly hope.
        </>
      }
      closingNote="The Diagnostic identifies which weekly inputs would change how you make decisions."
    />
  );
}