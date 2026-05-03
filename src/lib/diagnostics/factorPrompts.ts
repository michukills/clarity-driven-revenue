/**
 * P41.4C — Diagnostic factor prompt registry.
 *
 * Every diagnostic factor card (client and admin) renders three pieces of
 * copy from this map:
 *
 *   1. `question`    — one clear, plain-English question that tells the
 *                      user exactly what we want them to describe.
 *   2. `helper`      — what a strong answer looks like; describes the
 *                      kind of detail that makes the answer useful
 *                      WITHOUT sounding like an internal audit note.
 *   3. `placeholder` — textarea placeholder guiding specificity.
 *
 * Rules enforced by `clientFacingFactorPromptClarityContract.test.ts`:
 *   - No fragment prompts (must end with "?").
 *   - No banned phrases like "Mention Look for…" or
 *     "Describe what is actually happening" used as the only question.
 *   - Helper + placeholder must exist and be metric-specific.
 *   - Same prompt copy is used for both client and admin so wording stays
 *     plain English on every surface.
 */

export interface FactorPrompt {
  question: string;
  helper: string;
  placeholder: string;
}

const PROMPTS: Record<string, FactorPrompt> = {
  // ── Scorecard: Demand ───────────────────────────────────────────────
  channel_predictability: {
    question: "Which channels reliably bring in leads each month, and how predictable are they?",
    helper: "Describe where leads actually come from today, how steady that flow is, and whether it depends on the owner pushing it.",
    placeholder: "Explain which channels produce leads, how consistent they are month to month, and one recent example.",
  },
  lead_volume_stability: {
    question: "How steady is your lead volume from month to month?",
    helper: "Describe whether lead count is roughly the same each month or swings up and down, and what causes the swings if you know.",
    placeholder: "Explain how much your monthly lead count varies and any pattern you notice.",
  },
  lead_quality_fit: {
    question: "How often do incoming leads actually match the customer you want to serve?",
    helper: "Describe what share of leads are a good fit, what the bad-fit leads usually look like, and where they tend to come from.",
    placeholder: "Explain how well your incoming leads match your ideal customer, and where the bad-fit ones come from.",
  },
  demand_documentation: {
    question: "Is there a written record of where your leads come from and what triggers them to reach out?",
    helper: "Describe whether lead sources are tracked anywhere, who maintains it, and how reliable that record is.",
    placeholder: "Explain how lead sources are recorded today (or whether they are not), and where that record lives.",
  },
  founder_dependency: {
    question: "How much of your new revenue still depends on the owner's personal effort or network?",
    helper: "Describe what would happen to lead flow if the owner stepped back for 30 days, and which deals only happen because of the owner.",
    placeholder: "Explain how much new business depends on the owner being personally involved, with a recent example if possible.",
  },

  // ── Scorecard: Conversion ───────────────────────────────────────────
  pipeline_visibility: {
    question: "Can you see every active lead or sales opportunity and its current stage in one place within one minute?",
    helper: "Describe where this information lives, who updates it, and how reliable it is day to day.",
    placeholder: "Explain how active leads or deals are tracked today, where that record lives, and whether it stays current.",
  },
  stage_dropoff: {
    question: "Do you know where leads most often stall, disappear, or fail to move forward?",
    helper: "Describe whether you can see the stages where momentum is lost and how you currently identify those drop-off points.",
    placeholder: "Explain where leads typically slow down or stop moving, and how clearly that is tracked today.",
  },
  follow_up_discipline: {
    question: "What happens after a lead does not buy or respond the first time?",
    helper: "Describe the normal follow-up process, including timing, responsibility, and whether the process is consistent.",
    placeholder: "Explain what happens after first contact if the lead does not buy or respond, including who follows up and when.",
  },
  close_conversation: {
    question: "Is there a consistent way the business asks for the sale or moves the customer to a decision?",
    helper: "Describe how closing conversations usually happen, whether there is a repeatable structure, and where deals tend to get stuck.",
    placeholder: "Explain how the business typically asks for the next step, handles objections, and moves the buyer toward a decision.",
  },
  win_rate_stability: {
    question: "How steady is your close rate from month to month, and do you know when it shifts?",
    helper: "Describe how you currently track wins vs. losses and whether the rate stays in a known range or swings unpredictably.",
    placeholder: "Explain what your typical win rate looks like, how you measure it, and any recent shifts you have noticed.",
  },

  // ── Scorecard / Revenue Leak: Operations ────────────────────────────
  process_documentation: {
    question: "Are your most important recurring workflows written down somewhere a new person could follow?",
    helper: "Describe which workflows are documented, where the documentation lives, and which ones still live only in someone's head.",
    placeholder: "Explain which recurring processes are written down, where they live, and which ones are not.",
  },
  hand_offs: {
    question: "When work moves from one person to another, does anything important typically get lost or repeated?",
    helper: "Describe a recent hand-off that went well or poorly, who was involved, and what information had to be re-asked.",
    placeholder: "Explain how work transfers between people today and where context tends to get dropped.",
  },
  rework: {
    question: "How often does your team have to redo the same kind of work because of an error or missing information?",
    helper: "Describe the kinds of rework that happen most often, who catches it, and roughly how frequent it is.",
    placeholder: "Explain what kinds of rework happen most, how often, and what usually causes them.",
  },
  scheduling: {
    question: "Does the team's calendar reflect the highest-priority work, or mostly whatever came in last?",
    helper: "Describe how work gets scheduled today, who decides priority, and how often urgent inbound bumps planned work.",
    placeholder: "Explain how scheduling is decided today and whether priorities or inbound requests usually win.",
  },
  capacity: {
    question: "If your volume jumped 20% next month, could the business absorb it without breaking?",
    helper: "Describe where the bottleneck would show up first — people, time, tools, or process — and how you know.",
    placeholder: "Explain what would happen if demand jumped 20% next month, and where things would break first.",
  },

  // ── Scorecard: Financial visibility ─────────────────────────────────
  revenue_by_offer: {
    question: "Can you see how much revenue each offer or service produces without doing manual math?",
    helper: "Describe where this data lives, how often it is updated, and how confident you are in the numbers.",
    placeholder: "Explain how you would look up revenue per offer today, where it lives, and how trustworthy it is.",
  },
  profit_per_job: {
    question: "Do you know which jobs or clients actually make money after costs, and which quietly lose money?",
    helper: "Describe how profit per job is calculated today, who tracks it, and one recent example if possible.",
    placeholder: "Explain how you currently know whether a job was profitable, including a recent example.",
  },
  cash_flow: {
    question: "Can you see your cash position and what is coming in and out over the next few weeks?",
    helper: "Describe how cash is tracked today, how often it is reviewed, and how confident you are in the numbers.",
    placeholder: "Explain how cash flow is tracked, where the numbers live, and how often you actually look.",
  },
  forecast: {
    question: "Can you produce a realistic 60–90 day revenue outlook from your current pipeline?",
    helper: "Describe whether a forecast exists today, what it is based on, and how often it has been wrong.",
    placeholder: "Explain how you forecast revenue today (or whether you do not), and how reliable it has been.",
  },
  attribution: {
    question: "When a deal closes, can you trace it back to where the lead originally came from?",
    helper: "Describe how source is captured, who records it, and how reliable that link between deal and source is.",
    placeholder: "Explain how you connect a closed deal back to its lead source today.",
  },

  // ── Scorecard: Independence ─────────────────────────────────────────
  owner_in_sales: {
    question: "Can deals close without the owner being directly involved in the sales conversation?",
    helper: "Describe which deals can close without the owner, which cannot, and what blocks others from running the close.",
    placeholder: "Explain which sales the owner must run personally and which the team handles end-to-end.",
  },
  owner_in_delivery: {
    question: "Can delivery happen without the owner approving or stepping into the work?",
    helper: "Describe what parts of delivery still require the owner, and what the team can run on its own.",
    placeholder: "Explain which delivery decisions still need the owner and which the team can handle alone.",
  },
  delegation: {
    question: "What real responsibilities — not just tasks — has the owner actually handed off to other people?",
    helper: "Describe what has been delegated, who owns it now, and whether the owner still has to step back in.",
    placeholder: "Explain what responsibilities the owner has handed off, to whom, and how that is going.",
  },
  documented_decisions: {
    question: "When a key decision gets made, is it written down so the team can repeat it without asking the owner?",
    helper: "Describe how decisions are recorded today, where that lives, and what happens when no one remembers the original choice.",
    placeholder: "Explain how key decisions are captured today and what happens when the owner is not available.",
  },
  founder_capacity: {
    question: "How much of the owner's week is currently spent on strategic work vs. running the day to day?",
    helper: "Describe a typical week, what consumes most of the owner's time, and how much room is left for planning.",
    placeholder: "Explain how the owner's typical week breaks down between day-to-day work and strategic work.",
  },

  // ── Revenue Leak: Market / Demand ───────────────────────────────────
  positioning_clarity: {
    question: "Can a new customer quickly understand what you sell, who it is for, and why it matters?",
    helper: "Describe how your business explains its value today. Mention what customers usually see first, whether the message is consistent, and where confusion tends to happen.",
    placeholder: "Explain what a customer would see or hear first, how clearly the offer is explained, and any examples of confusion or misunderstanding.",
  },
  audience_fit: {
    question: "Who is the best-fit customer for this offer, and how clearly is that defined in the business today?",
    helper: "Describe who the offer is really for, how you know, and whether your team consistently aims at that customer.",
    placeholder: "Explain who your best customer is, how you identify them, and whether that definition is documented or mostly informal.",
  },
  offer_clarity: {
    question: "Is it clear to a customer what they are buying, what is included, and what happens next?",
    helper: "Describe how the offer is presented today. Mention what is included, what customers often ask about, and where confusion happens if it does.",
    placeholder: "Explain how the offer is presented, what is included, and any areas where customers seem uncertain.",
  },
  trust_signals: {
    question: "What proof or credibility does a customer see before deciding to buy?",
    helper: "Include reviews, testimonials, examples of work, guarantees, credentials, word-of-mouth, or anything else buyers rely on to trust you.",
    placeholder: "Describe what a buyer sees that helps them trust the business before purchasing.",
  },
  lead_source_quality: {
    question: "Where do your best leads come from today, and how reliable is that source?",
    helper: "Describe which sources produce the best-fit leads, how steady they are, and what would happen if one stopped tomorrow.",
    placeholder: "Explain which lead sources produce your best customers and how dependable each one is.",
  },

  // ── Revenue Leak: Lead Capture ──────────────────────────────────────
  missed_inquiries: {
    question: "How often do inbound inquiries go unanswered or fall through the cracks?",
    helper: "Describe how inquiries arrive, who is responsible for catching them, and any examples where one was missed.",
    placeholder: "Explain how inbound inquiries are received and any cases where one was missed or answered late.",
  },
  response_speed: {
    question: "How quickly does a new lead actually hear back from someone in the business?",
    helper: "Describe the typical response time, who handles it first, and whether evenings or weekends change that.",
    placeholder: "Explain how fast a new lead usually gets a response and who is responsible for replying.",
  },
  intake_process: {
    question: "What happens between a lead reaching out and someone actually working their request?",
    helper: "Describe the steps a lead goes through after first contact, who owns each step, and where it slows down.",
    placeholder: "Explain the steps a new lead goes through after they reach out, and who handles each one.",
  },
  follow_up_process: {
    question: "When a lead does not respond or does not buy right away, what happens next?",
    helper: "Describe the normal follow-up pattern, who is responsible, and whether it actually happens consistently.",
    placeholder: "Explain how follow-up works today, including timing and who is responsible.",
  },
  lead_tracking: {
    question: "Where is every active lead recorded, and how confident are you that the list is current?",
    helper: "Describe where leads live (CRM, spreadsheet, notes), who updates it, and how often it falls out of date.",
    placeholder: "Explain where leads are tracked today, who updates that record, and how reliable it is.",
  },

  // ── Revenue Leak: Sales / Conversion ────────────────────────────────
  close_rate: {
    question: "Of the qualified opportunities you talk to, roughly what share end up buying?",
    helper: "Describe how you measure close rate today, how steady it is, and whether some sources or sellers convert better.",
    placeholder: "Explain what your typical close rate looks like and how you know.",
  },
  proposal_process: {
    question: "How are proposals or quotes built and sent today, and how consistent is that process?",
    helper: "Describe who builds the proposal, how long it takes, and whether the format and pricing are consistent.",
    placeholder: "Explain how proposals or quotes are produced today, including timing and consistency.",
  },
  quote_follow_up: {
    question: "After a quote or proposal goes out, what happens if the buyer does not respond?",
    helper: "Describe the normal follow-up after a quote, who handles it, and how often quotes simply go cold.",
    placeholder: "Explain what happens after a quote is sent if the buyer goes quiet.",
  },
  objection_handling: {
    question: "What objections do buyers raise most often, and how does the business respond to them?",
    helper: "Describe the most common objections, who handles them, and whether responses are consistent across the team.",
    placeholder: "Explain the objections you hear most often and how the business usually responds.",
  },
  value_communication: {
    question: "How clearly does the sales conversation explain the value of what the customer is buying?",
    helper: "Describe how value is framed today, whether price or value comes up first, and where buyers seem to push back.",
    placeholder: "Explain how value is communicated in sales conversations and where buyers tend to push back.",
  },

  // ── Revenue Leak: Pricing / Margin ──────────────────────────────────
  underpricing: {
    question: "How were your current prices set, and have they been re-anchored to today's costs and value?",
    helper: "Describe when prices were last reviewed, what they were based on, and whether you suspect any are too low.",
    placeholder: "Explain how your prices were set, when they were last updated, and where you suspect underpricing.",
  },
  discounting: {
    question: "How often are discounts given, and what usually triggers them?",
    helper: "Describe who can grant a discount, how often it happens, and the typical reason.",
    placeholder: "Explain how often discounts are given, who approves them, and what usually causes them.",
  },
  low_margin_services: {
    question: "Which services or offers do you suspect are barely breaking even or losing money?",
    helper: "Describe which offers feel low-margin, why, and whether anyone has actually checked the numbers.",
    placeholder: "Explain which offers you suspect are low-margin and why.",
  },
  package_structure: {
    question: "How are your offers packaged today, and is it clear what each package includes and excludes?",
    helper: "Describe the current packages, whether they are documented, and where customers get confused about what is included.",
    placeholder: "Explain how offers are packaged today and where the boundaries get fuzzy.",
  },
  complexity_charged: {
    question: "When a job turns out to be more complex than expected, does the price actually reflect that?",
    helper: "Describe how scope changes are handled, whether change orders are used, and how often extra work goes unbilled.",
    placeholder: "Explain what happens when a job grows beyond the original scope and whether the price adjusts.",
  },

  // ── Revenue Leak: Operations / Delivery ─────────────────────────────
  missed_deadlines: {
    question: "How often does work miss its promised deadline, and what usually causes it?",
    helper: "Describe how often deadlines slip, what kinds of work are most affected, and what the customer usually sees when it happens.",
    placeholder: "Explain how often deadlines slip and what tends to cause it.",
  },
  handoffs: {
    question: "When work moves from sales to delivery (or between delivery teams), does anything important get dropped?",
    helper: "Describe how that hand-off works today, what information transfers, and where it tends to break.",
    placeholder: "Explain how the hand-off from sales to delivery works and where context gets lost.",
  },
  capacity_bottlenecks: {
    question: "Where does work most often pile up or wait — which person, role, or step?",
    helper: "Describe the bottleneck that slows the most work, why it exists, and whether it can be relieved.",
    placeholder: "Explain where work tends to pile up today and who or what is the bottleneck.",
  },

  // ── Revenue Leak: Customer Retention ────────────────────────────────
  repeat_system: {
    question: "Is there a deliberate system that brings past customers back, or does repeat business mostly just happen?",
    helper: "Describe what happens after a customer's first purchase, who reaches back out, and whether it is systematic.",
    placeholder: "Explain how repeat business is generated today and whether anyone is actively driving it.",
  },
  check_in_cadence: {
    question: "Does someone check in with past customers on a regular cadence, or only when there is a reason to?",
    helper: "Describe the current check-in cadence, who owns it, and whether it actually happens.",
    placeholder: "Explain whether past customers are checked in on regularly and who is responsible.",
  },
  post_sale_comms: {
    question: "After a sale closes, what does the customer hear from you and on what schedule?",
    helper: "Describe the post-sale communication, who sends it, and whether it is automated, manual, or non-existent.",
    placeholder: "Explain what communication a customer gets after they buy, and on what cadence.",
  },
  referral_process: {
    question: "How do referrals actually happen today — by accident or by design?",
    helper: "Describe whether you ask for referrals, when, and how reliable that process is.",
    placeholder: "Explain how referrals come in today and whether anyone actively asks for them.",
  },
  lifecycle_visibility: {
    question: "Can you see, for any past customer, when they last bought and what they are likely to need next?",
    helper: "Describe where customer history lives, how easy it is to look up, and whether next-best-action is obvious.",
    placeholder: "Explain how easy it is to see a customer's history and figure out what they likely need next.",
  },

  // ── Revenue Leak: Financial Visibility ──────────────────────────────
  pipeline_forecast: {
    question: "Can you produce a realistic 60–90 day revenue outlook from your current pipeline?",
    helper: "Describe whether a forecast exists today, what it is based on, and how often it has been wrong.",
    placeholder: "Explain how you forecast revenue today (or whether you do not), and how reliable it has been.",
  },

  // ── Revenue Leak: Owner Dependency ──────────────────────────────────
  owner_sales: {
    question: "Can deals close without the owner being directly involved in the sales conversation?",
    helper: "Describe which deals can close without the owner, which cannot, and what blocks others from running the close.",
    placeholder: "Explain which sales the owner must run personally and which the team handles end-to-end.",
  },
  owner_delivery: {
    question: "Can delivery decisions be made without the owner stepping in?",
    helper: "Describe which delivery decisions still require the owner and which the team makes confidently on their own.",
    placeholder: "Explain which delivery decisions still require the owner and which the team handles alone.",
  },
  documented_process: {
    question: "Are your most important processes documented well enough that someone new could follow them?",
    helper: "Describe what is documented today, where it lives, and what still lives only in someone's head.",
    placeholder: "Explain what is documented today, where it lives, and what only exists in someone's head.",
  },

  // ── Persona Fit ─────────────────────────────────────────────────────
  urgency: {
    question: "How urgent is this problem for the buyer right now, and what triggered them to act?",
    helper: "Describe what is happening in their business that makes this matter today vs. someday.",
    placeholder: "Explain how acute the pain feels for the buyer today and what triggered them to look for help.",
  },
  budget: {
    question: "Can the buyer realistically fund this engagement without straining their cash position?",
    helper: "Describe what you know about their budget, how they typically buy, and any signs of cash pressure.",
    placeholder: "Explain whether the buyer can fund this without strain, and how you know.",
  },
  authority: {
    question: "Can this contact actually say yes on their own, or does the decision require others?",
    helper: "Describe who is involved in the decision, who signs, and how decisions usually get made there.",
    placeholder: "Explain who can say yes on their own and who else is involved in the decision.",
  },
  self_aware: {
    question: "Does the buyer already know they have this problem, or will sales have to teach them?",
    helper: "Describe how aware the buyer is of the problem and how they currently describe it.",
    placeholder: "Explain how clearly the buyer understands the problem before the sales conversation.",
  },
  coachable: {
    question: "How open is the buyer to being challenged and changing how they currently work?",
    helper: "Describe how they react to pushback, whether they have changed before, and any examples either way.",
    placeholder: "Explain how open the buyer is to changing how they work, with an example if possible.",
  },
};

/**
 * Build a clean, plain-English prompt for any factor. Falls back to a
 * label-derived question so a missing key never produces broken
 * "Mention Look for…" copy.
 */
export function getFactorPrompt(
  key: string,
  label: string,
): FactorPrompt {
  const explicit = PROMPTS[key];
  if (explicit) return explicit;
  const subject = label.trim().replace(/\.$/, "").toLowerCase();
  return {
    question: `How does ${subject} actually work in your business today?`,
    helper:
      "Include where this lives, who owns it, how it currently works, and one recent example if possible.",
    placeholder:
      "Describe the current reality, not the ideal process. \"I don't know\" is a valid answer.",
  };
}

export const FACTOR_PROMPT_KEYS = Object.keys(PROMPTS);