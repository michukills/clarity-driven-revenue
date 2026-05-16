/**
 * P100 — Admin UI for managing gig customers.
 *
 * Lets an admin create a gig customer, change their tier, set the purchased
 * package label, archive/restore, and explicitly convert to a full RGS client.
 * Conversion requires a typed confirmation string to prevent accidental
 * upgrades. All actions write to `customer_gig_audit`.
 */

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  GIG_TIERS,
  GIG_TIER_LABEL,
  GIG_TIER_SHORT_DESCRIPTION,
  type GigTier,
} from "@/lib/gig/gigTier";
import {
  adminArchiveGigCustomer,
  adminConvertGigToFullClient,
  adminCreateGigCustomer,
  adminListGigCustomers,
  adminRestoreGigCustomer,
  adminSetGigPackageType,
  adminSetGigTier,
  type GigCustomerRow,
} from "@/lib/gig/gigCustomerData";
import { GigAccountBadge, GigTierBadge } from "./GigTierBadge";

const CONVERSION_PHRASE = "CONVERT TO FULL CLIENT";

export function GigCustomerManager() {
  const [rows, setRows] = useState<GigCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tier, setTier] = useState<GigTier>("basic");
  const [packageType, setPackageType] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await adminListGigCustomers({ includeArchived, includeConverted: true });
    setRows(r);
    setLoading(false);
  }, [includeArchived]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate() {
    if (!fullName.trim() || !email.trim()) {
      toast({ title: "Name and email are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    const res = await adminCreateGigCustomer({
      fullName: fullName.trim(),
      email: email.trim(),
      businessName: businessName.trim() || undefined,
      tier,
      packageType: packageType.trim() || undefined,
    });
    setCreating(false);
    if ("error" in res) {
      toast({ title: "Could not create gig customer", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Gig customer created" });
    setFullName("");
    setEmail("");
    setBusinessName("");
    setPackageType("");
    setTier("basic");
    refresh();
  }

  async function handleTierChange(id: string, next: GigTier) {
    const res = await adminSetGigTier(id, next);
    if ("error" in res) {
      toast({ title: "Could not update tier", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: `Tier set to ${GIG_TIER_LABEL[next]}` });
    refresh();
  }

  async function handlePackageChange(id: string, value: string) {
    const res = await adminSetGigPackageType(id, value);
    if ("error" in res) {
      toast({ title: "Could not update package", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Gig package updated" });
    refresh();
  }

  async function handleArchive(id: string) {
    const reason = window.prompt("Optional archive reason:");
    const res = await adminArchiveGigCustomer(id, reason ?? undefined);
    if ("error" in res) {
      toast({ title: "Could not archive", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Gig customer archived" });
    refresh();
  }

  async function handleRestore(id: string) {
    const res = await adminRestoreGigCustomer(id);
    if ("error" in res) {
      toast({ title: "Could not restore", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Gig customer restored" });
    refresh();
  }

  async function handleConvert(id: string) {
    const typed = window.prompt(
      `Conversion to a full RGS client requires explicit confirmation.\nType exactly:\n\n${CONVERSION_PHRASE}\n\nThis preserves gig history and moves the customer into the Diagnostic lifecycle stage. Packages must be assigned separately.`,
    );
    if (typed !== CONVERSION_PHRASE) {
      toast({ title: "Conversion cancelled" });
      return;
    }
    const res = await adminConvertGigToFullClient(id);
    if ("error" in res) {
      toast({ title: "Could not convert", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Converted to full RGS client" });
    refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create gig customer</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gig customers can run standalone deliverables only. Full Diagnostic, Implementation, and RGS Control System access are not included until an admin explicitly converts them.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="gig-name">Full name</Label>
            <Input id="gig-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gig-email">Email</Label>
            <Input id="gig-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gig-business">Business name (optional)</Label>
            <Input id="gig-business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gig-package">Purchased gig package (optional)</Label>
            <Input id="gig-package" value={packageType} onChange={(e) => setPackageType(e.target.value)} placeholder="e.g. SOP Bible Package" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Gig tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as GigTier)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GIG_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {GIG_TIER_LABEL[t]} — {GIG_TIER_SHORT_DESCRIPTION[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "Create gig customer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Gig customers</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIncludeArchived((v) => !v)}>
              {includeArchived ? "Hide archived" : "Show archived"}
            </Button>
            <Button variant="ghost" size="sm" onClick={refresh}>Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gig customers yet. Create one above.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.id} className="rounded-md border border-border bg-card p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">
                          {r.business_name || r.full_name || r.email}
                        </span>
                        <GigAccountBadge />
                        <GigTierBadge tier={r.gig_tier} />
                        {r.gig_status === "archived" && <Badge variant="outline">Archived</Badge>}
                        {r.gig_status === "converted" && (
                          <Badge variant="outline" className="border-primary/40 text-primary">Converted</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.full_name ? `${r.full_name} · ` : ""}{r.email}
                      </p>
                      {r.gig_package_type && (
                        <p className="text-xs text-muted-foreground">Package: {r.gig_package_type}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={r.gig_tier ?? undefined}
                        onValueChange={(v) => handleTierChange(r.id, v as GigTier)}
                        disabled={r.gig_status === "archived" || r.gig_status === "converted"}
                      >
                        <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Set tier" /></SelectTrigger>
                        <SelectContent>
                          {GIG_TIERS.map((t) => (
                            <SelectItem key={t} value={t}>{GIG_TIER_LABEL[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {r.gig_status !== "converted" && (
                        r.gig_status === "archived" ? (
                          <Button size="sm" variant="outline" onClick={() => handleRestore(r.id)}>Restore</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleArchive(r.id)}>Archive</Button>
                        )
                      )}
                      {r.gig_status !== "converted" && (
                        <Button size="sm" onClick={() => handleConvert(r.id)}>
                          Convert to full RGS client
                        </Button>
                      )}
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center gap-2">
                    <Input
                      defaultValue={r.gig_package_type ?? ""}
                      placeholder="Purchased gig package"
                      className="h-8"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== (r.gig_package_type ?? "")) handlePackageChange(r.id, v);
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
