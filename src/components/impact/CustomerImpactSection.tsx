// P9.0 — Admin section: Impact Ledger for a single customer.
import { useEffect, useMemo, useState } from "react";
import { Plus, Eye, EyeOff, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  archiveImpactEntry,
  draftFromEntry,
  emptyDraft,
  formatImpactValue,
  IMPACT_AREAS,
  IMPACT_AREA_LABEL,
  IMPACT_STATUSES,
  IMPACT_STATUS_LABEL,
  IMPACT_TYPES,
  IMPACT_TYPE_LABEL,
  IMPACT_VISIBILITIES,
  IMPACT_VISIBILITY_LABEL,
  loadImpactForCustomer,
  saveImpactEntry,
  type ImpactArea,
  type ImpactDraft,
  type ImpactEntry,
  type ImpactStatus,
  type ImpactType,
  type ImpactVisibility,
} from "@/lib/impact/ledger";
import { ImpactEntryDialog } from "./ImpactEntryDialog";

function fmt(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusTone(s: ImpactStatus): string {
  switch (s) {
    case "verified":
    case "resolved":
    case "improved":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "installed":
      return "border-primary/40 bg-primary/10 text-foreground";
    case "in_progress":
      return "border-sky-500/40 bg-sky-500/10 text-sky-300";
    case "identified":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "archived":
    default:
      return "border-border bg-muted/20 text-muted-foreground";
  }
}

function visibilityTone(v: ImpactVisibility): string {
  return v === "client_visible"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : "border-border bg-muted/30 text-muted-foreground";
}

interface Props {
  customerId: string;
  initialDraft?: ImpactDraft | null;
  onConsumedInitialDraft?: () => void;
}

export function CustomerImpactSection({ customerId, initialDraft, onConsumedInitialDraft }: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ImpactEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ImpactDraft | null>(null);
  const [filterStatus, setFilterStatus] = useState<ImpactStatus | "all">("all");
  const [filterArea, setFilterArea] = useState<ImpactArea | "all">("all");
  const [filterType, setFilterType] = useState<ImpactType | "all">("all");
  const [filterVisibility, setFilterVisibility] = useState<ImpactVisibility | "all">("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await loadImpactForCustomer(customerId);
      setEntries(data);
    } catch (e: any) {
      toast.error(e?.message || "Could not load impact ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  // Open dialog with externally-supplied draft (e.g. from review queue).
  useEffect(() => {
    if (initialDraft) {
      setDraft(initialDraft);
      setOpen(true);
      onConsumedInitialDraft?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraft]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (filterArea !== "all" && e.impact_area !== filterArea) return false;
      if (filterType !== "all" && e.impact_type !== filterType) return false;
      if (filterVisibility !== "all" && e.visibility !== filterVisibility) return false;
      return true;
    });
  }, [entries, filterStatus, filterArea, filterType, filterVisibility]);

  const startNew = () => {
    setDraft(emptyDraft(customerId));
    setOpen(true);
  };

  const startEdit = (entry: ImpactEntry) => {
    setDraft(draftFromEntry(entry));
    setOpen(true);
  };

  const toggleVisibility = async (entry: ImpactEntry) => {
    const next: ImpactVisibility = entry.visibility === "client_visible" ? "admin_only" : "client_visible";
    if (next === "client_visible" && !(entry.client_note && entry.client_note.trim())) {
      toast.error("Add a client note before sharing this entry with the client.");
      startEdit({ ...entry, visibility: "client_visible" });
      return;
    }
    const res = await saveImpactEntry(
      { ...draftFromEntry(entry), visibility: next },
      user?.id ?? null,
    );
    if (!res.ok) {
      toast.error(res.error || "Could not change visibility.");
      return;
    }
    toast.success(next === "client_visible" ? "Shared with client." : "Hidden from client.");
    void load();
  };

  const archive = async (entry: ImpactEntry) => {
    const res = await archiveImpactEntry(entry.id, user?.id ?? null);
    if (!res.ok) {
      toast.error(res.error || "Could not archive.");
      return;
    }
    toast.success("Archived.");
    void load();
  };

  const restore = async (entry: ImpactEntry) => {
    const res = await saveImpactEntry(
      { ...draftFromEntry(entry), status: "identified" },
      user?.id ?? null,
    );
    if (!res.ok) {
      toast.error(res.error || "Could not restore.");
      return;
    }
    toast.success("Restored.");
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Proof Layer
          </div>
          <h2 className="text-lg font-light text-foreground mt-0.5">RGS Impact Ledger™</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Source-backed record of what RGS identified, installed, reduced, resolved, or
            clarified. Admin-only by default — share entries with the client when ready.
          </p>
        </div>
        <Button onClick={startNew} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New impact entry
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <FilterSelect
          label="Status"
          value={filterStatus}
          onChange={(v) => setFilterStatus(v as ImpactStatus | "all")}
          options={[["all", "All"], ...IMPACT_STATUSES.map((s) => [s, IMPACT_STATUS_LABEL[s]] as const)]}
        />
        <FilterSelect
          label="Area"
          value={filterArea}
          onChange={(v) => setFilterArea(v as ImpactArea | "all")}
          options={[["all", "All"], ...IMPACT_AREAS.map((a) => [a, IMPACT_AREA_LABEL[a]] as const)]}
        />
        <FilterSelect
          label="Type"
          value={filterType}
          onChange={(v) => setFilterType(v as ImpactType | "all")}
          options={[["all", "All"], ...IMPACT_TYPES.map((t) => [t, IMPACT_TYPE_LABEL[t]] as const)]}
        />
        <FilterSelect
          label="Visibility"
          value={filterVisibility}
          onChange={(v) => setFilterVisibility(v as ImpactVisibility | "all")}
          options={[["all", "All"], ...IMPACT_VISIBILITIES.map((v) => [v, IMPACT_VISIBILITY_LABEL[v]] as const)]}
        />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading impact ledger…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {entries.length === 0
              ? "No impact entries yet. Add one when RGS identifies, installs, or resolves something meaningful."
              : "No entries match these filters."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((e) => {
            const value =
              e.current_value !== null && e.value_unit
                ? formatImpactValue(e.current_value, e.value_unit)
                : null;
            return (
              <li
                key={e.id}
                className="rounded-2xl border border-border bg-card/40 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{e.title}</span>
                      <Chip className={statusTone(e.status)}>{IMPACT_STATUS_LABEL[e.status]}</Chip>
                      <Chip className={visibilityTone(e.visibility)}>
                        {e.visibility === "client_visible" ? (
                          <Eye className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <EyeOff className="h-3 w-3 mr-1 inline" />
                        )}
                        {IMPACT_VISIBILITY_LABEL[e.visibility]}
                      </Chip>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">
                      {IMPACT_AREA_LABEL[e.impact_area]} · {IMPACT_TYPE_LABEL[e.impact_type]} · {fmt(e.impact_date)}
                    </div>
                    <p className="text-xs text-foreground/90 mt-1.5 whitespace-pre-wrap">{e.summary}</p>
                    {value && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Value: <span className="text-foreground tabular-nums">{value}</span>
                        {e.baseline_value !== null && e.value_unit && (
                          <span className="ml-1 opacity-70">
                            (from {formatImpactValue(e.baseline_value, e.value_unit)})
                          </span>
                        )}
                      </div>
                    )}
                    {e.admin_note && (
                      <div className="text-[11px] text-muted-foreground mt-1 italic">
                        Admin note: {e.admin_note}
                      </div>
                    )}
                    {e.client_note && (
                      <div className="text-[11px] text-emerald-300/80 mt-1">
                        Client-facing: {e.client_note}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                  <ActionBtn icon={Pencil} label="Edit" onClick={() => startEdit(e)} />
                  {e.status !== "archived" && (
                    <>
                      <ActionBtn
                        icon={e.visibility === "client_visible" ? EyeOff : Eye}
                        label={e.visibility === "client_visible" ? "Hide from client" : "Share with client"}
                        onClick={() => toggleVisibility(e)}
                      />
                      <ActionBtn icon={Archive} label="Archive" onClick={() => archive(e)} tone="muted" />
                    </>
                  )}
                  {e.status === "archived" && (
                    <ActionBtn icon={ArchiveRestore} label="Restore" onClick={() => restore(e)} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ImpactEntryDialog
        open={open}
        onOpenChange={setOpen}
        draft={draft}
        actorId={user?.id ?? null}
        onSaved={load}
      />
    </div>
  );
}

function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${className || ""}`}
    >
      {children}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">
      <span className="block mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-muted/20 border border-border rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/60"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  tone?: "muted";
}) {
  const cls =
    tone === "muted"
      ? "border-border text-muted-foreground hover:text-foreground"
      : "border-border text-foreground hover:bg-muted/20";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] transition-colors ${cls}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

export default CustomerImpactSection;