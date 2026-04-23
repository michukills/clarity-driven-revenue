/**
 * P9.1 — Tool Usage Session tracking
 *
 * Lightweight, privacy-safe engagement tracking for client-facing tools.
 * Records aggregate seconds only — never form values, keystrokes, mouse
 * coordinates, page content, or screenshots.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ExitReason =
  | "navigation"
  | "visibility_hidden"
  | "idle_timeout"
  | "logout"
  | "manual"
  | "unknown";

export interface UseToolUsageSessionOptions {
  toolTitle: string;
  toolKey?: string | null;
  resourceId?: string | null;
  /** Idle threshold in seconds. Default 60. */
  idleThresholdSeconds?: number;
  /** Heartbeat update cadence in seconds. Default 45. */
  heartbeatSeconds?: number;
  /** Set false to temporarily disable (e.g. unauth). Default true. */
  enabled?: boolean;
}

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "click",
  "keydown",
  "scroll",
  "pointerdown",
  "focus",
];

/**
 * Hook that opens a usage session row when the component mounts and
 * accumulates active vs idle seconds, finalizing on navigation/unmount/
 * tab-hide. No event details are stored — only second counts.
 */
export function useToolUsageSession(opts: UseToolUsageSessionOptions): void {
  const { toolTitle, toolKey = null, resourceId = null } = opts;
  const idleThreshold = opts.idleThresholdSeconds ?? 60;
  const heartbeat = opts.heartbeatSeconds ?? 45;
  const enabled = opts.enabled ?? true;

  const { user } = useAuth();
  const location = useLocation();
  const route = location.pathname;

  const sessionIdRef = useRef<string | null>(null);
  const customerIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const lastActivityRef = useRef<number>(Date.now());
  const activeSecondsRef = useRef<number>(0);
  const idleSecondsRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const finalizedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;

    const start = async () => {
      // Resolve customer for current user
      const { data: c } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !c?.id) return;
      customerIdRef.current = c.id;

      const { data: row } = await supabase
        .from("tool_usage_sessions")
        .insert({
          customer_id: c.id,
          user_id: user.id,
          resource_id: resourceId,
          tool_key: toolKey,
          tool_title: toolTitle,
          route,
        })
        .select("id")
        .maybeSingle();
      if (cancelled || !row?.id) return;
      sessionIdRef.current = row.id;

      startedAtRef.current = Date.now();
      lastActivityRef.current = Date.now();
      activeSecondsRef.current = 0;
      idleSecondsRef.current = 0;
      finalizedRef.current = false;

      // Per-second tick — accumulates active vs idle without storing details.
      tickRef.current = window.setInterval(() => {
        const sinceActivity = (Date.now() - lastActivityRef.current) / 1000;
        if (sinceActivity <= idleThreshold) {
          activeSecondsRef.current += 1;
        } else {
          idleSecondsRef.current += 1;
        }
      }, 1000);

      // Periodic flush so admins see in-flight sessions even on hard exits.
      heartbeatRef.current = window.setInterval(() => {
        void flush(false, "unknown");
      }, heartbeat * 1000);
    };

    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const flush = async (final: boolean, reason: ExitReason) => {
      const id = sessionIdRef.current;
      if (!id) return;
      if (final && finalizedRef.current) return;
      const duration = Math.max(
        0,
        Math.round((Date.now() - startedAtRef.current) / 1000),
      );
      const active = Math.min(activeSecondsRef.current, duration);
      const idle = Math.max(0, duration - active);
      const payload: {
        duration_seconds: number;
        active_seconds: number;
        idle_seconds: number;
        ended_at?: string;
        exit_reason?: ExitReason;
      } = {
        duration_seconds: duration,
        active_seconds: active,
        idle_seconds: idle,
      };
      if (final) {
        payload.ended_at = new Date().toISOString();
        payload.exit_reason = reason;
        finalizedRef.current = true;
      }
      try {
        await supabase
          .from("tool_usage_sessions")
          .update(payload)
          .eq("id", id);
      } catch {
        /* best-effort */
      }

      // P10.2d — Emit aggregated tool-usage signal on FINAL flush only.
      if (final && customerIdRef.current) {
        try {
          const { emitToolUsageSignal } = await import(
            "@/lib/diagnostics/signalEmitters"
          );
          await emitToolUsageSignal({
            customerId: customerIdRef.current,
            sessionId: id,
            toolKey,
            toolTitle,
            activeSeconds: active,
            exitReason: reason,
          });
        } catch {
          /* swallow */
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        void flush(true, "visibility_hidden");
      }
    };

    void start();
    ACTIVITY_EVENTS.forEach((evt) =>
      document.addEventListener(evt, markActivity, { passive: true }),
    );
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      ACTIVITY_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, markActivity),
      );
      document.removeEventListener("visibilitychange", handleVisibility);
      void flush(true, "navigation");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, route, toolKey, resourceId, enabled]);
}

export function formatSeconds(total: number | null | undefined): string {
  if (total == null || !Number.isFinite(total) || total <= 0) return "0s";
  const s = Math.round(total);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}