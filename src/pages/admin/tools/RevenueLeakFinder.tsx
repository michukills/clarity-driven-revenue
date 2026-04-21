import { useState, useMemo } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const defaultData = {
  monthly_leads: 100,
  lead_to_call_rate: 40, // %
  call_to_close_rate: 25, // %
  avg_deal_value: 5000,
  monthly_churn: 5, // % of customers lost
  active_customers: 60,
  // Benchmarks
  target_lead_to_call: 60,
  target_call_to_close: 35,
  target_churn: 2,
  notes: "",
};

export default function RevenueLeakFinderTool() {
  const [data, setData] = useState<any>(defaultData);
  const set = (k: string, v: any) => setData({ ...data, [k]: v });

  const computed = useMemo(() => {
    const callsCurrent = data.monthly_leads * (data.lead_to_call_rate / 100);
    const closesCurrent = callsCurrent * (data.call_to_close_rate / 100);
    const revCurrent = closesCurrent * data.avg_deal_value;

    const callsTarget = data.monthly_leads * (data.target_lead_to_call / 100);
    const closesTarget = callsTarget * (data.target_call_to_close / 100);
    const revTarget = closesTarget * data.avg_deal_value;

    const newSalesLeak = Math.max(0, revTarget - revCurrent);

    const churnLeak = Math.max(
      0,
      data.active_customers * ((data.monthly_churn - data.target_churn) / 100) * data.avg_deal_value,
    );

    const totalMonthly = newSalesLeak + churnLeak;
    const annual = totalMonthly * 12;
    return { revCurrent, revTarget, newSalesLeak, churnLeak, totalMonthly, annual };
  }, [data]);

  const summary = () => ({
    monthly_leak: Math.round(computed.totalMonthly),
    annual_leak: Math.round(computed.annual),
    biggest_leak: computed.newSalesLeak > computed.churnLeak ? "Sales conversion" : "Churn",
  });

  const Field = ({ k, label, suffix }: { k: string; label: string; suffix?: string }) => (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="relative mt-1">
        <Input
          type="number"
          value={data[k]}
          onChange={(e) => set(k, Number(e.target.value))}
          className="bg-muted/40 border-border pr-10"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </label>
  );

  return (
    <ToolRunnerShell
      toolKey="revenue_leak_finder"
      toolTitle="Revenue Leak Finder"
      description="Diagnose where money is leaking between offer, sales, and delivery. Compare current funnel performance to target benchmarks and quantify the gap."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={summary}
      rightPanel={
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Estimated Annual Leak</div>
          <div className="font-display text-4xl text-destructive tabular-nums">{fmt(computed.annual)}</div>
          <div className="text-xs text-muted-foreground mt-1">{fmt(computed.totalMonthly)} / month</div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Sales conversion leak</span>
              <span className="text-foreground tabular-nums">{fmt(computed.newSalesLeak)}/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Churn leak</span>
              <span className="text-foreground tabular-nums">{fmt(computed.churnLeak)}/mo</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Current revenue</span>
              <span className="text-foreground tabular-nums">{fmt(computed.revCurrent)}/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target revenue</span>
              <span className="text-primary tabular-nums">{fmt(computed.revTarget)}/mo</span>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-foreground mb-4">Current Funnel</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field k="monthly_leads" label="Monthly leads" />
            <Field k="lead_to_call_rate" label="Lead → call" suffix="%" />
            <Field k="call_to_close_rate" label="Call → close" suffix="%" />
            <Field k="avg_deal_value" label="Avg deal value" suffix="$" />
            <Field k="active_customers" label="Active customers" />
            <Field k="monthly_churn" label="Monthly churn" suffix="%" />
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-foreground mb-4">Target Benchmarks</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field k="target_lead_to_call" label="Target lead → call" suffix="%" />
            <Field k="target_call_to_close" label="Target call → close" suffix="%" />
            <Field k="target_churn" label="Target churn" suffix="%" />
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-foreground mb-3">Diagnostic Notes</h3>
          <Textarea
            value={data.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Where does friction show up? What stage breaks first?"
            className="bg-muted/40 border-border min-h-[120px]"
          />
        </section>
      </div>
    </ToolRunnerShell>
  );
}