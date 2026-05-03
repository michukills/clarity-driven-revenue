// P39 — Blog registry. Single source of truth for /blog and /blog/:slug.
//
// Each post is a plain object with SEO metadata, a structured body
// (sections of typed blocks), and CTA targets. Adding a post = adding
// an entry here. No CMS, no remote fetch, no fake proof.

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "callout"; text: string }
  | { type: "list"; items: string[] };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string; // ISO yyyy-mm-dd
  readingTimeMin: number;
  author: string;
  seoTitle: string;
  seoDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  heroEyebrow: string;
  heroSubtitle: string;
  body: BlogBlock[];
  primaryCta: "scorecard" | "diagnostic" | "demo" | "why-rgs";
  related: string[]; // slugs
  status: "published" | "draft";
  // P40 — optional editorial / SEO quality fields. Optional so older
  // posts keep working without churn, but new posts should fill these.
  searchIntent?: "informational" | "commercial" | "navigational";
  audience?: string;
  contentGoal?: string;
  internalLinks?: { label: string; to: string }[];
  updatedAt?: string; // ISO yyyy-mm-dd
  lastReviewed?: string; // ISO yyyy-mm-dd
  qualityStatus?: "draft" | "review_needed" | "launch_ready";
}

export const BLOG_AUTHOR = "Revenue & Growth Systems";

