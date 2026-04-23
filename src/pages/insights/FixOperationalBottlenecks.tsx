import SpokeTemplate from "./_SpokeTemplate";

export default function FixOperationalBottlenecks() {
  return (
    <SpokeTemplate
      eyebrow="Operations & Process Clarity"
      h1={
        <>
          How to fix{" "}
          <span className="text-accent">operational bottlenecks</span>.
        </>
      }
      intro="Growth often stalls not because of demand, but because delivery, follow-up, handoffs, or ownership keeps breaking down at the same point. Adding more leads to a broken process produces more lost revenue, not more revenue."
      seoTitle="How to Fix Operational Bottlenecks — Owner Bottleneck, Handoffs & Process Gaps | RGS"
      seoDescription="Most growth stalls are operational, not market problems. Learn how to spot the owner-as-bottleneck, broken handoffs, and process gaps that quietly cap revenue — and how RGS turns process clarity into implementation priorities."
      canonical="/fix-operational-bottlenecks"
      problemHeading="A growth stall is usually a process stall in disguise."
      problemParagraphs={[
        "When a business stops growing, the instinct is to push harder on demand — more leads, more outreach, more campaigns. If the bottleneck is operational, that pressure makes things worse: more leads collide with the same broken handoffs, and conversion gets quieter, not louder.",
        "Operational bottlenecks rarely look like one big break. They look like the same small failure repeating: a follow-up that didn't happen, a handoff that lost context, a decision that only the owner can make, a delivery step that depends on memory.",
        "Process clarity isn't paperwork. It's making the work observable enough that the same break stops being a surprise.",
    ]}
      signalsHeading="Likely an operational bottleneck if…"
      signals={[
        "The same kind of issue keeps recurring across different clients or projects.",
        "Work waits on the owner for routine decisions.",
        "Handoffs between sales and delivery (or delivery and follow-up) drop context.",
        "Adding people hasn't actually reduced the owner's load.",
        "The team can describe what's broken but no one is responsible for fixing it.",
      ]}
      blocksHeading="What 'fixing the bottleneck' actually looks like."
      blocks={[
        {
          title: "Find the repeated break",
          body: "Look for the same failure pattern across different work. The bottleneck is wherever the same recovery effort keeps happening — not the loudest single incident.",
        },
        {
          title: "Make the work observable",
          body: "If a process can't be seen, it can't be fixed. Naming the steps, owners, and inputs is most of the work. Most bottlenecks reveal themselves once they're observable.",
        },
        {
          title: "Sequence by impact, not by anxiety",
          body: "Not every bottleneck deserves attention now. Implementation priorities should follow revenue impact and stability impact — not whichever issue made the loudest noise this week.",
        },
      ]}
      proofParagraph="RGS uses a structured diagnostic system to surface where work actually breaks down inside the business. Process clarity then becomes an ordered list of implementation priorities — what to install first, second, and what to leave alone for now."
      proofTools={["Process Clarity Engine™"]}
      relatedLinks={[
        { to: "/why-businesses-lose-revenue", label: "Why your business is losing money (and how to fix it)" },
        { to: "/implementation", label: "About RGS Implementation" },
        { to: "/measure-business-stability", label: "How to measure business stability" },
      ]}
      closingHeading={
        <>
          Fix the bottleneck{" "}
          <span className="text-accent">before adding more demand</span>.
        </>
      }
      closingNote="The Diagnostic locates where the work is actually breaking — and what to install first to fix it."
    />
  );
}