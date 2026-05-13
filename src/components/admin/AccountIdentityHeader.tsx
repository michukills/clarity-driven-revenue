/**
 * P93F — Account Identity Header.
 *
 * Single source of truth for "who is this account?" at the top of the admin
 * customer detail page. The email MUST be visible here because the delete
 * confirmation flow requires the admin to type it.
 *
 * Pure presentation. No side effects, no data fetching.
 */
import { Copy, Mail, Building2, IdCard } from "lucide-react";
import { toast } from "sonner";
import {
  AccountTypeBadge,
} from "@/components/admin/AccountClassificationBadges";
import { classifyAccount, type AccountInput } from "@/lib/accounts/accountClassification";

type Customer = AccountInput & {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  archived_at?: string | null;
  is_demo_account?: boolean | null;
};

function copy(label: string, value: string) {
  if (!value) return;
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error(`Could not copy ${label.toLowerCase()}`),
  );
}

export function AccountIdentityHeader({ customer }: { customer: Customer }) {
  const c = classifyAccount(customer);
  const email = (customer.email ?? "").trim();
  const business = (customer.business_name ?? "").trim();
  const name = (customer.full_name ?? "").trim() || "(No contact name)";

  return (
    <section
      data-testid="account-identity-header"
      className="rounded-2xl border border-border bg-card/40 p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {business || "No business name on file"}
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl text-foreground break-words">
            {name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AccountTypeBadge classification={c} />
          {customer.archived_at ? (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300">
              Archived
            </span>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <IdentityRow
          icon={<Mail className="h-3.5 w-3.5" />}
          label="Account email"
          value={email}
          monospace
          missingLabel="No email on file"
          testId="identity-email"
          onCopy={email ? () => copy("Email", email) : undefined}
        />
        <IdentityRow
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Business"
          value={business}
          missingLabel="—"
          testId="identity-business"
        />
        <IdentityRow
          icon={<IdCard className="h-3.5 w-3.5" />}
          label="Account ID (admin)"
          value={customer.id}
          monospace
          missingLabel="—"
          testId="identity-id"
          truncate
          onCopy={() => copy("Account ID", customer.id)}
        />
      </dl>

      <p className="text-[11px] text-muted-foreground">
        {c.helperText}
      </p>
    </section>
  );
}

function IdentityRow({
  icon,
  label,
  value,
  missingLabel,
  monospace,
  truncate,
  testId,
  onCopy,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  missingLabel: string;
  monospace?: boolean;
  truncate?: boolean;
  testId: string;
  onCopy?: () => void;
}) {
  const display = value || missingLabel;
  const muted = !value;
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-2 min-w-0">
        <span
          data-testid={testId}
          className={`text-xs ${muted ? "text-muted-foreground italic" : "text-foreground"} ${
            monospace ? "font-mono" : ""
          } ${truncate ? "truncate" : "break-all"}`}
          title={value || undefined}
        >
          {display}
        </span>
        {onCopy && value ? (
          <button
            type="button"
            onClick={onCopy}
            className="ml-auto inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40"
            aria-label={`Copy ${label.toLowerCase()}`}
            title={`Copy ${label.toLowerCase()}`}
            data-testid={`${testId}-copy`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </dd>
    </div>
  );
}

export default AccountIdentityHeader;