export const blogPosts: BlogPost[] = [
  {
    slug: "why-your-business-feels-harder-to-run-than-it-should",
    title: "Why Your Business Feels Harder to Run Than It Should",
    excerpt:
      "Most owner-led businesses do not fall apart all at once. One gear starts slipping, then the rest of the system carries pressure it was not built to carry.",
    category: "Business Stability",
    tags: ["stability", "owner-led", "systems", "diagnostics"],
    date: "2026-05-01",
    readingTimeMin: 8,
    author: BLOG_AUTHOR,
    seoTitle: "Why Your Business Feels Harder to Run Than It Should | RGS",
    seoDescription:
      "Owner-led businesses rarely fail from lack of effort. They get heavier when one part of the system starts slipping. Here is how to see it before it spreads.",
    primaryKeyword: "business stability",
    secondaryKeywords: [
      "owner-led business",
      "business systems",
      "business diagnostic",
      "revenue stability",
    ],
    heroEyebrow: "Business Stability",
    heroSubtitle:
      "If the work keeps getting heavier even though you are doing more of it, the issue is rarely effort. It is usually pressure moving through a system that was never built to carry it.",
    body: [
      {
        type: "p",
        text:
          "Owners almost never describe the real problem on the first try. They describe the symptom that is loudest this week. Sales feels slower. Cash feels tight. A good employee just left. The schedule has gone sideways again. Each of those feels like its own fire, so the owner puts on the gear they always put on, and they go fight it.",
      },
      {
        type: "p",
        text:
          "Then the same kind of fire shows up next month, in a slightly different room. That is the part that wears people down. Not the work. The repetition.",
      },
      { type: "h2", text: "The symptoms usually look separate" },
      {
        type: "p",
        text:
          "When several small things go wrong in different parts of a business, the natural reaction is to treat them as separate events. Hire a closer. Try a new ad channel. Buy better software. Have another team meeting. Most of those moves are reasonable in isolation. They just rarely solve the underlying issue, because the underlying issue is not in any one of those rooms.",
      },
      {
        type: "p",
        text:
          "A business is a connected system. Pressure that builds in one place tends to come out somewhere else. Slow follow-up shows up as a margin problem two months later. A fragile delivery process shows up as a hiring problem. A pricing model that never got updated shows up as an owner who cannot step away.",
      },
      { type: "h2", text: "The problem is often system pressure" },
      {
        type: "p",
        text:
          "A gear usually does not fail all at once. One worn tooth starts slipping. Then the next part of the system has to carry pressure it was not built to carry. From the outside it looks fine for a while. From the inside it feels heavier every week.",
      },
      {
        type: "p",
        text:
          "When that pattern is in motion, more effort does not fix it. More effort just gets absorbed by the part of the system that is already compensating. The owner ends up doing the carrying personally, which is why so many owner-led businesses quietly turn into the owner.",
      },
      { type: "h2", text: "The five gears RGS looks at" },
      {
        type: "p",
        text:
          "RGS looks at a business through five connected gears. They are not categories on a slide. They are the places where pressure usually shows up first.",
      },
      {
        type: "list",
        items: [
          "Demand generation — whether new opportunities are arriving on purpose, not by accident.",
          "Revenue conversion — whether opportunities are turning into paying work without leaks.",
          "Operational efficiency — whether the work happens the same way twice without the owner steering every step.",
          "Financial visibility — whether the numbers are clear enough to make the next decision without guessing.",
          "Owner independence — whether the business can keep moving when the owner is not in the room.",
        ],
      },
      {
        type: "p",
        text:
          "When all five are reasonably stable, growth feels calmer. When one is slipping, the rest start carrying weight they were not designed for. That is usually what the owner is feeling, even when they describe it as something else.",
      },
      { type: "h2", text: "Why dashboards alone are not enough" },
      {
        type: "p",
        text:
          "Dashboards are good at showing what already happened. They are less good at telling an owner what to do next. A revenue chart can be flat for ten different reasons. A cash chart can be tight for five. The number is not the answer. The number is the prompt to ask a better question.",
      },
      {
        type: "p",
        text:
          "The job is not to stare at more screens. The job is to know which gear is slipping, why it matters, and what to look at first. That is a different problem than reporting.",
      },
      { type: "h2", text: "Why guided independence matters" },
      {
        type: "p",
        text:
          "RGS is not here to think for the owner. It is here to make the business easier to think through. The point is not to keep the owner dependent on an outside advisor. The point is to put the right information in front of the owner so the next decision is easier to make on their own.",
      },
      {
        type: "callout",
        text:
          "A stable business should be able to keep moving even when the owner steps away. Anything that quietly works against that is worth questioning.",
      },
      { type: "h2", text: "Start with the Scorecard" },
      {
        type: "p",
        text:
          "Before spending more money on the issue, it usually helps to know which gear is actually under load. The 0–1000 Business Stability Scorecard is a structured way to take that first reading. It is not a personality quiz, and it is not a sales pitch in disguise. It is a system check.",
      },
      {
        type: "p",
        text:
          "If the score lines up with what you already suspected, you have a clearer place to start. If it surprises you, that is usually the more useful outcome.",
      },
    ],
    primaryCta: "scorecard",
    related: [
      "what-makes-rgs-different",
      "the-five-gears-of-an-owner-led-business",
    ],
    status: "published",
  },
  {
    slug: "what-makes-rgs-different",
    title: "What Makes RGS Different From Generic Business Consulting",
    excerpt:
      "Most advice is general. General advice is a slippery slope when the real problem has not been identified. Here is how a structured diagnostic changes the conversation.",
    category: "How RGS Works",
    tags: ["diagnostic", "consulting", "owner-led", "decision rights"],
    date: "2026-04-15",
    readingTimeMin: 7,
    author: BLOG_AUTHOR,
    seoTitle: "What Makes RGS Different From Generic Business Consulting | RGS",
    seoDescription:
      "RGS starts with a structured diagnostic instead of generic advice, so the recommendations match what is actually breaking — and the owner keeps decision authority.",
    primaryKeyword: "business diagnostic vs consulting",
    secondaryKeywords: [
      "structured business assessment",
      "owner decision rights",
      "evidence-backed findings",
    ],
    heroEyebrow: "How RGS Works",
    heroSubtitle:
      "The goal is not to sound smart. The goal is to make the next step make sense.",
    body: [
      {
        type: "p",
        text:
          "Most business advice arrives the same way. Someone listens for ten minutes, recognizes a familiar pattern, and prescribes the playbook they already had ready. Sometimes that works. Often it solves a problem the business does not actually have, while the real problem keeps quietly growing in another room.",
      },
      { type: "h2", text: "The diagnostic comes before the prescription" },
      {
        type: "p",
        text:
          "RGS starts with a structured diagnostic. Before any recommendation is made, the business is examined across the five gears that usually carry the pressure: demand generation, revenue conversion, operational efficiency, financial visibility, and owner independence. The output is a structured picture, not a hot take.",
      },
      {
        type: "p",
        text:
          "That ordering matters. General advice is a slippery slope when the real problem has not been identified. A diagnostic forces the conversation to be about evidence first, not opinion first.",
      },
      { type: "h2", text: "Findings are labeled by how strong they are" },
      {
        type: "p",
        text:
          "Not every signal is the same weight. Some things are directly supported by the data the owner provided. Some are patterns across multiple answers. Some are worth investigating but not yet proven. RGS labels findings that way on purpose, so the owner can tell the difference between a clear issue and a hypothesis.",
      },
      { type: "h2", text: "The owner keeps decision authority" },
      {
        type: "p",
        text:
          "RGS helps identify the issue and explain the likely next step. The owner keeps final decision authority. That is not a disclaimer. It is the operating model. A business that quietly hands its decisions to an outside advisor is trading one kind of fragility for another.",
      },
      {
        type: "callout",
        text:
          "RGS is not here to think for the owner. It is here to make the business easier to think through.",
      },
      { type: "h2", text: "Implementation is a separate decision" },
      {
        type: "p",
        text:
          "After the diagnostic, the owner can choose what to do next. Sometimes the answer is internal. Sometimes it is a focused implementation engagement. Sometimes it is the Revenue Control System for ongoing visibility. Those are different decisions, made on their own merit, not bundled into a single yes.",
      },
      { type: "h2", text: "If you want to see the difference yourself" },
      {
        type: "p",
        text:
          "The 0–1000 Business Stability Scorecard is the lightest-weight way to feel the difference between a structured read and a general opinion. It will not solve anything by itself. It will give an honest first picture of where the business actually stands.",
      },
    ],
    primaryCta: "why-rgs",
    related: [
      "why-your-business-feels-harder-to-run-than-it-should",
      "the-five-gears-of-an-owner-led-business",
    ],
    status: "published",
  },
  {
    slug: "the-five-gears-of-an-owner-led-business",
    title: "The Five Gears of an Owner-Led Business",
    excerpt:
      "A short walk through the five gears RGS uses to read a business — what each one does, what it looks like when it slips, and why the owner usually feels the slip before the data shows it.",
    category: "Business Stability",
    tags: ["five gears", "stability", "systems", "owner-led"],
    date: "2026-03-20",
    readingTimeMin: 9,
    author: BLOG_AUTHOR,
    seoTitle: "The Five Gears of an Owner-Led Business | RGS",
    seoDescription:
      "Demand generation, revenue conversion, operational efficiency, financial visibility, and owner independence — the five gears RGS reads to find where a business is slipping.",
    primaryKeyword: "five gears business system",
    secondaryKeywords: [
      "owner independence",
      "revenue conversion",
      "operational efficiency",
      "financial visibility",
    ],
    heroEyebrow: "Business Stability",
    heroSubtitle:
      "Five connected gears. When one starts slipping, the others have to carry pressure they were not built to carry.",
    body: [
      {
        type: "p",
        text:
          "It is tempting to picture a business as a stack of departments. Sales over here, operations over there, finance in the back. That picture makes the org chart easier to draw, but it makes the actual problems harder to see. A business does not run as separate boxes. It runs as connected gears that pass pressure between each other.",
      },
      { type: "h2", text: "1. Demand generation" },
      {
        type: "p",
        text:
          "Whether new opportunities arrive on purpose, not by accident. A demand gear is slipping when the pipeline depends on a single channel, a single referral source, or a single person remembering to follow up. It can look fine for a long time, until the source moves or the person leaves.",
      },
      { type: "h2", text: "2. Revenue conversion" },
      {
        type: "p",
        text:
          "Whether opportunities turn into paying work without leaking on the way. This is where pricing, scoping, follow-up timing, and proposal clarity live. A conversion gear is slipping when good leads quietly get cold, or when the owner has to personally save deals that should have closed on their own.",
      },
      { type: "h2", text: "3. Operational efficiency" },
      {
        type: "p",
        text:
          "Whether the work happens the same way twice without the owner steering every step. A few signs this gear is slipping: the same fire keeps recurring, new hires take longer than they should to be useful, and the owner is the only person who knows the full sequence of how a job actually gets done.",
      },
      { type: "h2", text: "4. Financial visibility" },
      {
        type: "p",
        text:
          "Whether the numbers are clear enough to make the next decision without guessing. This is not about more dashboards. It is about whether revenue, cash, and margin are visible at a useful cadence, and whether the owner trusts what they are looking at. When the numbers feel like a mystery, decisions slow down or get made on instinct alone.",
      },
      { type: "h2", text: "5. Owner independence" },
      {
        type: "p",
        text:
          "Whether the business can keep moving when the owner is not in the room. Owner independence is the gear that quietly tells the truth about everything else. If the business stalls every time the owner steps away, one of the other four gears is being held together by them personally.",
      },
      {
        type: "callout",
        text:
          "A stable business should be able to keep moving even when the owner steps away.",
      },
      { type: "h2", text: "How the gears interact" },
      {
        type: "p",
        text:
          "Slips do not stay where they start. A weak demand gear pushes pressure into conversion, because every lead suddenly has to close. A weak conversion gear pushes pressure into operations, because the work that does close has to be over-delivered to keep the relationship. A weak operations gear pushes pressure into the owner. That is the loop most owner-led businesses are quietly stuck in.",
      },
      { type: "h2", text: "Where to start" },
      {
        type: "p",
        text:
          "Reading all five gears at once is the point of the Business Stability Scorecard. It is a structured first read, designed to take a few minutes and give an honest picture of which gear is under the most load right now.",
      },
    ],
    primaryCta: "scorecard",
    related: [
      "why-your-business-feels-harder-to-run-than-it-should",
      "what-makes-rgs-different",
    ],
    status: "published",
  },
];

export const blogCategories = Array.from(
  new Set(blogPosts.map((p) => p.category)),
).sort();

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getRelatedPosts(post: BlogPost): BlogPost[] {
  return post.related
    .map((s) => getPostBySlug(s))
    .filter((p): p is BlogPost => Boolean(p));
}

export function getFeaturedPost(): BlogPost {
  return blogPosts[0];
}

export function getNonFeaturedPosts(): BlogPost[] {
  return blogPosts.slice(1);
}