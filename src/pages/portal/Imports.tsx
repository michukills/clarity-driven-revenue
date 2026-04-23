/**
 * P12.3 — Client CSV import surface.
 *
 * Simpler than the admin flow: client picks the data type, uploads the
 * file, confirms mapping, and submits. All client imports go to review
 * (no auto-trust) — admin / verification gates downstream.
 */

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CsvImportWizard } from "@/components/imports/CsvImportWizard";
import { Upload as UploadIcon, ShieldCheck } from "lucide-react";

export default function ClientImports() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setCustomer(data ? { id: data.id } : null);
      setLoading(false);
    })();
  }, [user]);

  return (
    <PortalShell variant="customer">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <UploadIcon className="h-5 w-5" /> Import data from a CSV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            If you already have your data in a spreadsheet, you don't have to
            re-enter it. Export it as CSV and bring it in here.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> What happens after upload
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Imported rows are staged for review before they affect your
              dashboards. We map columns automatically where we can, ignore
              anything we don't recognize, and flag duplicates.
            </p>
            <p>
              You'll see a clear preview of every row — what we parsed, what
              we'll skip, and why — before anything is saved.
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !customer ? (
          <p className="text-sm text-muted-foreground">
            Your account isn't set up for imports yet. Contact your RGS contact.
          </p>
        ) : (
          <CsvImportWizard customerId={customer.id} audience="client" />
        )}
      </div>
    </PortalShell>
  );
}
