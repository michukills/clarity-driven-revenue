import SpokeTemplate from "./_SpokeTemplate";

export default function IdentifyIdealCustomer() {
  return (
    <SpokeTemplate
      eyebrow="Customer Fit"
      h1={
        <>
          How to identify <span className="text-accent">your ideal customer</span>.
        </>
      }
      intro="Most service businesses are not short on leads. They're short on the right ones. When marketing and sales chase too broad an audience, messaging weakens, conversion drops, and effort gets spent on buyers who were never going to be a fit."
      seoTitle="How to Identify Your Ideal Customer — Stop Attracting the Wrong Buyers | RGS"
      seoDescription="Wrong-fit customers create some of the largest hidden revenue leaks in service businesses. Learn the signals you're attracting the wrong buyers, what an ideal customer actually means, and how RGS makes buyer fit measurable."
      canonical="/identify-ideal-customer"
      problemHeading="Wrong-fit customers don't show up as a line item — but they're costing you."
      problemParagraphs={[
        "Effort spent attracting the wrong customers doesn't appear on a P&L. It hides inside marketing spend, sales hours, scope creep, refund risk, and the slow drag of work that doesn't fit how the business actually delivers.",
        "Broad targeting feels safer. It is not. Vague messaging speaks to no one specifically, which makes conversion harder, pricing weaker, and referrals less precise.",
        "Identifying the ideal customer is not a brand exercise. It is a revenue exercise. Better-fit buyers convert faster, pay sooner, scope cleaner, and refer the right people.",
      ]}
      signalsHeading="You may be attracting the wrong customers if…"
      signals={[
        "Closed deals routinely require unusual scope, discounting, or hand-holding to land.",
        "Sales calls feel like education sessions instead of fit conversations.",
        "Referrals send people who look right on paper but don't convert.",
        "The team can't describe the ideal buyer in one sentence the same way twice.",
        "Your best clients don't look anything like the audience your marketing speaks to.",
      ]}
      blocksHeading="What 'ideal customer' actually means."
      blocks={[
        {
          title: "Fit, not persona",
          body: "Demographics describe a person. Fit describes the conditions under which your offer creates real value — situation, problem severity, urgency, decision authority, and willingness to act.",
        },
        {
          title: "Where the money already proves it",
          body: "The clearest definition usually lives inside your existing client base. Best-fit clients show repeating patterns in how they bought, how they decided, and what they needed.",
        },
        {
          title: "What it changes downstream",
          body: "A clearer buyer definition tightens messaging, sharpens sales qualification, simplifies pricing, and reduces the customer-journey friction that quietly costs revenue.",
        },
      ]}
      proofParagraph="RGS uses a structured diagnostic system to surface buyer-fit patterns from inside the business itself — not from imagined personas. Fit becomes something you can describe, qualify against, and use to filter where revenue effort goes."
      proofTools={["Buyer Intelligence Engine™"]}
      relatedLinks={[
        { to: "/why-businesses-lose-revenue", label: "Why your business is losing money (and how to fix it)" },
        { to: "/losing-customers-before-they-buy", label: "Why you're losing customers before they buy" },
        { to: "/diagnostic", label: "About the Diagnostic" },
      ]}
      closingHeading={
        <>
          Stop guessing who you serve.{" "}
          <span className="text-accent">Make buyer fit measurable.</span>
        </>
      }
      closingNote="The Diagnostic surfaces who's actually paying you well — and who's quietly costing you."
    />
  );
}