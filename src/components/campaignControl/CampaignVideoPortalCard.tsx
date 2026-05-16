/**
 * P98 — Read-only portal view of approved Campaign Videos.
 * No admin notes, no raw prompts, no internal metadata.
 */
import { useEffect, useState } from "react";
import { clientListVideoProjectsForCustomer } from "@/lib/campaignControl/campaignVideoData";
import { MANUAL_PUBLISH_READY_CLARIFICATION } from "@/lib/campaignControl/campaignVideoStatusMachine";

export function CampaignVideoPortalCard({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    let alive = true;
    void clientListVideoProjectsForCustomer(customerId).then((data) => {
      if (alive) setRows((data ?? []) as Array<Record<string, unknown>>);
    });
    return () => {
      alive = false;
    };
  }, [customerId]);

  return (
    <section className="rounded-xl border border-border bg-card/40 p-4">
      <h2 className="mb-3 text-lg text-foreground">Approved campaign videos</h2>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-background/30 p-3 text-sm text-muted-foreground">
          No approved campaign videos are available yet. Drafts are created by RGS and require human approval before they appear here.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div key={String(r.id)} className="rounded-lg border border-border bg-background/30 p-3">
              <div className="text-sm text-foreground">{String(r.title ?? "Campaign video")}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Format: {String(r.format ?? "—")} · Manual publish state: <strong>{String(r.manual_publish_status ?? "not_ready")}</strong>
              </p>
              {r.client_safe_summary ? (
                <p className="mt-2 text-sm text-muted-foreground">{String(r.client_safe_summary)}</p>
              ) : null}
              <p className="mt-3 text-[11px] text-muted-foreground">{MANUAL_PUBLISH_READY_CLARIFICATION}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}