import { supabase } from "@/integrations/supabase/client";
import type { ReportStatus } from "./reportTypes";

/* P4.2 — Lightweight activity logging for report lifecycle events.
   Writes to the existing activity_log table (admin-visible) and to
   customer_timeline (for the linked client timeline). Failures are silent;
   logging must never block a status change. */

type Action =
  | "report_published"
  | "report_unpublished"
  | "report_archived"
  | "report_unarchived";

function actionFor(prev: ReportStatus | undefined, next: ReportStatus): Action | null {
  if (next === "published" && prev !== "published") return "report_published";
  if (next === "draft" && prev === "published") return "report_unpublished";
  if (next === "archived") return "report_archived";
  if (next === "draft" && prev === "archived") return "report_unarchived";
  return null;
}

const TITLES: Record<Action, string> = {
  report_published: "Report published",
  report_unpublished: "Report moved back to draft",
  report_archived: "Report archived",
  report_unarchived: "Report restored from archive",
};

export async function logReportActivity(
  reportId: string,
  prev: ReportStatus | undefined,
  next: ReportStatus,
  customerId?: string | null,
) {
  const action = actionFor(prev, next);
  if (!action) return;

  try {
    const { data: u } = await supabase.auth.getUser();
    const actor = u.user?.id ?? null;

    // Admin activity feed (existing table)
    await supabase.from("activity_log").insert([
      {
        action,
        actor_id: actor,
        customer_id: customerId ?? null,
        details: { report_id: reportId, from: prev ?? null, to: next },
      } as never,
    ]);

    // Client-visible timeline (only when the change is meaningful to a client)
    if (customerId && (action === "report_published" || action === "report_unpublished")) {
      await supabase.from("customer_timeline").insert([
        {
          customer_id: customerId,
          event_type: action,
          title: TITLES[action],
          // Detail intentionally omits internal notes.
          detail:
            action === "report_published"
              ? "A new report is available in your portal."
              : "A report previously shared has been temporarily unpublished.",
          actor_id: actor,
        } as never,
      ]);
    }
  } catch {
    // Swallow — activity logging must not break the status change.
  }
}