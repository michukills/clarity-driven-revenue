import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase.rpc("get_client_tool_walkthrough_videos");
  if (error) throw error;
  return (data ?? []) as ClientWalkthroughVideo[];
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