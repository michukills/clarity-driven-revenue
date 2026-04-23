/**
 * P12.3 — Admin CSV import surface.
 *
 * Lets RGS admins import CSV data on behalf of any customer, with full
 * mapping visibility, "stage all for review" override, and a recent-batch
 * audit list.
 */

import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CsvImportWizard } from "@/components/imports/CsvImportWizard";
import { listCsvBatches } from "@/lib/imports/csvImport";
import { Database, History, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMPORT_TARGETS } from "@/lib/imports/csvImport";
import { downloadTemplate } from "@/lib/imports/templates";

interface CustomerLite {
  id: string;
  business_name: string | null;
  full_name: string;
}

export default function AdminImports() {
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, business_name, full_name")
        .order("business_name", { ascending: true });
      setCustomers(((data ?? []) as CustomerLite[]));
    })();
  }, []);

  useEffect(() => {
    if (!customerId) return setBatches([]);
    void (async () => {
      const rows = await listCsvBatches(customerId, 30);
      setBatches(rows as any[]);
    })();
  }, [customerId]);

  const grouped = useMemo(() => {
    const map = new Map<string, { ref: string; count: number; latest: string; status: Record<string, number> }>();
    for (const r of batches) {
      const note: string = r.notes ?? "";
      const m = /batch:([a-f0-9]+)/i.exec(note);
      const ref = m?.[1] ?? "unknown";
      if (!map.has(ref)) {
        map.set(ref, { ref, count: 0, latest: r.created_at, status: {} });
      }
      const e = map.get(ref)!;
      e.count++;
      e.status[r.reconcile_status] = (e.status[r.reconcile_status] ?? 0) + 1;
      if (r.created_at > e.latest) e.latest = r.created_at;
    }
    return Array.from(map.values()).sort((a, b) => b.latest.localeCompare(a.latest));
  }, [batches]);

  return (
    <PortalShell variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" /> CSV / Spreadsheet Imports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bring existing client data into the OS — staged with provenance,
            verification policy, and duplicate protection.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose customer</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.business_name ?? c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {customerId && (
          <CsvImportWizard
            customerId={customerId}
            audience="admin"
            onCompleted={async () => {
              const rows = await listCsvBatches(customerId, 30);
              setBatches(rows as any[]);
            }}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" /> Starter templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Hand a client one of these to make their first import painless.
              Headers auto-map at high confidence.
            </p>
            <div className="flex flex-wrap gap-2">
              {IMPORT_TARGETS.map((t) => (
                <Button
                  key={t.id}
                  size="sm"
                  variant="outline"
                  onClick={() => downloadTemplate(t.id)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  {t.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {customerId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" /> Recent batches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {grouped.length === 0 ? (
                <p className="text-sm text-muted-foreground">No CSV imports yet.</p>
              ) : (
                <div className="space-y-2">
                  {grouped.map((b) => (
                    <div
                      key={b.ref}
                      className="flex items-center justify-between border rounded-md p-3"
                    >
                      <div>
                        <code className="text-xs">{b.ref}</code>
                        <div className="text-xs text-muted-foreground">
                          {new Date(b.latest).toLocaleString()} · {b.count} staged rows
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {Object.entries(b.status).map(([k, v]) => (
                          <Badge key={k} variant="outline">
                            {k}: {v as number}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PortalShell>
  );
}
