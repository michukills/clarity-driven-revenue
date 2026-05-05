/**
 * P67A — Admin Connector Capability Matrix + Marketing Claim Safety panel.
 *
 * Renders the full industry-wide source-of-truth connector matrix with
 * honest status labels and the marketing-safe claim per connector so
 * RGS admins always know which claims are safe in demos, screenshots,
 * sales calls, and marketing copy.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, AlertTriangle, Plug } from "lucide-react";
import {
  CONNECTOR_CAPABILITY_MATRIX,
  CONNECTOR_STATUS_LABEL,
  type ConnectorStatus,
} from "@/lib/integrations/connectorCapabilityMatrix";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

const INDUSTRY_OPTIONS: { value: IndustryCategory | "all"; label: string }[] = [
  { value: "all", label: "All industries" },
  { value: "general_service", label: "General / Professional Services" },
  { value: "trade_field_service", label: "Trades / Home Services" },
  { value: "restaurant", label: "Restaurants" },
  { value: "retail", label: "Retail / E-commerce" },
  { value: "mmj_cannabis", label: "Cannabis / MMJ / Dispensary" },
  { value: "other", label: "Other" },
];

function statusVariant(s: ConnectorStatus): "default" | "secondary" | "outline" | "destructive" {
  if (s === "live_connected_sync") return "default";
  if (s === "manual_export_import_supported") return "secondary";
  if (s === "sync_failed_needs_reconnect") return "destructive";
  return "outline";
}

export function ConnectorCapabilityMatrixPanel() {
  const [industry, setIndustry] = useState<IndustryCategory | "all">("all");

  const rows = useMemo(() => {
    if (industry === "all") return CONNECTOR_CAPABILITY_MATRIX;
    return CONNECTOR_CAPABILITY_MATRIX.filter((c) => c.industries.includes(industry));
  }, [industry]);

  const liveCount = rows.filter((r) => r.status === "live_connected_sync").length;
  const manualCount = rows.filter((r) => r.status === "manual_export_import_supported").length;
  const plannedCount = rows.filter((r) => r.status === "planned_connector").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plug className="h-4 w-4" /> Connector Capability Matrix · Marketing
          Claim Safety
        </CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Honest, per-industry source-of-truth status. Use these labels in
          demos, screenshots, sales calls, and marketing — never imply a
          connector is live, syncing, or real-time unless its status is
          <span className="font-medium text-foreground">
            {" "}Live connected sync
          </span>
          .
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Select
            value={industry}
            onValueChange={(v) => setIndustry(v as IndustryCategory | "all")}
          >
            <SelectTrigger className="h-8 w-64 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="default" className="text-[10px] gap-1">
            <ShieldCheck className="h-3 w-3" /> {liveCount} live
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {manualCount} manual export
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {plannedCount} planned
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map((c) => {
            const liveLie = c.status !== "live_connected_sync";
            return (
              <div
                key={c.providerId}
                className="border rounded-md p-3 flex flex-wrap gap-3 items-start"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    {c.providerName}
                    <Badge variant={statusVariant(c.status)} className="text-[10px]">
                      {CONNECTOR_STATUS_LABEL[c.status]}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Marketing-safe: {c.marketingClaim}
                    </Badge>
                    {liveLie && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Do not claim live/synced/real-time
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Industries: {c.industries.join(", ")} · Source-of-truth:{" "}
                    {c.sourceOfTruth.join(", ")}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {c.knownLimitations}
                  </div>
                  <div className="text-[11px] text-foreground/80 mt-1 italic">
                    Client-safe blurb: "{c.clientSafeBlurb}"
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}