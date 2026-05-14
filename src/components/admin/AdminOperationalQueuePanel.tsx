/**
 * P88 — Admin Operational Queue panel.
 *
 * Aggregates the highest-priority operational signals across the
 * portfolio: evidence review queue, diagnostic timeline attention,
 * and recent reminder/email-attempt status. Honest reminder labels —
 * never claims an email was sent unless the row's send_status is "sent".
 *
 * No fake automation. No live-sync claims. Admin-only data — never
 * mounted on a client surface.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks, ClipboardCheck, Mail, ShieldAlert } from "lucide-react";
import {
  adminListEvidenceReviewQueue,
  adminListTimelineAttention,
  adminListRecentEmailAttempts,
  reminderStatusLabel,
  isEmailBackendWired,
  type AdminAttemptRow,
  type AdminEvidenceQueueRow,
  type AdminTimelineQueueRow,
} from "@/lib/adminCommandCenter";
import { EVIDENCE_SLOT_STATUS_CLIENT_LABEL } from "@/config/evidenceVaultSlots";

export function AdminOperationalQueuePanel() {
  const [evidence, setEvidence] = useState<AdminEvidenceQueueRow[]>([]);
  const [timeline, setTimeline] = useState<AdminTimelineQueueRow[]>([]);
  const [attempts, setAttempts] = useState<AdminAttemptRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [e, t, a] = await Promise.all([
        adminListEvidenceReviewQueue(15).catch(() => []),
        adminListTimelineAttention(15).catch(() => []),
        adminListRecentEmailAttempts(15).catch(() => []),
      ]);
      setEvidence(e);
      setTimeline(t);
      setAttempts(a);
      setLoaded(true);
    })();
  }, []);

  const backendWired = isEmailBackendWired();

  return (
    <section className="bg-card border border-border rounded-xl p-5 mb-8 min-w-0" data-testid="admin-operational-queue">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <ShieldAlert className="h-3 w-3" /> Operational Queue
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <h2 className="text-lg text-foreground font-light tracking-tight">
          What needs attention first
        </h2>
        <span className="text-[11px] text-muted-foreground italic">
          {backendWired
            ? "Reminder sends reflect real backend status."
            : "Admin-tracked only — automated email not wired."}
        </span>
      </div>

      {!loaded && (
        <div className="text-xs text-muted-foreground mt-4">Loading queue…</div>
      )}

      {/* Evidence review queue */}
      <div className="mt-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          <ClipboardCheck className="h-3 w-3" /> Evidence review queue ({evidence.length})
        </div>
        {evidence.length === 0 ? (
          <WorkflowEmptyState
            title="No evidence is waiting for admin review."
            body="Items appear here when clients upload documents into requested evidence slots. Until then, no review is needed. Use a customer's Evidence Vault to request new evidence."
            testId="op-queue-evidence-empty"
          />
        ) : (
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {evidence.slice(0, 8).map((r) => (
              <li key={r.id} className="p-3 flex items-center gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">{r.slot_key}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {(EVIDENCE_SLOT_STATUS_CLIENT_LABEL as Record<string, string>)[r.status] ??
                      r.status}
                  </div>
                </div>
                <Link
                  to={`/admin/customers/${r.customer_id}#evidence-vault`}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Diagnostic timeline attention */}
      <div className="mt-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          <ListChecks className="h-3 w-3" /> Diagnostic timeline attention ({timeline.length})
        </div>
        {timeline.length === 0 ? (
          <WorkflowEmptyState
            title="No diagnostic timeline stages need attention."
            body="Timeline stages flag here when an interview, evidence step, or report step is overdue or scheduled. When everything is current, this list stays empty."
            testId="op-queue-timeline-empty"
          />
        ) : (
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {timeline.slice(0, 8).map((r) => (
              <li key={r.id} className="p-3 flex items-center gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">{r.stage_key}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.status}
                    {r.scheduled_at ? ` · scheduled ${new Date(r.scheduled_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <Link
                  to={`/admin/customers/${r.customer_id}#diagnostic-timeline`}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reminder / email attempt tracking — honest labels only */}
      <div className="mt-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          <Mail className="h-3 w-3" /> Reminder tracking ({attempts.length})
        </div>
        {attempts.length === 0 ? (
          <WorkflowEmptyState
            title="No reminder attempts recorded yet."
            body="This list logs admin-tracked reminder attempts. Automated email is not wired — reminders are admin-sent and admin-logged. Records appear here once an admin marks a reminder as sent."
            testId="op-queue-reminders-empty"
          />
        ) : (
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {attempts.slice(0, 8).map((r) => (
              <li key={r.id} className="p-3 flex items-center gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">{r.notification_type}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {reminderStatusLabel(r.send_status)}
                  </div>
                </div>
                {r.customer_id && (
                  <Link
                    to={`/admin/customers/${r.customer_id}`}
                    className="text-xs text-primary hover:underline shrink-0"
                  >
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}