import { INDUSTRY_BANKS, INDUSTRY_KEYS, auditBank, summarizeBank, INDUSTRY_FINDING_CALIBRATIONS } from "./src/lib/industryDiagnostic";
for (const k of INDUSTRY_KEYS) {
  const a = auditBank(INDUSTRY_BANKS[k]);
  const s = summarizeBank(INDUSTRY_BANKS[k]);
  console.log(k, "total=", s.total, "kinds=", s.by_kind);
  console.log("  gears=", s.by_gear, "full=", a.meets_full_depth, "issues=", a.issues.length, "calibs=", (INDUSTRY_FINDING_CALIBRATIONS[k]||[]).length);
  if (a.issues.length) console.log("  issues:", a.issues.slice(0,5).map(i=>i.message));
}
