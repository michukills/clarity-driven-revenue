import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell } from "@/components/domains/DomainShell";
import { ClientRevenueTracker } from "@/components/bcc/ClientRevenueTracker";
import { useBccData } from "@/lib/bcc/useBccData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function ClientRevenueTrackerPage() {
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
        eyebrow="Business Control Center"
        title="Revenue Tracker"
        description="Track weekly revenue, expenses, payroll, receivables, and cash movement — then turn those numbers into business control insight."
      >
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <ClientRevenueTracker
            data={data}
            customerId={customerId}
            isSample={isSample}
            onChange={reload}
          />
        )}
      </DomainShell>
    </PortalShell>
  );
}