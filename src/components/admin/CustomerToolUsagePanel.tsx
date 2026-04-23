import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatSeconds } from "@/lib/usage/toolUsageSession";
import { Activity } from "lucide-react";

interface UsageRow {
  id: string;
  tool_title: string;
  tool_key: string | null;
  route: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  active_seconds: number | null;
  idle_seconds: number | null;
  exit_reason: string | null;
}

interface Props {
  customerId: string;
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * P9.1 — Compact admin view of tool engagement signals.
 *
 * Privacy: shows only aggregated time + tool labels. No form values,
 * keystrokes, or content are stored or shown.
 */
export function CustomerToolUsagePanel({ customerId }: Props) {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tool_usage_sessions")
        .select(
          "id, tool_title, tool_key, route, started_at, ended_at, " +
            "duration_seconds, active_seconds, idle_seconds, exit_reason",
        )
        .eq("customer_id", customerId)
        .order("started_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      setRows(((data ?? []) as unknown) as UsageRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const totalSessions = rows.length;
  const totalActive = rows.reduce((sum, r) => sum + (r.active_seconds ?? 0), 0);
  const last = rows[0];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
        <Activity className="h-3.5 w-3.5" /> Tool engagement
      </div>
      <p className="text-[11px] text-muted-foreground mb-4 max-w-xl">
        Aggregated time only — no form values, inputs, or page content are
        recorded. Helps RGS spot where clients may need support.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Sessions (last 50)" value={String(totalSessions)} />
        <Stat label="Total active time" value={formatSeconds(totalActive)} />
        <Stat label="Last tool" value={last?.tool_title ?? "—"} truncate />
        <Stat
          label="Last used"
          value={last ? fmtDateTime(last.started_at) : "—"}
        />
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No tracked sessions yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-normal">Tool</th>
                <th className="py-2 pr-3 font-normal">Started</th>
                <th className="py-2 pr-3 font-normal">Duration</th>
                <th className="py-2 pr-3 font-normal">Active</th>
                <th className="py-2 pr-3 font-normal">Idle</th>
                <th className="py-2 pr-3 font-normal">Exit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="py-2 pr-3 text-foreground">
                    {r.tool_title}
                    <div className="text-[10px] text-muted-foreground">
                      {r.route}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {fmtDateTime(r.started_at)}
                  </td>
                  <td className="py-2 pr-3 text-foreground">
                    {formatSeconds(r.duration_seconds)}
                  </td>
                  <td className="py-2 pr-3 text-foreground">
                    {formatSeconds(r.active_seconds)}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {formatSeconds(r.idle_seconds)}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {r.exit_reason ?? (r.ended_at ? "—" : "open")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="bg-muted/20 rounded-md p-3 border border-border">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-sm text-foreground ${truncate ? "truncate" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}