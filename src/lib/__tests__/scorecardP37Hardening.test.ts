import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  PILLARS,
  RUBRIC_VERSION,
  emptyAnswers,
  scoreAnswer,
  scorePillar,
  scoreScorecard,
} from "@/lib/scorecard/rubric";

/**
 * P37 — Natural-language scorecard hardening regression guards.
 *
 * 1. The public scorecard surfaces and the portal Stability Self-Assessment
 *    must not contain numeric self-rating inputs (no sliders, no 1–10 inputs).
 * 2. Scoring must be deterministic and free of any AI/edge calls.
 * 3. Detailed answers must score higher than vague ones, and vague answers
 *    must NOT inflate the score.
 * 4. Contradictory answers must reduce confidence.
 * 5. Evidence (per question) and confidence (per pillar + overall) must be
 *    populated by the rubric and round-trip through `scoreScorecard`.
 */

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Strip `// …` line comments and `/* … */` block comments. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const SCORECARD_FILES = [
  "src/pages/Scorecard.tsx",
  "src/pages/RevenueScorecard.tsx",
  "src/pages/portal/Scorecard.tsx",
  "src/pages/portal/tools/SelfAssessment.tsx",
];

describe("P37 — no numeric self-rating inputs in scorecard surfaces", () => {
  it("no scorecard surface uses a range slider", () => {
    const offenders: string[] = [];
    for (const f of SCORECARD_FILES) {
      const code = stripComments(read(f));
      if (/type\s*=\s*['"\x60]range['"\x60]/.test(code)) offenders.push(f);
      if (/<\s*Slider\b/.test(code)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("no scorecard surface uses a numeric input bound to a 1–10 score", () => {
    const offenders: string[] = [];
    for (const f of SCORECARD_FILES) {
      const code = stripComments(read(f));
      // Catch <input type="number" ... min={1} max={10}> style fields.
      if (
        /type\s*=\s*['"\x60]number['"\x60][^>]*\bmax\s*=\s*\{?\s*10\s*\}?/.test(
          code,
        )
      ) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("rubric questions are typed prompts, not numeric scales", () => {
    for (const p of PILLARS) {
      for (const q of p.questions) {
        expect(q.prompt.length).toBeGreaterThan(20);
        expect(q.prompt).not.toMatch(/\b1\s*[–-]\s*10\b/);
        expect(q.prompt).not.toMatch(/\brate\s+(your|us|the)\b/i);
      }
    }
  });
});

describe("P37 — AI is not used in the scoring path", () => {
  it("scoring module imports nothing AI-related", () => {
    const src = read("src/lib/scorecard/rubric.ts");
    const code = stripComments(src);
    expect(code).not.toMatch(/from\s+["']openai["']/);
    expect(code).not.toMatch(/from\s+["']@google\/generative-ai["']/);
    expect(code).not.toMatch(/anthropic|gemini|gpt-|lovable.*ai/i);
    // No edge-function or network calls allowed in the scoring path.
    expect(code).not.toMatch(/functions\s*\.\s*invoke/);
    expect(code).not.toMatch(/\bfetch\s*\(/);
  });

  it("public scorecard submission never invokes AI / edge functions", () => {
    const code = stripComments(read("src/pages/Scorecard.tsx"));
    expect(code).not.toMatch(/functions\s*\.\s*invoke/);
    expect(code).not.toMatch(/openai|anthropic|gemini|lovable.*ai/i);
  });

  it("portal Self-Assessment never invokes AI / edge functions", () => {
    const code = stripComments(read("src/pages/portal/tools/SelfAssessment.tsx"));
    expect(code).not.toMatch(/functions\s*\.\s*invoke/);
    expect(code).not.toMatch(/openai|anthropic|gemini|lovable.*ai/i);
  });

  it("no file under src/lib/scorecard imports AI sdks or invokes edge functions", () => {
    const offenders: string[] = [];
    const dir = join(root, "src/lib/scorecard");
    for (const f of walk(dir)) {
      const code = stripComments(readFileSync(f, "utf8"));
      if (
        /from\s+["'](openai|@google\/generative-ai|@anthropic-ai\/sdk)["']/.test(
          code,
        ) ||
        /functions\s*\.\s*invoke/.test(code)
      ) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("P37 — scoring is deterministic", () => {
  it("the same answers always produce the same score", () => {
    const answers = emptyAnswers();
    for (const p of PILLARS) {
      for (const q of p.questions) {
        answers[p.id][q.id] =
          "We review weekly in HubSpot, the ops lead owns it, " +
          "we track 22 leads/month with a 31% close rate.";
      }
    }
    const a = scoreScorecard(answers);
    const b = scoreScorecard(answers);
    const c = scoreScorecard(answers);
    expect(a.overall_score_estimate).toBe(b.overall_score_estimate);
    expect(b.overall_score_estimate).toBe(c.overall_score_estimate);
    expect(a.overall_confidence).toBe(b.overall_confidence);
    // Pillar-level scores stable too.
    for (let i = 0; i < a.pillar_results.length; i++) {
      expect(a.pillar_results[i].score).toBe(b.pillar_results[i].score);
      expect(a.pillar_results[i].confidence).toBe(
        b.pillar_results[i].confidence,
      );
    }
  });

  it("rubric version is the natural-language evidence rubric", () => {
    expect(RUBRIC_VERSION).toBe("v2_natural_language_evidence");
  });
});

describe("P37 — evidence quality logic", () => {
  function fillAll(text: string) {
    const a = emptyAnswers();
    for (const p of PILLARS) for (const q of p.questions) a[p.id][q.id] = text;
    return a;
  }

  const DETAILED =
    "We review revenue every Monday in QuickBooks and HubSpot. " +
    "The ops manager owns it. We track 22 leads/month at a 31% close rate, " +
    "average deal $12,000, and job margin weekly. Step 1 we qualify, " +
    "then send a templated proposal, then run a follow-up cadence. " +
    "QuickBooks is reconciled monthly by our bookkeeper.";

  const VAGUE = "We kind of track things and try to stay on top of it.";

  it("detailed answers score higher than vague ones", () => {
    const detailed = scoreScorecard(fillAll(DETAILED));
    const vague = scoreScorecard(fillAll(VAGUE));
    expect(detailed.overall_score_estimate).toBeGreaterThan(
      vague.overall_score_estimate,
    );
  });

  it("vague answers do not produce high confidence or a high band", () => {
    const vague = scoreScorecard(fillAll(VAGUE));
    expect(vague.overall_confidence).not.toBe("high");
    expect(vague.overall_band).toBeLessThanOrEqual(3);
  });

  it("contradictory but detailed answers reduce confidence below high", () => {
    const contradictory =
      "We track everything carefully and review every metric weekly. " +
      "Honestly though there are no reports, no dashboard, no KPIs. " +
      "Everything depends on me — I do it all manually from memory. " +
      "We don't track lead sources and we don't measure margin.";
    const r = scoreScorecard(fillAll(contradictory));
    expect(r.overall_confidence).not.toBe("high");
  });

  it("a single answer's evidence is low for empty input and >= medium for detailed input", () => {
    const q = PILLARS[0].questions[0];
    expect(scoreAnswer(q, "").evidence).toBe("low");
    const sig = scoreAnswer(q, DETAILED);
    expect(["medium", "high"]).toContain(sig.evidence);
  });
});

describe("P37 — evidence + confidence fields are populated and stored", () => {
  it("every per-question signal carries an evidence_level field", () => {
    const answers = emptyAnswers();
    for (const p of PILLARS) for (const q of p.questions) answers[p.id][q.id] = "Owner does it all from memory.";
    const r = scoreScorecard(answers);
    for (const pr of r.pillar_results) {
      expect(pr.confidence).toMatch(/^(low|medium|high)$/);
      for (const s of pr.signals) {
        expect(s.evidence).toMatch(/^(low|medium|high)$/);
        expect(typeof s.word_count).toBe("number");
        expect(typeof s.contradictory_hits).toBe("number");
      }
    }
    expect(r.overall_confidence).toMatch(/^(low|medium|high)$/);
  });

  it("scoreScorecard output round-trips through JSON (DB-safe shape)", () => {
    const answers = emptyAnswers();
    for (const p of PILLARS) for (const q of p.questions) answers[p.id][q.id] = "Reviewed weekly in QuickBooks.";
    const r = scoreScorecard(answers);
    const round = JSON.parse(JSON.stringify(r));
    expect(round.pillar_results[0].confidence).toBe(
      r.pillar_results[0].confidence,
    );
    expect(round.pillar_results[0].signals[0].evidence).toBe(
      r.pillar_results[0].signals[0].evidence,
    );
  });

  it("the public scorecard submission persists pillar_results and overall_confidence", () => {
    const code = stripComments(read("src/pages/Scorecard.tsx"));
    expect(code).toMatch(/pillar_results:\s*computed\.pillar_results/);
    expect(code).toMatch(/overall_confidence:\s*computed\.overall_confidence/);
    expect(code).toMatch(
      /\.from\(\s*["'\x60]scorecard_runs["'\x60]\s*\)\s*\.insert/,
    );
  });
});

describe("P37 — pillar score is monotone in answer quality", () => {
  it("scorePillar(detailed) >= scorePillar(vague) for each pillar", () => {
    for (const p of PILLARS) {
      const detailedAnswers: Record<string, string> = {};
      const vagueAnswers: Record<string, string> = {};
      for (const q of p.questions) {
        detailedAnswers[q.id] =
          "Reviewed every Monday in HubSpot and QuickBooks; the ops lead owns it; " +
          "we track 22 leads/month at 31% close rate.";
        vagueAnswers[q.id] = "Sometimes. Kind of. Depends.";
      }
      const detailed = scorePillar(p, detailedAnswers);
      const vague = scorePillar(p, vagueAnswers);
      expect(detailed.score).toBeGreaterThanOrEqual(vague.score);
      // And the vague version must not be reported as high confidence.
      expect(vague.confidence).not.toBe("high");
    }
  });
});

// Make sure the scorecard test directory is real (helps catch path drift).
it("scorecard surface files exist", () => {
  for (const f of SCORECARD_FILES) {
    expect(statSync(join(root, f)).isFile()).toBe(true);
  }
});