// P7.2.6 — Engagement Billing Breakdown
// Lets admins track Diagnostic, Implementation, and Add-on payment status
// independently of the legacy `customers.payment_status` column.
// No card/bank info, no Stripe, no entitlement changes.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export type EngagementSectionKey = "diagnostic" | "implementation" | "addon";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "not_required", label: "Not required" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "waived", label: "Waived" },
];

const SECTIONS: Array<{
  key: EngagementSectionKey;
  title: string;
  subtitle: string;
  statusField: string;
  paidField: string;
  selectLabel: string;
  paidLabel: string;
  defaultStatus: string;
  eventType: string;
  eventTitle: string;
  eventDetail: string;
}> = [
  {
    key: "diagnostic",
    title: "Business Diagnostic",
    subtitle: "Tracks whether the Diagnostic engagement has been paid.",
    statusField: "diagnostic_payment_status",
    paidField: "diagnostic_paid_at",
    selectLabel: "Diagnostic payment",
    paidLabel: "Diagnostic paid date",
    defaultStatus: "unpaid",
    eventType: "diagnostic_payment_updated",
    eventTitle: "Diagnostic payment updated",
    eventDetail: "Business Diagnostic payment status was updated.",
  },
  {
    key: "implementation",
    title: "System Implementation",
    subtitle: "Tracks whether the Implementation engagement has been paid.",
    statusField: "implementation_payment_status",
    paidField: "implementation_paid_at",
    selectLabel: "Implementation payment",
    paidLabel: "Implementation paid date",
    defaultStatus: "unpaid",
    eventType: "implementation_payment_updated",
    eventTitle: "Implementation payment updated",
    eventDetail: "System Implementation payment status was updated.",
  },
  {
    key: "addon",
    title: "Add-ons / Other Tools",
    subtitle: "Tracks whether assigned add-on tools have been paid.",
    statusField: "addon_payment_status",
    paidField: "addon_paid_at",
    selectLabel: "Add-on payment",
    paidLabel: "Add-on paid date",
    defaultStatus: "not_required",
    eventType: "addon_payment_updated",
    eventTitle: "Add-on payment updated",
    eventDetail: "Add-on payment status was updated.",
  },
];

function statusTone(status: string | null | undefined): string {
  switch (status) {
    case "paid":
      return "text-secondary";
    case "partial":
      return "text-amber-400";
    case "unpaid":
      return "text-amber-400";
    case "refunded":
      return "text-amber-400";
    case "waived":
      return "text-muted-foreground";
    case "not_required":
    default:
      return "text-muted-foreground";
  }
}

function statusLabel(status: string | null | undefined): string {
  return STATUS_OPTIONS.find((o) => o.value === (status || ""))?.label || "—";
}

function toDateInputValue(v: string | null | undefined): string {
  if (!v) return "";
  // Accept date or timestamptz; render as YYYY-MM-DD for the date input.
  return v.slice(0, 10);
}

export function EngagementBillingSection({
  customer,
  onUpdated,
}: {
  customer: any;
  onUpdated: () => void;
}) {
  type LocalState = Record<EngagementSectionKey, { status: string; paid: string }>;
  const initial: LocalState = useMemo(
    () => ({
      diagnostic: {
        status: customer.diagnostic_payment_status || "unpaid",
        paid: toDateInputValue(customer.diagnostic_paid_at),
      },
      implementation: {
        status: customer.implementation_payment_status || "unpaid",
        paid: toDateInputValue(customer.implementation_paid_at),
      },
      addon: {
        status: customer.addon_payment_status || "not_required",
        paid: toDateInputValue(customer.addon_paid_at),
      },
    }),
    [
      customer.id,
      customer.diagnostic_payment_status,
      customer.diagnostic_paid_at,
      customer.implementation_payment_status,
      customer.implementation_paid_at,
      customer.addon_payment_status,
      customer.addon_paid_at,
    ],
  );

  const [form, setForm] = useState<LocalState>(initial);
  const [notes, setNotes] = useState<string>(customer.billing_notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial);
    setNotes(customer.billing_notes || "");
  }, [initial, customer.billing_notes]);

  const dirty =
    SECTIONS.some((s) => {
      const f = form[s.key];
      const cur = (customer[s.statusField] as string) || s.defaultStatus;
      const curPaid = toDateInputValue(customer[s.paidField]);
      return f.status !== cur || f.paid !== curPaid;
    }) || (notes || "") !== (customer.billing_notes || "");

  const save = async () => {
    setSaving(true);
    const update: Record<string, any> = {};
    const changed: typeof SECTIONS = [];

    for (const s of SECTIONS) {
      const f = form[s.key];
      const cur = (customer[s.statusField] as string) || s.defaultStatus;
      const curPaid = toDateInputValue(customer[s.paidField]);
      const statusChanged = f.status !== cur;
      const paidChanged = f.paid !== curPaid;
      if (statusChanged) update[s.statusField] = f.status;
      if (paidChanged) update[s.paidField] = f.paid ? f.paid : null;
      if (statusChanged || paidChanged) changed.push(s);
    }

    if ((notes || "") !== (customer.billing_notes || "")) {
      update.billing_notes = notes ? notes : null;
    }

    if (Object.keys(update).length === 0) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("customers")
      .update(update as any)
      .eq("id", customer.id);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    if (changed.length > 0) {
      const { data: u } = await supabase.auth.getUser();
      const events = changed.map((s) => ({
        customer_id: customer.id,
        event_type: s.eventType,
        title: s.eventTitle,
        detail: s.eventDetail,
        actor_id: u.user?.id || null,
      }));
      await supabase.from("customer_timeline").insert(events as any);
    }

    toast.success("Engagement billing updated");
    setSaving(false);
    onUpdated();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Engagement Billing
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Track Diagnostic, Implementation, and Add-on payments separately. No card or bank
            information is stored. RCC subscription is tracked in its own card below.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SECTIONS.map((s) => {
          const savedStatus = (customer[s.statusField] as string) || s.defaultStatus;
          const savedPaid = customer[s.paidField] as string | null;
          const f = form[s.key];
          return (
            <div
              key={s.key}
              className="bg-muted/20 border border-border rounded-md p-4 flex flex-col gap-3"
            >
              <div>
                <div className="text-sm text-foreground font-medium">{s.title}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {s.subtitle}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Current</span>
                <span className={statusTone(savedStatus)}>{statusLabel(savedStatus)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Paid date</span>
                <span className="text-foreground">{savedPaid ? savedPaid.slice(0, 10) : "—"}</span>
              </div>
              <label className="block">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                  {s.selectLabel}
                </div>
                <select
                  value={f.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [s.key]: { ...prev[s.key], status: e.target.value } }))
                  }
                  className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                  {s.paidLabel}
                </div>
                <Input
                  type="date"
                  value={f.paid}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [s.key]: { ...prev[s.key], paid: e.target.value } }))
                  }
                />
              </label>
            </div>
          );
        })}
      </div>

      <label className="block mt-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          Billing notes (admin only)
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Internal notes — never shown to clients."
          className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
        />
      </label>

      <div className="flex justify-end mt-4">
        <Button
          onClick={save}
          disabled={!dirty || saving}
          className="bg-primary hover:bg-secondary disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save engagement billing"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        These statuses are tracked separately from the legacy overall payment status and from the
        Revenue Control Center™ subscription. Changes do not unlock or lock client portal access.
      </p>
    </div>
  );
}