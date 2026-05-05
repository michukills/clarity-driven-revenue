/**
 * P12.2 + P12.2.H — Admin Integration Planning surface.
 *
 * Renders the typed planning artifacts plus the hardening layer:
 * onboarding checklists, readiness state, mapping-completeness
 * validation, and exportable planning report.
 */

import { useMemo } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Layers,
  ShieldCheck,
  Database,
  RefreshCw,
  Ban,
  Map as MapIcon,
  ListChecks,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  Sheet,
} from "lucide-react";
import {
  CONNECTOR_PLANS,
  FIELD_MAPPINGS,
  VERIFICATION_POLICIES,
  SYNC_STRATEGIES,
  NOISE_EXCLUSIONS,
  PRIORITY_LABEL,
  VERIFICATION_LABEL,
  TRUTH_ROLE_LABEL,
  SYNC_MODE_LABEL,
  WRITE_SEMANTICS_LABEL,
  CONFLICT_LABEL,
  INDUSTRY_LABEL,
  truthRoleCounts,
  type ConnectorPlan,
  type ConnectorPriority,
  type VerificationPolicy,
} from "@/lib/integrations/planning";
import {
  ALL_GATES,
  GATE_LABEL,
  READINESS_LABEL,
  checklistFor,
  gateProgress,
  readinessVariant,
} from "@/lib/integrations/onboarding";
import {
  validatePlanning,
  summarize,
  issuesForConnector,
  type ValidationSeverity,
} from "@/lib/integrations/validation";
import {
  reportToJson,
  reportToCsv,
  reportToMarkdown,
  downloadFile,
} from "@/lib/integrations/exporter";
import { ConnectorCapabilityMatrixPanel } from "@/components/admin/ConnectorCapabilityMatrixPanel";

const priorityVariant = (p: ConnectorPriority) =>
  p === "tier_1" ? "default" : p === "tier_2" ? "secondary" : "outline";

const verificationVariant = (v: VerificationPolicy) =>
  v === "auto_trust"
    ? "secondary"
    : v === "do_not_import"
    ? "destructive"
    : "outline";

const severityVariant = (s: ValidationSeverity) =>
  s === "error" ? "destructive" : s === "warning" ? "secondary" : "outline";

