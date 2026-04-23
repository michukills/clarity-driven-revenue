/**
 * P12.3.IH — Admin Template Library.
 *
 * Single, OS-managed surface that lists every supported import template
 * with a clear description, a one-click download, and an option to load
 * the template's example row directly into the wizard for a dry run.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, BookOpen } from "lucide-react";
import {
  IMPORT_TARGETS,
  type ImportTargetId,
  type ImportTargetSpec,
} from "@/lib/imports/csvImport";
import {
  downloadTemplate,
  templateFileName,
} from "@/lib/imports/templates";

const WHEN_TO_USE: Record<ImportTargetId, string> = {
  revenue_entries:
    "Use when bringing in historical or recent revenue lines from a spreadsheet or accounting export.",
  expense_entries:
    "Use for vendor / category expense history. Category mapping is reviewed before activation.",
  invoice_entries:
    "Use for sent and outstanding invoices. Totals can auto-trust when amounts and dates are clean.",
  financial_obligations:
    "Use for upcoming payments — taxes, loans, recurring fixed costs. Admin-only.",
  cash_position_snapshots:
    "Use to seed point-in-time cash on hand. Admin-controlled truth.",
  client_pipeline_deals:
    "Use to bring open and recent sales opportunities into the client pipeline.",
};

interface Props {
  /** Optional: when provided, "Use in import" preselects this target in the wizard. */
  onUseTemplate?: (targetId: ImportTargetId) => void;
}

export function TemplateLibrary({ onUseTemplate }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Template Library
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          One place for every import template. Download to share with a client,
          or use directly in the import flow.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {IMPORT_TARGETS.map((t) => (
            <TemplateCard key={t.id} target={t} onUseTemplate={onUseTemplate} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateCard({
  target,
  onUseTemplate,
}: {
  target: ImportTargetSpec;
  onUseTemplate?: (targetId: ImportTargetId) => void;
}) {
  const required = target.fields.filter((f) => f.required).length;
  return (
    <div className="border rounded-md p-3 flex flex-col gap-2 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm flex items-center gap-2">
            <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
            {target.label}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {target.fields.length} columns · {required} required
          </div>
        </div>
        {!target.clientAllowed && (
          <Badge variant="outline" className="text-[10px]">
            Admin only
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{WHEN_TO_USE[target.id]}</p>
      <div className="text-[10px] font-mono text-muted-foreground truncate">
        {templateFileName(target.id)}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => downloadTemplate(target.id)}>
          <Download className="h-3.5 w-3.5 mr-1" /> Download
        </Button>
        {onUseTemplate && (
          <Button size="sm" variant="ghost" onClick={() => onUseTemplate(target.id)}>
            Use in import
          </Button>
        )}
      </div>
    </div>
  );
}