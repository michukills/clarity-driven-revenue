/**
 * P12.2 — Admin Integration Planning surface.
 *
 * Renders the typed planning artifacts from src/lib/integrations/planning.ts
 * into a compact, scannable internal page. This is RGS-only architecture
 * planning — no client-facing data, no live connector state.
 */
 
import { PortalShell } from "@/components/portal/PortalShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Layers,
  ShieldCheck,
  Database,
  RefreshCw,
  Ban,
  Map as MapIcon,
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
 
const priorityVariant = (p: ConnectorPriority) =>
  p === "tier_1" ? "default" : p === "tier_2" ? "secondary" : "outline";
 
const verificationVariant = (v: VerificationPolicy) =>
  v === "auto_trust"
    ? "secondary"
    : v === "do_not_import"
    ? "destructive"
    : "outline";
 
function ConnectorCard({ plan }: { plan: ConnectorPlan }) {
  const counts = truthRoleCounts(plan.id);
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
        <Badge variant={priorityVariant(plan.priority)}>
          {PRIORITY_LABEL[plan.priority]}
        </Badge>
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
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        <Badge variant="outline">
          {counts.source_of_truth} source-of-truth
        </Badge>
        <Badge variant="outline">{counts.imported_supporting} supporting</Badge>
        <Badge variant="outline">{counts.advisory_only} advisory</Badge>
      </div>
    </div>
  );
}
 
export default function IntegrationPlanning() {
  return (
    <PortalShell variant="admin">
      <div className="container max-w-7xl py-8 space-y-6">
        <header>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Integration Architecture
          </div>
          <h1 className="text-2xl text-foreground mt-1">
            Connected source strategy
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            Field-mapped planning for every relevant connector. Defines
            owned-truth scope, verification policy, sync strategy, and
            explicit noise-exclusion rules. Future connector implementation
            reads from this registry — do not hand-roll trust handling per
            connector.
          </p>
        </header>
 
        <Tabs defaultValue="priority" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="priority">
              <Layers className="h-3.5 w-3.5 mr-1.5" /> Priority &amp; owned truth
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
          </TabsList>
 
          {/* ── 1 + 2: Priority ladder + owned-truth matrix ──────────────── */}
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
                  <ConnectorCard key={p.id} plan={p} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
 
          {/* ── 3: Field mapping registry ────────────────────────────────── */}
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
                      <th className="text-left py-2 pr-3">Truth role</th>
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
              </CardContent>
            </Card>
          </TabsContent>
 
          {/* ── 4: Verification policy matrix ────────────────────────────── */}
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
 
          {/* ── 5: Sync strategy matrix ──────────────────────────────────── */}
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
 
          {/* ── 6: Do-not-ingest ─────────────────────────────────────────── */}
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
        </Tabs>
      </div>
    </PortalShell>
  );
}
