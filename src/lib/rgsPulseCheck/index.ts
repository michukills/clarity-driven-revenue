/**
 * P86 Part 4 — RGS Pulse Check (Friday 15) data access.
 * Admin-tracked weekly ritual. No calendar automation wired.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  RGS_PULSE_CHECK_CHECKLIST,
  RGS_PULSE_CHECK_NAME,
  type PulseCheckChecklistKey,
} from "@/config/rgsPulseCheck";

export interface PulseCheckRunRow {
  id: string;
  run_label: string;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  status: "scheduled" | "in_progress" | "completed" | "missed" | "cancelled";
  checklist_json: Array<{ key: PulseCheckChecklistKey; checked: boolean; note?: string }>;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function adminCreatePulseCheckRun(scheduledFor: Date) {
  const checklist = RGS_PULSE_CHECK_CHECKLIST.map((c) => ({
    key: c.key,
    checked: false,
    note: "",
  }));
  const { data, error } = await (supabase as any)
    .from("rgs_pulse_check_runs").insert({
      run_label: RGS_PULSE_CHECK_NAME,
      scheduled_for: scheduledFor.toISOString(),
      status: "scheduled",
      checklist_json: checklist,
    }).select("*").single();
  if (error) throw error;
  return data as PulseCheckRunRow;
}

export async function adminListPulseCheckRuns(limit = 12) {
  const { data, error } = await (supabase as any)
    .from("rgs_pulse_check_runs").select("*")
    .order("scheduled_for", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PulseCheckRunRow[];
}

export async function adminCompletePulseCheckRun(
  id: string,
  checklist: PulseCheckRunRow["checklist_json"],
  adminNotes?: string,
) {
  const { error } = await (supabase as any).from("rgs_pulse_check_runs").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    checklist_json: checklist,
    admin_notes: adminNotes ?? null,
  }).eq("id", id);
  if (error) throw error;
}