/**
 * P12.3 — Reusable CSV import wizard.
 *
 * Four steps:
 *   1. Upload — read .csv text
 *   2. Target — pick destination domain (filtered by `audience`)
 *   3. Map    — confirm column → field mapping (auto-suggested)
 *   4. Review — disposition counts, per-row preview, commit
 *
 * Designed to be embedded in either admin or client surfaces. Client
 * mode hides admin-only targets and forces all rows into review.
 */

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  ListChecks,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  IMPORT_TARGETS,
  type ImportTargetSpec,
  type ImportTargetId,
  type ColumnMapping,
  type ValidationOutcome,
  parseCsv,
  suggestMappings,
  validateRows,
  batchHash,
  commitImport,
  plannedMappingsForTarget,
} from "@/lib/imports/csvImport";

type Audience = "admin" | "client";

interface Props {
  customerId: string;
  audience: Audience;
  onCompleted?: () => void;
}

const DISPOSITION_LABEL: Record<string, string> = {
  auto_trust: "Auto-trust",
  client_verify: "Client verify",
  admin_review: "Admin review",
  skipped: "Skipped",
};

const DISPOSITION_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  auto_trust: "default",
  client_verify: "secondary",
  admin_review: "outline",
  skipped: "destructive",
};

export function CsvImportWizard({ customerId, audience, onCompleted }: Props) {
  const { toast } = useToast();
  const targets = useMemo(
    () =>
      IMPORT_TARGETS.filter((t) => (audience === "client" ? t.clientAllowed : true)),
    [audience],
  );

  const [fileName, setFileName] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [targetId, setTargetId] = useState<ImportTargetId | "">("");
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [outcome, setOutcome] = useState<ValidationOutcome | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    trusted: number;
    staged: number;
    skipped: number;
    duplicates: number;
    batchRef: string;
    errors: string[];
  } | null>(null);

  const target = targetId ? targets.find((t) => t.id === targetId) ?? null : null;

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "CSV only for now",
        description:
          "Spreadsheet (.xlsx) import is planned. For now, export your sheet to CSV and re-upload.",
        variant: "destructive",
      });
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0) {
      toast({ title: "Empty file", description: "No rows detected.", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    setFileContent(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setOutcome(null);
    setDone(null);
    setMappings([]);
    setTargetId("");
  };

  const chooseTarget = (id: ImportTargetId) => {
    setTargetId(id);
    const t = targets.find((x) => x.id === id);
    if (!t) return;
    setMappings(suggestMappings(headers, t));
    setOutcome(null);
  };

  const updateMapping = (column: string, fieldKey: string | null) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.column === column
          ? { ...m, fieldKey, confidence: fieldKey ? "high" : "low" }
          : m,
      ),
    );
    setOutcome(null);
  };

  const runValidation = () => {
    if (!target) return;
    const o = validateRows({ raw: rows, mappings, target });
    setOutcome(o);
  };

  const submit = async (forceReview = false) => {
    if (!target || !outcome) return;
    setSubmitting(true);
    try {
      const ref = await batchHash(fileName, fileContent, target.id);
      const result = await commitImport({
        customerId,
        target,
        outcome,
        fileName,
        batchRef: ref,
        forceReview: audience === "client" ? true : forceReview,
      });
      setDone({
        trusted: result.trustedInserted,
        staged: result.stagedForReview,
        skipped: result.skipped,
        duplicates: result.duplicatesSkipped,
        batchRef: result.batchRef,
        errors: result.errors,
      });
      if (result.errors.length === 0) {
        toast({
          title: "Import complete",
          description: `${result.trustedInserted} trusted • ${result.stagedForReview} for review • ${result.skipped} skipped`,
        });
        onCompleted?.();
      } else {
        toast({
          title: "Import finished with notes",
          description: result.errors[0],
        });
      }
    } catch (e) {
      toast({
        title: "Import failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Step 1: upload ── */
  if (!fileName) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload a CSV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-10 cursor-pointer hover:bg-muted/40 transition-colors">
            <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm font-medium">Choose CSV file</span>
            <span className="text-xs text-muted-foreground mt-1">
              .csv only — spreadsheet (.xlsx) support is planned
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>
        </CardContent>
      </Card>
    );
  }

  /* ── Done ── */
  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Import complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Trusted" value={done.trusted} />
            <Stat label="For review" value={done.staged} />
            <Stat label="Skipped" value={done.skipped} />
            <Stat label="Duplicates" value={done.duplicates} />
          </div>
          <div className="text-xs text-muted-foreground">
            Batch ref: <code>{done.batchRef}</code>
          </div>
          {done.errors.length > 0 && (
            <Alert variant="default">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Notes</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {done.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setFileName("");
              setFileContent("");
              setHeaders([]);
              setRows([]);
              setMappings([]);
              setOutcome(null);
              setTargetId("");
              setDone(null);
            }}
          >
            Import another file
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Steps 2/3/4 ── */
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileUp className="h-4 w-4" /> {fileName}
            </span>
            <Badge variant="outline">{rows.length} rows</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 2 — target */}
          <div>
            <div className="text-sm font-medium mb-2">1. Choose import target</div>
            <Select value={targetId} onValueChange={(v) => chooseTarget(v as ImportTargetId)}>
              <SelectTrigger>
                <SelectValue placeholder="Select where this data belongs..." />
              </SelectTrigger>
              <SelectContent>
                {targets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {target && (
              <p className="text-xs text-muted-foreground mt-2">
                {target.description} · default policy:{" "}
                <strong>{DISPOSITION_LABEL[target.defaultVerification] ?? target.defaultVerification}</strong>
                {plannedMappingsForTarget(target).length > 0 && (
                  <>
                    {" "}
                    · {plannedMappingsForTarget(target).length} planned connector mapping(s)
                  </>
                )}
              </p>
            )}
          </div>

          {/* Step 3 — mappings */}
          {target && (
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                2. Confirm column mapping
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-normal text-muted-foreground">
                  Auto-suggestions shown · unknown columns are ignored by default
                </span>
              </div>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">CSV column</TableHead>
                      <TableHead>Maps to</TableHead>
                      <TableHead className="w-24">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((m) => (
                      <TableRow key={m.column}>
                        <TableCell className="font-mono text-xs">{m.column}</TableCell>
                        <TableCell>
                          <Select
                            value={m.fieldKey ?? "__ignore"}
                            onValueChange={(v) =>
                              updateMapping(m.column, v === "__ignore" ? null : v)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__ignore">— ignore —</SelectItem>
                              {target.fields.map((f) => (
                                <SelectItem key={f.key} value={f.key}>
                                  {f.label}
                                  {f.required ? " *" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              m.confidence === "high"
                                ? "default"
                                : m.confidence === "medium"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {m.confidence}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={runValidation} size="sm">
                  <ListChecks className="h-4 w-4 mr-1" /> Preview & validate
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 — review */}
          {outcome && target && (
            <div className="space-y-3">
              <div className="text-sm font-medium">3. Review staged rows</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Auto-trust" value={outcome.counts.auto_trust} />
                <Stat label="Client verify" value={outcome.counts.client_verify} />
                <Stat label="Admin review" value={outcome.counts.admin_review} />
                <Stat label="Skipped" value={outcome.counts.skipped} />
              </div>

              {outcome.unmappedRequiredFields.length > 0 && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Required fields not mapped</AlertTitle>
                  <AlertDescription>
                    {outcome.unmappedRequiredFields.join(", ")} — every row will be skipped
                    until these are mapped.
                  </AlertDescription>
                </Alert>
              )}
              {outcome.unknownColumns.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Unknown columns ignored</AlertTitle>
                  <AlertDescription>
                    {outcome.unknownColumns.join(", ")} — these will not be imported
                    (default-deny).
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-md overflow-x-auto max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Disposition</TableHead>
                      <TableHead>Preview</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outcome.rows.slice(0, 50).map((r) => (
                      <TableRow key={r.index}>
                        <TableCell className="text-xs">{r.index + 1}</TableCell>
                        <TableCell>
                          <Badge variant={DISPOSITION_VARIANT[r.disposition]}>
                            {DISPOSITION_LABEL[r.disposition]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono truncate max-w-md">
                          {Object.entries(r.values)
                            .slice(0, 4)
                            .map(([k, v]) => `${k}=${v ?? "—"}`)
                            .join(" · ")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {[...r.errors, ...r.warnings].join(" · ") || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {outcome.rows.length > 50 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    showing first 50 of {outcome.rows.length} rows
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => submit(false)}
                  disabled={submitting || outcome.counts.auto_trust + outcome.counts.client_verify + outcome.counts.admin_review === 0}
                >
                  Confirm import
                </Button>
                {audience === "admin" && (
                  <Button
                    variant="outline"
                    onClick={() => submit(true)}
                    disabled={submitting}
                  >
                    Stage all for review (no auto-trust)
                  </Button>
                )}
                <p className="text-xs text-muted-foreground self-center">
                  {audience === "client"
                    ? "Client imports always go to review. Admin will verify before activation."
                    : "Auto-trust rows write directly to your trusted tables. All others go into the review queue."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
