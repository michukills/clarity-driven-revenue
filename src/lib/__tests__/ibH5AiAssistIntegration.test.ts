/**
 * IB-H5 — Admin-Reviewed AI Assist Integration contract tests.
 *
 * Verifies:
 *  - The shared edge utility produces a prompt block containing the
 *    deterministic-score guarantee, banned claims, and the structured
 *    signal/candidate/benchmark/glossary lists.
 *  - Cannabis/MMJ industries trigger operational-visibility framing
 *    and never inject HIPAA/clinical/patient-care language.
 *  - `isAdminOnlyAiOutput` correctly enforces admin-only metadata.
 *  - Both `report-ai-assist` and `diagnostic-ai-followup` import the
 *    shared utility and inject the prompt block into the user message.
 *  - The shared utility is never imported from `src/` (no frontend AI
 *    secret/gateway leakage), and deterministic scoring files do not
 *    import it either.
 *  - Report AI assist forces admin-only output (`client_safe: false`).
 *  - $1,000/month pricing remains in the plan doc.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

// The shared edge file uses a Deno-style absolute import nowhere; it's
// pure TS. We import it with a relative path so vitest can compile it.
import {
  buildIndustryEvidenceContext,
  isAdminOnlyAiOutput,
} from "../../../supabase/functions/_shared/industry-evidence-context";

const root = process.cwd();
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

const REPORT_AI_SRC = read("supabase/functions/report-ai-assist/index.ts");
const DIAG_AI_SRC = read("supabase/functions/diagnostic-ai-followup/index.ts");
const SHARED_SRC = read(
  "supabase/functions/_shared/industry-evidence-context.ts",
);
const PLAN_DOC = read(
  "docs/industry-brain-gear-metrics-hardening-plan.md",
);

describe("IB-H5 — context builder content", () => {
  const result = buildIndustryEvidenceContext({
    customerId: "cust_test",
    reportDraftId: "draft_test",
    industryKey: "trades_services",
    industryLabel: "Trades / Home Services",
    signals: [
      {
        gear: "demand",
        metricKey: "cpql",
        questionKey: "odi.cpql",
        answerState: "unknown",
        signalType: "visibility_weakness",
        severity: "high",
        clientSafeSummary: "CPQL not currently tracked.",
        clarificationQuestion: "Where is qualified-lead spend tracked today?",
        adminOnlyNotes: "ADMIN_HYPOTHESIS_X",
      },
      {
        gear: "independence",
        metricKey: "vacation_test",
        questionKey: "odi.vacation_test",
        answerState: "no",
        signalType: "critical_gap",
        severity: "critical",
        reportFindingSeed: "Owner cannot leave for two weeks.",
      },
    ],
    repairCandidates: [
      {
        gear: "demand",
        metricKey: "cpql",
        title: "Establish visibility for CPQL",
        severity: "high",
        belongsTo: "diagnostic_clarification",
      },
    ],
    benchmarkAnchors: [
      {
        industryKey: "trades_services",
        gear: "demand",
        metricKey: "cpql",
        label: "$50–$150 per qualified lead",
        needsExternalVerification: true,
      },
    ],
    glossaryTerms: [{ term: "CPQL", definition: "Cost per qualified lead" }],
  });

  it("includes deterministic-score guarantee + banned claims", () => {
    expect(result.promptBlock).toMatch(/0–1000 RGS Stability Score is fixed/);
    expect(result.promptBlock).toMatch(/Banned claims:/);
    expect(result.promptBlock).toMatch(/admin-only.*client-safe/i);
  });

  it("lists signals/candidates/anchors/glossary with safety markers", () => {
    expect(result.promptBlock).toMatch(/Visibility weaknesses/);
    expect(result.promptBlock).toMatch(/Critical gaps/);
    expect(result.promptBlock).toMatch(/Repair-map candidates/);
    expect(result.promptBlock).toMatch(/NEEDS_EXTERNAL_VERIFICATION/);
    expect(result.promptBlock).toMatch(/CPQL: Cost per qualified lead/);
  });

  it("admin-only notes are not silently merged into a client-safe section", () => {
    // Admin notes may appear in the admin-context block, but the block
    // never claims them client-safe; the AI is told to keep them admin-only.
    expect(result.promptBlock).toMatch(
      /admin_only_notes MUST stay on the admin_only_notes field/,
    );
  });

  it("structured summary records signal/candidate counts and safety flags", () => {
    expect(result.structured.signalCount).toBe(2);
    expect(result.structured.repairCandidateCount).toBe(1);
    expect(result.structured.safetyFlags).toContain(
      "benchmarks_interpretive_only",
    );
    expect(result.structured.safetyFlags).toContain("critical_gap_present");
  });
});

describe("IB-H5 — cannabis/MMJ framing", () => {
  const result = buildIndustryEvidenceContext({
    customerId: "cust_canna",
    industryKey: "mmj_cannabis",
    industryLabel: "Cannabis / MMJ",
    signals: [],
  });
  it("forces operational-visibility framing", () => {
    expect(result.promptBlock).toMatch(/Cannabis \/ MMJ \/ MMC framing/);
    expect(result.promptBlock).toMatch(/Operational visibility/);
    expect(result.promptBlock).toMatch(/NOT healthcare/);
    expect(result.promptBlock).toMatch(/NOT HIPAA/);
    expect(result.promptBlock).toMatch(/NOT patient care/);
  });
  it("flags cannabis safety in structured output", () => {
    expect(result.structured.safetyFlags).toContain(
      "cannabis_operational_visibility_only",
    );
  });
});

describe("IB-H5 — isAdminOnlyAiOutput predicate", () => {
  it("accepts admin-only metadata", () => {
    expect(
      isAdminOnlyAiOutput({
        ai_assisted: true,
        review_required: true,
        client_visible: false,
        score_change_requested: false,
      }),
    ).toBe(true);
  });
  it("rejects client-visible AI output", () => {
    expect(
      isAdminOnlyAiOutput({
        ai_assisted: true,
        review_required: true,
        client_visible: true,
        score_change_requested: false,
      }),
    ).toBe(false);
  });
  it("rejects score-change requests", () => {
    expect(
      isAdminOnlyAiOutput({
        ai_assisted: true,
        review_required: true,
        client_visible: false,
        score_change_requested: true,
      }),
    ).toBe(false);
  });
});

describe("IB-H5 — edge function wiring", () => {
  it("report-ai-assist imports the shared evidence context utility", () => {
    expect(REPORT_AI_SRC).toMatch(/industry-evidence-context/);
    expect(REPORT_AI_SRC).toMatch(/buildIndustryEvidenceContext/);
    expect(REPORT_AI_SRC).toMatch(/ibContext\.promptBlock/);
  });
  it("report-ai-assist forces admin-only output", () => {
    expect(REPORT_AI_SRC).toMatch(/client_safe:\s*false/);
    expect(REPORT_AI_SRC).toMatch(/status:\s*"needs_review"/);
  });
  it("diagnostic-ai-followup imports the shared evidence context utility", () => {
    expect(DIAG_AI_SRC).toMatch(/industry-evidence-context/);
    expect(DIAG_AI_SRC).toMatch(/buildIndustryEvidenceContext/);
  });
});

describe("IB-H5 — isolation guarantees", () => {
  function walk(d: string): string[] {
    const out: string[] = [];
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      const st = statSync(p);
      if (st.isDirectory()) out.push(...walk(p));
      else if (/\.(ts|tsx)$/.test(e)) out.push(p);
    }
    return out;
  }

  it("no file under src/ imports the shared edge utility", () => {
    const files = walk(resolve(root, "src"));
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (
        /from\s+["'][^"']*supabase\/functions\/_shared\/industry-evidence-context["']/.test(
          src,
        )
      ) {
        offenders.push(f);
      }
    }
    // The contract test itself imports it — exclude this file.
    const filtered = offenders.filter(
      (f) => !f.endsWith("ibH5AiAssistIntegration.test.ts"),
    );
    expect(filtered, `Frontend importers: ${filtered.join(", ")}`).toHaveLength(
      0,
    );
  });

  it("deterministic scoring files do not import the shared utility", () => {
    const scoringDir = resolve(root, "src/lib/scoring");
    let files: string[] = [];
    try {
      files = walk(scoringDir);
    } catch {
      /* dir may not exist */
    }
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/industry-evidence-context/);
    }
  });

  it("shared utility has no frontend secret reads", () => {
    expect(SHARED_SRC).not.toMatch(/process\.env\./);
    expect(SHARED_SRC).not.toMatch(/import\.meta\.env/);
    // Deno.env is NOT used either — this builder is pure.
    expect(SHARED_SRC).not.toMatch(/Deno\.env/);
    expect(SHARED_SRC).not.toMatch(/ai\.gateway\.lovable\.dev/);
  });
});

describe("IB-H5 — pricing & doc", () => {
  it("plan doc references $1,000/month and IB-H5", () => {
    expect(PLAN_DOC).toMatch(/\$1,000\s*\/\s*month/);
    expect(PLAN_DOC).toMatch(/IB-H5 — Admin-Reviewed AI Assist Integration/);
  });
});