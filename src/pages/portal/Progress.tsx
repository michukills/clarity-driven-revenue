import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STAGES } from "@/lib/portal";
import { Check } from "lucide-react";

export default function ProgressPage() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setCustomer(data));
  }, [user]);

  const currentIdx = customer ? STAGES.findIndex((s) => s.key === customer.stage) : -1;

  return (
    <PortalShell variant="customer">
      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Progress</div>
        <h1 className="mt-2 text-3xl text-foreground">Your Engagement</h1>
      </div>

      {!customer ? (
        <p className="text-sm text-muted-foreground">No active engagement yet.</p>
      ) : (
        <div className="bg-card border border-border rounded-xl p-8 max-w-2xl">
          <div className="space-y-4">
            {STAGES.map((s, i) => {
              const done = i < currentIdx;
              const current = i === currentIdx;
              return (
                <div key={s.key} className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : current
                        ? "bg-primary/20 border border-primary text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <div className="flex-1 pb-4 border-b border-border last:border-0">
                    <div
                      className={`text-sm ${
                        current
                          ? "text-foreground font-medium"
                          : done
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </div>
                    {current && (
                      <div className="text-xs text-primary mt-1">Current stage</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PortalShell>
  );
}