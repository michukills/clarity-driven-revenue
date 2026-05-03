import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * P36 — Legal / Scope / Expectation Language Pass
 *
 * Sitewide guard against:
 *  - guaranteed outcome / revenue claims
 *  - legal / tax / accounting / financial advice claims
 *  - fake testimonials / case studies / fabricated proof
 *  - "done for you" / "we run your business" overpromises
 *  - implied partnership / endorsement with third-party brands
 *  - instant-portal-access claims
 *  - missing legal links + intake disclaimers
 */

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(join(root, dir))) {
    if (name === "__tests__" || name.startsWith(".")) continue;
    const rel = `${dir}/${name}`;
    const st = statSync(join(root, rel));
    if (st.isDirectory()) walk(rel, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(rel);
  }
  return acc;
}

const PUBLIC_DIRS = ["src/pages", "src/components"];
const PUBLIC_FILES = PUBLIC_DIRS.flatMap((d) => walk(d)).filter(
  (f) =>
    !f.startsWith("src/pages/admin/") &&
    !f.startsWith("src/components/admin/") &&
    !f.includes("/__tests__/"),
);

/**
 * Strip JS/JSX comments and elide any line whose own text — or the 8
 * lines of context above it — establishes negation. The forbidden-language
 * guards below are meant to catch *positive* claims; bullet items inside
 * arrays/sections like `doesNotDo`, `badFitItems`, `whatThisIsNot`, or any
 * sentence with "not", "doesn't", "isn't", etc. should not trip them.
 */
function stripCommentsAndGuardLiterals(src: string): string {
  const cleaned = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const lines = cleaned.split("\n");
  const NEGATION =
    /\b(not|no\b|never|cannot|can'?t|don'?t|does\s*not|doesn'?t|isn'?t|aren'?t|won'?t|without|avoid|replace|stop|prevent)\b/i;
  const NEGATED_CONTEXT =
    /doesNotDo|does_not_do|notFor|not_for|badFit|bad_fit|whatThisIsNot|notDoing|whoThisIsNotFor|disqualif|excluded?|disclaim/i;
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ctx = lines.slice(Math.max(0, i - 8), i + 1).join("\n");
    if (NEGATION.test(line) || NEGATED_CONTEXT.test(ctx)) continue;
    out.push(line);
  }
  return out.join("\n");
}

describe("P36 — guarantee / advice / proof language is absent from public surfaces", () => {
  const FORBIDDEN: Array<[string, RegExp]> = [
    ["guaranteed revenue", /guaranteed?\s+(revenue|results?|roi|growth|outcomes?)/i],
    ["promise of outcome", /\bwe\s+promise\b|\bpromised?\s+results?\b/i],
    ["risk-free / money-back", /risk[-\s]?free|money[-\s]?back/i],
    ["10x / double / triple / skyrocket", /\b(10x|2x your|double your|triple your|skyrocket|dominate your)\b/i],
    ["legal/tax/financial advice claim", /\b(we\s+(provide|offer|give))\s+(legal|tax|accounting|financial)\s+advice/i],
    ["certified pro claim", /\b(certified|licensed)\s+(financial|legal|tax|accounting)\s+(advisor|professional|expert)\b/i],
    ["partnership claim", /\b(official\s+partner|partnered\s+with|endorsed\s+by)\s+(QuickBooks|Xero|Stripe|Square|HubSpot|Salesforce|Google)/i],
    ["we run your business", /\bwe\s+(run|operate|manage)\s+your\s+business\b/i],
    ["done-for-you execution promise", /\bdone[-\s]for[-\s]you\s+(execution|implementation|growth)/i],
    ["instant unlock", /\b(instant(ly)?|immediately)\s+unlock(s|ed)?\s+(all|every)\b/i],
  ];

  for (const file of PUBLIC_FILES) {
    const src = stripCommentsAndGuardLiterals(read(file));
    for (const [label, re] of FORBIDDEN) {
      it(`${file} — does not contain ${label}`, () => {
        expect(re.test(src), `${file} matched ${label}`).toBe(false);
      });
    }
  }
});

