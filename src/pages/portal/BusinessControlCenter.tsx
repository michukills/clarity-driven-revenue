import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell } from "@/components/domains/DomainShell";
import { BusinessControlCenterView } from "@/components/bcc/BusinessControlCenterView";
import { useBccData } from "@/lib/bcc/useBccData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function PortalBusinessControlCenter() {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("customers").select("id").eq("user_id", user.id).maybeSingle();
      setCustomerId(data?.id ?? null);
    })();
  }, [user]);

  const { data, isSample, loading, reload } = useBccData(customerId);

  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="RGS OS Domain"
        title="Business Control Center"
        description="Your one-stop view of revenue, expenses, payroll, cash flow, and what each number means for the health of your business. This is a visibility and decision-support layer — not accounting software."
      >
        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
        ) : (
          <BusinessControlCenterView
            data={data}
            customerId={customerId}
            isSample={isSample}
            audience="client"
            onChange={reload}
          />
        )}
      </DomainShell>
    </PortalShell>
  );
}