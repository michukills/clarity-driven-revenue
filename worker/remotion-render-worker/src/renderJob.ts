import { createClient } from "@supabase/supabase-js";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
interface Claim { render_job_id: string; video_project_id: string; customer_id: string | null; scene_plan: unknown; output: { bucket: string; path: string; mime_type: string }; }
export async function processNextJob(env: { supabaseUrl: string; serviceKey: string; sharedSecret: string }): Promise<"processed" | "idle" | "failed"> {
  const claimRes = await fetch(`${env.supabaseUrl}/functions/v1/campaign-video-render-claim`, { method: "POST", headers: { "Content-Type": "application/json", "x-remotion-worker-secret": env.sharedSecret }, body: "{}" });
  if (!claimRes.ok) { console.error("claim failed", claimRes.status); return "failed"; }
  const cb = (await claimRes.json()) as { job: Claim | null };
  if (!cb.job) return "idle";
  const job = cb.job;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), `r-${job.render_job_id}-`));
  const outFile = path.join(tmp, "out.mp4");
  try {
    const serveUrl = await bundle({ entryPoint: path.resolve(__dirname, "remotion/index.js") });
    const composition = await selectComposition({ serveUrl, id: "RgsCampaignVideo", inputProps: { scenePlan: job.scene_plan } });
    await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: outFile, inputProps: { scenePlan: job.scene_plan } });
    const buf = await fs.readFile(outFile);
    const sb = createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await sb.storage.from(job.output.bucket).upload(job.output.path, buf, { contentType: job.output.mime_type, upsert: true });
    if (error) throw error;
    await postCb(env, { render_job_id: job.render_job_id, outcome: "success", output_storage_bucket: job.output.bucket, output_storage_path: job.output.path, bytes: buf.byteLength, mime_type: job.output.mime_type });
    return "processed";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await postCb(env, { render_job_id: job.render_job_id, outcome: "failure", error_message: msg.slice(0, 240) });
    return "failed";
  } finally { await fs.rm(tmp, { recursive: true, force: true }).catch(() => {}); }
}
async function postCb(env: { supabaseUrl: string; sharedSecret: string }, body: Record<string, unknown>) {
  await fetch(`${env.supabaseUrl}/functions/v1/campaign-video-render-callback`, { method: "POST", headers: { "Content-Type": "application/json", "x-remotion-worker-secret": env.sharedSecret }, body: JSON.stringify(body) });
}
