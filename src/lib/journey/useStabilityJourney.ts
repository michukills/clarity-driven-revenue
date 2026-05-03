import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadToolSequence } from "@/lib/diagnostics/toolSequence";
import {
  deriveStabilityJourney,
  type JourneyResult,
} from "./stabilityJourney";

/**
 * P42 — Loads everything needed to derive a customer's Stability Journey.
 * Returns null while loading or when no customer is provided.
 */
export function useStabilityJourney(customerId: string | null): {
  journey: JourneyResult | null;
  loading: boolean;
  reload: () => void;
} {
  const [journey, setJourney] = useState<JourneyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!customerId) {
      setJourney(null);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      const [cust, sequence, answers, runs] = await Promise.all([
        supabase
          .from("customers")
          .select("owner_interview_completed_at")
          .eq("id", customerId)
          .maybeSingle(),
        loadToolSequence(customerId).catch(() => null),
        supabase
          .from("diagnostic_intake_answers")
          .select("section_key, answer")
          .eq("customer_id", customerId),
        supabase
          .from("diagnostic_tool_runs")
          .select("tool_key, status")
          .eq("customer_id", customerId),
      ]);
      if (!alive) return;
      const interviewAnswers = new Map<string, string>();
      (answers.data ?? []).forEach((r: any) => {
        if (r.section_key && typeof r.answer === "string") {
          interviewAnswers.set(r.section_key, r.answer);
        }
      });
      const completedToolKeys = new Set<string>();
      (runs.data ?? []).forEach((r: any) => {
        if (r.tool_key && r.status === "completed") completedToolKeys.add(r.tool_key);
      });
      const result = deriveStabilityJourney({
        ownerInterviewCompletedAt: (cust.data as any)?.owner_interview_completed_at ?? null,
        interviewAnswers,
        completedToolKeys,
        sequence,
        reportState: null,
      });
      setJourney(result);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [customerId, tick]);

  return { journey, loading, reload: () => setTick((n) => n + 1) };
}
