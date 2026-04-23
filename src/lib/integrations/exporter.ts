/**
 * P12.2.H — Exportable planning report (JSON / CSV / Markdown).
 */

import {
  CONNECTOR_PLANS,
  FIELD_MAPPINGS,
  VERIFICATION_POLICIES,
  SYNC_STRATEGIES,
  NOISE_EXCLUSIONS,
  PRIORITY_LABEL,
  TRUTH_ROLE_LABEL,
  VERIFICATION_LABEL,
  SYNC_MODE_LABEL,
  WRITE_SEMANTICS_LABEL,
  CONFLICT_LABEL,
  truthRoleCounts,
} from "./planning";
import {
  ONBOARDING_CHECKLISTS,
  READINESS_LABEL,
  GATE_LABEL,
  ALL_GATES,
  gateProgress,
  checklistFor,
} from "./onboarding";
import { validatePlanning, summarize } from "./validation";

export interface PlanningReport {
  generatedAt: string;
  connectors: typeof CONNECTOR_PLANS;
  fieldMappings: typeof FIELD_MAPPINGS;
  verificationPolicies: typeof VERIFICATION_POLICIES;
  syncStrategies: typeof SYNC_STRATEGIES;
  noiseExclusions: typeof NOISE_EXCLUSIONS;
  onboarding: typeof ONBOARDING_CHECKLISTS;
  validation: ReturnType<typeof validatePlanning>;
}

export function buildReport(): PlanningReport {
  return {
    generatedAt: new Date().toISOString(),
    connectors: CONNECTOR_PLANS,
    fieldMappings: FIELD_MAPPINGS,
    verificationPolicies: VERIFICATION_POLICIES,
    syncStrategies: SYNC_STRATEGIES,
    noiseExclusions: NOISE_EXCLUSIONS,
    onboarding: ONBOARDING_CHECKLISTS,
    validation: validatePlanning(),
  };
}

export function reportToJson(): string {
  return JSON.stringify(buildReport(), null, 2);
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function reportToCsv(): string {
  const headers = [
    "connector",
    "source_field",
    "destination_module",
    "destination_entity",
    "destination_field",
    "truth_role",
    "verification",
    "confidence",
    "note",
  ];
  const rows = FIELD_MAPPINGS.map((m) =>
    [
      m.connector,
      m.sourceField,
      m.destinationModule,
      m.destinationEntity,
      m.destinationField,
      m.truthRole,
      m.verification,
      m.confidence,
      m.note ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function reportToMarkdown(): string {
  const issues = validatePlanning();
  const sum = summarize(issues);
  const lines: string[] = [];

  lines.push("# RGS OS — Connected Source Planning Report");
  lines.push("");
  lines.push(`_Generated ${new Date().toISOString()}_`);
  lines.push("");
  lines.push("## Validation summary");
  lines.push("");
  lines.push(
    `- **Total issues:** ${sum.total} (errors: ${sum.errors}, warnings: ${sum.warnings}, info: ${sum.info})`
  );
  lines.push("");

  lines.push("## Connectors");
  lines.push("");
  for (const c of CONNECTOR_PLANS) {
    const counts = truthRoleCounts(c.id);
    const cl = checklistFor(c.id);
    const prog = gateProgress(cl);
    lines.push(`### ${c.label} (\`${c.id}\`)`);
    lines.push("");
    lines.push(`- Priority: **${PRIORITY_LABEL[c.priority]}**`);
    lines.push(
      `- Readiness: **${READINESS_LABEL[cl.readiness]}** (${prog.cleared}/${prog.total} gates · ${prog.pct}%)`
    );
    lines.push(`- Owned truth: ${c.ownedTruthSummary}`);
    lines.push(`- Consumes: ${c.consumingModules.join(", ")}`);
    lines.push(
      `- Mapping mix: ${counts.source_of_truth} source-of-truth · ${counts.imported_supporting} supporting · ${counts.advisory_only} advisory`
    );
    if (cl.blocker) lines.push(`- Blocker: _${cl.blocker}_`);
    const cleared = new Set(cl.cleared);
    const open = ALL_GATES.filter((g) => !cleared.has(g));
    if (open.length > 0) {
      lines.push(`- Open gates: ${open.map((g) => GATE_LABEL[g]).join("; ")}`);
    }
    lines.push("");
  }

  lines.push("## Field mappings");
  lines.push("");
  lines.push(
    "| Connector | Source | Destination | Truth | Verification | Confidence |"
  );
  lines.push("|---|---|---|---|---|---|");
  for (const m of FIELD_MAPPINGS) {
    lines.push(
      `| ${m.connector} | \`${m.sourceField}\` | ${m.destinationModule} · ${m.destinationEntity}.${m.destinationField} | ${TRUTH_ROLE_LABEL[m.truthRole]} | ${VERIFICATION_LABEL[m.verification]} | ${m.confidence} |`
    );
  }
  lines.push("");

  lines.push("## Sync strategy");
  lines.push("");
  lines.push("| Domain | Connector | Mode | Writes | Conflict | Cadence |");
  lines.push("|---|---|---|---|---|---|");
  for (const s of SYNC_STRATEGIES) {
    lines.push(
      `| ${s.domain} | ${s.connector} | ${SYNC_MODE_LABEL[s.syncMode]} | ${WRITE_SEMANTICS_LABEL[s.writeSemantics]} | ${CONFLICT_LABEL[s.conflict]} | ${s.cadence ?? "—"} |`
    );
  }
  lines.push("");

  lines.push("## Do-not-ingest");
  lines.push("");
  for (const n of NOISE_EXCLUSIONS) {
    lines.push(`- **${n.connector}** — ${n.rule}. _${n.reason}_`);
  }
  lines.push("");

  if (issues.length > 0) {
    lines.push("## Validation issues");
    lines.push("");
    for (const i of issues) {
      lines.push(
        `- [${i.severity.toUpperCase()}] (${i.connector}) ${i.code}: ${i.message}`
      );
    }
  }

  return lines.join("\n");
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
