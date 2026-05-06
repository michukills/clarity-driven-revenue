/**
 * P87 — Admin Diagnostic Timeline panel.
 * 6 stages, scheduled/sent/completed/snoozed/extended states.
 * Day-4 / Day-6 reminder buttons route through P86 consent gate.
 * Honest labels: never claim "sent" unless email backend is wired.
 */
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  DIAGNOSTIC_STAGES,
  DIAGNOSTIC_STAGE_KEYS,
  STAGE_HAS_CLIENT_REMINDER,
  type DiagnosticStageKey,
  type DiagnosticStageStatus,
} from "@/config/diagnosticTimeline";
import {
  adminListTimelineStages,
  adminUpsertTimelineStage,
  adminCreateTimelineReminderAttempt,
  type AdminTimelineStageRow,
} from "@/lib/diagnosticTimeline";
import { EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED } from "@/config/evidenceDecay";

const STATUSES: DiagnosticStageStatus[] = [
  "not_scheduled","scheduled","sent","overdue","completed","snoozed","extended",
];

const STAGE_KEY_BY_DAY: Record<number, DiagnosticStageKey> = {
  1: "systems_interview",
  2: "evidence_vault_opens",
  4: "evidence_reminder",
  6: "evidence_window_closes",
  8: "rgs_review",
  10: "report_walkthrough",
};

export function DiagnosticTimelineAdminPanel({
  customerId,
  customerEmail,
  customerUserId,
}: {
  customerId: string;
  customerEmail?: string | null;
  customerUserId?: string | null;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminTimelineStageRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Record<string, Partial<AdminTimelineStageRow & { extendedReason: string }>>>({});

  const reload = async () => {
    try { setRows(await adminListTimelineStages(customerId)); }
    catch (e: any) { toast.error(e.message ?? "Failed to load timeline"); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const byKey = useMemo(() => {
    const m = new Map<DiagnosticStageKey, AdminTimelineStageRow>();
    for (const r of rows) m.set(r.stage_key, r);
    return m;
  }, [rows]);

  const save = async (stageKey: DiagnosticStageKey) => {
    if (!user?.id) return;
    const d = draft[stageKey] ?? {};
    const existing = byKey.get(stageKey);
    setBusy(true);
    try {
      const res = await adminUpsertTimelineStage({
        customerId,
        stageKey,
        status: (d.status ?? existing?.status ?? "scheduled") as DiagnosticStageStatus,
        scheduledAt: d.scheduled_at ?? existing?.scheduled_at ?? null,
        completedAt: d.completed_at ?? existing?.completed_at ?? null,
        snoozedUntil: d.snoozed_until ?? existing?.snoozed_until ?? null,
        extendedUntil: d.extended_until ?? existing?.extended_until ?? null,
        extensionReason:
          (d as any).extendedReason ?? existing?.extension_reason ?? null,
        adminOnlyNote: d.admin_only_note ?? existing?.admin_only_note ?? null,
        adminId: user.id,
      });
      if (!res.ok) toast.error(`Blocked: ${res.reason}`);
      else { toast.success("Stage saved"); await reload(); }
    } finally { setBusy(false); }
  };

  const sendReminder = async (stageKey: DiagnosticStageKey) => {
    if (!customerEmail) {
      toast.message("No client email on file — admin-tracked only.");
      return;
    }
    setBusy(true);
    try {
      const r = await adminCreateTimelineReminderAttempt({
        customerId,
        stageKey,
        recipientEmail: customerEmail,
        userId: customerUserId ?? null,
      });
      if (r.admin_tracked_only) {
        toast.message(`Admin-tracked only (${r.status}). Email backend ${EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED ? "wired" : "not wired"}.`);
      } else {
        toast.success("Reminder sent");
      }
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="admin-diagnostic-timeline-panel" className="space-y-3">
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5 mt-0.5" />
        <p>
          10-day diagnostic cadence. Day-4 / Day-6 reminder buttons honor
          P86 email-consent. UI never claims "sent" if the email backend
          is not wired.
        </p>
      </div>
      <ul className="space-y-3">
        {DIAGNOSTIC_STAGES.map((s) => {
          const stageKey = STAGE_KEY_BY_DAY[s.day];
          const row = byKey.get(stageKey);
          const d = draft[stageKey] ?? {};
          const hasReminder = STAGE_HAS_CLIENT_REMINDER[stageKey];
          return (
            <li key={stageKey} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-medium text-foreground">Day {s.day} · {s.title}</div>
                  <div className="text-[11px] text-muted-foreground">{s.body}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{row?.status ?? "not_scheduled"}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-[11px] text-muted-foreground">
                  Scheduled at
                  <Input
                    type="datetime-local"
                    value={(d.scheduled_at ?? row?.scheduled_at ?? "").toString().slice(0,16)}
                    onChange={(e) => setDraft((p) => ({ ...p, [stageKey]: { ...d, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null } }))}
                  />
                </label>
                <label className="text-[11px] text-muted-foreground">
                  Completed at
                  <Input
                    type="datetime-local"
                    value={(d.completed_at ?? row?.completed_at ?? "").toString().slice(0,16)}
                    onChange={(e) => setDraft((p) => ({ ...p, [stageKey]: { ...d, completed_at: e.target.value ? new Date(e.target.value).toISOString() : null } }))}
                  />
                </label>
                <label className="text-[11px] text-muted-foreground">
                  Snoozed until
                  <Input
                    type="datetime-local"
                    value={(d.snoozed_until ?? row?.snoozed_until ?? "").toString().slice(0,16)}
                    onChange={(e) => setDraft((p) => ({ ...p, [stageKey]: { ...d, snoozed_until: e.target.value ? new Date(e.target.value).toISOString() : null } }))}
                  />
                </label>
                <label className="text-[11px] text-muted-foreground">
                  Extended until {stageKey === "evidence_window_closes" && <span className="text-amber-600">(reason required)</span>}
                  <Input
                    type="datetime-local"
                    value={(d.extended_until ?? row?.extended_until ?? "").toString().slice(0,16)}
                    onChange={(e) => setDraft((p) => ({ ...p, [stageKey]: { ...d, extended_until: e.target.value ? new Date(e.target.value).toISOString() : null } }))}
                  />
                </label>
              </div>
              {stageKey === "evidence_window_closes" && (
                <Input
                  placeholder="Extension reason (admin-only)"
                  value={(d as any).extendedReason ?? row?.extension_reason ?? ""}
                  onChange={(e) => setDraft((p) => ({ ...p, [stageKey]: { ...d, extendedReason: e.target.value } as any }))}
                />
              )}
              <Textarea
                placeholder="Admin-only note"
                value={(d.admin_only_note ?? row?.admin_only_note ?? "")}
                onChange={(e) => setDraft((p) => ({ ...p, [stageKey]: { ...d, admin_only_note: e.target.value } }))}
              />
              <div className="flex flex-wrap gap-2 items-center">
                {STATUSES.map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={(d.status ?? row?.status) === st ? "default" : "outline"}
                    onClick={() => setDraft((p) => ({ ...p, [stageKey]: { ...d, status: st } }))}
                  >
                    {st}
                  </Button>
                ))}
                <Button size="sm" disabled={busy} onClick={() => save(stageKey)}>Save</Button>
                {hasReminder && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => sendReminder(stageKey)}
                  >
                    <BellRing className="h-3 w-3 mr-1" /> Attempt reminder
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {!EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED && (
        <p className="text-[11px] text-muted-foreground italic">
          Email backend is not wired — reminder attempts log as
          admin-tracked only.
        </p>
      )}
    </div>
  );
}

export default DiagnosticTimelineAdminPanel;