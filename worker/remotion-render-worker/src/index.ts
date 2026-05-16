import { processNextJob } from "./renderJob.js";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 15000);
function req(n: string): string { const v = process.env[n]; if (!v) { console.error(`missing ${n}`); process.exit(1); } return v; }
async function main() {
  const env = { supabaseUrl: req("SUPABASE_URL"), serviceKey: req("SUPABASE_SERVICE_ROLE_KEY"), sharedSecret: req("REMOTION_WORKER_SHARED_SECRET") };
  console.log(`[worker] polling every ${POLL_INTERVAL_MS}ms`);
  while (true) {
    try { const r = await processNextJob(env); if (r === "idle") await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS)); }
    catch (e) { console.error("[worker]", e); await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS)); }
  }
}
main();
