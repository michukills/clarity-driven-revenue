import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import CostOfFrictionCalculator from "@/components/costOfFriction/CostOfFrictionCalculator";
import {
  COST_OF_FRICTION_NAME,
  COST_OF_FRICTION_CLIENT_DISCLAIMER,
  DEFAULT_COST_OF_FRICTION_ASSUMPTIONS,
  type CostOfFrictionAssumptions,
  type CostOfFrictionInputs,
} from "@/config/costOfFriction";
import {
  getClientCostOfFrictionRuns,
  upsertCostOfFrictionRun,
  type ClientCostOfFrictionRunRow,
} from "@/lib/costOfFriction/costOfFriction";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { MobileActionBar } from "@/components/portal/MobileActionBar";

export default function CostOfFrictionCalculatorPage() {
  const { customerId } = usePortalCustomerId();
  const [inputs, setInputs] = useState<CostOfFrictionInputs>({});
  const [assumptions, setAssumptions] = useState<CostOfFrictionAssumptions>(
    DEFAULT_COST_OF_FRICTION_ASSUMPTIONS,
  );
  const [approvedRuns, setApprovedRuns] = useState<ClientCostOfFrictionRunRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    getClientCostOfFrictionRuns(customerId)
      .then(setApprovedRuns)
      .catch(() => setApprovedRuns([]));
  }, [customerId]);

  const onInputChange = (lineKey: string, fieldKey: string, value: number | undefined) => {
    setInputs((prev) => ({
      ...prev,
      [lineKey]: { ...(prev[lineKey] ?? {}), [fieldKey]: value },
    }));
  };

  const save = async () => {
    if (!customerId) return;
    setSaving(true);
    try {
      await upsertCostOfFrictionRun({
        customerId,
        runName: `${COST_OF_FRICTION_NAME} (client draft)`,
        status: "draft",
        inputs,
        assumptions,
        createdByRole: "client",
      });
      toast.success("Estimate saved for review");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalShell variant="customer">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Client Tool</div>
        <h1 className="mt-1 text-3xl text-foreground">{COST_OF_FRICTION_NAME}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          {COST_OF_FRICTION_CLIENT_DISCLAIMER}
        </p>
      </div>

      {approvedRuns.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-card/60 p-5">
          <h2 className="text-sm font-medium text-foreground mb-3">
            Approved estimates from your account team
          </h2>
          <ul className="space-y-2">
            {approvedRuns.map((r) => (
              <li key={r.id} className="rounded-md border border-border/60 bg-background/40 p-3">
                <div className="text-sm text-foreground">{r.run_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  Estimated monthly friction: ${Math.round(r.monthly_total).toLocaleString()} ·
                  Annual: ${Math.round(r.annual_total).toLocaleString()}
                </div>
                {r.client_safe_summary && (
                  <p className="mt-1 text-xs text-muted-foreground">{r.client_safe_summary}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pb-24 md:pb-0">
        <CostOfFrictionCalculator
        inputs={inputs}
        assumptions={assumptions}
        onInputChange={onInputChange}
        onAssumptionsChange={setAssumptions}
        />
      </div>

      <MobileActionBar className="mt-4">
        <Button onClick={save} disabled={saving} className="w-full md:w-auto h-11">
          <Save className="h-4 w-4 mr-1" /> Save estimate
        </Button>
      </MobileActionBar>
    </PortalShell>
  );
}