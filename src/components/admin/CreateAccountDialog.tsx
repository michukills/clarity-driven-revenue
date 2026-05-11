/**
 * P93B — Create Account dialog with explicit record-type chooser,
 * confirmation, and review summary.
 *
 * Replaces the legacy "New Client" inline form which silently defaulted every
 * record to a real client. Admin must now explicitly pick:
 *   1. Real Client
 *   2. Demo / Test Account
 *   3. Prospect / Draft Record
 *   4. Gig Work Account
 * and confirm the choice before submit. The review summary is rendered from
 * `classifyAccount()` so the admin sees the resulting Account Type, Data Mode,
 * Payment Mode, Delivery Stage, Portal Access, and Scope Boundary before
 * insert.
 */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ShieldCheck, Beaker, FileText, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import { AccountClassificationPanel } from "./AccountClassificationBadges";
import type { AccountInput } from "@/lib/accounts/accountClassification";

export type CreateAccountRecordType =
  | "real_client"
  | "demo_test"
  | "prospect_draft"
  | "gig_work";

const RECORD_TYPE_OPTIONS: {
  key: CreateAccountRecordType;
  label: string;
  icon: any;
  description: string;
  confirm: string;
}[] = [
  {
    key: "real_client",
    label: "Real Client",
    icon: ShieldCheck,
    description:
      "For paid/active RGS Diagnostic, Implementation, or RGS Control System delivery. May involve portal access, payment flows, and full client reports.",
    confirm:
      "I confirm this is a real client/prospect delivery record and not a demo/test or gig-only account.",
  },
  {
    key: "demo_test",
    label: "Demo / Test Account",
    icon: Beaker,
    description:
      "For fake data, walkthroughs, testing, internal QA, or sales demos. Uses demo/test mode. No real payment or real client data.",
    confirm:
      "I confirm this is a demo/test account and will not contain real client data.",
  },
  {
    key: "prospect_draft",
    label: "Prospect / Draft Record",
    icon: FileText,
    description:
      "For pre-sale preparation, draft notes, or possible future client. No client portal access unless explicitly approved later.",
    confirm:
      "I confirm this is a draft/prospect record and will not receive client portal access unless explicitly approved later.",
  },
  {
    key: "gig_work",
    label: "Gig Work Account",
    icon: Briefcase,
    description:
      "For standalone gig deliverables only — Fiverr/freelance-style jobs or limited-scope services. Does not include full Diagnostic, Implementation, or RGS Control System.",
    confirm:
      "I confirm this is a gig work account for a limited-scope standalone deliverable only, not full Diagnostic, Implementation, or RGS Control System access.",
  },
];

const INDUSTRY_OPTIONS: { value: IndustryCategory; label: string }[] = [
  { value: "trade_field_service", label: "Trades / field service" },
  { value: "retail", label: "Retail" },
  { value: "restaurant", label: "Restaurant" },
  { value: "mmj_cannabis", label: "Cannabis / MMJ / Rec (regulated retail)" },
  { value: "general_service", label: "General / mixed business" },
  { value: "other", label: "Other / needs classification" },
];

/**
 * Translate the chooser into the safest current DB persistence + the
 * AccountInput used by `classifyAccount()` for the live review summary.
 * Backed only by columns that exist today (`account_kind`, `is_demo_account`,
 * `service_type`). A dedicated `is_gig` column is intentionally deferred to a
 * later P93 phase per P93A documentation.
 */
function buildPersistencePayload(
  recordType: CreateAccountRecordType,
  form: {
    full_name: string;
    email: string;
    business_name: string;
    service_type: string;
    industry: IndustryCategory | "";
    business_description: string;
  },
) {
  const base: Record<string, any> = {
    full_name: form.full_name,
    email: form.email,
    business_name: form.business_name,
    business_description: form.business_description,
    industry: form.industry || null,
    industry_confirmed_by_admin: false,
    needs_industry_review: true,
    industry_intake_source: "admin_create_account",
    industry_intake_value: form.industry || null,
  };

  switch (recordType) {
    case "real_client":
      return {
        ...base,
        account_kind: "client",
        service_type: form.service_type || null,
        stage: "lead",
        industry_review_notes:
          "Created from admin Create Account flow as Real Client. Industry requires verification before tools unlock.",
      };
    case "demo_test":
      return {
        ...base,
        account_kind: "demo",
        is_demo_account: true,
        service_type: form.service_type || "demo",
        stage: "lead",
        industry_review_notes:
          "Created from admin Create Account flow as Demo/Test Account. Demo data only.",
      };
    case "prospect_draft":
      return {
        ...base,
        account_kind: "prospect",
        service_type: form.service_type || null,
        stage: "lead",
        industry_review_notes:
          "Created from admin Create Account flow as Prospect/Draft. Pre-sale only.",
      };
    case "gig_work":
      return {
        ...base,
        account_kind: "client",
        service_type:
          form.service_type && form.service_type.toLowerCase().includes("gig")
            ? form.service_type
            : `gig: ${form.service_type || "standalone deliverable"}`,
        stage: "lead",
        industry_review_notes:
          "Created from admin Create Account flow as Gig Work Account. Limited-scope standalone deliverable only.",
      };
  }
}

