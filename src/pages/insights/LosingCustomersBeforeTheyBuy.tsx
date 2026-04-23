import SpokeTemplate from "./_SpokeTemplate";

export default function LosingCustomersBeforeTheyBuy() {
  return (
    <SpokeTemplate
      eyebrow="Buyer Journey & Conversion"
      h1={
        <>
          Why you're losing customers{" "}
          <span className="text-accent">before they buy</span>.
        </>
      }
      intro="When leads don't convert, it's tempting to call it a lead-quality problem. Most of the time it isn't. Customers are dropping off because the buying journey is unclear, inconsistent, or harder to complete than it should be — and the business can't see exactly where."
      seoTitle="Why You're Losing Customers Before They Buy — Buyer Journey Drop-Off | RGS"
      seoDescription="Most lead-quality problems are actually buyer-journey problems. Learn where buyers commonly drop off, why follow-up fails, and how mapping the customer journey reveals the missed revenue hiding inside your sales process."
      canonical="/losing-customers-before-they-buy"
      problemHeading="It looks like a lead problem. It usually isn't."
      problemParagraphs={[
        "Buyers don't drop off because they suddenly stop being interested. They drop off because the next step is unclear, the follow-up is inconsistent, the messaging shifts between touchpoints, or the path to commit is heavier than the value of committing right now.",
        "When the journey is invisible, the failure points are invisible too. Sales blames marketing. Marketing blames sales. The actual leak — a specific moment in the sequence — never gets named.",
        "Mapping the buyer journey isn't a branding workshop. It's the act of making each step real, observed, and measurable so the broken step becomes obvious.",
      ]}
      signalsHeading="Likely a buyer journey problem if…"
      signals={[
        "Leads engage early then go quiet without a clear reason.",
        "Follow-up depends on who's available rather than on a defined sequence.",
        "Different touchpoints describe the offer in noticeably different ways.",
        "Proposals or quotes get sent and never get a yes-or-no.",
        "The team can't agree on where in the journey deals usually die.",
      ]}
      blocksHeading="What mapping the journey actually fixes."
      blocks={[
        {
          title: "Naming the steps",
          body: "Make each step in how a buyer actually moves through the business explicit — not assumed. Without named steps, drop-off can't be located.",
        },
        {
          title: "Locating the drop",
          body: "Once steps exist, the leak shows up. Usually it isn't where the team thought it was. Often it's earlier, smaller, and more fixable than it felt.",
        },
        {
          title: "Closing the gaps that aren't lead problems",
          body: "Most fixes here are operational: clearer next steps, consistent messaging across touchpoints, defined follow-up cadence, and removing avoidable friction at commit.",
        },
      ]}
      proofParagraph="RGS uses a structured diagnostic system to make the buyer journey concrete — not a slide. Drop-off points become visible, and conversion problems stop being treated as lead-quality problems when they aren't."
      proofTools={["Customer Journey Mapping System™"]}
      relatedLinks={[
        { to: "/why-businesses-lose-revenue", label: "Why your business is losing money (and how to fix it)" },
        { to: "/identify-ideal-customer", label: "How to identify your ideal customer" },
        { to: "/diagnostic", label: "About the Diagnostic" },
      ]}
      closingHeading={
        <>
          Find the drop-off{" "}
          <span className="text-accent">that's costing you the most</span>.
        </>
      }
      closingNote="The Diagnostic locates where the journey actually breaks — not where it feels like it does."
    />
  );
}