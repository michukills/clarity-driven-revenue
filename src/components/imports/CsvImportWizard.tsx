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
  Download,
  RefreshCw,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  IMPORT_TARGETS,
  type ImportTargetSpec,
  type ImportTargetId,
  type ColumnMapping,
  type ValidationOutcome,
  parseCsv,
  CsvParseError,
  suggestMappings,
  validateRows,
  batchHash,
  commitImport,
  plannedMappingsForTarget,
} from "@/lib/imports/csvImport";
import { downloadTemplate } from "@/lib/imports/templates";
import {
  parseWorkbook,
  extractSheet,
  isSpreadsheetFilename,
  type ParsedWorkbook,
} from "@/lib/imports/spreadsheetImport";

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

const SKIP_REASON_LABEL: Record<string, string> = {
  validation: "Validation errors",
  duplicate: "Duplicates of earlier rows",
  missing_required: "Missing required fields",
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
  const [parseError, setParseError] = useState<string | null>(null);
  const [templateTargetId, setTemplateTargetId] = useState<ImportTargetId | "">("");
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [sheetName, setSheetName] = useState<string>("");
  const [sourceKind, setSourceKind] = useState<"csv" | "xlsx">("csv");
  /**
   * P12.3.X.H — per-sheet mapping memory. When the user switches between
   * worksheets in the same workbook and back, restore the mapping + target
   * they had configured for that sheet so they don't have to remap.
   */
  const [sheetMemory, setSheetMemory] = useState<
    Record<
      string,
      { targetId: ImportTargetId | ""; mappings: ColumnMapping[] }
    >
  >({});
  const [done, setDone] = useState<{
    trusted: number;
    staged: number;
    skipped: number;
    duplicates: number;
    batchRef: string;
    errors: string[];
  } | null>(null);

  const target = targetId ? targets.find((t) => t.id === targetId) ?? null : null;
  const needsSheetChoice =
    sourceKind === "xlsx" && workbook !== null && (headers.length === 0 || rows.length === 0);

  const handleFile = async (file: File) => {
    setParseError(null);
    const isSheet = isSpreadsheetFilename(file.name);
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    if (!isSheet && !isCsv) {
      const msg =
        "Unsupported file type. Upload a .csv, .xlsx, or .xls file.";
      setParseError(msg);
      toast({ title: "Unsupported file", description: msg, variant: "destructive" });
      return;
    }
    if (file.size === 0) {
      setParseError("This file is empty.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setParseError(
        "This file is larger than 5 MB. Split it into smaller batches before importing.",
      );
      return;
    }
    if (isSheet) {
      let buf: ArrayBuffer;
      try {
        buf = await file.arrayBuffer();
      } catch (e) {
        setParseError(`Could not read file: ${(e as Error).message}`);
        return;
      }
      let wb: ParsedWorkbook;
      try {
        wb = parseWorkbook(buf);
      } catch (e) {
        const msg = e instanceof CsvParseError ? e.message : (e as Error).message;
        setParseError(msg);
        return;
      }
      const usable = wb.sheets.filter((s) => !s.empty);
      if (usable.length === 0) {
        setParseError("This workbook has no sheets with data.");
        return;
      }
      setSourceKind("xlsx");
      setWorkbook(wb);
      setFileName(file.name);
      // Use bytes signature as content fingerprint for batch hash
      setFileContent(`xlsx:${file.size}:${file.lastModified}`);
      setOutcome(null);
      setDone(null);
      setMappings([]);
      setTargetId("");
      setSheetMemory({});
      // Auto-pick the only usable sheet; otherwise wait for user choice
      if (usable.length === 1) {
        loadSheet(wb, usable[0].name, {});
      } else if (wb.defaultSheet) {
        // Multi-sheet — still preselect the best candidate sheet so the user
        // sees a preview immediately, but they can switch.
        loadSheet(wb, wb.defaultSheet, {});
      } else {
        setSheetName("");
        setHeaders([]);
        setRows([]);
      }
      return;
    }
    // CSV path
    let text: string;
    try {
      text = await file.text();
    } catch (e) {
      setParseError(`Could not read file: ${(e as Error).message}`);
      return;
    }
    let parsed;
    try {
      parsed = parseCsv(text);
    } catch (e) {
      const msg = e instanceof CsvParseError ? e.message : (e as Error).message;
      setParseError(msg);
      return;
    }
    if (parsed.rows.length === 0) {
      setParseError("Headers detected but no data rows. Add at least one row of data.");
      return;
    }
    setSourceKind("csv");
    setWorkbook(null);
    setSheetName("");
    setFileName(file.name);
    setFileContent(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setOutcome(null);
    setDone(null);
    setMappings([]);
    setTargetId("");
  };

  const loadSheet = (
    wb: ParsedWorkbook,
    name: string,
    memoryOverride?: Record<
      string,
      { targetId: ImportTargetId | ""; mappings: ColumnMapping[] }
    >,
  ) => {
    setParseError(null);
    // Save the current sheet's mapping work before switching away.
    if (sheetName && sheetName !== name && (targetId || mappings.length > 0)) {
      setSheetMemory((prev) => ({
        ...prev,
        [sheetName]: { targetId, mappings },
      }));
    }
    const info = wb.sheets.find((s) => s.name === name);
    if (info?.empty) {
      setSheetName(name);
      setHeaders([]);
      setRows([]);
      setParseError(`Sheet "${name}" is empty — pick another sheet.`);
      return;
    }
    if (info?.headersBlank) {
      setSheetName(name);
      setHeaders([]);
      setRows([]);
      setParseError(
        `Sheet "${name}" has a blank header row. Add a header row at the top of the sheet (column names) and re-upload.`,
      );
      return;
    }
    if (info?.duplicateHeader) {
      setSheetName(name);
      setHeaders([]);
      setRows([]);
      setParseError(
        `Sheet "${name}" has duplicate column header "${info.duplicateHeader}". Rename so every column is unique.`,
      );
      return;
    }
    try {
      const parsed = extractSheet(wb, name);
      if (parsed.rows.length === 0) {
        setSheetName(name);
        setHeaders(parsed.headers);
        setRows([]);
        setParseError(
          `Sheet "${name}" has headers but no data rows. Add at least one row of data and re-upload.`,
        );
        return;
      }
      setSheetName(name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      // Restore previously configured target/mapping for this sheet, if any.
      const memSrc = memoryOverride ?? sheetMemory;
      const remembered = memSrc[name];
      if (remembered && remembered.targetId) {
        const t = targets.find((x) => x.id === remembered.targetId);
        if (t) {
          // Re-suggest mappings against current headers, then overlay any
          // user choices that are still valid for these headers.
          const fresh = suggestMappings(parsed.headers, t);
          const validHeaders = new Set(parsed.headers);
          const overlaid = fresh.map((m) => {
            const prior = remembered.mappings.find((x) => x.column === m.column);
            if (prior && validHeaders.has(prior.column)) {
              return { ...m, fieldKey: prior.fieldKey, confidence: prior.confidence };
            }
            return m;
          });
          setTargetId(t.id);
          setMappings(overlaid);
          setOutcome(null);
          return;
        }
      }
      setMappings([]);
      setOutcome(null);
      setTargetId("");
    } catch (e) {
      const msg = e instanceof CsvParseError ? e.message : (e as Error).message;
      setParseError(msg);
    }
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
      const fingerprint =
        sourceKind === "xlsx" ? `${fileContent}|sheet:${sheetName}` : fileContent;
      const ref = await batchHash(fileName, fingerprint, target.id);
      const result = await commitImport({
        customerId,
        target,
        outcome,
        fileName,
        batchRef: ref,
        forceReview: audience === "client" ? true : forceReview,
        sourceKind,
        sheetName: sourceKind === "xlsx" ? sheetName : undefined,
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

  const reset = () => {
    setFileName("");
    setFileContent("");
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setOutcome(null);
    setTargetId("");
    setDone(null);
    setParseError(null);
    setWorkbook(null);
    setSheetName("");
    setSourceKind("csv");
    setSheetMemory({});
  };

  const stepNumber = !fileName ? 1 : !targetId ? 2 : !outcome ? 3 : 4;

  /* ── Step 1: upload ── */
  if (!fileName) {
    return (
      <div className="space-y-4">
        <StepIndicator step={1} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" /> Upload a CSV or Excel file
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-10 cursor-pointer hover:bg-muted/40 transition-colors">
              <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">Choose CSV or Excel file</span>
              <span className="text-xs text-muted-foreground mt-1">
                .csv, .xlsx, or .xls · max 5 MB
              </span>
              <input
                type="file"
                accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </label>

            {parseError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>We couldn't read that file</AlertTitle>
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            <div className="border-t pt-3">
              <div className="text-xs font-medium mb-2 flex items-center gap-1">
                <Download className="h-3.5 w-3.5" /> Not sure what columns to use?
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Download a starter template — pre-filled with the right column
                names so the system maps everything automatically.
              </p>
              <div className="flex gap-2">
                <Select
                  value={templateTargetId}
                  onValueChange={(v) => setTemplateTargetId(v as ImportTargetId)}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Pick a data type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {targets.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!templateTargetId}
                  onClick={() => templateTargetId && downloadTemplate(templateTargetId)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Done ── */
  if (done) {
    const totalProcessed = done.trusted + done.staged + done.skipped;
    const nothingImported = done.trusted === 0 && done.staged === 0;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {nothingImported ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Nothing was imported
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" /> Import complete
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nothingImported && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No rows were saved</AlertTitle>
              <AlertDescription>
                {done.duplicates === totalProcessed && totalProcessed > 0
                  ? "Every row in this file was already imported earlier (duplicate batch)."
                  : "Every row was skipped — fix the issues above and try again. The original data is unchanged."}
              </AlertDescription>
            </Alert>
          )}
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
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-1" /> Import another file
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Steps 2/3/4 ── */
  return (
    <div className="space-y-4">
      <StepIndicator step={stepNumber} />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileUp className="h-4 w-4" /> {fileName}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{rows.length} rows</Badge>
              <Button size="sm" variant="ghost" onClick={reset}>
                Start over
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {parseError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Spreadsheet issue</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
          {/* Spreadsheet sheet picker (xlsx only) */}
          {sourceKind === "xlsx" && workbook && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <div className="text-sm font-medium">Worksheet</div>
                <span className="text-xs font-normal text-muted-foreground">
                  {workbook.sheets.length === 1
                    ? "This workbook has 1 sheet."
                    : `This workbook has ${workbook.sheets.length} sheets — pick the one with the data you want to import.`}
                </span>
              </div>
              <Select
                value={sheetName}
                onValueChange={(v) => workbook && loadSheet(workbook, v)}
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Choose a worksheet..." />
                </SelectTrigger>
                <SelectContent>
                  {workbook.sheets.map((s) => {
                    const status = s.empty
                      ? "empty"
                      : s.headersBlank
                      ? "blank header"
                      : s.duplicateHeader
                      ? "duplicate header"
                      : s.headersOnly
                      ? "no data rows"
                      : `${s.rowCount} row${s.rowCount === 1 ? "" : "s"}`;
                    const unusable =
                      s.empty || s.headersBlank || !!s.duplicateHeader || s.headersOnly;
                    return (
                      <SelectItem key={s.name} value={s.name} disabled={s.empty}>
                        <span className="truncate inline-block max-w-[18rem] align-bottom">
                          {s.name}
                        </span>
                        <span className={unusable ? "text-muted-foreground" : ""}>
                          {" · "}
                          {status}
                        </span>
                        {s.hidden ? " · hidden" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Worksheet preview — header + first 3 rows */}
              {sheetName && (() => {
                const info = workbook.sheets.find((s) => s.name === sheetName);
                if (!info || info.empty || info.headersBlank) return null;
                const previewHeaders = info.headers.length > 8 ? info.headers.slice(0, 8) : info.headers;
                const truncated = info.headers.length > previewHeaders.length;
                return (
                  <div className="rounded-md border bg-muted/20">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">Sheet preview · {sheetName}</span>
                      </div>
                      <div className="text-muted-foreground shrink-0">
                        {info.headers.length} column{info.headers.length === 1 ? "" : "s"} ·{" "}
                        {info.rowCount} row{info.rowCount === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {previewHeaders.map((h, i) => (
                              <TableHead key={i} className="font-mono text-[11px] whitespace-nowrap">
                                {h || <span className="text-muted-foreground italic">(blank)</span>}
                              </TableHead>
                            ))}
                            {truncated && (
                              <TableHead className="text-[11px] text-muted-foreground">
                                +{info.headers.length - previewHeaders.length} more
                              </TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {info.previewRows.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={previewHeaders.length + (truncated ? 1 : 0)}
                                className="text-xs text-muted-foreground py-3 text-center"
                              >
                                No data rows below the header.
                              </TableCell>
                            </TableRow>
                          ) : (
                            info.previewRows.map((r, i) => (
                              <TableRow key={i}>
                                {previewHeaders.map((_, j) => (
                                  <TableCell key={j} className="text-[11px] whitespace-nowrap max-w-[14rem] truncate">
                                    {r[j] || <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                ))}
                                {truncated && (
                                  <TableCell className="text-[11px] text-muted-foreground">…</TableCell>
                                )}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {needsSheetChoice && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Pick a worksheet to continue</AlertTitle>
              <AlertDescription>
                Choose which sheet contains the data you want to import. Then
                pick the import target below.
              </AlertDescription>
            </Alert>
          )}

          {/* Step 2 — target */}
          <div className={needsSheetChoice ? "opacity-50 pointer-events-none" : ""}>
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
                      <TableHead className="w-1/3">
                        {sourceKind === "xlsx" ? "Sheet column" : "CSV column"}
                      </TableHead>
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

              {(() => {
                const skipBreakdown = outcome.rows.reduce(
                  (acc, r) => {
                    if (r.skipReason) acc[r.skipReason] = (acc[r.skipReason] ?? 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                );
                const allSkipped =
                  outcome.counts.skipped > 0 &&
                  outcome.counts.auto_trust + outcome.counts.client_verify + outcome.counts.admin_review === 0;
                return (
                  <>
                    {allSkipped && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Every row would be skipped</AlertTitle>
                        <AlertDescription>
                          Nothing will be imported with the current mapping. Reasons:{" "}
                          {Object.entries(skipBreakdown)
                            .map(([k, v]) => `${SKIP_REASON_LABEL[k] ?? k} (${v})`)
                            .join(" · ") || "validation errors"}
                          .
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                );
              })()}
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
                          {r.skipReason && (
                            <Badge variant="outline" className="mr-1">
                              {SKIP_REASON_LABEL[r.skipReason]}
                            </Badge>
                          )}
                          {[...r.errors, ...r.warnings].join(" · ") || (r.skipReason ? "" : "—")}
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

const STEP_LABELS = ["Upload", "Choose target", "Map columns", "Review & commit"];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={
                "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold " +
                (done
                  ? "bg-primary text-primary-foreground"
                  : active
                  ? "bg-primary/20 text-primary border border-primary"
                  : "bg-muted text-muted-foreground")
              }
            >
              {n}
            </div>
            <span className={active ? "font-medium" : "text-muted-foreground"}>
              {label}
            </span>
            {n < STEP_LABELS.length && <span className="text-muted-foreground">›</span>}
          </div>
        );
      })}
    </div>
  );
}