function payloadToClassifierInput(payload: Record<string, any>): AccountInput {
  return {
    account_kind: payload.account_kind,
    is_demo_account: payload.is_demo_account ?? null,
    service_type: payload.service_type ?? null,
    email: payload.email ?? null,
    full_name: payload.full_name ?? null,
    business_name: payload.business_name ?? null,
  };
}

export function CreateAccountDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [recordType, setRecordType] = useState<CreateAccountRecordType | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    business_name: "",
    service_type: "",
    industry: "" as IndustryCategory | "",
    business_description: "",
  });

  const reset = () => {
    setRecordType(null);
    setConfirmed(false);
    setSubmitting(false);
    setForm({
      full_name: "",
      email: "",
      business_name: "",
      service_type: "",
      industry: "",
      business_description: "",
    });
  };

  const previewPayload = useMemo(
    () => (recordType ? buildPersistencePayload(recordType, form) : null),
    [recordType, form],
  );
  const classifierInput = useMemo(
    () => (previewPayload ? payloadToClassifierInput(previewPayload) : null),
    [previewPayload],
  );

  const selectedOption = recordType
    ? RECORD_TYPE_OPTIONS.find((o) => o.key === recordType)
    : null;

  const canSubmit =
    !!recordType &&
    confirmed &&
    !!form.full_name.trim() &&
    !!form.email.trim() &&
    !submitting;

  const submit = async () => {
    if (!canSubmit || !previewPayload) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("customers")
      .insert([previewPayload as any]);
    if (error) {
      toast.error(error.message || "Could not create account");
      setSubmitting(false);
      return;
    }
    toast.success(`${selectedOption?.label} created`);
    setOpen(false);
    reset();
    onCreated?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-secondary" data-testid="open-create-account">
          <Plus className="h-4 w-4" /> Create Account
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Step 1: choose record type */}
          <section>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Step 1 · What kind of record are you creating?
            </div>
            <div className="grid gap-2">
              {RECORD_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = recordType === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    data-testid={`record-type-${opt.key}`}
                    onClick={() => {
                      setRecordType(opt.key);
                      setConfirmed(false);
                    }}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      active
                        ? "border-primary/60 bg-primary/10"
                        : "border-border bg-background/40 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: details */}
          {recordType && (
            <section>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Step 2 · Account details
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Full name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  placeholder="Business name"
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                />
                <Input
                  placeholder={
                    recordType === "gig_work"
                      ? "Scope (e.g. SOP gig, single deliverable)"
                      : "Service type (e.g. Diagnostic, Implementation)"
                  }
                  value={form.service_type}
                  onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                />
                <select
                  value={form.industry}
                  onChange={(e) =>
                    setForm({ ...form, industry: e.target.value as IndustryCategory | "" })
                  }
                  className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Industry unknown — send to review queue</option>
                  {INDUSTRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Textarea
                  placeholder="Business description"
                  value={form.business_description}
                  onChange={(e) =>
                    setForm({ ...form, business_description: e.target.value })
                  }
                />
              </div>
            </section>
          )}

          {/* Step 3: review */}
          {recordType && classifierInput && (
            <section>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Step 3 · Review account setup
              </div>
              <AccountClassificationPanel input={classifierInput} />
            </section>
          )}

          {/* Step 4: confirm */}
          {recordType && selectedOption && (
            <section className="rounded-lg border border-border bg-muted/20 p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(v === true)}
                  data-testid="create-account-confirm"
                />
                <span className="text-xs text-foreground leading-relaxed">
                  {selectedOption.confirm}
                </span>
              </label>
            </section>
          )}

          <Button
            onClick={submit}
            disabled={!canSubmit}
            data-testid="create-account-submit"
            className="w-full bg-primary hover:bg-secondary disabled:opacity-50"
          >
            {submitting
              ? "Creating…"
              : recordType
                ? `Create ${selectedOption?.label}`
                : "Choose a record type to continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateAccountDialog;