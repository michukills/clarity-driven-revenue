import { supabase } from "@/integrations/supabase/client";
import { TOOL_WALKTHROUGH_VIDEO_REGISTRY } from "@/config/toolWalkthroughVideos";

export type WalkthroughVideoStatus =
  | "not_started" | "planned" | "recorded" | "uploaded" | "approved" | "archived";

export type WalkthroughCaptionFormat = "plain_text" | "srt" | "vtt";

export interface ClientWalkthroughVideo {
  id: string;
  tool_key: string;
  title: string;
  short_description: string | null;
  video_url: string | null;
  embed_url: string | null;
  transcript: string | null;
  captions: string | null;
  caption_format: WalkthroughCaptionFormat | null;
  duration_seconds: number | null;
}

export interface AdminWalkthroughVideo extends ClientWalkthroughVideo {
  video_status: WalkthroughVideoStatus;
  client_visible: boolean;
  internal_notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Client-safe: returns only approved, client-visible, non-archived videos. */
export async function getClientWalkthroughVideos(): Promise<ClientWalkthroughVideo[]> {
  const fallback = getClientStaticWalkthroughVideos();
  const { data, error } = await supabase.rpc("get_client_tool_walkthrough_videos");
  if (error) return fallback;

  const rows = (data ?? []) as ClientWalkthroughVideo[];
  if (rows.length === 0) return fallback;

  const byToolKey = new Map(rows.map((row) => [row.tool_key, row]));
  for (const row of fallback) {
    if (!byToolKey.has(row.tool_key)) byToolKey.set(row.tool_key, row);
  }
  return Array.from(byToolKey.values());
}

function getClientStaticWalkthroughVideos(): ClientWalkthroughVideo[] {
  return TOOL_WALKTHROUGH_VIDEO_REGISTRY
    .filter((entry) =>
      entry.show_in_client_portal &&
      entry.video_status === "finished" &&
      Boolean(entry.video_url)
    )
    .map((entry) => ({
      id: `static-${entry.tool_key}`,
      tool_key: entry.tool_key,
      title: entry.title,
      short_description: entry.description,
      video_url: entry.video_url,
      embed_url: null,
      transcript: null,
      captions: null,
      caption_format: "vtt" as const,
      duration_seconds: durationLabelToSeconds(entry.duration_label),
    }));
}

function durationLabelToSeconds(label: string | null): number | null {
  if (!label) return null;
  const [minutes, seconds] = label.split(":").map((part) => Number(part));
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  return minutes * 60 + seconds;
}

/** Admin-only: list all walkthrough videos (including drafts and archived). */
export async function adminListWalkthroughVideos(): Promise<AdminWalkthroughVideo[]> {
  const { data, error } = await supabase
    .from("tool_walkthrough_videos")
    .select("*")
    .order("tool_key", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminWalkthroughVideo[];
}

export async function adminCreateWalkthroughVideo(input: {
  tool_key: string;
  title: string;
  short_description?: string | null;
}): Promise<AdminWalkthroughVideo> {
  const { data, error } = await supabase
    .from("tool_walkthrough_videos")
    .insert(input as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminWalkthroughVideo;
}

export async function adminUpdateWalkthroughVideo(
  id: string,
  patch: Partial<Omit<AdminWalkthroughVideo, "id" | "created_at" | "updated_at">>,
): Promise<AdminWalkthroughVideo> {
  const { data, error } = await supabase
    .from("tool_walkthrough_videos")
    .update(patch as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminWalkthroughVideo;
}

export async function adminArchiveWalkthroughVideo(id: string): Promise<void> {
  const { error } = await supabase
    .from("tool_walkthrough_videos")
    .update({
      archived_at: new Date().toISOString(),
      video_status: "archived",
      client_visible: false,
    } as never)
    .eq("id", id);
  if (error) throw error;
}
