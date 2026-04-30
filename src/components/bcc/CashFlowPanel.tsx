import type { Metrics } from "@/lib/bcc/engine";
import { Money } from "./Money";

export function CashFlowPanel({ m }: { m: Metrics }) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
    >
      <div className="bg-card border border-border rounded-xl p-5 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Cash movement (actual)</div>
        <div className="mt-3 space-y-2 text-sm">
          <Row label="Cash in" value={<Money value={m.cashIn} />} />
          <Row label="Cash out" value={<Money value={-m.cashOut} />} />
          <div className="h-px bg-border my-2" />
          <Row label="Net cash" value={<Money value={m.netCash} signed />} bold />
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Upcoming (expected)</div>
        <div className="mt-3 space-y-2 text-sm">
          <Row label="Expected in" value={<Money value={m.expectedCashIn} />} />
          <Row label="Expected out" value={<Money value={-m.expectedCashOut} />} />
          <div className="h-px bg-border my-2" />
          <Row label="Projected net" value={<Money value={m.expectedCashIn - m.expectedCashOut} signed />} bold />
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Receivables & runway</div>
        <div className="mt-3 space-y-2 text-sm">
          <Row label="Receivables open" value={<Money value={m.receivablesOpen} />} />
          <Row
            label="Overdue"
            value={<span className={m.receivablesOverdue > 0 ? "text-rose-400" : "text-foreground"}><Money value={m.receivablesOverdue} /></span>}
          />
          <Row label="Payables pending" value={<Money value={m.payablesPending} />} />
          <div className="h-px bg-border my-2" />
          <Row
            label="Runway estimate"
            value={
              <span className="text-foreground">
                {m.cashRunwayMonths == null ? "—" : `${m.cashRunwayMonths.toFixed(1)} mo`}
              </span>
            }
            bold
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 min-w-0">
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      <span className={`tabular-nums whitespace-nowrap ${bold ? "font-medium" : ""}`}>{value}</span>
    </div>
  );
}