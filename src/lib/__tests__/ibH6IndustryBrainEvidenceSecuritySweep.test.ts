/**
 * IB-H6 — Industry Brain Evidence Regression + Security Sweep.
 *
 * Single contract suite that proves the IB-H2 → IB-H5 stack remains
 * launch-safe. No production logic changes — only static / structural
 * assertions across:
 *   - deterministic score isolation
 *   - Industry Brain anchor / RLS safety
 *   - gear metric registry shape
 *   - industry-depth question shape
 *   - evidence interpretation defaults
 *   - admin-reviewed AI assist guarantees
 *   - client-visibility / admin-note leakage
 *   - admin route gating
 *   - cannabis/MMJ safety
 *   - public demo / proof safety
 *   - pricing / scope ($1,000/month, no $297/month)
 *   - frontend secret / AI-provider leakage
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

import {
  GEAR_METRIC_REGISTRY,
  type GearKey,
} from "../intelligence/gearMetricRegistry";
import {
  INDUSTRY_DEPTH_QUESTIONS,
  INDUSTRY_DEPTH_INDUSTRY_KEYS,
} from "../intelligence/industryDepthQuestionRegistry";
import {
  buildEvidenceSignal,
  buildEvidenceSignals,
  buildIndustryEvidenceReportSections,
  buildRepairMapCandidatesFromEvidence,
} from "../intelligence/evidenceInterpretation";
import {
  buildIndustryEvidenceContext,
  isAdminOnlyAiOutput,
} from "../../../supabase/functions/_shared/industry-evidence-context";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const p = join(dir, name);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(p, acc);
    } else if (/\.(ts|tsx)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

const SRC_FILES = walk(resolve(ROOT, "src"));
const SCORING_FILES = walk(resolve(ROOT, "src/lib/scoring"));
const PORTAL_FILES = [
  ...walk(resolve(ROOT, "src/pages/portal")),
  ...walk(resolve(ROOT, "src/components/portal")),
];

// ---------------------------------------------------------------------
// AREA 1 — Deterministic score safety
// ---------------------------------------------------------------------
describe("IB-H6 / Area 1 — deterministic scoring isolation", () => {
  const FORBIDDEN = [
    "gearMetricRegistry",
    "industryDepthQuestionRegistry",
    "evidenceInterpretation",
    "industry-evidence-context",
    "report-ai-assist",
    "diagnostic-ai-followup",
  ];

  it("scoring files do not import IB-H3/H3B/H4/H5 surfaces", () => {
    for (const f of SCORING_FILES) {
      const src = readFileSync(f, "utf8");
      for (const token of FORBIDDEN) {
        expect(src, `${f} must not import ${token}`).not.toContain(token);
      }
    }
  });

  it("evidence interpretation contains no AI / fetch / supabase / secret usage", () => {
    const src = read("src/lib/intelligence/evidenceInterpretation.ts");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/from\s+["']@\/integrations\/supabase/);
    expect(src).not.toMatch(/LOVABLE_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY/);
    expect(src).not.toMatch(/api\.lovable\.app|generativelanguage|api\.openai/);
  });

  it("gear metric + industry depth registries contain no AI / fetch / supabase / secret usage", () => {
    for (const rel of [
      "src/lib/intelligence/gearMetricRegistry.ts",
      "src/lib/intelligence/industryDepthQuestionRegistry.ts",
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/\bfetch\s*\(/);
      expect(src).not.toMatch(/from\s+["']@\/integrations\/supabase/);
      expect(src).not.toMatch(/LOVABLE_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY/);
    }
  });
});

// ---------------------------------------------------------------------
// AREA 2 — Industry Brain anchor / RLS regression
// ---------------------------------------------------------------------
describe("IB-H6 / Area 2 — Industry Brain anchor + RLS safety", () => {
  const IBH2 = read(
    "supabase/migrations/20260505043826_df0de85e-a386-47d8-acb3-2caf256215e0.sql",
  );

  it("IB-H2 creates the three companion tables with RLS", () => {
    for (const t of [
      "industry_benchmark_anchors",
      "industry_glossary_terms",
      "industry_case_studies",
    ]) {
      expect(IBH2).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${t}`));
      expect(IBH2).toMatch(new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`));
    }
  });

  it("companion tables only have admin-managed policies (no broad public read)", () => {
    expect(IBH2).toMatch(/Admin manage industry benchmark anchors/);
    expect(IBH2).toMatch(/Admin manage industry glossary terms/);
    expect(IBH2).toMatch(/Admin manage industry case studies/);
    // No "USING (true)" anywhere in this migration
    expect(IBH2).not.toMatch(/USING\s*\(\s*true\s*\)/i);
  });

  it("synthetic case studies are constrained as synthetic / not real client", () => {
    expect(IBH2).toMatch(/is_synthetic = true AND not_real_client = true/);
    expect(IBH2).toMatch(/Training example — not a real customer/);
  });

  it("public-facing demo / index pages do not surface synthetic case rows as real proof", () => {
    for (const rel of [
      "src/pages/Index.tsx",
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/Training example — not a real customer/);
      expect(src).not.toMatch(/is_synthetic/);
    }
  });
});

// ---------------------------------------------------------------------
// AREA 3 — Gear metric registry regression
// ---------------------------------------------------------------------
describe("IB-H6 / Area 3 — gear metric registry shape", () => {
  const GEARS: GearKey[] = [
    "demand",
    "conversion",
    "operations",
    "financial",
    "independence",
  ];

  it("has exactly 25 metrics, 5 per gear, all interpretiveOnly", () => {
    expect(GEAR_METRIC_REGISTRY.length).toBe(25);
    for (const g of GEARS) {
      expect(GEAR_METRIC_REGISTRY.filter((m) => m.gear === g)).toHaveLength(5);
    }
    expect(GEAR_METRIC_REGISTRY.every((m) => m.interpretiveOnly === true)).toBe(true);
  });

  it("metric keys are unique", () => {
    const keys = GEAR_METRIC_REGISTRY.map((m) => m.metricKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ---------------------------------------------------------------------
// AREA 4 — Industry depth question registry regression
// ---------------------------------------------------------------------
describe("IB-H6 / Area 4 — industry depth questions", () => {
  it("covers exactly 5 industries × 25 questions, 5 per gear", () => {
    expect(INDUSTRY_DEPTH_INDUSTRY_KEYS).toHaveLength(5);
    for (const ind of INDUSTRY_DEPTH_INDUSTRY_KEYS) {
      const qs = INDUSTRY_DEPTH_QUESTIONS.filter((q) => q.industryKey === ind);
      expect(qs, `industry ${ind} has 25 questions`).toHaveLength(25);
      for (const gear of [
        "demand",
        "conversion",
        "operations",
        "financial",
        "independence",
      ] as GearKey[]) {
        expect(qs.filter((q) => q.gear === gear)).toHaveLength(5);
      }
    }
  });

  it("every metricMappings entry references a real gear metric", () => {
    const valid = new Set(GEAR_METRIC_REGISTRY.map((m) => m.metricKey));
    for (const q of INDUSTRY_DEPTH_QUESTIONS) {
      for (const key of q.metricMappings) {
        expect(valid.has(key), `unknown metric mapping ${key}`).toBe(true);
      }
      expect(q.interpretiveOnly).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------
// AREA 5 — Evidence interpretation defaults
// ---------------------------------------------------------------------
describe("IB-H6 / Area 5 — evidence interpretation defaults", () => {
  const baseInput = (overrides: Partial<Parameters<typeof buildEvidenceSignal>[0]> = {}) => ({
    gear: "demand" as GearKey,
    metricKey: "demand.cpql",
    questionKey: "odi.cpql",
    industryKey: null,
    answerState: "unknown" as const,
    ...overrides,
  });

  it("verified → stable, no repair candidate", () => {
    const sig = buildEvidenceSignal(baseInput({ answerState: "verified" }));
    expect(sig.signalType).toBe("stable");
    expect(sig.repairMapCandidate).toBe(false);
    const repairs = buildRepairMapCandidatesFromEvidence([sig]);
    expect(repairs).toHaveLength(0);
  });

  it("unknown → visibility_weakness, high severity, admin-only by default", () => {
    const sig = buildEvidenceSignal(baseInput({ answerState: "unknown" }));
    expect(sig.signalType).toBe("visibility_weakness");
    expect(sig.severity).toBe("high");
    expect(sig.clientVisibleDefault).toBe(false);
    expect(sig.reviewRequired).toBe(true);
  });

  it("incomplete → slipping; no on financial/independence → critical_gap", () => {
    const inc = buildEvidenceSignal(baseInput({ answerState: "incomplete" }));
    expect(inc.signalType).toBe("slipping");
    const crit = buildEvidenceSignal(
      baseInput({
        answerState: "no",
        gear: "independence",
        metricKey: "independence.vacation_test",
        questionKey: "odi.vacation_test",
      }),
    );
    expect(["slipping", "critical_gap"]).toContain(crit.signalType);
    expect(["high", "critical"]).toContain(crit.severity);
  });

  it("report sections + repair candidates default admin-only", () => {
    const sigs = buildEvidenceSignals([
      baseInput({ answerState: "unknown" }),
      baseInput({ answerState: "incomplete" }),
    ]);
    const sections = buildIndustryEvidenceReportSections(sigs, null);
    expect(sections.reviewRequired).toBe(true);
    expect(sections.clientVisible).toBe(false);
    const repairs = buildRepairMapCandidatesFromEvidence(sigs);
    expect(repairs.length).toBeGreaterThan(0);
    for (const r of repairs) {
      expect(r.clientVisible).toBe(false);
      expect(r.approvalRequired).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------
// AREA 6 — AI assist regression
// ---------------------------------------------------------------------
describe("IB-H6 / Area 6 — AI assist safety", () => {
  const REPORT_AI = read("supabase/functions/report-ai-assist/index.ts");
  const DIAG_AI = read("supabase/functions/diagnostic-ai-followup/index.ts");
  const SHARED = read("supabase/functions/_shared/industry-evidence-context.ts");

  it("isAdminOnlyAiOutput enforces admin-only metadata", () => {
    expect(
      isAdminOnlyAiOutput({
        ai_assisted: true,
        review_required: true,
        client_visible: false,
        score_change_requested: false,
      }),
    ).toBe(true);
    expect(isAdminOnlyAiOutput({ client_visible: true })).toBe(false);
    expect(isAdminOnlyAiOutput({})).toBe(false);
  });

  it("context builder forbids score change + bans unsafe claims", () => {
    const { promptBlock } = buildIndustryEvidenceContext({
      customerId: "c",
      reportDraftId: "d",
      industryKey: null,
      industryLabel: null,
      signals: [],
      repairCandidates: [],
      benchmarkAnchors: [],
      glossaryTerms: [],
    });
    expect(promptBlock).toMatch(/score_change_requested\s*=\s*false/);
    expect(promptBlock).toMatch(/client_visible\s*=\s*false/);
    expect(promptBlock).toMatch(/review_required\s*=\s*true/);
  });

  it("report-ai-assist forces client_safe=false and needs_review status", () => {
    expect(REPORT_AI).toMatch(/client_safe:\s*false/);
    expect(REPORT_AI).toMatch(/status:\s*["']needs_review["']/);
    expect(REPORT_AI).toMatch(/industry-evidence-context/);
  });

  it("diagnostic-ai-followup imports the shared context", () => {
    expect(DIAG_AI).toMatch(/industry-evidence-context/);
  });

  it("shared edge utility explicitly forbids healthcare / HIPAA drift in its prompt rules", () => {
    // The shared file is allowed to *name* the banned terms in its
    // safety rules. We assert the safety rules are present.
    expect(SHARED).toMatch(/Do not frame cannabis.*HIPAA/i);
    expect(SHARED).toMatch(/score_change_requested\s*=\s*false/);
  });

  it("no frontend file imports the edge AI context utility", () => {
    for (const f of SRC_FILES) {
      if (f.includes("__tests__")) continue;
      const src = readFileSync(f, "utf8");
      expect(
        /from\s+["'][^"']*supabase\/functions\/_shared\/industry-evidence-context["']/.test(src),
        `${f} must not import the edge AI context`,
      ).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------
// AREA 7-8 — Client visibility + route gating
// ---------------------------------------------------------------------
describe("IB-H6 / Areas 7-8 — client visibility + admin route gating", () => {
  it("portal pages/components do not import any /components/admin/ panel", () => {
    for (const f of PORTAL_FILES) {
      const src = readFileSync(f, "utf8");
      expect(
        /from\s+["']@\/components\/admin\//.test(src),
        `${f} must not import admin panels`,
      ).toBe(false);
    }
  });

  it("IndustryEvidenceReviewPanel only mounts in admin routes", () => {
    const APP = read("src/App.tsx");
    // Panel is mounted inside ReportDraftDetail (admin page), not directly in App
    const matches = APP.match(/IndustryEvidenceReviewPanel/g);
    expect(matches === null || matches.length === 0).toBe(true);
    const detail = read("src/pages/admin/ReportDraftDetail.tsx");
    expect(detail).toMatch(/IndustryEvidenceReviewPanel/);
  });

  it("every /admin/* route is wrapped in ProtectedRoute requireRole=\"admin\" or is a Navigate redirect", () => {
    const APP = read("src/App.tsx");
    const lines = APP.split("\n");
    const adminLineIdx = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => /path=["']\/admin/.test(l));
    expect(adminLineIdx.length).toBeGreaterThan(0);
    for (const { l, i } of adminLineIdx) {
      // Inspect a small window around the path attribute to handle both
      // single-line and multi-line <Route ... /> declarations.
      const window = lines.slice(Math.max(0, i - 4), i + 8).join("\n");
      if (/element=\{<Navigate\s/.test(window)) continue;
      expect(
        /ProtectedRoute\s+requireRole=["']admin["']/.test(window),
        `unguarded admin route: ${l.trim()}`,
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------
// AREA 9 — RLS / storage safety (static)
// ---------------------------------------------------------------------
describe("IB-H6 / Area 9 — RLS / storage safety (static)", () => {
  it("tool-reports bucket is private", () => {
    const mig = read(
      "supabase/migrations/20260504185218_eab1e9fe-8eed-463e-bf5c-9c508dfaed6d.sql",
    );
    expect(mig).toMatch(/'tool-reports',\s*'tool-reports',\s*false/);
    expect(mig).toMatch(/tool_report_artifacts/);
  });
});

// ---------------------------------------------------------------------
// AREA 10 — Cannabis / MMJ safety
// ---------------------------------------------------------------------
describe("IB-H6 / Area 10 — cannabis / MMJ safety", () => {
  // Each entry: file + array of allowed line-substrings. Lines containing
  // any allowed substring are skipped (they are safety rules / comments
  // explicitly *banning* the term, not unsafe claims).
  const SURFACES: Array<{ rel: string; allow: string[] }> = [
    { rel: "src/lib/intelligence/gearMetricRegistry.ts", allow: ["No HIPAA"] },
    { rel: "src/lib/intelligence/industryDepthQuestionRegistry.ts", allow: [] },
    {
      rel: "src/lib/intelligence/evidenceInterpretation.ts",
      allow: ["No HIPAA", "medical billing", "insurance-claim", "HIPAA"],
    },
    {
      rel: "supabase/functions/_shared/industry-evidence-context.ts",
      allow: [
        "Do not frame",
        "Do not say",
        "NOT healthcare",
        "NOT HIPAA",
        "NOT patient",
        "NOT clinical",
        "NOT medical",
        "NOT insurance",
        "HIPAA / clinical",
        "medical billing, or insurance",
      ],
    },
    {
      rel: "supabase/functions/report-ai-assist/index.ts",
      allow: [
        "never healthcare",
        "NOT healthcare",
        "NOT patient",
        "NOT HIPAA",
        "not healthcare",
        "not patient care",
        "not HIPAA",
      ],
    },
    {
      rel: "supabase/functions/diagnostic-ai-followup/index.ts",
      allow: ["NOT healthcare", "NOT HIPAA", "not HIPAA", "Do not"],
    },
  ];

  function scanForBanned(rel: string, allow: string[], banned: RegExp[]) {
    const src = read(rel).split("\n");
    src.forEach((line, idx) => {
      if (allow.some((a) => line.includes(a))) return;
      for (const re of banned) {
        expect(
          re.test(line) === false,
          `${rel}:${idx + 1} contains banned ${re}: ${line.trim()}`,
        ).toBe(true);
      }
    });
  }

  it("no healthcare/HIPAA/clinical/medical-billing drift outside safety rules", () => {
    const banned = [
      /HIPAA/i,
      /patient care/i,
      /clinical workflow/i,
      /medical billing/i,
      /insurance claim/i,
    ];
    for (const { rel, allow } of SURFACES) scanForBanned(rel, allow, banned);
  });

  it("no compliance certification language outside safety rules", () => {
    const banned = [
      /certified compliant/i,
      /legally compliant/i,
      /guaranteed compliance/i,
      /AI verified compliance/i,
      /compliance certification/i,
    ];
    for (const { rel, allow } of SURFACES) {
      // For these, also allow lines that explicitly forbid the phrase.
      const expanded = [
        ...allow,
        "Do not say",
        "Do not claim",
        "Do not produce",
        "no \"certified",
        "no compliance certification",
        "not a compliance",
        "Not legal",
        "not legally",
      ];
      scanForBanned(rel, expanded, banned);
    }
  });
});

// ---------------------------------------------------------------------
// AREA 12 — Pricing / scope
// ---------------------------------------------------------------------
describe("IB-H6 / Area 12 — pricing / scope", () => {
  // Only scan code surfaces. The plan doc legitimately mentions
  // `$297/month` in safety prose ("no active $297/month pricing").
  const SURFACES = [
    "src/lib/intelligence/gearMetricRegistry.ts",
    "src/lib/intelligence/industryDepthQuestionRegistry.ts",
    "src/lib/intelligence/evidenceInterpretation.ts",
    "supabase/functions/_shared/industry-evidence-context.ts",
    "supabase/functions/report-ai-assist/index.ts",
    "supabase/functions/diagnostic-ai-followup/index.ts",
  ];

  it("none of the IB-H stack reintroduces $297/month pricing", () => {
    // Active-pricing reintroduction would say something like:
    //   "$297/month" or "price: $297" without a "no"/"never"/"not" guard.
    for (const rel of SURFACES) {
      const src = read(rel).split("\n");
      src.forEach((line, idx) => {
        if (!/\$297|297\s*\/\s*month/.test(line)) return;
        // Allowed: lines that explicitly disclaim $297/month (safety copy).
        const safe = /no\b|never\b|not\b|reintroduc|block|guard|forbid/i.test(
          line,
        );
        expect(safe, `${rel}:${idx + 1} reintroduces $297: ${line.trim()}`).toBe(
          true,
        );
      });
    }
  });

  it("plan doc still references $1,000/month pricing", () => {
    const PLAN = read("docs/industry-brain-gear-metrics-hardening-plan.md");
    expect(PLAN).toMatch(/\$1,000\s*\/\s*month/);
  });
});

// ---------------------------------------------------------------------
// AREA 13 — Frontend secret / AI provider leakage
// ---------------------------------------------------------------------
describe("IB-H6 / Area 13 — frontend secret / AI provider leakage", () => {
  it("src/ contains no service role key, sk_live, sk_test, or AI provider keys", () => {
    const banned = [
      /SUPABASE_SERVICE_ROLE_KEY/,
      /\bsk_live_[A-Za-z0-9]/,
      /\bsk_test_[A-Za-z0-9]/,
      /OPENAI_API_KEY/,
      /ANTHROPIC_API_KEY/,
      /GEMINI_API_KEY/,
    ];
    for (const f of SRC_FILES) {
      if (f.includes("__tests__")) continue;
      const src = readFileSync(f, "utf8");
      for (const re of banned) {
        expect(src, `${f} contains ${re}`).not.toMatch(re);
      }
    }
  });

  it("src/ does not directly call AI provider hosts", () => {
    const banned = [
      /api\.openai\.com/,
      /api\.anthropic\.com/,
      /generativelanguage\.googleapis\.com/,
      /ai\.gateway\.lovable\.dev/,
    ];
    for (const f of SRC_FILES) {
      if (f.includes("__tests__")) continue;
      const src = readFileSync(f, "utf8");
      for (const re of banned) {
        expect(src, `${f} calls AI host ${re}`).not.toMatch(re);
      }
    }
  });
});
