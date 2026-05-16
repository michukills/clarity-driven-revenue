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
import { AlertTriangle, Download, Film, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateVideoProject,
  adminListVideoProjectsForAsset,
  adminTransitionVideoProject,
  adminListRenderJobs,
  adminRequestRender,
  adminRecordRenderSetupRequired,
  adminRecordRenderFailed,
  adminGetRenderWorkerStatus,
  requestCampaignVideoSignedDownload,
  type ProjectRow,
  type RenderJobRow,
} from "@/lib/campaignControl/campaignVideoData";
import type { CampaignVideoAction } from "@/lib/campaignControl/campaignVideoStatusMachine";
import { MANUAL_PUBLISH_READY_CLARIFICATION } from "@/lib/campaignControl/campaignVideoStatusMachine";
import type { VideoBrainContext } from "@/lib/campaignControl/campaignVideoBrain";
import { AiOutputEnvelopePanel } from "@/components/ai/AiOutputEnvelopePanel";
import type { AiOutputEnvelope, AiOutputEnvelopeConfidenceLevel } from "@/lib/ai/aiOutputEnvelopeTypes";

function buildVideoPlanEnvelope(
  plan: Record<string, unknown>,
  outline: Record<string, unknown>,
): AiOutputEnvelope | null {
  if (!plan || typeof plan !== "object") return null;
  const confidence = (plan.confidence_level as string) ?? "low";
  const level: AiOutputEnvelopeConfidenceLevel =
    confidence === "high" || confidence === "medium" ? confidence : "low";
  const missing = (plan.missing_inputs as string[]) ?? [];
  const risks = (plan.risk_warnings as string[]) ?? [];
  return {
    title: (outline.title as string) ?? "Campaign video AI-assisted draft",
    summary: "",
    recommended_next_actions: [],
    confidence_level: level,
    confidence_reason:
      typeof plan.confidence_reason === "string"
        ? (plan.confidence_reason as string)
        : "Derived from scene plan completeness. Human review required.",
    missing_inputs: Array.isArray(missing) ? missing : [],
    evidence_basis: [],
    assumptions: [],
    risk_warnings: Array.isArray(risks) ? risks : [],
    claim_safety_warnings: [],
    human_review_required: true,
    client_safe_output: false,
    output_schema_version: "campaign-video-plan-derived-v1",
  };
}

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
  const [renderJobs, setRenderJobs] = useState<Record<string, RenderJobRow[]>>({});
  const [workerStatus, setWorkerStatus] = useState<{
    worker_configured: boolean;
    queued_jobs: number;
    dead_lettered_jobs: number;
    recent_worker_activity_count: number;
    notes: string;
  } | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setActorId(data.user?.id ?? null));
    void adminGetRenderWorkerStatus().then((s) => setWorkerStatus(s));
  }, []);

  const refresh = useCallback(async () => {
    const rows = await adminListVideoProjectsForAsset(asset.id);
    setProjects(rows);
    const jobMap: Record<string, RenderJobRow[]> = {};
    for (const p of rows) {
      jobMap[p.id] = await adminListRenderJobs(p.id);
    }
    setRenderJobs(jobMap);
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

  async function requestRender(project: ProjectRow) {
    setBusy(true);
    try {
      const res = await adminRequestRender(project, { actor_user_id: actorId });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Render requested. No runner is wired yet — record the outcome honestly below.");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }
  async function recordSetupRequired(project: ProjectRow) {
    setBusy(true);
    try {
      const res = await adminRecordRenderSetupRequired(project, {
        actor_user_id: actorId,
        reason: "Remotion render runner is not wired in this environment.",
      });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Recorded: render setup required.");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }
  async function recordFailed(project: ProjectRow) {
    const reason = window.prompt("Render failure reason?");
    if (!reason) return;
    setBusy(true);
    try {
      const res = await adminRecordRenderFailed(project, { actor_user_id: actorId, reason });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Recorded: render failed.");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function downloadApproved(projectId: string) {
    setBusy(true);
    try {
      const res = await requestCampaignVideoSignedDownload(projectId);
      if (res.ok !== true) {
        toast.error((res as { error: string }).error);
        return;
      }
      // Open in a new tab; the URL itself is short-lived and never logged.
      window.open(res.signed_url, "_blank", "noopener,noreferrer");
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

      {workerStatus ? (
        <div
          data-testid="render-worker-status"
          className={`mb-3 rounded-md border p-2 text-[11px] ${
            workerStatus.worker_configured
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          <strong>
            {workerStatus.worker_configured
              ? "Render worker configured"
              : "Rendering setup required"}
          </strong>
          <span className="ml-2 text-muted-foreground">{workerStatus.notes}</span>
          {workerStatus.dead_lettered_jobs > 0 ? (
            <span className="ml-2">· dead-lettered: {workerStatus.dead_lettered_jobs}</span>
          ) : null}
        </div>
      ) : null}

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
        const derivedEnvelope = buildVideoPlanEnvelope(plan, outline);
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

            {derivedEnvelope ? (
              <div className="mt-3">
                <AiOutputEnvelopePanel
                  envelope={derivedEnvelope}
                  variant="compact"
                />
              </div>
            ) : null}

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
              <Button size="sm" variant="outline" disabled={busy || p.video_status !== "scene_plan_ready"} onClick={() => requestRender(p)}>
                Request render
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => recordSetupRequired(p)}>
                Record: setup required
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => recordFailed(p)}>
                Record: render failed
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

            {renderJobs[p.id] && renderJobs[p.id].length > 0 ? (
              <div className="mt-3 rounded-md border border-border bg-background/30 p-2 text-[11px] text-muted-foreground">
                <div className="mb-1 font-medium text-foreground">Render jobs (no fake renders)</div>
                <ul className="space-y-1">
                  {renderJobs[p.id].map((j) => (
                    <li key={j.id} className="flex flex-wrap items-center gap-2">
                      <span>status: <strong>{j.status}</strong></span>
                      <span>· requested: {new Date(j.created_at).toLocaleString()}</span>
                      {j.error_message ? <span>· note: {j.error_message}</span> : null}
                      {j.output_storage_path ? (
                        <span>· output: protected (download available after approval)</span>
                      ) : (
                        <span>· no output file</span>
                      )}
                      {j.status === "draft_ready" && j.output_storage_path && p.approval_status === "approved" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid="admin-video-download"
                          disabled={busy}
                          onClick={() => downloadApproved(p.id)}
                        >
                          <Download className="h-3.5 w-3.5" /> Download approved video
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}