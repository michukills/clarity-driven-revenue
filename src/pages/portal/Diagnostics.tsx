import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { stageLabel } from "@/lib/portal";

export default function PortalDiagnostics() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, business_name, stage, diagnostic_status, last_activity_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setCustomer(data);
    })();
  }, [user]);

  const deliverables = [
    "Buyer Persona",
    "Outreach Channels",
    "Conversion Flow Map",
    "Revenue Metrics",
    "Strategy Plan",
  ];

  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Your Diagnostic"
        title="Your RGS Diagnostic"
        description="The diagnostic surfaces where revenue is leaking, where the business depends on you, and what to fix before anything is rebuilt. Five deliverables, one direction."
      >
        <DomainSection
          title="Status"
          subtitle={customer ? `${stageLabel(customer.stage)} · ${customer.diagnostic_status}` : "Not started"}
        >
          {customer ? (
            <div className="text-sm text-foreground">
              {customer.business_name || customer.full_name}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              No diagnostic on file yet. Your RGS team will activate this view once your diagnostic begins.
            </div>
          )}
        </DomainSection>

        <DomainSection title="Your Deliverables" subtitle="What you receive at the end of the diagnostic">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {deliverables.map((d) => (
              <div key={d} className="p-3 rounded-md bg-muted/30 border border-border">
                <div className="text-sm text-foreground">{d}</div>
              </div>
            ))}
          </div>
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}