describe("P36 — legal pages and links exist", () => {
  it("Privacy and EULA pages exist and are flagged as draft / for legal review", () => {
    const privacy = read("src/pages/Privacy.tsx");
    const eula = read("src/pages/Eula.tsx");
    expect(privacy).toMatch(/legal review|attorney|qualified legal counsel/i);
    expect(eula).toMatch(/legal review|attorney|qualified legal counsel/i);
  });

  it("Footer surfaces both legal links and the not-financial-advice disclaimer", () => {
    const footer = read("src/components/Footer.tsx");
    expect(footer).toMatch(/\/eula/);
    expect(footer).toMatch(/\/privacy/);
    expect(footer).toMatch(/not\s+financial,?\s+legal,?\s+or\s+tax\s+advice/i);
    expect(footer).toMatch(/not\s+affiliated\s+with,\s+endorsed\s+by/i);
  });

  it("Auth and ClaimInvite link to legal pages and state the no-advice / no-guarantee disclaimer", () => {
    for (const f of ["src/pages/portal/Auth.tsx", "src/pages/ClaimInvite.tsx"]) {
      const src = read(f);
      expect(src, `${f} must link to /eula`).toMatch(/to=["']\/eula["']/);
      expect(src, `${f} must link to /privacy`).toMatch(/to=["']\/privacy["']/);
      expect(src).toMatch(/does not guarantee/i);
      expect(src).toMatch(/legal,\s+tax,\s+accounting,?\s+or\s+financial\s+advice/i);
    }
  });

  it("DiagnosticApply intake retains acknowledgement copy (no-guarantee + one-primary-scope)", () => {
    const src = read("src/pages/DiagnosticApply.tsx");
    expect(src).toMatch(/does not guarantee/i);
    expect(src).toMatch(/legal,\s+tax,\s+accounting,?\s+or\s+financial\s+advice/i);
    expect(src).toMatch(/ack_no_guarantee/);
    expect(src).toMatch(/ack_one_primary_scope/);
  });

  it("DiagnosticOffer states scope, no-guarantee, and that implementation is separate", () => {
    const src = read("src/pages/DiagnosticOffer.tsx");
    expect(src).toMatch(/Not legal,\s+tax,\s+accounting,?\s+or\s+financial\s+advice/i);
    expect(src).toMatch(/Not a guarantee/i);
    expect(src).toMatch(/implementation is a separate/i);
    expect(src).toMatch(/one primary product,\s+service,?\s+or\s+revenue path/i);
  });

  it("Implementation and RCS pages keep the not-a-guarantee + not-a-substitute language", () => {
    const impl = read("src/pages/Implementation.tsx");
    const rcs = read("src/pages/RevenueControlSystem.tsx");
    expect(impl).toMatch(/does not guarantee revenue or business outcomes/i);
    expect(rcs).toMatch(/does not guarantee/i);
    expect(rcs).toMatch(/Replace legal,\s+tax,\s+accounting/i);
  });
});

describe("P36 — no fabricated client proof on public surfaces", () => {
  it("public pages do not include testimonial/case-study/quoted-client-name blocks", () => {
    for (const f of PUBLIC_FILES) {
      const src = stripCommentsAndGuardLiterals(read(f));
      expect(/<blockquote[\s>]/i.test(src), `${f} contains <blockquote>`).toBe(false);
      expect(/\btestimonial(s)?\b/i.test(src), `${f} mentions testimonial`).toBe(false);
      expect(/\bcase\s+study\b/i.test(src), `${f} mentions case study`).toBe(false);
    }
  });
});

describe("P36 — invite-only flow remains intact", () => {
  it("Auth still tells users portal accounts are issued by RGS, not self-served", () => {
    const src = read("src/pages/portal/Auth.tsx");
    expect(src).toMatch(/Portal accounts are created by RGS/);
  });
});