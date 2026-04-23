import SpokeTemplate from "./_SpokeTemplate";

export default function MeasureBusinessStability() {
  return (
    <SpokeTemplate
      eyebrow="Business Stability"
      h1={
        <>
          How to measure{" "}
          <span className="text-accent">business stability</span>.
        </>
      }
      intro="Revenue alone doesn't prove a business is stable. Owner-dependency, single-source pipelines, fragile processes, and missing financial visibility hide inside healthy-looking top-line numbers — until something shifts and the fragility becomes the story."
      seoTitle="How to Measure Business Stability — A Structured Health Check | RGS"
      seoDescription="Revenue is not stability. Learn how to measure business stability across owner load, pipeline diversity, financial visibility, repeatable systems, and operational fragility — and why this matters before scaling."
      canonical="/measure-business-stability"
      problemHeading="A good revenue month is not a stability signal."
      problemParagraphs={[
        "Stability is whether the business can keep producing the same outcome under normal conditions, without depending on any single person, source, or heroic effort.",
        "Most owners can describe their revenue. Few can describe their stability. That gap is where surprises live — sudden cash issues, key-person risk, pipeline cliffs, delivery breakdowns under load.",
        "Stability needs to be measured before scaling. Adding volume to a fragile system doesn't strengthen it. It accelerates the failure mode.",
      ]}
      signalsHeading="You might be less stable than the numbers suggest if…"
      signals={[
        "Removing the owner from any single workflow stalls the business.",
        "Most revenue depends on one client, one channel, or one referral source.",
        "Repeatable processes exist as habits in someone's head, not as systems.",
        "Cash visibility is reactive — felt before it's seen.",
        "Two good months in a row feel surprising, not expected.",
      ]}
      blocksHeading="What stability is actually made of."
      blocks={[
        {
          title: "Owner load",
          body: "How many decisions, handoffs, and recoveries depend on the owner specifically. Owner-as-load is the most common stability tax in small service businesses.",
        },
        {
          title: "Source and pipeline diversity",
          body: "How concentrated revenue is across clients, channels, and sources. Diversity is not always the goal — but unmonitored concentration is always a risk.",
        },
        {
          title: "Repeatable systems and visibility",
          body: "Whether work runs the same way twice, whether numbers are visible weekly, and whether problems can be located before they grow. Stability lives in repeatability.",
        },
      ]}
      proofParagraph="RGS uses a structured diagnostic system to score stability across the dimensions that actually matter — not just revenue. The result is a measured, comparable picture of where the business is fragile and where it's already solid."
      proofTools={["Business Stability Index™"]}
      relatedLinks={[
        { to: "/why-businesses-lose-revenue", label: "Why your business is losing money (and how to fix it)" },
        { to: "/system", label: "The RGS Stability System" },
        { to: "/fix-operational-bottlenecks", label: "How to fix operational bottlenecks" },
      ]}
      closingHeading={
        <>
          Measure stability{" "}
          <span className="text-accent">before you scale anything</span>.
        </>
      }
      closingNote="The Diagnostic produces a structured stability picture — what's solid, what's fragile, and what to fix first."
    />
  );
}