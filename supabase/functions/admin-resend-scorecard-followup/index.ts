// P93E-E4B — Admin-only manual resend of the Scorecard follow-up email.
//
// Verifies the caller is an authenticated admin, re-reads the scorecard
// run server-side, applies a cooldown spam guard (force flag required to
// override), sends the follow-up via the shared email module, and logs
// every attempt to scorecard_email_attempts.
//
// Secrets (server-only): RESEND_API_KEY, RGS_EMAIL_FROM /
// FOLLOWUP_EMAIL_FROM, RGS_EMAIL_REPLY_TO. Never touched by the frontend.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  sendLeadFollowupEmail,
  topSlippingGear,
  safeFollowupFrom,
} from "../_shared/scorecard-followup-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cooldown window: refuse a manual resend within this many minutes of the
// most recent successful send unless `force: true` is supplied.
const RECENT_SEND_COOLDOWN_MIN = 60;

const BodySchema = z.object({
  runId: z.string().uuid(),
  force: z.boolean().optional().default(false),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function logAttempt(args: {
  supa: ReturnType<typeof admin>;
  runId: string;
  customerId: string | null;
  email: string;
  status: string;
  failureReason: string | null;
  providerMessageId: string | null;
  emailFrom: string | null;
  triggeredBy: string | null;
}): Promise<void> {
  try {
    await args.supa.rpc("admin_log_scorecard_email_attempt", {
      _run_id: args.runId,
      _customer_id: args.customerId,
      _email: args.email,
      _attempt_type: "manual_resend",
      _status: args.status,
      _safe_failure_reason: args.failureReason,
      _provider_message_id: args.providerMessageId,
      _email_from: args.emailFrom,
      _triggered_by: args.triggeredBy,
    });
  } catch (e) {
    console.warn("admin-resend-scorecard-followup: failed to log attempt", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    // 1) Authenticated user check.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return jsonResponse({ error: "unauthorized" }, 401);

    const supa = admin();

    // Validate the token via the auth admin API.
    const { data: userData, error: userErr } = await supa.auth.getUser(token);
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
    const userId = userData.user.id;

    // 2) Admin-only: verify via the existing is_admin SQL function.
    const { data: isAdminData, error: isAdminErr } = await supa.rpc("is_admin", {
      _user_id: userId,
    });
    if (isAdminErr || isAdminData !== true) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    // 3) Validate body.
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonResponse(
        { error: parsed.error.flatten().fieldErrors },
        400,
      );
    }
    const { runId, force } = parsed.data;

    // 4) Re-read run server-side. Never trust caller payload.
    const { data: run, error: runErr } = await supa
      .from("scorecard_runs")
      .select(
        "id, first_name, last_name, email, business_name, email_consent, " +
          "follow_up_email_status, linked_customer_id, " +
          "overall_score_estimate, overall_score_low, overall_score_high, " +
          "recommended_focus, pillar_results",
      )
      .eq("id", runId)
      .maybeSingle();
    if (runErr || !run) {
      return jsonResponse({ error: "run_not_found" }, 404);
    }
    if (!run.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(run.email)) {
      await logAttempt({
        supa,
        runId,
        customerId: run.linked_customer_id ?? null,
        email: run.email ?? "",
        status: "skipped_invalid_email",
        failureReason: "Invalid or missing recipient email",
        providerMessageId: null,
        emailFrom: null,
        triggeredBy: userId,
      });
      return jsonResponse({ status: "skipped_invalid_email" });
    }

    // 5) Cooldown spam guard — refuse repeat sends within window unless forced.
    if (!force) {
      const since = new Date(
        Date.now() - RECENT_SEND_COOLDOWN_MIN * 60 * 1000,
      ).toISOString();
      const { data: recent } = await supa
        .from("scorecard_email_attempts")
        .select("id, sent_at, status")
        .eq("scorecard_run_id", runId)
        .eq("status", "sent")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1);
      if (recent && recent.length > 0) {
        await logAttempt({
          supa,
          runId,
          customerId: run.linked_customer_id ?? null,
          email: run.email,
          status: "skipped_recently_sent",
          failureReason:
            `A follow-up email was sent within the last ${RECENT_SEND_COOLDOWN_MIN} minutes. Re-send with force=true to override.`,
          providerMessageId: null,
          emailFrom: null,
          triggeredBy: userId,
        });
        return jsonResponse({
          status: "skipped_recently_sent",
          cooldownMinutes: RECENT_SEND_COOLDOWN_MIN,
          requiresConfirm: true,
        });
      }
    }

    // 6) Send via shared module — same sender, reply-to, body, secrets.
    const result = await sendLeadFollowupEmail({
      to: run.email,
      firstName: run.first_name ?? "",
      businessName: run.business_name ?? "",
      scoreLow: run.overall_score_low,
      scoreHigh: run.overall_score_high,
      scoreEstimate: run.overall_score_estimate,
      recommendedFocus: Array.isArray(run.recommended_focus)
        ? (run.recommended_focus as string[])
        : [],
      topSlippingGear: topSlippingGear(run.pillar_results),
    });

    // 7) Log attempt + mirror onto scorecard_runs status when sent.
    await logAttempt({
      supa,
      runId,
      customerId: run.linked_customer_id ?? null,
      email: run.email,
      status: result.status,
      failureReason: result.error,
      providerMessageId: result.providerMessageId,
      emailFrom: result.from,
      triggeredBy: userId,
    });
    if (result.status === "sent") {
      try {
        await supa.rpc("admin_record_scorecard_email_result", {
          _run_id: runId,
          _kind: "follow_up",
          _status: "sent",
          _error: null,
          _recipients: [run.email],
          _from: result.from,
        });
      } catch (e) {
        console.warn(
          "admin-resend-scorecard-followup: failed to record run-level send status",
          e,
        );
      }
    }

    // 8) Honest response — never expose provider secrets / RESEND_API_KEY.
    return jsonResponse({
      status: result.status,
      from: safeFollowupFrom(),
      forced: !!force,
    });
  } catch (e) {
    console.error("admin-resend-scorecard-followup error", e);
    return jsonResponse({ status: "error" }, 500);
  }
});
