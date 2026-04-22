import type { Metrics } from "@/lib/bcc/engine";
import { Money, fmtPct } from "./Money";

function Tile({ label, value, hint, tone = "default" }: { label: string; value: React.ReactNode; hint?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneCls =
    tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-300" : tone === "bad" ? "text-rose-400" : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-light ${toneCls}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ProfitDashboard({ m }: { m: Metrics }) {
  const marginTone = m.profitMargin >= 20 ? "good" : m.profitMargin >= 10 ? "default" : m.profitMargin >= 0 ? "warn" : "bad";
  const laborTone = m.laborPctRevenue <= 45 ? "good" : m.laborPctRevenue <= 60 ? "warn" : "bad";
  const expenseTone = m.expenseRatio <= 50 ? "good" : m.expenseRatio <= 70 ? "warn" : "bad";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Total revenue" value={<Money value={m.totalRevenue} />} hint={`Collected ${fmtPct(m.totalRevenue ? (m.collectedRevenue / m.totalRevenue) * 100 : 0, 0)}`} />
        <Tile label="Total expenses" value={<Money value={m.totalExpenses} />} />
        <Tile label="Payroll & labor" value={<Money value={m.payrollCost + m.laborCost} />} />
        <Tile label="Net profit" value={<Money value={m.netProfit} signed />} tone={m.netProfit >= 0 ? "good" : "bad"} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Gross profit" value={<Money value={m.grossProfit} />} hint="Revenue − direct labor" />
        <Tile label="Profit margin" value={fmtPct(m.profitMargin)} tone={marginTone} />
        <Tile label="Labor / revenue" value={fmtPct(m.laborPctRevenue)} tone={laborTone} hint="Healthy when below 45%" />
        <Tile label="Expense ratio" value={fmtPct(m.expenseRatio)} tone={expenseTone} hint="Healthy when below 50%" />
      </div>
      {m.profitMargin < 10 && m.totalRevenue > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          <span className="font-medium">Margin leakage warning.</span> Profit margin is below 10%. This is a signal to investigate pricing, delivery cost, and discounting.
        </div>
      )}
    </div>
  );
}