export type CustomerAccountKind = "client" | "demo" | "test" | "internal_admin";

type CustomerLike = {
  account_kind?: CustomerAccountKind | string | null;
  is_demo_account?: boolean | null;
  email?: string | null;
  full_name?: string | null;
  business_name?: string | null;
  status?: string | null;
};

export const ACCOUNT_KIND_LABEL: Record<CustomerAccountKind, string> = {
  client: "Client",
  demo: "Demo",
  test: "Test",
  internal_admin: "Internal admin",
};

export const ACCOUNT_KIND_TONE: Record<CustomerAccountKind, string> = {
  client: "bg-muted/40 text-muted-foreground border-border",
  demo: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  test: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  internal_admin: "bg-primary/15 text-primary border-primary/40",
};

export function getCustomerAccountKind(customer: CustomerLike): CustomerAccountKind {
  const explicit = normalizeKind(customer.account_kind);
  if (explicit) return explicit;

  const email = lower(customer.email);
  const fullName = lower(customer.full_name);
  const businessName = lower(customer.business_name);
  const haystack = `${email} ${fullName} ${businessName}`;

  if (
    customer.status === "internal" ||
    email === "internal@rgs.local" ||
    haystack.includes("revenueandgrowthsystems") ||
    haystack.includes("revenue & growth systems") ||
    haystack.includes("revenue and growth systems") ||
    haystack.includes("rgs internal")
  ) {
    return "internal_admin";
  }

  if (
    customer.is_demo_account ||
    email.endsWith("@demo.rgs.local") ||
    email.endsWith("@showcase.rgs.local") ||
    haystack.includes("(showcase)") ||
    businessName.startsWith("demo ") ||
    businessName.startsWith("demo-") ||
    businessName.startsWith("demo:")
  ) {
    return "demo";
  }

  if (
    email.endsWith("@rgs-test.local") ||
    email.endsWith("@test.rgs.local") ||
    email.includes("+test@") ||
    email.startsWith("test@") ||
    fullName === "test" ||
    fullName.startsWith("test ") ||
    businessName.startsWith("test ") ||
    businessName.includes(" test account")
  ) {
    return "test";
  }

  return "client";
}

export function isCustomerFlowAccount(customer: CustomerLike): boolean {
  return getCustomerAccountKind(customer) !== "internal_admin";
}

function normalizeKind(value: CustomerLike["account_kind"]): CustomerAccountKind | null {
  return value === "client" || value === "demo" || value === "test" || value === "internal_admin"
    ? value
    : null;
}

function lower(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}
