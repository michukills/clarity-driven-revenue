/**
 * P98 — Admin Campaign Video panel.
 *
 * Mounted inside the admin Campaign Control asset row. Only enabled
 * when the source asset is approved. All actions route through
 * `adminTransitionVideoProject` so the status machine + audit log
 * stay authoritative.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Film, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateVideoProject,
  adminListVideoProjectsForAsset,
  adminTransitionVideoProject,
  type ProjectRow,
} from "@/lib/campaignControl/campaignVideoData";
import type { CampaignVideoAction } from "@/lib/campaignControl/campaignVideoStatusMachine";
import { MANUAL_PUBLISH_READY_CLARIFICATION } from "@/lib/campaignControl/campaignVideoStatusMachine";
import type { VideoBrainContext } from "@/lib/campaignControl/campaignVideoBrain";

interface Props {
  asset: {
    id: string;
    approval_status: string;
    campaign_brief_id?: string | null;
    title?: string | null;
    platform?: string | null;
    asset_type?: string | null;
    edited_content?: string | null;
    draft_content?: string | null;
    client_safe_explanation?: string | null;
  };
  customerId: string;
  brainContext: VideoBrainContext;
}

export function CampaignVideoPanel({ asset, customerId, brainContext }: Props) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [actorId, setActorId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setActorId(data.user?.id ?? null));
  }, []);

  const refresh = useCallback(async () => {
    const rows = await adminListVideoProjectsForAsset(asset.id);
    setProjects(rows);
  }, [asset.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isEligible = asset.approval_status === "approved";

  async function startDraft() {
    setBusy(true);
    try {
      const res = await adminCreateVideoProject({
        asset: {
          id: asset.id,
          approval_status: asset.approval_status,
          campaign_brief_id: asset.campaign_brief_id ?? null,
          title: asset.title ?? null,
        },
        customer_id: customerId,
        actor_user_id: actorId,
        brain_context: brainContext,
      });
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Video draft created. Outline and Remotion-ready scene plan are ready for human review.");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function runAction(project: ProjectRow, action: CampaignVideoAction) {
    setBusy(true);
    try {
      const res = await adminTransitionVideoProject(project, action, { actor_user_id: actorId });
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Updated.");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Film className="h-4 w-4" /> Campaign video
        </div>
        {!isEligible ? (
          <span className="text-xs text-amber-300">
            Video drafting is available after this campaign asset is approved.
          </span>
        ) : null}
      </div>

      {isEligible && projects.length === 0 ? (
        <Button size="sm" onClick={startDraft} disabled={busy}>
          Start video draft (AI-assisted, requires human approval)
        </Button>
      ) : null}

      {projects.map((p) => {
        const outline = (p.outline ?? {}) as Record<string, unknown>;
        const plan = (p.scene_plan ?? {}) as Record<string, unknown>;
        const missing = ((plan.missing_inputs as string[]) ?? []) as string[];
        const risks = ((plan.risk_warnings as string[]) ?? []) as string[];
        return (
          <div key={p.id} className="mt-3 rounded-md border border-border bg-card/40 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-muted-foreground">
              <div>
                <div className="text-sm text-foreground">{(outline.title as string) ?? "Video draft"}</div>
                <div className="mt-1">
                  Status: <strong>{p.video_status}</strong> · Approval: <strong>{p.approval_status}</strong> · Manual publish:{" "}
                  <strong>{p.manual_publish_status}</strong>
                </div>
              </div>
              <div className="text-right">
                <div>Format: {(plan.format as string) ?? "—"}</div>
                <div>AI confidence: {(plan.confidence_level as string) ?? "—"}</div>
              </div>
            </div>

            {missing.length > 0 ? (
              <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                Missing inputs: {missing.join(" ")}
              </div>
            ) : null}

            {risks.length > 0 ? (
              <div className="mt-2 rounded-md border border-border bg-background/30 p-2 text-[11px] text-muted-foreground">
                Claim/risk notes: {risks.join(" ")}
              </div>
            ) : null}

            <div className="mt-2 rounded-md border border-border bg-background/30 p-2 text-[11px] text-muted-foreground">
              Rendering setup required. Outline + scene plan are ready for human review. RGS does not post to any platform in this phase.
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => runAction(p, "request_revision")}>
                Request revision
              </Button>
              <Button
                size="sm"
                disabled={busy || p.approval_status === "approved"}
                onClick={() => runAction(p, "approve")}
              >
                <ShieldCheck className="h-4 w-4" /> Approve video asset
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || p.approval_status !== "approved"}
                onClick={() => runAction(p, "mark_ready_for_export")}
              >
                Mark ready for manual export
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || p.manual_publish_status !== "ready_for_manual_export"}
                onClick={() => runAction(p, "mark_manual_publish_ready")}
              >
                Mark manual publish-ready
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => runAction(p, "reject")}>
                Reject
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => runAction(p, "archive")}>
                Archive
              </Button>
              <p className="basis-full text-[11px] text-muted-foreground">{MANUAL_PUBLISH_READY_CLARIFICATION}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}