function ConnectorCard({
  plan,
  issueCount,
}: {
  plan: ConnectorPlan;
  issueCount: number;
}) {
  const counts = truthRoleCounts(plan.id);
  const checklist = checklistFor(plan.id);
  const prog = gateProgress(checklist);
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-base font-medium text-foreground">
            {plan.label}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {plan.industry.map((i) => INDUSTRY_LABEL[i]).join(" · ")}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={priorityVariant(plan.priority)}>
            {PRIORITY_LABEL[plan.priority]}
          </Badge>
          <Badge variant={readinessVariant(checklist.readiness)} className="text-[10px]">
            {READINESS_LABEL[checklist.readiness]}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-foreground/85 leading-relaxed">
        {plan.ownedTruthSummary}
      </p>
      <div className="mt-3 text-xs text-muted-foreground">
        <span className="text-foreground/80">Consumes:</span>{" "}
        {plan.consumingModules.join(", ")}
      </div>
      <div className="mt-2 text-xs text-muted-foreground italic leading-relaxed">
        {plan.whenToActivate}
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Onboarding gates</span>
          <span>
            {prog.cleared}/{prog.total} · {prog.pct}%
          </span>
        </div>
        <Progress value={prog.pct} className="h-1.5" />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        <Badge variant="outline">
          {counts.source_of_truth} source-of-truth
        </Badge>
        <Badge variant="outline">{counts.imported_supporting} supporting</Badge>
        <Badge variant="outline">{counts.advisory_only} advisory</Badge>
        {issueCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {issueCount} issue{issueCount === 1 ? "" : "s"}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function IntegrationPlanning() {
  const issues = useMemo(() => validatePlanning(), []);
  const sum = useMemo(() => summarize(issues), [issues]);

  const handleExport = (kind: "json" | "csv" | "md") => {
    const stamp = new Date().toISOString().split("T")[0];
    if (kind === "json") {
      downloadFile(
        `rgs-planning-${stamp}.json`,
        reportToJson(),
        "application/json"
      );
    } else if (kind === "csv") {
      downloadFile(
        `rgs-planning-mappings-${stamp}.csv`,
        reportToCsv(),
        "text/csv"
      );
    } else {
      downloadFile(
        `rgs-planning-${stamp}.md`,
        reportToMarkdown(),
        "text/markdown"
      );
    }
  };

  return (
    <PortalShell variant="admin">
      <div className="container max-w-7xl py-8 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Integration Architecture
            </div>
            <h1 className="text-2xl text-foreground mt-1">
              Connected source strategy
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
              Field-mapped planning for every relevant connector. Defines
              owned-truth scope, verification policy, sync strategy, explicit
              noise-exclusion rules, onboarding gates, and internal readiness
              state. Future connector implementation reads from this registry —
              do not hand-roll trust handling per connector.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("json")}
              className="gap-1.5"
            >
              <FileJson className="h-3.5 w-3.5" /> JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              className="gap-1.5"
            >
              <Sheet className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("md")}
              className="gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" /> Markdown
            </Button>
          </div>
        </header>

        {/* Validation summary banner */}
        <Card
          className={
            sum.errors > 0
              ? "border-destructive/50 bg-destructive/5"
              : sum.warnings > 0
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-emerald-500/40 bg-emerald-500/5"
          }
        >
          <CardContent className="py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {sum.errors === 0 && sum.warnings === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle
                  className={
                    sum.errors > 0
                      ? "h-5 w-5 text-destructive"
                      : "h-5 w-5 text-amber-500"
                  }
                />
              )}
              <div>
                <div className="text-sm text-foreground font-medium">
                  Planning validation
                </div>
                <div className="text-xs text-muted-foreground">
                  {sum.total === 0
                    ? "All planning artifacts are internally consistent."
                    : `${sum.errors} error${sum.errors === 1 ? "" : "s"} · ${sum.warnings} warning${sum.warnings === 1 ? "" : "s"} across ${Object.keys(sum.byConnector).length} connector${Object.keys(sum.byConnector).length === 1 ? "" : "s"}.`}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(sum.byConnector).map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-[10px]">
                  {k}: {v}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="priority" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="priority">
              <Layers className="h-3.5 w-3.5 mr-1.5" /> Priority &amp; owned truth
            </TabsTrigger>
            <TabsTrigger value="matrix">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Capability &amp; marketing safety
            </TabsTrigger>
            <TabsTrigger value="readiness">
              <ListChecks className="h-3.5 w-3.5 mr-1.5" /> Readiness &amp; gates
            </TabsTrigger>
            <TabsTrigger value="fields">
              <MapIcon className="h-3.5 w-3.5 mr-1.5" /> Field mappings
            </TabsTrigger>
            <TabsTrigger value="verification">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Verification policy
            </TabsTrigger>
            <TabsTrigger value="sync">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Sync strategy
            </TabsTrigger>
            <TabsTrigger value="noise">
              <Ban className="h-3.5 w-3.5 mr-1.5" /> Do-not-ingest
            </TabsTrigger>
            <TabsTrigger value="validation">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Validation
            </TabsTrigger>
          </TabsList>

          {/* Priority + owned-truth */}
          <TabsContent value="priority" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Connector priority ladder
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CONNECTOR_PLANS.map((p) => (
                  <ConnectorCard
                    key={p.id}
                    plan={p}
                    issueCount={issuesForConnector(issues, p.id).length}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* P67A — Capability matrix + marketing claim safety */}
          <TabsContent value="matrix" className="space-y-4">
            <ConnectorCapabilityMatrixPanel />
          </TabsContent>

          {/* Readiness + onboarding gates */}
          <TabsContent value="readiness" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Connector readiness &amp; onboarding gates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {CONNECTOR_PLANS.map((p) => {
                  const c = checklistFor(p.id);
                  const cleared = new Set(c.cleared);
                  const prog = gateProgress(c);
                  return (
                    <div
                      key={p.id}
                      className="rounded-md border border-border bg-card/50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {p.label}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {PRIORITY_LABEL[p.priority]}
                          </div>
                        </div>
                        <Badge variant={readinessVariant(c.readiness)}>
                          {READINESS_LABEL[c.readiness]}
                        </Badge>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Gate progress</span>
                          <span>
                            {prog.cleared}/{prog.total} · {prog.pct}%
                          </span>
                        </div>
                        <Progress value={prog.pct} className="h-1.5" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2">
                        {ALL_GATES.map((g) => {
                          const ok = cleared.has(g);
                          return (
                            <div
                              key={g}
                              className="flex items-center gap-2 text-xs"
                            >
                              {ok ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                              )}
                              <span
                                className={
                                  ok
                                    ? "text-foreground/85"
                                    : "text-muted-foreground"
                                }
                              >
                                {GATE_LABEL[g]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {c.blocker && (
                        <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 italic">
                          Blocker: {c.blocker}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Field mapping registry */}
          <TabsContent value="fields" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Field mapping registry ({FIELD_MAPPINGS.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-2 pr-3">Connector</th>
                      <th className="text-left py-2 pr-3">Source field</th>
                      <th className="text-left py-2 pr-3">Destination</th>
                      <th className="text-left py-2 pr-3">Provenance</th>
                      <th className="text-left py-2 pr-3">Verification</th>
                      <th className="text-left py-2 pr-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELD_MAPPINGS.map((m, idx) => (
                      <tr
                        key={`${m.connector}-${m.sourceField}-${idx}`}
                        className="border-b border-border/40 align-top"
                      >
                        <td className="py-2 pr-3 text-foreground/90">
                          {m.connector}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[11px]">
                          {m.sourceField}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="text-foreground/90">
                            {m.destinationModule}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {m.destinationEntity}.{m.destinationField}
                          </div>
                          {m.note && (
                            <div className="text-[10px] text-muted-foreground italic mt-0.5">
                              {m.note}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className="text-[10px]">
                            {TRUTH_ROLE_LABEL[m.truthRole]}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3">
                          <Badge
                            variant={verificationVariant(m.verification)}
                            className="text-[10px]"
                          >
                            {VERIFICATION_LABEL[m.verification]}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-foreground/80 capitalize">
                          {m.confidence}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 text-[11px] text-muted-foreground italic">
                  Provenance column shows the connector's intended trust role
                  for the destination field. Consumers must respect this when
                  rendering imported data.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification policy */}
          <TabsContent value="verification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Verification policy by data class
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {VERIFICATION_POLICIES.map((v, idx) => (
                  <div
                    key={`${v.dataClass}-${idx}`}
                    className="rounded-md border border-border bg-card/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="text-sm font-medium text-foreground">
                        {v.dataClass}
                      </div>
                      <Badge variant={verificationVariant(v.policy)}>
                        {VERIFICATION_LABEL[v.policy]}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {v.rationale}
                    </div>
                    {v.appliesTo.length > 0 && (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Applies to: {v.appliesTo.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync strategy */}
          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Sync strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-2 pr-3">Domain</th>
                      <th className="text-left py-2 pr-3">Connector</th>
                      <th className="text-left py-2 pr-3">Mode</th>
                      <th className="text-left py-2 pr-3">Writes</th>
                      <th className="text-left py-2 pr-3">Conflict</th>
                      <th className="text-left py-2 pr-3">Cadence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SYNC_STRATEGIES.map((s, idx) => (
                      <tr
                        key={`${s.domain}-${idx}`}
                        className="border-b border-border/40 align-top"
                      >
                        <td className="py-2 pr-3 text-foreground/90">
                          {s.domain}
                          {s.notes && (
                            <div className="text-[10px] text-muted-foreground italic mt-0.5">
                              {s.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-3">{s.connector}</td>
                        <td className="py-2 pr-3">
                          {SYNC_MODE_LABEL[s.syncMode]}
                        </td>
                        <td className="py-2 pr-3">
                          {WRITE_SEMANTICS_LABEL[s.writeSemantics]}
                        </td>
                        <td className="py-2 pr-3">
                          {CONFLICT_LABEL[s.conflict]}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {s.cadence ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Do-not-ingest */}
          <TabsContent value="noise" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="h-4 w-4 text-primary" />
                  Do-not-ingest rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {NOISE_EXCLUSIONS.map((n, idx) => (
                  <div
                    key={`${n.connector}-${idx}`}
                    className="rounded-md border border-border bg-card/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="text-sm text-foreground">{n.rule}</div>
                      <Badge variant="outline" className="text-[10px]">
                        {n.connector}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {n.reason}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Validation */}
          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  Mapping completeness validation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {issues.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">
                    No issues — planning artifacts are internally consistent.
                  </div>
                ) : (
                  issues.map((i, idx) => (
                    <div
                      key={`${i.code}-${idx}`}
                      className="rounded-md border border-border bg-card/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="text-sm text-foreground">
                          {i.message}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[10px]">
                            {i.connector}
                          </Badge>
                          <Badge
                            variant={severityVariant(i.severity)}
                            className="text-[10px] capitalize"
                          >
                            {i.severity}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {i.code}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PortalShell>
  );
}
